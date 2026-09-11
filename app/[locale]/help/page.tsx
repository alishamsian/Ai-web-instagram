import SimplePage from "@/components/shared/SimplePage";

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SimplePage
      params={params}
      title={locale === "en" ? "Help" : "راهنما"}
      body={
        locale === "en"
          ? "Paste a public Instagram URL to generate a website. Use instagram.com/demo to preview the product without connecting live collection."
          : "لینک پیج عمومی اینستاگرام را بگذار تا سایت ساخته شود. برای دیدن محصول بدون اتصال زنده، instagram.com/demo را امتحان کن."
      }
    />
  );
}
