"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trackProjectByCode } from "@/app/actions/project";
import {
    SearchIcon,
    FolderIcon,
    TagIcon,
    MapPinIcon,
    CalendarIcon,
    Loader2,
    CheckCircle2Icon,
    XCircleIcon,
    ClockIcon,
    FileEditIcon,
    CopyIcon,
    CheckIcon,
} from "lucide-react";

type ProjectStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "RETURNED_INCOMPLETE"
    | "PENDING_REVIEW"
    | "UNDER_REVIEW"
    | "REVIEW_COMPLETE"
    | "SESSION_SCHEDULED"
    | "APPROVED"
    | "APPROVED_WITH_CONDITIONS"
    | "REJECTED"
    | "UNDER_APPEAL"
    | "APPEAL_RESOLVED"
    | "ARCHIVED";

interface TrackedProject {
    id: string;
    trackingCode: string;
    title: string;
    category: string;
    location: string | null;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
    statusHistory: {
        status: ProjectStatus;
        comment: string | null;
        createdAt: Date;
    }[];
}

const statusConfig: Record<ProjectStatus, { label: string; color: string; dot: string; icon: React.ElementType }> = {
    DRAFT: {
        label: "Draft",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        dot: "bg-gray-400",
        icon: FileEditIcon,
    },
    SUBMITTED: {
        label: "Submitted",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        dot: "bg-blue-500",
        icon: ClockIcon,
    },
    PENDING_REVIEW: {
        label: "Pending Review",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
        dot: "bg-amber-500",
        icon: ClockIcon,
    },
    UNDER_REVIEW: {
        label: "Under Review",
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
        dot: "bg-purple-500",
        icon: ClockIcon,
    },
    REVIEW_COMPLETE: {
        label: "Review Complete",
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
        dot: "bg-indigo-500",
        icon: CheckCircle2Icon,
    },
    SESSION_SCHEDULED: {
        label: "Session Scheduled",
        color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
        dot: "bg-cyan-500",
        icon: CalendarIcon,
    },
    APPROVED: {
        label: "Approved",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
        dot: "bg-emerald-500",
        icon: CheckCircle2Icon,
    },
    APPROVED_WITH_CONDITIONS: {
        label: "Approved with Conditions",
        color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
        dot: "bg-teal-500",
        icon: CheckCircle2Icon,
    },
    REJECTED: {
        label: "Rejected",
        color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        dot: "bg-red-500",
        icon: XCircleIcon,
    },
    RETURNED_INCOMPLETE: {
        label: "Returned Incomplete",
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        dot: "bg-orange-500",
        icon: XCircleIcon,
    },
    UNDER_APPEAL: {
        label: "Under Appeal",
        color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
        dot: "bg-rose-500",
        icon: ClockIcon,
    },
    APPEAL_RESOLVED: {
        label: "Appeal Resolved",
        color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        dot: "bg-slate-500",
        icon: CheckCircle2Icon,
    },
    ARCHIVED: {
        label: "Archived",
        color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        dot: "bg-gray-300",
        icon: ClockIcon,
    },
};
const unknownStatusConfig = {
    label: "Unknown Status",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dot: "bg-gray-400",
    icon: ClockIcon,
};

export default function ProjectTracker() {
    const [code, setCode] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<TrackedProject | null>(null);
    const [searched, setSearched] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) return;

        setIsLoading(true);
        setError(null);
        setResult(null);
        setSearched(true);

        try {
            const project = await trackProjectByCode(trimmed);
            if (project) {
                setResult(project as TrackedProject);
            } else {
                setError("No protocol found with that tracking code. Please double-check and try again.");
            }
        } catch {
            setError("An error occurred while looking up the protocol. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCode = async () => {
        const textToCopy = result?.trackingCode || code.trim().toUpperCase();
        if (!textToCopy) return;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    const config = result ? (statusConfig[result.status] ?? unknownStatusConfig) : null;

    return (
        <div className="space-y-4">
            <form onSubmit={handleTrack} className="flex gap-2">
                <Input
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        if (searched) {
                            setSearched(false);
                            setResult(null);
                            setError(null);
                        }
                    }}
                    placeholder="e.g. CNERSH-2026-A3F7B29C"
                    className="flex-1 font-mono text-sm tracking-wider uppercase"
                    maxLength={20}
                    spellCheck={false}
                    autoComplete="off"
                />
                <Button
                    type="submit"
                    disabled={isLoading || !code.trim()}
                    className="bg-blue-700 hover:bg-blue-800 text-white shrink-0"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <SearchIcon className="h-4 w-4" />
                    )}
                    <span className="ml-1.5 hidden sm:inline">Track</span>
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyCode}
                    disabled={!result?.trackingCode && !code.trim()}
                    className="shrink-0"
                    title="Copy tracking code"
                >
                    {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                </Button>
            </form>

            {/* Error state */}
            {error && !isLoading && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-start gap-2">
                    <XCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Result */}
            {result && config && !isLoading && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                    {/* Status Banner */}
                    <div className={`px-4 py-2.5 flex items-center gap-2 ${config.color}`}>
                        <div className={`h-2 w-2 rounded-full ${config.dot}`} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{config.label}</span>
                        <Badge className={`ml-auto text-[10px] ${config.color} border-0`}>
                            {result.status}
                        </Badge>
                    </div>

                    {/* Project details */}
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-3 py-2">
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">Tracking Code</p>
                            <code className="text-xs font-mono font-semibold tracking-wide text-indigo-900 dark:text-indigo-100">
                                {result.trackingCode}
                            </code>
                        </div>

                        <div className="flex items-start gap-2">
                            <FolderIcon className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Protocol Title</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.title}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-start gap-2">
                                <TagIcon className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Category</p>
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{result.category}</p>
                                </div>
                            </div>
                            {result.location && (
                                <div className="flex items-start gap-2">
                                    <MapPinIcon className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Location</p>
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{result.location}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <CalendarIcon className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Submitted</p>
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {new Date(result.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <CalendarIcon className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Last Updated</p>
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {new Date(result.updatedAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Latest status comment */}
                        {result.statusHistory.length > 0 && result.statusHistory[0].comment && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Latest Update</p>
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                    {result.statusHistory[0].comment}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
