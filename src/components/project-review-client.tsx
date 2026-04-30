"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
    assignProjectReviewer,
    autoAssignProjectReviewer,
    reassignProjectReviewer,
} from "@/app/actions/project";
import { toast } from "sonner";
import { UserCheckIcon, HashIcon, ZapIcon, RefreshCwIcon } from "lucide-react";

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
    isAvailable?: boolean;
    activeAssignmentCount?: number;
}

interface ProjectData {
    id: string;
    trackingCode: string;
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
    RETURNED_INCOMPLETE: "bg-orange-100 text-orange-800",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
    UNDER_REVIEW: "bg-purple-100 text-purple-800",
    REVIEW_COMPLETE: "bg-indigo-100 text-indigo-800",
    SESSION_SCHEDULED: "bg-cyan-100 text-cyan-800",
    APPROVED: "bg-green-100 text-green-800",
    APPROVED_WITH_CONDITIONS: "bg-teal-100 text-teal-800",
    REJECTED: "bg-red-100 text-red-800",
    UNDER_APPEAL: "bg-rose-100 text-rose-800",
    APPEAL_RESOLVED: "bg-slate-100 text-slate-800",
    ARCHIVED: "bg-gray-100 text-gray-500",
};

const ASSIGNABLE_STATUSES = ["SUBMITTED", "PENDING_REVIEW", "UNDER_REVIEW"];
const HAS_ACTIVE_ASSIGNMENT_STATUSES = ["PENDING_REVIEW", "UNDER_REVIEW"];

export default function ProjectReviewClient({
                                                projects,
                                                isSuperAdmin,
                                                adminUsers = [],
                                            }: ProjectReviewClientProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });

    const handleAssign = async (projectId: string, adminId: string) => {
        try {
            setLoadingId(projectId);
            await assignProjectReviewer(projectId, adminId);
            toast.success("Reviewer assigned successfully");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to assign reviewer");
        } finally {
            setLoadingId(null);
        }
    };

    const handleAutoAssign = async (projectId: string) => {
        try {
            setLoadingId(projectId);
            await autoAssignProjectReviewer(projectId);
            toast.success("Protocol auto-assigned to an available reviewer");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Auto-assign failed");
        } finally {
            setLoadingId(null);
        }
    };

    const handleReassign = async (projectId: string) => {
        try {
            setLoadingId(projectId);
            await reassignProjectReviewer(projectId);
            toast.success("Protocol reassigned to next available reviewer");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Reassignment failed");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <>
            {projects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">No protocols to review</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {projects.map((project) => {
                        const isLoading = loadingId === project.id;
                        const hasActiveAssignment =
                            HAS_ACTIVE_ASSIGNMENT_STATUSES.includes(project.status) && !!project.assignedToId;
                        const canAssign =
                            isSuperAdmin && ASSIGNABLE_STATUSES.includes(project.status);
                        const assignedAdmin = adminUsers.find((a) => a.id === project.assignedToId);

                        return (
                            <Card
                                key={project.id}
                                className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md transition-shadow"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div
                                            className="cursor-pointer flex-1"
                                            onClick={() => router.push(`/protocols/${project.id}`)}
                                        >
                                            <CardTitle className="text-base">{project.title}</CardTitle>
                                            <p className="text-xs text-gray-500 mt-1">
                                                by {project.user.name} • {formatDate(project.createdAt)}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <HashIcon className="h-3 w-3 text-indigo-400 shrink-0" />
                                                <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                                                    {project.trackingCode}
                                                </code>
                                            </div>
                                        </div>
                                        <Badge className={statusColors[project.status] || ""}>
                                            {project.status.replace(/_/g, " ")}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <p
                                        className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 cursor-pointer"
                                        onClick={() => router.push(`/protocols/${project.id}`)}
                                    >
                                        {project.description}
                                    </p>
                                    <div className="mt-2 text-xs text-gray-500">
                                        {project.category}
                                        {project.location && ` • ${project.location}`}
                                    </div>

                                    {canAssign && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                                            {/* Currently assigned info */}
                                            {assignedAdmin && (
                                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                                    <UserCheckIcon className="h-3 w-3" />
                                                    Assigned to{" "}
                                                    <span className="font-medium">
                                                        {assignedAdmin.name || assignedAdmin.email}
                                                    </span>
                                                </p>
                                            )}

                                            {/* Manual assign dropdown */}
                                            <div className="flex items-center gap-2">
                                                <UserCheckIcon className="h-4 w-4 text-gray-500 shrink-0" />
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0">
                                                    Manual Assign:
                                                </span>
                                                <Select
                                                    defaultValue={project.assignedToId || undefined}
                                                    onValueChange={(value) => handleAssign(project.id, value)}
                                                    disabled={isLoading}
                                                >
                                                    <SelectTrigger className="h-8 text-xs flex-1">
                                                        <SelectValue placeholder="Select admin..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {adminUsers.map((admin) => (
                                                            <SelectItem key={admin.id} value={admin.id}>
                                                                <span className="flex items-center gap-2">
                                                                    {admin.name || admin.email}
                                                                    {admin.role === "superadmin" ? " (Super)" : ""}
                                                                    {admin.isAvailable !== undefined && (
                                                                        <span
                                                                            className={`text-[10px] font-semibold px-1 rounded ${
                                                                                admin.isAvailable
                                                                                    ? "text-green-600 bg-green-100"
                                                                                    : "text-amber-600 bg-amber-100"
                                                                            }`}
                                                                        >
                                                                            {admin.isAvailable ? "Available" : "Busy"}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Auto-Assign / Reassign smart buttons */}
                                            <div className="flex gap-2">
                                                {!hasActiveAssignment && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-8 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                                        onClick={() => handleAutoAssign(project.id)}
                                                        disabled={isLoading}
                                                    >
                                                        <ZapIcon className="h-3 w-3 mr-1" />
                                                        Auto-Assign
                                                    </Button>
                                                )}
                                                {hasActiveAssignment && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                                                        onClick={() => handleReassign(project.id)}
                                                        disabled={isLoading}
                                                    >
                                                        <RefreshCwIcon className="h-3 w-3 mr-1" />
                                                        {isLoading ? "Reassigning..." : "Reassign"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </>
    );
}