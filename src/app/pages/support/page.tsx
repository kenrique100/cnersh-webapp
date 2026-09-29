import { redirect } from "next/navigation";
import Link from "next/link";
import {
    LifeBuoy,
    BookOpen,
    Mail,
    MessageSquare,
    Clock,
    ShieldCheck,
    ExternalLink,
} from "lucide-react";
import { authSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SupportForm from "@/components/support-form";
import Navbar from "@/components/navbar";

export const dynamic = "force-dynamic";

const quickHelp = [
    {
        icon: BookOpen,
        title: "Browse the SOPs",
        description: "Standard operating procedures and submission guidelines.",
        href: "/pages/resources",
        external: false,
    },
    {
        icon: ShieldCheck,
        title: "Ethical clearance",
        description: "Documents, calendars, and clearance forms.",
        href: "/pages/ethical-clearance",
        external: false,
    },
    {
        icon: Mail,
        title: "Email us directly",
        description: "Prefer email? Reach the team at support@cnersh.cm.",
        href: "mailto:support@cnersh.cm",
        external: true,
    },
];

export default async function SupportPage() {
    const session = await authSession();
    if (!session) redirect("/sign-in?next=/pages/support");

    let navUser: {
        name: string | null;
        email: string;
        image: string | null;
        gender: string | null;
        role: string | null;
    } | null = null;
    let notificationCount = 0;

    try {
        const [user, unreadCount] = await Promise.all([
            db.user.findUnique({
                where: { id: session.user.id },
                select: {
                    name: true,
                    email: true,
                    image: true,
                    gender: true,
                    role: true,
                },
            }),
            getUnreadNotificationCount(),
        ]);
        if (user) {
            navUser = {
                name: user.name,
                email: user.email,
                image: user.image,
                gender: user.gender,
                role: user.role,
            };
        }
        notificationCount = unreadCount;
    } catch (error) {
        console.error("Error fetching user data for support page:", error);
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={navUser} notificationCount={notificationCount} />

            <main className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Page header */}
                <div className="mb-8 text-center">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                        <LifeBuoy className="h-7 w-7 text-blue-700 dark:text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Support
                    </h1>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                        Need help with CNERSH? Send us a message and our team will get
                        back to you as soon as possible.
                    </p>
                </div>

                {/* Quick help cards */}
                <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {quickHelp.map((item) => {
                        const Icon = item.icon;
                        const Wrapper = item.external ? "a" : Link;
                        const extraProps = item.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {};
                        return (
                            <Wrapper
                                key={item.title}
                                href={item.href}
                                {...(extraProps as object)}
                                className="group"
                            >
                                <Card className="h-full border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-800">
                                    <CardContent className="flex flex-col gap-2 p-4">
                                        <div className="flex items-center justify-between">
                                            <Icon className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                                            {item.external && (
                                                <ExternalLink className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-blue-600" />
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {item.title}
                                        </p>
                                        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                            {item.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Wrapper>
                        );
                    })}
                </div>

                {/* Main grid: form + info */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        <SupportForm
                            user={{
                                name: session.user.name ?? "",
                                email: session.user.email ?? "",
                            }}
                        />
                    </div>

                    {/* Info panel */}
                    <div className="space-y-4">
                        <Card className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <Clock className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    Response time
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                    We aim to reply within{" "}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        1 business day
                                    </span>
                                    . Urgent protocol issues are triaged first.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <MessageSquare className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    What to include
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                    <li>Steps to reproduce the issue (if a bug)</li>
                                    <li>The exact page or tracking code involved</li>
                                    <li>Your browser and device, if it looks visual</li>
                                    <li>Screenshots or links, if helpful</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                            <CardContent className="p-4">
                                <p className="text-xs leading-relaxed text-blue-900 dark:text-blue-200">
                                    <span className="font-semibold">Privacy:</span>{" "}
                                    Support messages are visible only to CNERSH super
                                    admins. They are also logged securely in Sentry for
                                    reliability.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} CNERSH - National Ethics Committee for Health Research on Humans. All rights reserved.
                    </p>
                </div>
            </footer>        </div>
    );
}