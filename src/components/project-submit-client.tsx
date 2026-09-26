"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtocolFormWizard, { clearProtocolDraft } from "@/components/protocol-form-wizard";
import {
    submitProject,
    type SubmitProjectResult,
} from "@/app/actions/project";

export interface ProjectFormPayload {
    title: string;
    description: string;
    objectives?: string;
    category: string;
    location?: string;
    timeline?: string;
    budget?: string;
    document?: string;
    formData?: Record<string, unknown>;
}

interface ProjectSubmitClientProps {
    /** Authenticated user id, sourced from the server session. */
    userId: string;
}

export default function ProjectSubmitClient({ userId }: ProjectSubmitClientProps) {
    const router = useRouter();
    const [idempotencyKey, setIdempotencyKey] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only UUID; runs once on mount, cannot be derived from props/state
        setIdempotencyKey(crypto.randomUUID());
    }, []);

    const handleSubmit = async (payload: ProjectFormPayload) => {
        if (isSubmitting || !idempotencyKey) return;

        setIsSubmitting(true);
        try {
            const result: SubmitProjectResult = await submitProject({
                ...payload,
                idempotencyKey,
            });

            if (result.success) {
                // Submission succeeded — this user's local draft is now stale.
                clearProtocolDraft(userId);
                toast.success(`Protocol submitted. Tracking code: ${result.protocol.trackingCode}`);
                router.push(`/protocols/${result.protocol.id}`);
                return;
            }

            if (result.isDuplicate) {
                toast.error(result.error);
                router.push(`/protocols/${result.existingProtocolId}/edit`);
                return;
            }

            if (result.reason === "in-progress") {
                toast.info(result.error);
                return;
            }

            if (result.reason === "validation" || result.reason === "unauthorized") {
                toast.error(result.error);
                return;
            }

            toast.error(result.error);
        } catch (err) {
            console.error("[submit] unexpected:", err);
            toast.error(err instanceof Error ? err.message : "Failed to submit protocol");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ProtocolFormWizard
            key={userId}
            userId={userId}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={!idempotencyKey || isSubmitting}
        />
    );
}