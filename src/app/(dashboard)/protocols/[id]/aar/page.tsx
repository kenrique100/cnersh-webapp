import { authIsRequired } from "@/lib/auth-utils";
import { getProjectById } from "@/app/actions/project";
import { startAARApplication } from "@/app/actions/aar";
import { notFound, redirect } from "next/navigation";
import AARClient from "./aar-client";

export const dynamic = "force-dynamic";

export default async function AARPage({
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

    const isOwner = project.userId === session.user.id;
    const isAdmin = session.user.role === "admin" || session.user.role === "superadmin";

    if (!isOwner && !isAdmin) {
        redirect(`/protocols/${id}`);
    }

    const allowedStatuses = ["APPROVED", "APPROVED_WITH_CONDITIONS"];
    if (!allowedStatuses.includes(project.status)) {
        redirect(`/protocols/${id}`);
    }

    // Start or get the existing AAR application
    let application;
    try {
        application = await startAARApplication(id);
    } catch {
        redirect(`/protocols/${id}`);
    }

    return (
        <AARClient
            projectId={id}
            projectTitle={project.title}
            application={application}
        />
    );
}
