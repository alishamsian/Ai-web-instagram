import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/origin";
import { createCheckoutSession } from "@/lib/billing/checkout";
import { isBillingConfigured, resolvePriceConfig } from "@/lib/billing/config";

const bodySchema = z.object({
  priceId: z.string().min(3).max(200),
  locale: z.string().min(2).max(8).optional(),
});

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!isBillingConfigured()) {
    return NextResponse.json(
      {
        error: "BILLING_NOT_CONFIGURED",
        message: "Billing provider is not configured",
      },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  // Never trust client-provided plan/workspace — use session workspace only.
  if (!resolvePriceConfig(parsed.data.priceId)) {
    return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
  }

  const result = await createCheckoutSession({
    workspaceId: session.workspace.id,
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    priceId: parsed.data.priceId,
    locale: parsed.data.locale,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status: result.code === "BILLING_NOT_CONFIGURED" ? 503 : 400 },
    );
  }

  return NextResponse.json({ url: result.url, sessionId: result.sessionId });
}
