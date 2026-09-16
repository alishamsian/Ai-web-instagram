import SimplePage from "@/components/shared/SimplePage";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEn = locale === "en";
  return (
    <SimplePage
      params={params}
      title={isEn ? "Privacy" : "حریم خصوصی"}
      body={
        isEn
          ? "Vitrin processes account, workspace, and website data needed to run the product. We only import public Instagram data you ask us to access. Private profiles are not imported. Media may be stored so temporary Instagram CDN URLs are not used as permanent assets. We do not sell personal data. This page is a product foundation statement — not legal advice or a compliance certification. Contact support for data requests."
          : "ویترین داده‌های حساب، ورک‌اسپیس و سایت را فقط برای ارائهٔ محصول پردازش می‌کند. فقط داده‌های عمومی اینستاگرام که شما درخواست می‌کنید وارد می‌شود. پیج خصوصی وارد نمی‌شود. رسانه ممکن است ذخیره شود تا لینک‌های موقت CDN دارایی دائمی نباشند. دادهٔ شخصی فروخته نمی‌شود. این صفحه بیانیهٔ پایهٔ محصول است — مشاورهٔ حقوقی یا گواهی compliance نیست. برای درخواست داده با پشتیبانی تماس بگیرید."
      }
    />
  );
}
