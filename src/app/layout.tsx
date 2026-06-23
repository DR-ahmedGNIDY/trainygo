import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { getLocale } from "@/lib/i18n/server";
import { dirForLocale } from "@/lib/i18n/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FITXNET — منصة إدارة المدربين الشخصيين",
    template: "%s | FITXNET",
  },
  description:
    "منصة متكاملة للمدربين الشخصيين لإدارة العملاء والبرامج التدريبية والأنظمة الغذائية والمتابعات والقياسات من مكان واحد.",
  applicationName: "FITXNET",
  keywords: [
    "FITXNET",
    "تدريب",
    "مدرب شخصي",
    "personal trainer",
    "coaching",
    "fitness",
    "تغذية",
  ],
  authors: [{ name: "FITXNET" }],
  metadataBase: new URL("https://fitxnet.com"),
  openGraph: {
    title: "FITXNET — منصة إدارة المدربين الشخصيين",
    description:
      "منصة متكاملة للمدربين الشخصيين لإدارة التدريب والتغذية والمتابعات والقياسات في مكان واحد.",
    siteName: "FITXNET",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.png",
    apple: "/icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F7" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = dirForLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${cairo.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
