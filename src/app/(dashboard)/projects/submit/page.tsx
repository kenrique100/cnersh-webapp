import { authIsRequired } from "@/lib/auth-utils";
import ProjectSubmitClient from "@/components/project-submit-client";

export const dynamic = "force-dynamic";

export default async function SubmitProjectPage() {
    await authIsRequired();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Submit Project
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Submit your project for ethical review and approval
                    </p>
                </div>
                <ProjectSubmitClient />
            </div>
        </div>
    );
}
