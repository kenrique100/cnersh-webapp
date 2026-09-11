import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
    title: "Account deleted | CNERSH",
    robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
    return (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
            <CardHeader className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                    <ShieldCheckIcon className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your account has been deleted</CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    You have been signed out everywhere and this account can no longer be used.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                    Your account profile has been removed and the encryption key protecting your protected data has been
                    destroyed. Protocols you submitted, their attachments, review records, and the audit trail are kept by the
                    ethics committee under its retention rules. Retained records may contain identifying information.
                </p>
                <p>
                    If you did not request this deletion, contact the CNERSH secretariat as soon as possible.
                </p>
                <div className="pt-2 text-center">
                    <Link href="/" className="text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400">
                        Return to the home page
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
