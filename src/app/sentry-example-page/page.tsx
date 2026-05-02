"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SentryExamplePage() {
    return (
        <div className="min-h-screen bg-[#F3F2EF] dark:bg-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Sentry Error Test</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Click the button below to trigger a test error that Sentry will capture.
                    </p>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            throw new Error("Sentry test error from cnersh-webapp");
                        }}
                    >
                        Throw test error
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            Sentry.captureException(new Error("Sentry captured exception from cnersh-webapp"));
                            alert("Exception sent to Sentry! Check your Sentry dashboard.");
                        }}
                    >
                        Capture exception manually
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
