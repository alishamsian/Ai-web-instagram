import { notFound } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { TemplatePreviewClient } from "@/components/templates/TemplatePreviewClient";
import {
  getTemplateById,
  instantiateTemplate,
} from "@/lib/templates";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { ensureWebsitePages } from "@/lib/visual-editor/pages";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ locale: string; templateId: string }>;
}) {
  const { locale: raw, templateId } = await params;
  const locale = parseLocale(raw);
  const dict = getDictionary(locale);
  const template = getTemplateById(templateId);
  if (!template) notFound();

  // In-memory only — does not create a website / write to store.
  const { config } = instantiateTemplate(template.id, {
    locale,
    language: locale,
    direction: locale === "fa" ? "rtl" : "ltr",
  });
  const pages = ensureWebsitePages(config);

  return (
    <div className="min-h-screen bg-white">
      <Navbar dict={dict} locale={locale} />
      <TemplatePreviewClient
        locale={locale}
        dict={dict}
        templateId={template.id}
        name={template.name}
        description={template.description}
        category={template.category}
        style={template.style}
        tags={template.tags}
        features={template.features}
        pages={pages}
        previewConfig={config}
      />
    </div>
  );
}
