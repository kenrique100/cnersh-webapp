import { authIsRequired } from "@/lib/auth-utils";
import { updateProfile } from "@/app/actions/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ViewFormsPage() {
    await authIsRequired();
    const user = await updateProfile();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        View Forms
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Browse and manage your ethical review forms
                    </p>
                </div>

                {/* Main Content */}
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FileTextIcon className="w-5 h-5" />
                            Forms List
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                            View and manage your forms
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No Forms Available
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                You haven't created any forms yet. Start by creating a new form from the "Add Form" option.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
