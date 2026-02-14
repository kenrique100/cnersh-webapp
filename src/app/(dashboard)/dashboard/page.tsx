import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheckIcon, PenSquareIcon, FolderIcon, MessageSquareIcon, BellIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    await authIsRequired();
    const user = await updateProfile();

    const userInitials = user?.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.slice(0, 2).toUpperCase() || "U";

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header - LinkedIn style */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg mb-8 overflow-hidden">
                    {/* Cover Banner */}
                    <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
                    <CardContent className="relative pt-0 pb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
                            <Avatar className="h-24 w-24 border-4 border-white dark:border-gray-950 shadow-lg">
                                <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                                <AvatarFallback className="bg-blue-700 text-white text-2xl font-bold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 pt-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {user?.name || "Welcome"}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {user?.email}
                                </p>
                            </div>
                            <Link
                                href="/update-profile"
                                className="text-sm text-blue-700 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                            >
                                Edit Profile
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Access Grid */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
                    <Link href="/feeds">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-3">
                                    <PenSquareIcon className="w-6 h-6 text-blue-700 dark:text-blue-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Feeds</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Share &amp; interact</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/projects">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mb-3">
                                    <FolderIcon className="w-6 h-6 text-green-700 dark:text-green-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">My Projects</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Track submissions</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/community">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 mb-3">
                                    <MessageSquareIcon className="w-6 h-6 text-purple-700 dark:text-purple-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Community</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Discussions</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/notifications">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 mb-3">
                                    <BellIcon className="w-6 h-6 text-orange-700 dark:text-orange-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stay updated</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Security Reminder */}
                {user && !user.twoFactorEnabled && (
                    <Card className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <ShieldCheckIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                        Enhance Your Account Security
                                    </p>
                                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                        We recommend enabling two-factor authentication to protect your account. 
                                        You can enable it in your{" "}
                                        <Link href="/update-profile" className="underline font-medium">
                                            profile page
                                        </Link>.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
