import SimplePage from "@/components/shared/SimplePage";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SimplePage
      params={params}
      title={locale === "en" ? "Blog" : "بلاگ"}
      body={
        locale === "en"
          ? "Guides will appear here. The product is focused on turning Instagram into a website, not generic AI writing."
          : "راهنماها اینجا منتشر می‌شوند. تمرکز محصول تبدیل اینستاگرام به سایت است، نه نویسندگی عمومی با هوش مصنوعی."
      }
    />
  );
}
