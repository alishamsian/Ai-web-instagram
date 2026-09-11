import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProUpgradeCard({
  locale,
  feature,
}: {
  locale: "fa" | "en";
  feature: "sync" | "domain" | "generic";
}) {
  const isFa = locale === "fa";
  const copy = {
    sync: {
      fa: {
        title: "همگام‌سازی هوشمند اینستاگرام",
        body: "با پلن حرفه‌ای، پست‌های جدید را خودکار به ویترین منتقل کن.",
      },
      en: {
        title: "Smart Instagram sync",
        body: "On Pro, pull new posts into your storefront automatically.",
      },
    },
    domain: {
      fa: {
        title: "دامنه اختصاصی برندت",
        body: "آدرس خودت + SSL و حذف برند ویترین.",
      },
      en: {
        title: "Your custom domain",
        body: "Your URL + SSL and remove Vitrin branding.",
      },
    },
    generic: {
      fa: {
        title: "پلن حرفه‌ای",
        body: "دامنه، همگام‌سازی و ظرفیت بیشتر سایت.",
      },
      en: {
        title: "Go Pro",
        body: "Custom domain, sync, and more sites.",
      },
    },
  }[feature][isFa ? "fa" : "en"];

  return (
    <aside className="overflow-hidden rounded-2xl border border-ink/10 bg-[linear-gradient(145deg,#111_0%,#2a2a2a_100%)] p-5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Lock className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] text-white/55 uppercase">
            Pro
          </p>
          <h3 className="mt-1 text-sm font-semibold">{copy.title}</h3>
          <p className="mt-1.5 text-xs leading-5 text-white/70">{copy.body}</p>
        </div>
      </div>
      <Button asChild size="sm" className="mt-4 w-full bg-white text-ink hover:bg-white/90">
        <Link href={`/${locale}/dashboard/billing`}>
          <Sparkles className="size-3.5" aria-hidden />
          {isFa ? "مشاهده پلن‌ها" : "View plans"}
        </Link>
      </Button>
    </aside>
  );
}
