import { cookies } from "next/headers";
import { PRIMARY_SITE_COOKIE } from "@/lib/dashboard/primary-site";

export async function getPrimarySiteIdCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(PRIMARY_SITE_COOKIE)?.value ?? null;
}
