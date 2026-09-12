import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { trackOnboardingEvent } from "@/lib/notifications/inbox";

const bodySchema = z.object({
  event: z.enum(["view", "step_done", "complete", "dismiss"]),
  stepId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  await trackOnboardingEvent(
    session.workspace.id,
    parsed.data.event,
    parsed.data.stepId,
  );
  return NextResponse.json({ ok: true });
}
