import SimplePage from "@/components/shared/SimplePage";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SimplePage
      params={params}
      title={locale === "en" ? "About" : "درباره"}
      body={
        locale === "en"
          ? "Vitrin turns a public Instagram presence into a professional website. AI understands the business; a deterministic renderer builds the site."
          : "ویترین حضور عمومی اینستاگرام را به یک وب‌سایت حرفه‌ای تبدیل می‌کند. هوش مصنوعی کسب‌وکار را می‌فهمد و رندر قطعی سایت را می‌سازد."
      }
    />
  );
}
