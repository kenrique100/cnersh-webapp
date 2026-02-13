import { updateProfile } from "@/app/actions/user";
import { ChangePasswordForm } from "@/components/change-password";
import { ToggleOtpForm } from "@/components/toggle-otp-form";
import { UpdateProfile } from "@/components/update-profile";
import { authIsRequired } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function UpdateProfilePage() {
    await authIsRequired();
    const user = await updateProfile();

    if (!user) redirect("/sign-in");

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Profile Settings
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Manage your account settings and security preferences
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Profile Information Card */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                        <CardHeader className="space-y-1 pb-4">
                            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Profile Information
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                Update your profile picture and personal details
                            </CardDescription>
                        </CardHeader>
                        <Separator className="bg-gray-200 dark:bg-gray-800" />
                        <CardContent className="pt-6">
                            <UpdateProfile
                                email={user.email}
                                name={user.name ?? ""}
                                image={user.image ?? ""}
                            />
                        </CardContent>
                    </Card>

                    {/* Security Settings Card */}
                    <div className="space-y-6">
                        {/* Change Password Card */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                            <CardHeader className="space-y-1 pb-4">
                                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    Change Password
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                    Update your password to keep your account secure
                                </CardDescription>
                            </CardHeader>
                            <Separator className="bg-gray-200 dark:bg-gray-800" />
                            <CardContent className="pt-6">
                                <ChangePasswordForm />
                            </CardContent>
                        </Card>

                        {/* Two-Factor Authentication Card */}
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                            <CardHeader className="space-y-1 pb-4">
                                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    Two-Factor Authentication
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                                    Add an extra layer of security to your account
                                </CardDescription>
                            </CardHeader>
                            <Separator className="bg-gray-200 dark:bg-gray-800" />
                            <CardContent className="pt-6">
                                <ToggleOtpForm twoFactorEnabled={user.twoFactorEnabled} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}