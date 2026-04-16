import { authIsRequired } from "@/lib/auth-utils";
import { getUserProjects } from "@/app/actions/project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderIcon, CalendarIcon, MapPinIcon, TagIcon, HashIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProtocolCardActions from "./protocol-card-actions";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    DRAFT: {
        label: "Draft",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        dot: "bg-gray-400",
    },
    SUBMITTED: {
        label: "Submitted",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        dot: "bg-blue-500",
    },
    RETURNED_INCOMPLETE: {
        label: "Returned — Incomplete",
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        dot: "bg-orange-500",
    },
    PENDING_REVIEW: {
        label: "Pending Review",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        dot: "bg-amber-500",
    },
    UNDER_REVIEW: {
        label: "Under Review",
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
        dot: "bg-purple-500",
    },
    REVIEW_COMPLETE: {
        label: "Review Complete",
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
        dot: "bg-indigo-500",
    },
    SESSION_SCHEDULED: {
        label: "Session Scheduled",
        color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
        dot: "bg-cyan-500",
    },
    APPROVED: {
        label: "Approved",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        dot: "bg-emerald-500",
    },
    APPROVED_WITH_CONDITIONS: {
        label: "Approved with Conditions",
        color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
        dot: "bg-teal-500",
    },
    REJECTED: {
        label: "Rejected",
        color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        dot: "bg-red-500",
    },
    UNDER_APPEAL: {
        label: "Under Appeal",
        color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
        dot: "bg-rose-500",
    },
    APPEAL_RESOLVED: {
        label: "Appeal Resolved",
        color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        dot: "bg-slate-500",
    },
    ARCHIVED: {
        label: "Archived",
        color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300",
        dot: "bg-gray-300",
    },
};

export default async function ProjectsPage() {
    await authIsRequired();

    const projects = await getUserProjects();

    // Group projects by status
    const groupedProjects: Record<string, typeof projects> = {};
    for (const project of projects) {
        const status = project.status;
        if (!groupedProjects[status]) groupedProjects[status] = [];
        groupedProjects[status].push(project);
    }

    const statusOrder = [
        "PENDING_REVIEW",
        "UNDER_REVIEW",
        "REVIEW_COMPLETE",
        "SESSION_SCHEDULED",
        "SUBMITTED",
        "RETURNED_INCOMPLETE",
        "APPROVED",
        "APPROVED_WITH_CONDITIONS",
        "DRAFT",
        "REJECTED",
        "UNDER_APPEAL",
        "APPEAL_RESOLVED",
        "ARCHIVED",
    ];
    const orderedStatuses = [
        ...statusOrder,
        ...Object.keys(groupedProjects).filter((status) => !statusOrder.includes(status)),
    ];

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-600 text-white shrink-0">
                            <FolderIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                                My Protocols
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Track your submitted protocols and their status
                            </p>
                        </div>
                    </div>
                    <Link href="/protocols/submit" className="self-start sm:self-auto">
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                            Submit New Protocol
                        </Button>
                    </Link>
                </div>

                {/* Status Summary */}
                {projects.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-8">
                        {orderedStatuses.map((status) => {
                            const config = statusConfig[status] ?? {
                                label: status,
                                color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                                dot: "bg-gray-400",
                            };
                            const count = groupedProjects[status]?.length || 0;
                            return (
                                <div
                                    key={status}
                                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-sm"
                                >
                                    <div className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{config.label}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {projects.length === 0 ? (
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardContent className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <FolderIcon className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    No protocols yet
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    Submit your first protocol for ethical review
                                </p>
                                <Link href="/protocols/submit">
                                    <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                                        Submit Protocol
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {orderedStatuses
                            .filter((status) => groupedProjects[status]?.length > 0)
                            .map((status) => {
                                const config = statusConfig[status] ?? {
                                    label: status,
                                    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                                    dot: "bg-gray-400",
                                };
                                const statusProjects = groupedProjects[status];
                                return (
                                    <div key={status}>
                                        {/* Section Header */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className={`h-3 w-3 rounded-full ${config.dot}`} />
                                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {config.label}
                                            </h2>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                ({statusProjects.length})
                                            </span>
                                        </div>

                                        {/* Projects Grid */}
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {statusProjects.map((project) => {
                                                const cardConfig = statusConfig[project.status] ?? config;
                                                return (
                                                <Card
                                                    key={project.id}
                                                    className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden"
                                                >
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                                                                {project.title}
                                                            </CardTitle>
                                                            <Badge className={`${cardConfig.color} shrink-0 text-xs`}>
                                                                {cardConfig.label}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <HashIcon className="h-3 w-3 text-indigo-400 shrink-0" />
                                                            <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                                                                {project.trackingCode}
                                                            </code>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pt-0">
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                                            {project.description}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <TagIcon className="h-3 w-3" />
                                                                {project.category}
                                                            </span>
                                                            {project.location && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPinIcon className="h-3 w-3" />
                                                                    {project.location}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <CalendarIcon className="h-3 w-3" />
                                                                {new Date(project.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {project.feedback && (
                                                            <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                                                                <strong>Feedback:</strong> {project.feedback}
                                                            </div>
                                                        )}

                                                        <ProtocolCardActions
                                                            projectId={project.id}
                                                            initialTitle={project.title}
                                                            initialDescription={project.description}
                                                        />
                                                    </CardContent>
                                                </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>
        </div>
    );
}
