import { authIsRequired } from "@/lib/auth-utils";
import { getProjectById } from "@/app/actions/project";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FolderIcon,
    CalendarIcon,
    MapPinIcon,
    TagIcon,
    ClockIcon,
    DollarSignIcon,
    FileTextIcon,
    UserIcon,
    ArrowLeftIcon,
    DownloadIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    PENDING_REVIEW: {
        label: "Pending Review",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        dot: "bg-amber-500",
    },
    APPROVED: {
        label: "Approved",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        dot: "bg-emerald-500",
    },
    REJECTED: {
        label: "Rejected",
        color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        dot: "bg-red-500",
    },
};

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await authIsRequired();

    const { id } = await params;

    let project;
    try {
        project = await getProjectById(id);
    } catch {
        notFound();
    }

    if (!project) notFound();

    const config = statusConfig[project.status] || statusConfig.DRAFT;

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Projects
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-600 text-white shrink-0 mt-0.5">
                            <FolderIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {project.title}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Submitted by {project.user.name || project.user.email} on{" "}
                                {new Date(project.createdAt).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>
                    <Badge className={`${config.color} shrink-0 text-sm px-3 py-1`}>
                        <span className={`inline-block h-2 w-2 rounded-full ${config.dot} mr-2`} />
                        {config.label}
                    </Badge>
                </div>

                {/* Project Details */}
                <div className="space-y-6">
                    {/* Description */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {project.description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Objectives */}
                    {project.objectives && (
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    Objectives
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {project.objectives}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardContent className="py-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900 shrink-0">
                                    <TagIcon className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.category}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {project.location && (
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                <CardContent className="py-4 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
                                        <MapPinIcon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.location}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {project.timeline && (
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                <CardContent className="py-4 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900 shrink-0">
                                        <ClockIcon className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Timeline</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.timeline}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {project.budget && (
                            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                <CardContent className="py-4 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 shrink-0">
                                        <DollarSignIcon className="h-4 w-4 text-green-600 dark:text-green-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.budget}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardContent className="py-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                                    <CalendarIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {new Date(project.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardContent className="py-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900 shrink-0">
                                    <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Submitted by</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.user.name || project.user.email}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Document */}
                    {project.document && (
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <FileTextIcon className="h-4 w-4" />
                                    Project Document
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex gap-2">
                                    <a
                                        href={project.document}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-sm font-medium"
                                    >
                                        <FileTextIcon className="h-4 w-4" />
                                        View Document
                                    </a>
                                    <a
                                        href={project.document}
                                        download
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                                    >
                                        <DownloadIcon className="h-4 w-4" />
                                        Download
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Feedback */}
                    {project.feedback && (
                        <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-amber-900 dark:text-amber-200">
                                    Reviewer Feedback
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                                    {project.feedback}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status History */}
                    {project.statusHistory.length > 0 && (
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    Status History
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    {project.statusHistory.map((entry, index) => {
                                        const entryConfig = statusConfig[entry.status] || statusConfig.DRAFT;
                                        return (
                                            <div key={entry.id} className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className={`h-3 w-3 rounded-full ${entryConfig.dot} shrink-0 mt-1`} />
                                                    {index < project.statusHistory.length - 1 && (
                                                        <div className="w-px h-full bg-gray-200 dark:bg-gray-700 mt-1" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`${entryConfig.color} text-xs`}>
                                                            {entryConfig.label}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(entry.createdAt).toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                    {entry.comment && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                            {entry.comment}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
