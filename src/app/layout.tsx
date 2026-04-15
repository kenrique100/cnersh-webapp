import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import Script from "next/script";

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
          <CookieConsentBanner />
          <Toaster position="top-right" richColors />
        </ThemeProvider>

        {/*
          Google Translate widget container.
          Must NOT be display:none — Google cannot inject the combo select
          into a hidden element. Use position:absolute + visibility:hidden
          + zero dimensions so it is invisible but still rendered in the DOM.
        */}
        <div
          id="google_translate_element"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        />

        {/* Step 1: define the callback BEFORE the script loads */}
        <Script
          id="google-translate-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.googleTranslateElementInit = function() {
                new window.google.translate.TranslateElement(
                  {
                    pageLanguage: 'en',
                    includedLanguages: 'en,fr',
                    autoDisplay: false,
                    layout: 0
                  },
                  'google_translate_element'
                );
              };
            `,
          }}
        />

        {/* Step 2: load the Google Translate widget script */}
        <Script
          id="google-translate-script"
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
