"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface ProjectUser {
    id: string;
    name: string;
    email: string;
    image: string | null;
}

interface ProjectData {
    id: string;
    title: string;
    description: string;
    objectives: string | null;
    category: string;
    location: string | null;
    timeline: string | null;
    budget: string | null;
    document: string | null;
    status: string;
    feedback: string | null;
    createdAt: Date;
    user: ProjectUser;
}

interface ProjectReviewClientProps {
    projects: ProjectData[];
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

export default function ProjectReviewClient({ projects }: ProjectReviewClientProps) {
    const router = useRouter();

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    return (
        <>
            {projects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">No projects to review</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/projects/${project.id}`)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">{project.title}</CardTitle>
                                        <p className="text-xs text-gray-500 mt-1">
                                            by {project.user.name} • {formatDate(project.createdAt)}
                                        </p>
                                    </div>
                                    <Badge className={statusColors[project.status] || ""}>
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {project.description}
                                </p>
                                <div className="mt-2 text-xs text-gray-500">
                                    {project.category}
                                    {project.location && ` • ${project.location}`}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );
}
