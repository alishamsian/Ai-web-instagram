import { MarketingThemeProvider } from "@/components/landing/MarketingTheme";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HeroAtmosphere } from "@/components/landing/HeroAtmosphere";
import { SocialProof } from "@/components/landing/SocialProof";
import { LazyMarketingDemos } from "@/components/landing/LazyMarketingDemos";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { MobileStickyCta } from "@/components/landing/MobileStickyCta";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

/**
 * Marketing homepage — full funnel ending in branded footer.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = parseLocale(raw);
  const dict = getDictionary(locale);

  return (
    <MarketingThemeProvider>
      <HeroAtmosphere />
      <div className="marketing-foreground">
        <Navbar dict={dict} locale={locale} />
        <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <Hero dict={dict} locale={locale} />
          <SocialProof dict={dict} />
          <LazyMarketingDemos dict={dict} locale={locale} />
          <Pricing dict={dict} locale={locale} />
          <FAQ dict={dict} locale={locale} />
          <FinalCTA dict={dict} locale={locale} />
        </main>
        <Footer dict={dict} locale={locale} />
        <MobileStickyCta dict={dict} locale={locale} />
      </div>
    </MarketingThemeProvider>
  );
}
