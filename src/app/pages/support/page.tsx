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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SupportForm from "@/components/support-form";

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
    if (!session) redirect("/sign-in?callbackUrl=/support");

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Page header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-950 mb-4">
                        <LifeBuoy className="w-7 h-7 text-blue-700 dark:text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Support
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto">
                        Need help with CNERSH? Send us a message and our team will get back to
                        you as soon as possible.
                    </p>
                </div>

                {/* Quick help cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
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
                                <Card className="h-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm transition-all">
                                    <CardContent className="p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Icon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                                            {item.external && (
                                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Wrapper>
                        );
                    })}
                </div>

                {/* Main grid: form + info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                    Response time
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    We aim to reply within <span className="font-medium text-gray-700 dark:text-gray-200">1 business day</span>.
                                    Urgent protocol issues are triaged first.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                    What to include
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 leading-relaxed list-disc pl-4">
                                    <li>Steps to reproduce the issue (if a bug)</li>
                                    <li>The exact page or tracking code involved</li>
                                    <li>Your browser and device, if it looks visual</li>
                                    <li>Screenshots or links, if helpful</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                            <CardContent className="p-4">
                                <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                                    <span className="font-semibold">Privacy:</span> Support
                                    messages are visible only to CNERSH super admins. They are
                                    also logged securely in Sentry for reliability.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}