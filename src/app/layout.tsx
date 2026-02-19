import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "CNERSH - National Ethics Committee for Health Research on Humans",
  description: "Reviews research proposals involving human participants to ensure they are ethically sound and compliant with relevant guidelines and regulations, protecting the rights, safety, and well-being of participants.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
