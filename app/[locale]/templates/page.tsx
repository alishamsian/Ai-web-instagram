import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { TemplateCatalogClient } from "@/components/templates/TemplateCatalogClient";
import { getTemplateCatalog } from "@/lib/templates";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const templates = getTemplateCatalog();

  return (
    <div className="min-h-screen bg-white">
      <Navbar dict={dict} locale={locale} />
      <main>
        <TemplateCatalogClient
          locale={locale}
          dict={dict}
          initialTemplates={templates}
        />
      </main>
      <Footer dict={dict} locale={locale} />
    </div>
  );
}
