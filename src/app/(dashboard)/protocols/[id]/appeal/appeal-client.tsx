"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fileAppeal } from "@/app/actions/appeal";
import { ScaleIcon, ArrowLeftIcon, ClockIcon } from "lucide-react";
import Link from "next/link";

interface AppealClientProps {
    projectId: string;
    projectTitle: string;
    daysRemaining: number;
}

export default function AppealClient({ projectId, projectTitle, daysRemaining }: AppealClientProps) {
    const router = useRouter();
    const [grounds, setGrounds] = useState("");
    const [evidence, setEvidence] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!grounds.trim()) {
            toast.error("Please provide the grounds for your appeal");
            return;
        }
        if (grounds.trim().length < 50) {
            toast.error("Appeal grounds must be at least 50 characters");
            return;
        }

        setIsSubmitting(true);
        try {
            await fileAppeal({
                projectId,
                grounds: grounds.trim(),
                evidence: evidence.trim() || undefined,
            });

            toast.success("Appeal filed successfully. The committee president will review within 45 days.");
            router.push(`/protocols/${projectId}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to file appeal");
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
                        <ScaleIcon className="h-6 w-6 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            File an Appeal
                        </h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Protocol: <span className="font-medium">{projectTitle}</span>
                    </p>
                </div>

                <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-xl mb-4">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                            <ClockIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Appeal Window</p>
                                <p>
                                    You have <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> remaining to file this appeal. Only one appeal is permitted per rejected decision. The Committee President has 45 days to respond.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardHeader>
                        <CardTitle>Appeal Details</CardTitle>
                        <CardDescription>
                            Provide the grounds for your appeal and any supporting evidence. Appeals are reviewed by the CNERSH Committee President.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Grounds for Appeal <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={grounds}
                                    onChange={(e) => setGrounds(e.target.value)}
                                    placeholder="State the specific reasons why you believe the rejection decision should be overturned. Reference the rejection feedback and explain why you disagree..."
                                    className="min-h-[160px]"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Minimum 50 characters. Current: {grounds.length}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Supporting Evidence
                                </label>
                                <Textarea
                                    value={evidence}
                                    onChange={(e) => setEvidence(e.target.value)}
                                    placeholder="Provide any additional evidence, references, or clarifications that support your appeal (optional)..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || grounds.trim().length < 50}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <ScaleIcon className="h-4 w-4 mr-1.5" />
                                    {isSubmitting ? "Submitting..." : "File Appeal"}
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
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
