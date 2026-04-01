"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
    >
      <SessionProvider>{children}</SessionProvider>
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </NextThemesProvider>
  );
}
