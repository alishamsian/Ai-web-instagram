import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readStore, writeStore } from "@/lib/database/store";
import { allocateUniqueSlug } from "@/lib/website/slug";
import { planLimits } from "@/lib/config/plans";
import { createId } from "@/lib/utils";
import type { WebsiteConfig } from "@/types/website";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  deleteWebsiteForWorkspace,
  isSupabaseSchemaReady,
} from "@/lib/database/supabase-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const store = await readStore();
  const website = store.websites.find(
    (item) => item.id === id && item.workspaceId === session.workspace.id,
  );
  if (!website) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const domains = (store.domains ?? []).filter((d) => d.websiteId === id);
  return NextResponse.json({ ...website, domains });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as {
    config?: WebsiteConfig;
    slug?: string;
    expectedVersion?: number;
  };

  if (!body.config && body.slug == null) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let updated = null as Awaited<ReturnType<typeof readStore>>["websites"][number] | null;
  let slugError: string | null = null;
  let versionConflict = false;

  let nextSlug: string | undefined;
  if (typeof body.slug === "string" && body.slug.trim()) {
    nextSlug = await allocateUniqueSlug({
      base: body.slug.trim(),
      workspaceId: session.workspace.id,
      websiteId: id,
    });
  }

  await writeStore((store) => {
    if (!store.domains) store.domains = [];
    const website = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!website) return;

    if (
      typeof body.expectedVersion === "number" &&
      body.expectedVersion !== website.version
    ) {
      versionConflict = true;
      return;
    }

    if (nextSlug) {
      const clash = store.websites.some(
        (site) => site.slug === nextSlug && site.id !== id,
      );
      if (clash) {
        slugError = "SLUG_TAKEN";
        return;
      }
      website.slug = nextSlug;
    }

    if (body.config) {
      const limits = planLimits(session.workspace.plan);
      const nextConfig = structuredClone(body.config);
      if (!limits.removeBranding) {
        nextConfig.settings.showBranding = true;
      }
      website.config = nextConfig;
      website.updatedAt = new Date().toISOString();
      website.version += 1;
      store.versions.push({
        id: createId("ver"),
        websiteId: website.id,
        version: website.version,
        config: nextConfig,
        createdAt: website.updatedAt,
      });
    } else {
      website.updatedAt = new Date().toISOString();
    }

    updated = website;
  });

  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 409 });
  }
  if (versionConflict) {
    return NextResponse.json(
      { error: "VERSION_CONFLICT", message: "Site was updated elsewhere. Reload and try again." },
      { status: 409 },
    );
  }
  if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const workspaceId = session.workspace.id;

  try {
    let deleted = false;

    if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
      deleted = await deleteWebsiteForWorkspace(id, workspaceId);
    } else {
      await writeStore((store) => {
        if (!store.domains) store.domains = [];
        const index = store.websites.findIndex(
          (item) => item.id === id && item.workspaceId === workspaceId,
        );
        if (index < 0) return;

        store.websites.splice(index, 1);
        store.versions = store.versions.filter(
          (version) => version.websiteId !== id,
        );
        store.domains = store.domains.filter((domain) => domain.websiteId !== id);
        for (const job of store.jobs) {
          if (job.websiteId === id) delete job.websiteId;
        }
        deleted = true;
      });
    }

    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    try {
      const { revalidateTag, revalidatePath } = await import("next/cache");
      revalidateTag(`workspace-dashboard-${workspaceId}`, "max");
      revalidatePath("/fa/dashboard");
      revalidatePath("/en/dashboard");
      revalidatePath("/fa/sites");
      revalidatePath("/en/sites");
    } catch {
      // Cache APIs can be unavailable in some runtimes; DB delete already succeeded.
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[websites] DELETE failed", id, error);
    return NextResponse.json(
      {
        error: "DELETE_FAILED",
        message:
          error instanceof Error ? error.message : "Could not delete website.",
      },
      { status: 500 },
    );
  }
}
