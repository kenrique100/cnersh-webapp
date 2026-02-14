import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheckIcon, UsersIcon, FileTextIcon, ActivityIcon } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    await authIsRequired();
    const user = await updateProfile();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Dashboard
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Welcome back, {user?.name || user?.email}! Here's your overview.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Total Forms
                            </CardTitle>
                            <FileTextIcon className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                No forms created yet
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Community Members
                            </CardTitle>
                            <UsersIcon className="h-4 w-4 text-green-600 dark:text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">1</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Active members
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Security Status
                            </CardTitle>
                            <ShieldCheckIcon className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Two-factor authentication
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Activity
                            </CardTitle>
                            <ActivityIcon className="h-4 w-4 text-orange-600 dark:text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Active</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Account status
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Quick Actions */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Quick Actions
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                Common tasks and shortcuts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-700 dark:bg-blue-600">
                                        <FileTextIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Create New Form
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Start a new ethical review form
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-700 dark:bg-green-600">
                                        <UsersIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            View Community
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Connect with other members
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-700 dark:bg-purple-600">
                                        <ShieldCheckIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Security Settings
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Manage your account security
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Recent Activity
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                Your latest actions and updates
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <ActivityIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    No recent activity
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    Your activity will appear here once you start using the platform
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Welcome Message */}
                {!user?.twoFactorEnabled && (
                    <div className="mt-6">
                        <Card className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 shadow-lg">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <ShieldCheckIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                            Enhance Your Account Security
                                        </p>
                                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                            We recommend enabling two-factor authentication to protect your account. 
                                            You can enable it in your profile settings.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
