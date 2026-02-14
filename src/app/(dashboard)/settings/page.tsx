import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsIcon } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    await authIsRequired();
    const user = await updateProfile();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Settings
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Configure your application preferences and settings
                    </p>
                </div>

                {/* Main Content */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" />
                            Application Settings
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Manage your application preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <SettingsIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Settings Panel Coming Soon
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                Advanced application settings will be available here. For account and security settings, visit your profile page.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
