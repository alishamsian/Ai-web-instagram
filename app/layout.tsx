import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Fraunces, Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";
import "./store.css";
import "./editor.css";
import "./auth.css";
import { IconProvider } from "@/components/ui/icon-provider";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { DEFAULT_LOCALE, isLocale } from "@/lib/config/env";
import { getDictionary } from "@/lib/i18n/dictionary";

const vitrinSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vitrin-serif",
  display: "swap",
});

const vitrinDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-vitrin-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const headerLocale = (await headers()).get("x-locale") ?? DEFAULT_LOCALE;
  const locale = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    title: {
      default: dict.meta.title,
      template: `%s | ${dict.brand}`,
    },
    description: dict.meta.description,
    keywords: [
      "Instagram website builder",
      "Instagram to website",
      "سایت از اینستاگرام",
      "ساخت سایت از پیج اینستاگرام",
    ],
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
      locale: locale === "fa" ? "fa_IR" : "en_US",
    },
    alternates: {
      languages: { fa: "/fa", en: "/en" },
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const headerLocale = (await headers()).get("x-locale") ?? DEFAULT_LOCALE;
  const locale = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${vitrinSerif.variable} ${vitrinDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans text-foreground antialiased">
        <IconProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </IconProvider>
      </body>
    </html>
  );
}
