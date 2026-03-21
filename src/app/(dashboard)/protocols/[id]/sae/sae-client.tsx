"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { reportSAE } from "@/app/actions/sae";
import { AlertTriangleIcon, ArrowLeftIcon, ClockIcon } from "lucide-react";
import Link from "next/link";

const SAE_EVENT_TYPES = [
    { value: "ADVERSE_EVENT", label: "Adverse Event" },
    { value: "SERIOUS_ADVERSE_EVENT", label: "Serious Adverse Event (SAE)" },
    { value: "UNEXPECTED_ADVERSE_EVENT", label: "Unexpected Adverse Event" },
    { value: "LIFE_THREATENING", label: "Life-Threatening Event" },
    { value: "FATAL", label: "Fatal Event" },
];

interface SAEReportClientProps {
    projectId: string;
    projectTitle: string;
}

export default function SAEReportClient({ projectId, projectTitle }: SAEReportClientProps) {
    const router = useRouter();
    const [eventType, setEventType] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [description, setDescription] = useState("");
    const [immediateActions, setImmediateActions] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isUrgent = eventType === "LIFE_THREATENING" || eventType === "FATAL";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!eventType) {
            toast.error("Please select an event type");
            return;
        }
        if (!eventDate) {
            toast.error("Please enter the event date");
            return;
        }
        if (!description.trim()) {
            toast.error("Please describe the event");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await reportSAE({
                projectId,
                eventType: eventType as Parameters<typeof reportSAE>[0]["eventType"],
                eventDate,
                description: description.trim(),
                immediateActions: immediateActions.trim() || undefined,
            });

            if (result.isLate) {
                toast.warning(
                    "SAE report submitted, but this report is outside the 24-hour reporting window. This late submission has been logged as a compliance event.",
                    { duration: 6000 }
                );
            } else {
                toast.success("SAE report submitted successfully. Relevant authorities have been notified.");
            }

            router.push(`/protocols/${projectId}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit SAE report");
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
                        <AlertTriangleIcon className="h-6 w-6 text-red-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Report Serious Adverse Event
                        </h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Protocol: <span className="font-medium">{projectTitle}</span>
                    </p>
                </div>

                <Card className="border border-red-200 dark:border-red-800 bg-white dark:bg-gray-950 rounded-xl mb-4">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                            <ClockIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Reporting Obligation</p>
                                <p>SAEs must be reported within <strong>24 hours</strong> of the event. Late submissions are still accepted but are logged as compliance events.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {isUrgent && (
                    <Card className="border border-red-500 bg-red-50 dark:bg-red-950 rounded-xl mb-4">
                        <CardContent className="pt-4">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                                ⚠️ This event type triggers an emergency notification to the Committee President in addition to the Secretariat and DROS Officer.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                        <CardDescription>
                            Provide accurate information about the adverse event. This report will be sent simultaneously to CNERSH Secretariat and the DROS Officer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Event Type <span className="text-red-500">*</span>
                                </label>
                                <Select value={eventType} onValueChange={setEventType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select event type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SAE_EVENT_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Date of Event <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    max={new Date().toISOString().slice(0, 16)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description of Event <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the adverse event in detail, including the sequence of events, clinical manifestations, and any relevant context..."
                                    className="min-h-[120px]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Immediate Actions Taken
                                </label>
                                <Textarea
                                    value={immediateActions}
                                    onChange={(e) => setImmediateActions(e.target.value)}
                                    placeholder="Describe any immediate actions taken to address the event (optional)..."
                                    className="min-h-[80px]"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <AlertTriangleIcon className="h-4 w-4 mr-1.5" />
                                    {isSubmitting ? "Submitting..." : "Submit SAE Report"}
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
