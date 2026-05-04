"use client";

import * as Sentry from "@sentry/nextjs";
import NextErrorComponent from "next/error";
import { useEffect } from "react";

export default function GlobalError({
                                        error,
                                    }: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        // Optional: Add development logging
        if (process.env.NODE_ENV === "development") {
            console.error("Global error:", error);
        }

        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
        <body>
        <NextErrorComponent statusCode={0} />
        </body>
        </html>
    );
}