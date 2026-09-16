import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/origin";
import { createCustomerPortalSession } from "@/lib/billing/portal";
import { isBillingConfigured } from "@/lib/billing/config";

const bodySchema = z.object({
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

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createCustomerPortalSession({
    workspaceId: session.workspace.id,
    email: session.user.email,
    name: session.user.name,
    locale: parsed.data.locale,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ url: result.url });
}
