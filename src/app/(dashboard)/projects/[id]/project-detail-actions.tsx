"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, XIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { updateProjectStatus } from "@/app/actions/project";
import { useRouter } from "next/navigation";

interface ProjectDetailActionsProps {
    projectId: string;
    currentStatus: string;
}

export default function ProjectDetailActions({ projectId, currentStatus }: ProjectDetailActionsProps) {
    const router = useRouter();
    const [feedback, setFeedback] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleStatusUpdate = async (status: "APPROVED" | "REJECTED" | "PENDING_REVIEW") => {
        if (status === "REJECTED" && !feedback.trim()) {
            toast.error("Please provide feedback for rejection");
            return;
        }
        setIsSubmitting(true);
        try {
            await updateProjectStatus(projectId, status, feedback || undefined);
            toast.success(`Project ${status.toLowerCase().replace("_", " ")}`);
            setFeedback("");
            router.refresh();
        } catch {
            toast.error("Failed to update project status");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 rounded-xl">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Admin Review Actions
                </CardTitle>
                <p className="text-xs text-gray-500">Current status: {currentStatus.replace(/_/g, " ")}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
                <Textarea
                    placeholder="Provide feedback (required for rejection)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[80px]"
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => handleStatusUpdate("APPROVED")}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Approve
                    </Button>
                    <Button
                        onClick={() => handleStatusUpdate("REJECTED")}
                        disabled={isSubmitting}
                        variant="destructive"
                    >
                        <XIcon className="h-4 w-4 mr-1" />
                        Reject
                    </Button>
                    <Button
                        onClick={() => handleStatusUpdate("PENDING_REVIEW")}
                        disabled={isSubmitting}
                        variant="outline"
                    >
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Request Revision
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
