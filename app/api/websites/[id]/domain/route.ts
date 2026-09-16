import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readStore, writeStore } from "@/lib/database/store";
import { planLimits } from "@/lib/config/plans";
import {
  getWebsiteForWorkspace,
  getDomainsForWebsite,
} from "@/lib/database/queries";

function normalizeHost(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

/** Reject malformed / unsafe hostnames before persistence. */
function isValidPublicHost(host: string) {
  if (!host || host.length > 253) return false;
  if (host.includes("..") || host.includes(" ") || host.includes("@")) return false;
  if (!host.includes(".")) return false;
  if (!/^[a-z0-9.-]+$/.test(host)) return false;
  if (host.startsWith("-") || host.endsWith("-") || host.startsWith(".")) return false;
  // Block obvious local / metadata hosts from becoming custom domains.
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host.startsWith("127.") ||
    host.endsWith(".local") ||
    host === "0.0.0.0"
  ) {
    return false;
  }
  return true;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const website = await getWebsiteForWorkspace(id, session.workspace.id);
  if (!website) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const domains = await getDomainsForWebsite(id);
  return NextResponse.json({
    slug: website.slug,
    domains,
    allowed: planLimits(session.workspace.plan).customDomain,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (!planLimits(session.workspace.plan).customDomain) {
    return NextResponse.json(
      {
        error: "PRO_REQUIRED",
        message: "Custom domains are available on Pro.",
      },
      { status: 402 },
    );
  }

  const { id } = await params;
  const { recordProductEvent } = await import("@/lib/admin/events");
  void recordProductEvent({
    eventName: "domain_connection_started",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId: id,
    resourceType: "website",
    resourceId: id,
  });

  const body = (await request.json().catch(() => ({}))) as { host?: string };
  const host = normalizeHost(body.host ?? "");
  if (!isValidPublicHost(host)) {
    void recordProductEvent({
      eventName: "domain_connection_failed",
      userId: session.user.id,
      workspaceId: session.workspace.id,
      websiteId: id,
      resourceType: "website",
      resourceId: id,
      metadata: { reason: "invalid_host" },
    });
    return NextResponse.json({ error: "INVALID_HOST" }, { status: 400 });
  }

  let created = null as
    | Awaited<ReturnType<typeof readStore>>["domains"][number]
    | null;
  let conflict = false;

  await writeStore((store) => {
    if (!store.domains) store.domains = [];
    const website = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!website) return;
    if (store.domains.some((d) => d.host === host)) {
      conflict = true;
      return;
    }
    store.domains = store.domains.filter((d) => d.websiteId !== id);
    const domain = {
      id: crypto.randomUUID(),
      websiteId: id,
      host,
      createdAt: new Date().toISOString(),
      // Unverified until DNS ownership is confirmed — edge will not route yet.
      verifiedAt: null as string | null,
    };
    store.domains.push(domain);
    website.updatedAt = new Date().toISOString();
    created = domain;
  });

  if (conflict) {
    void recordProductEvent({
      eventName: "domain_connection_failed",
      userId: session.user.id,
      workspaceId: session.workspace.id,
      websiteId: id,
      resourceType: "website",
      resourceId: id,
      metadata: { reason: "host_taken" },
    });
    return NextResponse.json({ error: "HOST_TAKEN" }, { status: 409 });
  }
  if (!created) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  void recordProductEvent({
    eventName: "domain_connected",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId: id,
    resourceType: "domain",
    resourceId: created.id,
    metadata: { hostLength: host.length, verified: false },
  });
  return NextResponse.json({
    ...created,
    status: "pending_verification",
    message:
      "Domain saved. Public routing activates after verification.",
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { domainId?: string };

  let ok = false;
  await writeStore((store) => {
    if (!store.domains) store.domains = [];
    const website = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!website) return;
    const before = store.domains.length;
    store.domains = store.domains.filter((d) => {
      if (d.websiteId !== id) return true;
      if (body.domainId) return d.id !== body.domainId;
      return false;
    });
    ok = store.domains.length !== before;
    if (ok) website.updatedAt = new Date().toISOString();
  });

  if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
