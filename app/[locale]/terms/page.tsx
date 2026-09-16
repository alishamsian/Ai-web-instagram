import SimplePage from "@/components/shared/SimplePage";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEn = locale === "en";
  return (
    <SimplePage
      params={params}
      title={isEn ? "Terms" : "شرایط"}
      body={
        isEn
          ? "Use Vitrin for public profiles and businesses you are allowed to represent. Generated websites and content remain yours. Do not use the product to bypass Instagram access restrictions, abuse rate limits, or publish unlawful content. Service availability, plan limits, and features may change. This page is a launch foundation placeholder — not a complete legal contract."
          : "ویترین را برای پیج‌ها و کسب‌وکارهایی استفاده کنید که حق نمایندگی‌شان را دارید. محتوای سایت تولیدشده متعلق به شماست. از محصول برای دور زدن محدودیت‌های اینستاگرام، سوءاستفاده از سقف استفاده، یا انتشار محتوای غیرقانونی استفاده نکنید. دسترسی، محدودیت پلن و قابلیت‌ها ممکن است تغییر کند. این صفحه foundation راه‌اندازی است — قرارداد حقوقی کامل نیست."
      }
    />
  );
}
