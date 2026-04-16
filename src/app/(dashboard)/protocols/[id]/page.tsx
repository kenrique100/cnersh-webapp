import { authIsRequired } from "@/lib/auth-utils";
import { getProjectById } from "@/app/actions/project";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    HashIcon,
    EyeIcon,
    AlertTriangleIcon,
    ScaleIcon,
    ClipboardListIcon,
} from "lucide-react";
import Link from "next/link";
import ProjectDetailActions from "./project-detail-actions";
import TrackingCodeCopyButton from "./tracking-code-copy-button";

function daysSinceDate(date: Date | string): number {
    return (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

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
        color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
        dot: "bg-gray-300",
    },
};

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await authIsRequired();
    const isAdmin = session.user.role === "admin" || session.user.role === "superadmin";

    const { id } = await params;

    let project;
    try {
        project = await getProjectById(id);
    } catch {
        notFound();
    }

    if (!project) notFound();

    const isOwner = project.userId === session.user.id;

    // Determine which PI-specific actions are available based on status
    const canFileSAE = isOwner && ["APPROVED", "APPROVED_WITH_CONDITIONS", "UNDER_APPEAL", "APPEAL_RESOLVED"].includes(project.status);
    const canStartAAR = isOwner && ["APPROVED", "APPROVED_WITH_CONDITIONS"].includes(project.status) && !project.aarApplication;
    const canFileAppeal = isOwner && project.status === "REJECTED" && !project.appeal;

    // Check 30-day appeal window
    let appealWindowOpen = false;
    if (canFileAppeal) {
        const rejectionEntry = project.statusHistory?.find((h) => h.status === "REJECTED");
        const rejectionDate = rejectionEntry?.createdAt ?? project.updatedAt;
        appealWindowOpen = daysSinceDate(rejectionDate) <= 30;
    }
    const config = statusConfig[project.status] || statusConfig.DRAFT;

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link href="/protocols" className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Protocols
                </Link>

                {/* Tracking Code Banner */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 w-fit">
                    <HashIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide">Tracking Code</span>
                    <code className="text-sm font-mono font-bold text-indigo-800 dark:text-indigo-200 tracking-widest">
                        {project.trackingCode}
                    </code>
                    <TrackingCodeCopyButton trackingCode={project.trackingCode} />
                </div>

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

                {/* Project Actions (for owners and admins) - shown at top for visibility */}
                {(isOwner || isAdmin) && (
                    <div className="mb-6">
                        <ProjectDetailActions
                            projectId={project.id}
                            currentStatus={project.status}
                            isOwner={isOwner}
                            isAdmin={isAdmin}
                            projectTitle={project.title}
                            projectObjectives={project.objectives}
                            projectDescription={project.description}
                        />
                    </div>
                )}

                {/* PI Action Panel: SAE, Appeal, AAR */}
                {isOwner && (canFileSAE || (canFileAppeal && appealWindowOpen) || canStartAAR) && (
                    <div className="mb-6">
                        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    Available Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 flex flex-wrap gap-3">
                                {canFileSAE && (
                                    <Link href={`/protocols/${project.id}/sae`}>
                                        <Button variant="destructive" size="sm">
                                            <AlertTriangleIcon className="h-4 w-4 mr-1.5" />
                                            Report SAE
                                        </Button>
                                    </Link>
                                )}
                                {canFileAppeal && appealWindowOpen && (
                                    <Link href={`/protocols/${project.id}/appeal`}>
                                        <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950">
                                            <ScaleIcon className="h-4 w-4 mr-1.5" />
                                            File Appeal
                                        </Button>
                                    </Link>
                                )}
                                {canStartAAR && (
                                    <Link href={`/protocols/${project.id}/aar`}>
                                        <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950">
                                            <ClipboardListIcon className="h-4 w-4 mr-1.5" />
                                            Start AAR Application
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

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
                                    Protocol Document
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

                    {/* ── Comprehensive Protocol Data (from formData JSON) ── */}
                    {project.formData && (() => {
                        const fd = project.formData as Record<string, unknown>;
                        const piCv = fd.piCv as { url?: string; name?: string } | undefined;
                        const coInvestigators = fd.coInvestigators as Array<{ name: string; institution: string; email: string; role: string; cvUrl?: string; cvName?: string }> | undefined;
                        const fundingDocument = fd.fundingDocument as { url?: string; name?: string } | undefined;
                        const infoSheetEnglish = fd.infoSheetEnglish as { url?: string; name?: string } | undefined;
                        const infoSheetFrench = fd.infoSheetFrench as { url?: string; name?: string } | undefined;
                        const consentFormEnglish = fd.consentFormEnglish as { url?: string; name?: string } | undefined;
                        const consentFormFrench = fd.consentFormFrench as { url?: string; name?: string } | undefined;
                        const dataCollectionTools = fd.dataCollectionTools as { url?: string; name?: string } | undefined;
                        const budgetDocument = fd.budgetDocument as { url?: string; name?: string } | undefined;
                        const authorizationLetter = fd.authorizationLetter as { url?: string; name?: string } | undefined;
                        const paymentReceipt = fd.paymentReceipt as { url?: string; name?: string } | undefined;
                        const investigatorsBrochure = fd.investigatorsBrochure as { url?: string; name?: string } | undefined;
                        const participantInsurance = fd.participantInsurance as { url?: string; name?: string } | undefined;
                        const protocolErrorInsurance = fd.protocolErrorInsurance as { url?: string; name?: string } | undefined;
                        const endOfTrialAgreement = fd.endOfTrialAgreement as { url?: string; name?: string } | undefined;
                        const foreignEthicsApproval = fd.foreignEthicsApproval as { url?: string; name?: string } | undefined;
                        const materialTransferAgreement = fd.materialTransferAgreement as { url?: string; name?: string } | undefined;
                        const dataSharingAgreement = fd.dataSharingAgreement as { url?: string; name?: string } | undefined;
                        const specificObjectives = fd.specificObjectives as string[] | undefined;

                        const s = (key: string): string => {
                            const v = fd[key];
                            return typeof v === "string" ? v : "";
                        };

                        const FileLink = ({ file, label }: { file: { url?: string; name?: string } | undefined; label: string }) => {
                            if (!file?.url) return null;
                            return (
                                <div className="flex items-center gap-2 text-sm">
                                    <FileTextIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-400 shrink-0">{label}:</span>
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline truncate flex items-center gap-1">
                                        {file.name || "View"} <EyeIcon className="h-3 w-3" />
                                    </a>
                                </div>
                            );
                        };

                        return (
                            <>
                                {/* Principal Investigator */}
                                {(s("piFullName") || s("piInstitution")) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                <UserIcon className="h-4 w-4" />
                                                Principal Investigator
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                {s("piFullName") && <div><span className="text-gray-500 dark:text-gray-400">Name:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("piFullName")}</span></div>}
                                                {s("piInstitution") && <div><span className="text-gray-500 dark:text-gray-400">Institution:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("piInstitution")}</span></div>}
                                                {s("piEmail") && <div><span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("piEmail")}</span></div>}
                                                {s("piTelephone") && <div><span className="text-gray-500 dark:text-gray-400">Tel:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("piTelephone")}</span></div>}
                                                {s("piQualification") && <div><span className="text-gray-500 dark:text-gray-400">Qualification:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("piQualification")}</span></div>}
                                                {s("piExperience") && <div><span className="text-gray-500 dark:text-gray-400">Experience:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("piExperience")} years</span></div>}
                                            </div>
                                            <FileLink file={piCv} label="CV" />
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Co-Investigators */}
                                {coInvestigators && coInvestigators.length > 0 && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Co-Investigators</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            {coInvestigators.map((ci, i) => (
                                                <div key={i} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-sm">
                                                    <div className="font-medium text-gray-800 dark:text-gray-200">{ci.name}</div>
                                                    <div className="text-gray-500 dark:text-gray-400">{ci.institution} · {ci.role} · {ci.email}</div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Sponsor / Funding */}
                                {s("sponsorName") && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Sponsor / Funding</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                <div><span className="text-gray-500 dark:text-gray-400">Sponsor:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("sponsorName")}</span></div>
                                                {s("sponsorCountry") && <div><span className="text-gray-500 dark:text-gray-400">Country:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("sponsorCountry")}</span></div>}
                                                {s("fundingSourceType") && <div><span className="text-gray-500 dark:text-gray-400">Type:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("fundingSourceType")}</span></div>}
                                                {s("fundingAmount") && <div><span className="text-gray-500 dark:text-gray-400">Amount:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("fundingAmount")}</span></div>}
                                            </div>
                                            <FileLink file={fundingDocument} label="Funding Document" />
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Study Summary */}
                                {(s("studySummaryEnglish") || s("studySummaryFrench")) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Study Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-4">
                                            {s("studySummaryEnglish") && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">English</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("studySummaryEnglish")}</p>
                                                </div>
                                            )}
                                            {s("studySummaryFrench") && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">French</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("studySummaryFrench")}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Research Background */}
                                {s("researchBackground") && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Research Background & Introduction</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{s("researchBackground")}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Research Question & Hypothesis */}
                                {(s("mainResearchQuestion") || s("researchHypothesis")) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Research Question & Hypothesis</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            {s("mainResearchQuestion") && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Main Research Question</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("mainResearchQuestion")}</p>
                                                </div>
                                            )}
                                            {s("researchHypothesis") && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hypothesis</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("researchHypothesis")}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Research Objectives */}
                                {(s("generalObjective") || (specificObjectives && specificObjectives.some(o => o))) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Research Objectives</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            {s("generalObjective") && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">General Objective</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{s("generalObjective")}</p>
                                                </div>
                                            )}
                                            {specificObjectives && specificObjectives.filter(o => o).length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Specific Objectives</p>
                                                    <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                                        {specificObjectives.filter(o => o).map((o, i) => <li key={i}>{o}</li>)}
                                                    </ol>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Literature Review */}
                                {s("literatureReview") && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Literature Review</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{s("literatureReview")}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Methodology */}
                                {(s("studyLocation") || s("targetPopulation") || s("sampleSize")) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Methodology</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                {s("methodStudyType") && <div><span className="text-gray-500 dark:text-gray-400">Study Type:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("methodStudyType")}</span></div>}
                                                {s("studyLocation") && <div><span className="text-gray-500 dark:text-gray-400">Location:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("studyLocation")}</span></div>}
                                                {s("studyStartDate") && <div><span className="text-gray-500 dark:text-gray-400">Start Date:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("studyStartDate")}</span></div>}
                                                {s("studyEndDate") && <div><span className="text-gray-500 dark:text-gray-400">End Date:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("studyEndDate")}</span></div>}
                                                {s("targetPopulation") && <div><span className="text-gray-500 dark:text-gray-400">Target Population:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("targetPopulation")}</span></div>}
                                                {s("sampleSize") && <div><span className="text-gray-500 dark:text-gray-400">Sample Size:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("sampleSize")}</span></div>}
                                                {s("samplingMethod") && <div><span className="text-gray-500 dark:text-gray-400">Sampling Method:</span> <span className="font-medium text-gray-800 dark:text-gray-200">{s("samplingMethod")}</span></div>}
                                            </div>
                                            {s("inclusionCriteria") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inclusion Criteria</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("inclusionCriteria")}</p></div>
                                            )}
                                            {s("exclusionCriteria") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Exclusion Criteria</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("exclusionCriteria")}</p></div>
                                            )}
                                            {s("dataCollectionMethods") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Collection Methods</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("dataCollectionMethods")}</p></div>
                                            )}
                                            {s("dataAnalysisPlan") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Analysis Plan</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("dataAnalysisPlan")}</p></div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Ethical Considerations */}
                                {(s("participantProtection") || s("potentialRisks") || s("expectedBenefits")) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Ethical Considerations</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            {s("participantProtection") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Participant Protection</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("participantProtection")}</p></div>
                                            )}
                                            {s("confidentialityMeasures") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Confidentiality Measures</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("confidentialityMeasures")}</p></div>
                                            )}
                                            {s("potentialRisks") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Potential Risks</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("potentialRisks")}</p></div>
                                            )}
                                            {s("expectedBenefits") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expected Benefits</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("expectedBenefits")}</p></div>
                                            )}
                                            {s("compensation") && (
                                                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Compensation</p><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{s("compensation")}</p></div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Uploaded Documents */}
                                {(infoSheetEnglish?.url || infoSheetFrench?.url || consentFormEnglish?.url || consentFormFrench?.url ||
                                  dataCollectionTools?.url || budgetDocument?.url || authorizationLetter?.url || paymentReceipt?.url ||
                                  investigatorsBrochure?.url || participantInsurance?.url || protocolErrorInsurance?.url ||
                                  endOfTrialAgreement?.url || foreignEthicsApproval?.url || materialTransferAgreement?.url || dataSharingAgreement?.url) && (
                                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                <FileTextIcon className="h-4 w-4" />
                                                Uploaded Documents
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-2">
                                            <FileLink file={infoSheetEnglish} label="Info Sheet (English)" />
                                            <FileLink file={infoSheetFrench} label="Info Sheet (French)" />
                                            <FileLink file={consentFormEnglish} label="Consent Form (English)" />
                                            <FileLink file={consentFormFrench} label="Consent Form (French)" />
                                            <FileLink file={dataCollectionTools} label="Data Collection Tools" />
                                            <FileLink file={budgetDocument} label="Budget Document" />
                                            <FileLink file={authorizationLetter} label="Authorization Letter" />
                                            <FileLink file={paymentReceipt} label="Payment Receipt" />
                                            <FileLink file={investigatorsBrochure} label="Investigator's Brochure" />
                                            <FileLink file={participantInsurance} label="Participant Insurance" />
                                            <FileLink file={protocolErrorInsurance} label="Protocol Error Insurance" />
                                            <FileLink file={endOfTrialAgreement} label="End-of-Trial Agreement" />
                                            <FileLink file={foreignEthicsApproval} label="Foreign Ethics Approval" />
                                            <FileLink file={materialTransferAgreement} label="Material Transfer Agreement" />
                                            <FileLink file={dataSharingAgreement} label="Data Sharing Agreement" />
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        );
                    })()}

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
