import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Audio Pins",
  description: "Geo-pinned voice notes that attach lived experience to coordinates",
  manifest: "/manifest.json",
  themeColor: "#f5f3ef",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegistration />
        <OfflineIndicator />
        <InstallPrompt />
      </body>
    </html>
  );
}
