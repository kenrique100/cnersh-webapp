import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "CNERSH - National Ethics Committee for Health Research on Humans",
  description:
    "Reviews research proposals involving human participants to ensure they are ethically sound and compliant with relevant guidelines and regulations, protecting the rights, safety, and well-being of participants.",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /*
    src/proxy.ts mints this nonce and names it in the Content Security
    Policy. next-themes injects an inline script to apply the stored theme
    before first paint; without the nonce that script is blocked, the server and
    client markup disagree, and hydration fails.
  */
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          {children}
          <CookieConsentBanner />
          <Toaster position="top-right" richColors />
        </ThemeProvider>

        {/*
          Google Translate widget mount point.
          MUST NOT be display:none - Google cannot inject its combo <select>
          into a display:none subtree. We move it off-screen instead.
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

        {/*
          Step 1 - define the callback BEFORE the external script loads.
          The callback is served from /public as a real file instead of an
          inline script, so the Content Security Policy can forbid inline
          scripts outright. strategy="afterInteractive" is used for both;
          Next.js App Router preserves document order between them.
        */}
        <Script
          id="google-translate-init"
          src="/google-translate-init.js"
          strategy="afterInteractive"
        />

        {/* Step 2 - load the widget; it calls googleTranslateElementInit when ready */}
        <Script
          id="google-translate-script"
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
