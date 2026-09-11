import SimplePage from "@/components/shared/SimplePage";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SimplePage
      params={params}
      title={locale === "en" ? "Terms" : "شرایط"}
      body={
        locale === "en"
          ? "Use Vitrin with public profiles you are allowed to represent. Generated websites remain your content. Do not use the product to bypass Instagram access restrictions."
          : "ویترین را برای پیج‌های عمومی که حق نمایندگی‌شان را دارید استفاده کنید. محتوای سایت تولیدشده متعلق به شماست. از محصول برای دور زدن محدودیت‌های اینستاگرام استفاده نکنید."
      }
    />
  );
}
