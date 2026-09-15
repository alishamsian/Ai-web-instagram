import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAdminUser360 } from "@/lib/admin/phase3-queries";
import { AdminAuthError } from "@/lib/admin/rbac";
import { logAdminFailure } from "@/lib/admin/safe";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }
  try {
    const detail = await getAdminUser360({
      userId: session.user.id,
      targetUserId: id,
    });
    if (!detail) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    logAdminFailure("api.admin.user-360", error);
    return NextResponse.json({ error: "ERROR" }, { status: 500 });
  }
}
