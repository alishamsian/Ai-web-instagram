import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const websiteId = url.searchParams.get("websiteId");
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 14) || 14));

  const store = await readStore();
  const sites = store.websites.filter(
    (w) => w.workspaceId === session.workspace.id,
  );
  if (websiteId && !sites.some((w) => w.id === websiteId)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const targetIds = websiteId
    ? [websiteId]
    : sites.map((w) => w.id);

  if (!targetIds.length) {
    return NextResponse.json({
      total: 0,
      days,
      series: [],
      byPath: [],
    });
  }

  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return NextResponse.json({
      total: 0,
      days,
      series: [],
      byPath: [],
      stub: true,
    });
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("page_views")
    .select("path, created_at")
    .in("website_id", targetIds)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(20_000);

  if (error) {
    return NextResponse.json({
      total: 0,
      days,
      series: [],
      byPath: [],
      error: error.message,
    });
  }

  const rows = data ?? [];
  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const path = (row.path as string) || "/";
    byPath.set(path, (byPath.get(path) ?? 0) + 1);
  }

  return NextResponse.json({
    total: rows.length,
    days,
    series: [...byDay.entries()].map(([date, count]) => ({ date, count })),
    byPath: [...byPath.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  });
}
