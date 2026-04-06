import { authIsRequired } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import COIDeclarationClient from "./coi-client";

export const dynamic = "force-dynamic";

export default async function COIDeclarationPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ assignmentId?: string }>;
}) {
    const session = await authIsRequired();
    const { id } = await params;
    const { assignmentId } = await searchParams;

    if (!assignmentId) {
        redirect(`/protocols/${id}`);
    }

    const assignment = await db.reviewAssignment.findUnique({
        where: { id: assignmentId },
        include: {
            project: { select: { id: true, title: true, category: true } },
            coiDeclaration: true,
        },
    });

    if (!assignment) notFound();

    // Verify the current user is the assigned reviewer
    if (assignment.reviewerId !== session.user.id) {
        redirect(`/protocols/${id}`);
    }

    // If COI already declared, redirect to protocol detail
    if (assignment.coiDeclaration) {
        redirect(`/protocols/${id}`);
    }

    return (
        <COIDeclarationClient
            assignmentId={assignmentId}
            projectId={id}
            projectTitle={assignment.project.title}
            projectCategory={assignment.project.category}
        />
    );
}
