"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { assignProjectReviewer } from "@/app/actions/project";
import { toast } from "sonner";
import { UserCheckIcon } from "lucide-react";

interface ProjectUser {
    id: string;
    name: string;
    email: string;
    image: string | null;
}

interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string | null;
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
    assignedToId: string | null;
    createdAt: Date;
    user: ProjectUser;
}

interface ProjectReviewClientProps {
    projects: ProjectData[];
    isSuperAdmin?: boolean;
    adminUsers?: AdminUser[];
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

export default function ProjectReviewClient({ projects, isSuperAdmin, adminUsers = [] }: ProjectReviewClientProps) {
    const router = useRouter();
    const [assigningId, setAssigningId] = React.useState<string | null>(null);

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    const handleAssign = async (projectId: string, adminId: string) => {
        try {
            setAssigningId(projectId);
            await assignProjectReviewer(projectId, adminId);
            toast.success("Reviewer assigned successfully");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to assign reviewer");
        } finally {
            setAssigningId(null);
        }
    };

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
                            className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div
                                        className="cursor-pointer flex-1"
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
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
                                <p
                                    className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 cursor-pointer"
                                    onClick={() => router.push(`/projects/${project.id}`)}
                                >
                                    {project.description}
                                </p>
                                <div className="mt-2 text-xs text-gray-500">
                                    {project.category}
                                    {project.location && ` • ${project.location}`}
                                </div>

                                {/* Assign reviewer - only for superadmin and submitted projects */}
                                {isSuperAdmin && (project.status === "SUBMITTED" || project.status === "PENDING_REVIEW") && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <UserCheckIcon className="h-4 w-4 text-gray-500 shrink-0" />
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0">
                                                Assign Reviewer:
                                            </span>
                                            <Select
                                                defaultValue={project.assignedToId || undefined}
                                                onValueChange={(value) => handleAssign(project.id, value)}
                                                disabled={assigningId === project.id}
                                            >
                                                <SelectTrigger className="h-8 text-xs flex-1">
                                                    <SelectValue placeholder="Select admin..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {adminUsers.map((admin) => (
                                                        <SelectItem key={admin.id} value={admin.id}>
                                                            {admin.name || admin.email}
                                                            {admin.role === "superadmin" ? " (Super Admin)" : " (Admin)"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {project.assignedToId && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-6">
                                                ✓ Assigned to {adminUsers.find(a => a.id === project.assignedToId)?.name || "an admin"}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );
}
