import SimplePage from "@/components/shared/SimplePage";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <SimplePage
      params={params}
      title={locale === "en" ? "Privacy" : "حریم خصوصی"}
      body={
        locale === "en"
          ? "We only process public Instagram data the product is allowed to access. Private profiles are not imported. Media is stored so Instagram CDN URLs are not used as permanent assets."
          : "فقط داده‌های عمومی اینستاگرام که محصول اجازه دسترسی به آن‌ها را دارد پردازش می‌شود. پیج خصوصی وارد نمی‌شود. رسانه ذخیره می‌شود تا لینک‌های موقت اینستاگرام دارایی دائمی نباشند."
      }
    />
  );
}
