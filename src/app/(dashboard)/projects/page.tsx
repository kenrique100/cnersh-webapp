import { authIsRequired } from "@/lib/auth-utils";
import { getUserProjects } from "@/app/actions/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default async function ProjectsPage() {
    await authIsRequired();

    const projects = await getUserProjects();

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            My Projects
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Track your submitted projects and their status
                        </p>
                    </div>
                    <Link href="/projects/submit">
                        <Button>Submit New Project</Button>
                    </Link>
                </div>

                {projects.length === 0 ? (
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                        <CardContent className="py-12 text-center">
                            <FolderIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No projects yet
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Submit your first project for review
                            </p>
                            <Link href="/projects/submit">
                                <Button>Submit Project</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <Card
                                key={project.id}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-lg transition-shadow"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">
                                            {project.title}
                                        </CardTitle>
                                        <Badge
                                            className={
                                                statusColors[project.status] || ""
                                            }
                                        >
                                            {project.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                        {project.description}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                        <span>{project.category}</span>
                                        {project.location && (
                                            <>
                                                <span>•</span>
                                                <span>{project.location}</span>
                                            </>
                                        )}
                                    </div>
                                    {project.feedback && (
                                        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-800 dark:text-yellow-200">
                                            <strong>Feedback:</strong> {project.feedback}
                                        </div>
                                    )}
                                    <p className="mt-3 text-xs text-gray-400">
                                        Submitted{" "}
                                        {new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
