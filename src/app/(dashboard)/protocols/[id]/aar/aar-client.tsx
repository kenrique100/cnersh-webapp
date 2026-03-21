"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { submitAARApplication } from "@/app/actions/aar";
import { ClipboardListIcon, ArrowLeftIcon, InfoIcon, CheckCircleIcon } from "lucide-react";
import Link from "next/link";

interface AARApplication {
    id: string;
    status: string;
    submittedAt?: Date | null;
    aarRefNumber?: string | null;
    notes?: string | null;
}

interface AARClientProps {
    projectId: string;
    projectTitle: string;
    application: AARApplication;
}

const AAR_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
    SUBMITTED: { label: "Submitted to MINSANTE", color: "bg-blue-100 text-blue-700" },
    RECEIVED_BY_DROS: { label: "Received by DROS", color: "bg-amber-100 text-amber-700" },
    CLARIFICATION_REQUESTED: { label: "Clarification Requested", color: "bg-orange-100 text-orange-700" },
    AUTHORIZED: { label: "Authorized", color: "bg-emerald-100 text-emerald-700" },
    INADMISSIBLE: { label: "Inadmissible", color: "bg-red-100 text-red-700" },
};

export default function AARClient({ projectId, projectTitle, application }: AARClientProps) {
    const router = useRouter();
    const [notes, setNotes] = useState(application.notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isDraft = application.status === "DRAFT";
    const statusInfo = AAR_STATUS_LABELS[application.status] || AAR_STATUS_LABELS.DRAFT;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await submitAARApplication(projectId, notes || undefined);
            toast.success(
                "AAR application submitted. Please also send by email to minsantedros@yahoo.com and submit physical hard copies to MINSANTE.",
                { duration: 8000 }
            );
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit AAR application");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
                <Link
                    href={`/protocols/${projectId}`}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Protocol
                </Link>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <ClipboardListIcon className="h-6 w-6 text-emerald-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            AAR Application
                        </h1>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Protocol: <span className="font-medium">{projectTitle}</span>
                    </p>
                    {application.aarRefNumber && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            AAR Reference: <span className="font-mono font-bold">{application.aarRefNumber}</span>
                        </p>
                    )}
                </div>

                <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-xl mb-4">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-400">
                            <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="font-semibold">AAR Application Process</p>
                                <p>After submitting this portal application, you must:</p>
                                <ol className="list-decimal list-inside space-y-0.5 ml-2 text-xs">
                                    <li>Email your AAR documents to <strong>minsantedros@yahoo.com</strong></li>
                                    <li>Submit physical hard copies to MINSANTE in person</li>
                                </ol>
                                <p className="text-xs mt-1">
                                    ⚠️ The 21 working-day DROS review clock starts when the DROS Officer confirms receipt — not when you submit this application.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {!isDraft && (
                    <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 rounded-xl mb-4">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                                <CheckCircleIcon className="h-4 w-4 shrink-0" />
                                <p>
                                    Application submitted on{" "}
                                    <strong>
                                        {application.submittedAt
                                            ? new Date(application.submittedAt).toLocaleDateString()
                                            : "—"}
                                    </strong>. Current status: <strong>{statusInfo.label}</strong>.
                                    Remember to also submit documents physically at MINSANTE and by email.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isDraft && (
                    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                        <CardHeader>
                            <CardTitle>Application Notes</CardTitle>
                            <CardDescription>
                                Add any notes relevant to your AAR application. Ensure all required documents have been assembled before submitting.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Notes (optional)
                                </label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any relevant notes about your AAR document set or submission status..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <ClipboardListIcon className="h-4 w-4 mr-1.5" />
                                    {isSubmitting ? "Submitting..." : "Submit AAR Application"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
