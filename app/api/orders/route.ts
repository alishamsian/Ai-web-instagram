import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPublishedWebsiteBySlug, getWebsiteById } from "@/lib/database/queries";
import { notifyNewOrder } from "@/lib/orders/notify";

type OrderItem = { name: string; qty: number; price?: number | null };

/**
 * Public storefront order log — saves intent before redirecting to WhatsApp/IG.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    websiteId?: string;
    slug?: string;
    channel?: string;
    note?: string;
    customerContact?: string;
    items?: OrderItem[];
  };

  let websiteId = body.websiteId;
  if (!websiteId && body.slug) {
    const site = await getPublishedWebsiteBySlug(body.slug);
    websiteId = site?.id;
  }
  if (!websiteId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const site = await getWebsiteById(websiteId);
  if (!site || site.status !== "published") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const items = (body.items ?? [])
    .filter((item) => item?.name && item.qty > 0)
    .slice(0, 40)
    .map((item) => ({
      name: String(item.name).slice(0, 120),
      qty: Math.min(99, Math.max(1, Number(item.qty) || 1)),
      price: item.price ?? null,
    }));

  if (!items.length) {
    return NextResponse.json({ error: "EMPTY" }, { status: 400 });
  }

  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return NextResponse.json({ ok: true, stored: false, id: null });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("store_orders")
    .insert({
      website_id: site.id,
      workspace_id: site.workspaceId,
      channel: (body.channel || "checkout").slice(0, 40),
      customer_note: body.note?.slice(0, 500) ?? null,
      customer_contact: body.customerContact?.slice(0, 80) ?? null,
      items,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "STORE_FAILED", message: error.message },
      { status: 500 },
    );
  }

  const locale = site.config.settings.language;
  const summary = items
    .map((i) => `${i.name} ×${i.qty}`)
    .join(locale === "fa" ? "، " : ", ")
    .slice(0, 240);

  const { data: workspace } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", site.workspaceId)
    .maybeSingle();
  let ownerEmail: string | null = null;
  if (workspace?.owner_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("id", workspace.owner_id)
      .maybeSingle();
    ownerEmail = profile?.email ?? null;
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  void notifyNewOrder({
    workspaceId: site.workspaceId,
    ownerEmail,
    brandName: site.config.brand.name,
    summary,
    orderId: data.id as string,
    locale,
    storeWhatsapp: site.config.content.contact?.info?.whatsapp,
    dashboardOrdersUrl: `${appUrl}/${locale}/dashboard/orders`,
  });

  return NextResponse.json({ ok: true, stored: true, id: data.id });
}
