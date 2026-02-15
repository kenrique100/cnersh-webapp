import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlusIcon } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AddFormPage() {
    await authIsRequired();
    await updateProfile();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Add Form
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Create a new ethical review form
                    </p>
                </div>

                {/* Main Content */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FilePlusIcon className="w-5 h-5" />
                            Form Creation
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                            This feature will be available soon
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FilePlusIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Form Builder Coming Soon
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                The form creation interface is under development. You will be able to create custom ethical review forms here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
