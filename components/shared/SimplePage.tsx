import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

export default async function SimplePage({
  params,
  title,
  body,
}: {
  params: Promise<{ locale: string }>;
  title: string;
  body: string;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  return (
    <div className="min-h-screen bg-white">
      <Navbar dict={dict} locale={locale} />
      <main className="mx-auto max-w-2xl bg-white px-5 py-20">
        <h1 className="font-display text-4xl">{title}</h1>
        <p className="mt-6 text-base leading-8 text-muted-foreground">{body}</p>
      </main>
      <Footer dict={dict} locale={locale} />
    </div>
  );
}
