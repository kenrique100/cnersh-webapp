import { authIsRequired } from "@/lib/auth-utils";
import { getProjectById } from "@/app/actions/project";
import { notFound, redirect } from "next/navigation";
import SAEReportClient from "./sae-client";

export const dynamic = "force-dynamic";

export default async function SAEReportPage({
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

    const allowedStatuses = ["APPROVED", "APPROVED_WITH_CONDITIONS", "UNDER_APPEAL", "APPEAL_RESOLVED"];
    if (!allowedStatuses.includes(project.status)) {
        redirect(`/protocols/${id}`);
    }

    const isOwner = project.userId === session.user.id;
    const isAdmin = session.user.role === "admin" || session.user.role === "superadmin";

    if (!isOwner && !isAdmin) {
        redirect(`/protocols/${id}`);
    }

    return (
        <SAEReportClient
            projectId={id}
            projectTitle={project.title}
        />
    );
}
