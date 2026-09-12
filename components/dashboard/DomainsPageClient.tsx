"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  PageHeader,
  PageStack,
  Panel,
  SoftBanner,
  StatusBadge,
} from "@/components/dashboard/ui";
import { ProUpgradeCard } from "@/components/dashboard/ProUpgradeCard";

export function DomainsPageClient({
  locale,
  isPro,
  billingHref,
  sites,
  selectedId,
  liveUrl,
  subdomainHint,
  initialDomain,
}: {
  locale: "fa" | "en";
  isPro: boolean;
  billingHref: string;
  sites: { id: string; name: string; slug: string }[];
  selectedId: string | null;
  liveUrl: string | null;
  subdomainHint: string | null;
  initialDomain: { id: string; host: string } | null;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [host, setHost] = useState(initialDomain?.host ?? "");
  const [domain, setDomain] = useState(initialDomain);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!selectedId || sites.length === 0) {
    return (
      <PageStack>
        <PageHeader
          eyebrow={isFa ? "وبسایت" : "Website"}
          title={isFa ? "دامنه‌ها" : "Domains"}
          description={
            isFa
              ? "اسلاگ ویترین و دامنه اختصاصی فروشگاهت را اینجا مدیریت کن."
              : "Manage your Vitrin address and custom domain here."
          }
        />
        <EmptyState
          title={isFa ? "هنوز سایتی نیست" : "No site yet"}
          body={
            isFa
              ? "اول یک سایت بساز؛ بعد می‌توانی دامنه وصل کنی."
              : "Create a site first, then connect a domain."
          }
          icon={<Globe className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>
                {isFa ? "ساخت سایت" : "Create site"}
              </Link>
            </Button>
          }
        />
      </PageStack>
    );
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    if (!isPro || !selectedId) return;
    setPending(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/websites/${selectedId}/domain`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host }),
    });
    setPending(false);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      id?: string;
      host?: string;
    };
    if (!response.ok) {
      setError(
        payload.message ||
          (payload.error === "PRO_REQUIRED"
            ? isFa
              ? "فقط پلن حرفه‌ای"
              : "Pro only"
            : payload.error === "HOST_TAKEN"
              ? isFa
                ? "این دامنه قبلاً ثبت شده."
                : "Host already taken."
              : isFa
                ? "اتصال ناموفق بود."
                : "Could not connect."),
      );
      return;
    }
    if (payload.id && payload.host) {
      setDomain({ id: payload.id, host: payload.host });
      setHost(payload.host);
    }
    setMessage(isFa ? "دامنه ثبت شد." : "Domain saved.");
    router.refresh();
  }

  async function disconnect() {
    if (!selectedId || !domain) return;
    setPending(true);
    setError("");
    const response = await fetch(`/api/websites/${selectedId}/domain`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domainId: domain.id }),
    });
    setPending(false);
    if (!response.ok) {
      setError(isFa ? "حذف ناموفق بود." : "Could not remove domain.");
      return;
    }
    setDomain(null);
    setHost("");
    setMessage(isFa ? "دامنه حذف شد." : "Domain removed.");
    router.refresh();
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow={isFa ? "وبسایت" : "Website"}
        title={isFa ? "دامنه‌ها" : "Domains"}
        description={
          isFa
            ? "آدرس عمومی فروشگاه و دامنه اختصاصی — جدا از ادیتور طراحی."
            : "Your public storefront address and custom domain — separate from the design editor."
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={isFa ? "آدرس ویترین" : "Vitrin address"}
          description={
            isFa
              ? "لینک پیش‌فرض روی زیردامنه ویترین"
              : "Default link on your Vitrin subdomain"
          }
        >
          <div className="space-y-4 p-5">
            {liveUrl ? (
              <div className="flex items-start gap-3 rounded-xl bg-[#f6f6f4] px-4 py-3 ring-1 ring-border/70">
                <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-mono text-[13px] break-all text-ink" dir="ltr">
                    {liveUrl}
                  </p>
                  {subdomainHint ? (
                    <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                      {subdomainHint}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/dashboard/website?id=${selectedId}`}>
                {isFa ? "تغییر اسلاگ در مدیریت سایت" : "Change slug in site hub"}
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel
          title={isFa ? "دامنه اختصاصی" : "Custom domain"}
          description={
            isFa
              ? "برند خودت روی دامنه شخصی"
              : "Your brand on your own domain"
          }
        >
          <div className="space-y-4 p-5">
            {!isPro ? (
              <div className="space-y-3">
                <SoftBanner tone="info">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p>
                      {isFa
                        ? "اتصال دامنه اختصاصی در پلن حرفه‌ای فعال است."
                        : "Custom domains are available on the Pro plan."}
                    </p>
                    <Button asChild size="sm">
                      <Link href={billingHref}>
                        {isFa ? "ارتقا به حرفه‌ای" : "Upgrade to Pro"}
                      </Link>
                    </Button>
                  </div>
                </SoftBanner>
                <ProUpgradeCard locale={locale} feature="domain" />
              </div>
            ) : null}

            {domain ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div>
                  <StatusBadge tone="success">
                    {isFa ? "متصل" : "Connected"}
                  </StatusBadge>
                  <p className="mt-2 font-mono text-sm text-ink" dir="ltr">
                    {domain.host}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void disconnect()}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  {isFa ? "حذف" : "Remove"}
                </Button>
              </div>
            ) : null}

            <form onSubmit={connect} className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                {isFa ? "نام دامنه" : "Domain name"}
                <Input
                  className="mt-1.5"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="www.yourbrand.com"
                  disabled={!isPro || pending}
                  required
                  dir="ltr"
                />
              </label>
              {error ? (
                <p className="text-xs text-amber-800" role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="text-xs text-emerald-700" role="status">
                  {message}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={!isPro || pending || !host.trim()}
              >
                {pending
                  ? "…"
                  : domain
                    ? isFa
                      ? "به‌روزرسانی دامنه"
                      : "Update domain"
                    : isFa
                      ? "اتصال دامنه"
                      : "Connect domain"}
              </Button>
            </form>

            <div className="rounded-xl border border-dashed border-border px-4 py-3 text-[12px] leading-5 text-muted-foreground">
              <p className="font-medium text-ink">
                {isFa ? "تنظیم DNS" : "DNS setup"}
              </p>
              <p className="mt-1">
                {isFa
                  ? "یک رکورد CNAME از دامنه به آدرس ویترین اشاره بده. بعد از انتشار DNS، ترافیک روی دامنه تو می‌آید."
                  : "Point a CNAME from your domain to your Vitrin address. After DNS propagates, traffic will serve on your domain."}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </PageStack>
  );
}
