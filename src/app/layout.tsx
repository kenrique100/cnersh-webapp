import type { Metadata, Viewport } from "next";
import "./globals.css";
import React from "react";
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

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-bottom)` return a
 * non-zero value on notched phones (iPhone X+, Android with gesture bar). The
 * cookie banner and the bug FAB both read that variable to stay above the
 * home indicator.
 */
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#030712" },
    ],
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{ children: React.ReactNode }>) {
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
        <Script
            id="google-translate-init"
            src="/google-translate-init.js"
            strategy="afterInteractive"
        />
        <Script
            id="google-translate-script"
            src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
            strategy="afterInteractive"
        />
        </body>
        </html>
    );
}