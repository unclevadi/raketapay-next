import type { Metadata, Viewport } from "next";
import { Unbounded, Inter } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  weight: ["400", "700", "900"],
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  weight: ["300", "400", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Raketa Pay - оплата зарубежных подписок и сервисов из России",
    template: "%s | Raketa Pay",
  },
  description:
    "Raketa Pay: оплата зарубежных подписок и сервисов из России в 2026 году. ChatGPT, Netflix, Spotify, Steam, PlayStation, Booking.com, авиабилеты, маркетплейсы. Оформление через Telegram, поддержка 24/7.",
  applicationName: "Raketa Pay",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: siteUrl },
  keywords: [
    "Raketa Pay",
    "оплата подписок из России",
    "зарубежные сервисы Россия",
    "ChatGPT подписка оплата",
    "Netflix оплата из России",
    "Spotify Premium Россия",
    "Steam пополнение",
    "PlayStation Store оплата",
    "Booking.com оплата",
    "авиабилеты оплата зарубежная",
    "маркетплейсы оплата",
    "Discord Nitro",
    "Adobe Creative Cloud оплата",
    "YouTube Premium",
    "оплата без иностранной карты",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Raketa Pay",
    title: "Raketa Pay - оплата зарубежных подписок и сервисов из России",
    description:
      "Подписки, софт, путешествия, маркетплейсы и игры. Оформление через Telegram. Raketa Pay - зарубежные сервисы из России, 2026.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Raketa Pay - оплата зарубежных подписок из России",
    description:
      "ChatGPT, стриминг, Steam, авиабилеты, маркетплейсы. Оформление в Telegram.",
  },
  category: "finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`scroll-smooth scrollbar-none ${unbounded.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className="scrollbar-none bg-soviet-black text-soviet-cream font-body selection:bg-soviet-red selection:text-white overflow-x-hidden antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
