import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, FileTextIcon } from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function ArticlePage() {
    const session = await authSession();

    let navUser = null;
    let notificationCount = 0;

    if (session) {
        const [user, unreadCount] = await Promise.all([
            db.user.findUnique({
                where: { id: session.user.id },
                select: { name: true, email: true, image: true, role: true },
            }),
            getUnreadNotificationCount(),
        ]);
        if (user) {
            navUser = { name: user.name, email: user.email, image: user.image, role: user.role };
        }
        notificationCount = unreadCount;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div className="mb-6 flex items-center gap-2 text-sm">
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <Link
                        href="/pages"
                        className="text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                        Our Pages
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Articles</span>
                </div>

                <div className="mb-6 flex items-center gap-3">
                    <FileTextIcon className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
                            Articles and Publications
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Health research ethics in Cameroon
                        </p>
                    </div>
                </div>

                <Card className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            <FileTextIcon className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                            Articles and Publications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            This section features research articles and publications related to health research ethics in Cameroon. Content will be updated with new articles and publications.
                        </p>
                    </CardContent>
                </Card>
            </main>

            <footer className="mt-auto w-full border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNERSH - National Ethics Committee for Health Research on Humans. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
