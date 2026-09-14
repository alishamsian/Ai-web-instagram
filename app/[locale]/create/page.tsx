import { Suspense } from "react";
import { CreateClient } from "@/components/import/CreateClient";
import { HeroAtmosphere } from "@/components/landing/HeroAtmosphere";
import { MarketingThemeProvider } from "@/components/landing/MarketingTheme";
import { Navbar } from "@/components/landing/Navbar";
import { getSession } from "@/lib/auth/session";
import { IMPORT_POSTS_HARD_MAX } from "@/lib/config/import";
import { planLimits } from "@/lib/config/plans";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

export default async function CreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  const maxPosts = Math.min(
    planLimits(session?.workspace.plan).maxImportPosts,
    IMPORT_POSTS_HARD_MAX,
  );

  return (
    <MarketingThemeProvider>
      <HeroAtmosphere tone="ember" />
      <div className="marketing-foreground relative z-10 min-h-dvh">
        <Navbar dict={dict} locale={locale} />
        <Suspense
          fallback={
            <div className="container-marketing flex min-h-[70dvh] items-center justify-center">
              <span className="size-6 animate-pulse rounded-full bg-accent/40" />
            </div>
          }
        >
          <CreateClient locale={locale} maxPosts={maxPosts} />
        </Suspense>
      </div>
    </MarketingThemeProvider>
  );
}
