import { redirect } from "next/navigation";
import { parseLocale } from "@/lib/i18n/paths";

export default async function AdminIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = parseLocale(raw);
  redirect(`/${locale}/admin/dashboard`);
}
