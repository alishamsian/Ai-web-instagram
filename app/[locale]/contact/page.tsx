import SimplePage from "@/components/shared/SimplePage";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SimplePage
      params={params}
      title={locale === "en" ? "Contact" : "تماس"}
      body={locale === "en" ? "hello@vitrin.app" : "hello@vitrin.app"}
    />
  );
}
