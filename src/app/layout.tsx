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
    default: "Trainygo — منصة إدارة المدربين الشخصيين",
    template: "%s | Trainygo",
  },
  description:
    "منصة متكاملة للمدربين الشخصيين لإدارة العملاء والبرامج التدريبية والأنظمة الغذائية والمتابعات والقياسات من مكان واحد.",
  applicationName: "Trainygo",
  keywords: [
    "Trainygo",
    "تدريب",
    "مدرب شخصي",
    "personal trainer",
    "coaching",
    "fitness",
    "تغذية",
  ],
  authors: [{ name: "Trainygo" }],
  metadataBase: new URL("https://trainygo.com"),
  openGraph: {
    title: "Trainygo — منصة إدارة المدربين الشخصيين",
    description:
      "منصة متكاملة للمدربين الشخصيين لإدارة التدريب والتغذية والمتابعات والقياسات في مكان واحد.",
    siteName: "Trainygo",
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
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
