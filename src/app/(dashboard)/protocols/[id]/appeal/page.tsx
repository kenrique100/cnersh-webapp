import { authIsRequired } from "@/lib/auth-utils";
import { getProjectById } from "@/app/actions/project";
import { notFound, redirect } from "next/navigation";
import AppealClient from "./appeal-client";

export const dynamic = "force-dynamic";

function daysSinceDate(date: Date | string): number {
    return (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

export default async function AppealPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await authIsRequired();
    const { id } = await params;

    let project;
    try {
        project = await getProjectById(id);
    } catch {
        notFound();
    }

    if (!project) notFound();

    // Only rejected protocols can have appeals filed by their owner
    if (project.status !== "REJECTED") {
        redirect(`/protocols/${id}`);
    }

    const isOwner = project.userId === session.user.id;
    if (!isOwner) {
        redirect(`/protocols/${id}`);
    }

    // Check if an appeal already exists
    if (project.appeal && project.appeal.status !== undefined) {
        redirect(`/protocols/${id}`);
    }

    // Check the 30-day window
    const rejectionEntry = project.statusHistory?.find((h) => h.status === "REJECTED");
    const rejectionDate = rejectionEntry?.createdAt ?? project.updatedAt;
    const elapsed = daysSinceDate(rejectionDate);

    if (elapsed > 30) {
        redirect(`/protocols/${id}`);
    }

    return (
        <AppealClient
            projectId={id}
            projectTitle={project.title}
            daysRemaining={Math.max(0, Math.floor(30 - elapsed))}
        />
    );
}
