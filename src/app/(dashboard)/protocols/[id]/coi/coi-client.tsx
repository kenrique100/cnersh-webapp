"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitCOIDeclaration } from "@/app/actions/coi";
import { ShieldCheckIcon, ShieldAlertIcon, ArrowLeftIcon, InfoIcon } from "lucide-react";
import Link from "next/link";

interface COIDeclarationClientProps {
    assignmentId: string;
    projectId: string;
    projectTitle: string;
    projectCategory: string;
}

export default function COIDeclarationClient({
    assignmentId,
    projectId,
    projectTitle,
    projectCategory,
}: COIDeclarationClientProps) {
    const router = useRouter();
    const [hasCOI, setHasCOI] = useState<boolean | null>(null);
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (hasCOI === null) {
            toast.error("Please select whether you have a conflict of interest");
            return;
        }
        if (hasCOI && !details.trim()) {
            toast.error("Please describe your conflict of interest");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitCOIDeclaration({
                assignmentId,
                hasCOI,
                details: hasCOI ? details.trim() : undefined,
            });

            if (result.hasCOI) {
                toast.warning("COI declared. You have been excluded from this review. The secretariat has been notified.");
                router.push("/dashboard");
            } else {
                toast.success("No-COI declaration submitted. You now have access to the protocol documents.");
                router.push(`/protocols/${projectId}`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit declaration");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Dashboard
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                        Conflict of Interest Declaration
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        You have been assigned to review a research protocol. Before accessing any documents, you must declare whether you have a conflict of interest.
                    </p>
                </div>

                <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-xl mb-4">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-400">
                            <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Protocol Information</p>
                                <p className="mt-1">
                                    <span className="font-medium">Title:</span> {projectTitle}
                                </p>
                                <p>
                                    <span className="font-medium">Category:</span> {projectCategory}
                                </p>
                                <p className="mt-2 text-xs italic">
                                    No other protocol information is shown at this stage to ensure your declaration is uncontaminated.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardHeader>
                        <CardTitle>Do you have a conflict of interest?</CardTitle>
                        <CardDescription>
                            A conflict of interest exists if you have a financial, personal, academic, or institutional relationship with the PI or study team that could affect your impartiality. This declaration is immutable and cannot be changed after submission.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setHasCOI(false)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                                    hasCOI === false
                                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                <ShieldCheckIcon className={`h-8 w-8 ${hasCOI === false ? "text-green-600" : "text-gray-400"}`} />
                                <div className="text-center">
                                    <p className={`font-semibold text-sm ${hasCOI === false ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                                        No Conflict of Interest
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">I can review this protocol impartially</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setHasCOI(true)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                                    hasCOI === true
                                        ? "border-red-500 bg-red-50 dark:bg-red-950"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                <ShieldAlertIcon className={`h-8 w-8 ${hasCOI === true ? "text-red-600" : "text-gray-400"}`} />
                                <div className="text-center">
                                    <p className={`font-semibold text-sm ${hasCOI === true ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                                        Conflict of Interest
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">I have a conflict and cannot review</p>
                                </div>
                            </button>
                        </div>

                        {hasCOI === true && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Describe the conflict of interest <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Describe the nature of your conflict of interest (e.g., same institution as PI, financial interest, personal relationship with study team member)..."
                                    className="min-h-[100px]"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || hasCOI === null}
                                className={
                                    hasCOI === true
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : hasCOI === false
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : ""
                                }
                            >
                                {isSubmitting
                                    ? "Submitting..."
                                    : hasCOI === true
                                    ? "Declare Conflict of Interest"
                                    : hasCOI === false
                                    ? "Confirm No Conflict of Interest"
                                    : "Submit Declaration"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
