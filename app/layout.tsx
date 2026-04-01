// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import FullScreenLoader from "@/components/FullScreenLoader";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IMS",
  description: "Monitoring PI data and flowcharts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>

      <body className={plusJakarta.className}>
        <Providers>
          <Suspense fallback={<FullScreenLoader text="Loading" />}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
