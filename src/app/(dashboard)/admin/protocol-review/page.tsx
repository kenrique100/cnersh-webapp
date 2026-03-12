import { authIsRequired } from "@/lib/auth-utils";
import { getAllProjects, getAdminUsers } from "@/app/actions/project";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ProjectReviewClient from "@/components/project-review-client";

export const dynamic = "force-dynamic";

export default async function ProjectReviewPage() {
    const session = await authIsRequired();

    let userRole: string | null = null;
    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });
        userRole = user?.role ?? null;
    } catch (error) {
        console.error("Error fetching user for protocol review:", error);
    }

    if (userRole !== "admin" && userRole !== "superadmin") {
        redirect("/dashboard");
    }

    let projects: Awaited<ReturnType<typeof getAllProjects>> = [];
    try {
        projects = await getAllProjects();
    } catch (error) {
        console.error("Error fetching protocols for review:", error);
    }
    const isSuperAdmin = userRole === "superadmin";

    // Super admin can see the list of admins to assign reviewers
    let adminUsers: Awaited<ReturnType<typeof getAdminUsers>> = [];
    if (isSuperAdmin) {
        try {
            adminUsers = await getAdminUsers();
        } catch {
            adminUsers = [];
        }
    }

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Protocol Review
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Review and manage protocol submissions
                    </p>
                </div>
                <ProjectReviewClient
                    projects={JSON.parse(JSON.stringify(projects))}
                    isSuperAdmin={isSuperAdmin}
                    adminUsers={JSON.parse(JSON.stringify(adminUsers))}
                />
            </div>
        </div>
    );
}
