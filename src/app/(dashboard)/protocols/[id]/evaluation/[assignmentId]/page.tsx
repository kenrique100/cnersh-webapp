import Link from "next/link";
import { ArrowLeftIcon, ClipboardCheckIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getMyEvaluationReport } from "@/app/actions/evaluation";
import { getProjectById } from "@/app/actions/project";
import EvaluationForm from "@/components/evaluation-form";
import { authIsRequired } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function EvaluationPage({
    params,
}: {
    params: Promise<{ id: string; assignmentId: string }>;
}) {
    const session = await authIsRequired();
    const { id, assignmentId } = await params;

    let project;
    try {
        project = await getProjectById(id);
    } catch {
        notFound();
    }
    if (!project) notFound();

    const assignment = project.reviewAssignments.find(
        (item) =>
            item.id === assignmentId &&
            item.reviewerId === session.user.id &&
            item.status === "ACTIVE"
    );
    if (!assignment) notFound();

    const report = await getMyEvaluationReport(assignmentId);

    return (
        <main className="min-h-[calc(100vh-4rem)] w-full bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <Link
                    href={`/protocols/${id}`}
                    className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
                >
                    <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                    Back to protocol
                </Link>
                <header className="mb-8 flex items-start gap-3">
                    <ClipboardCheckIcon className="mt-1 h-7 w-7 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-950 dark:text-white">
                            Reviewer evaluation
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Score each ethics criterion, record your reasoning, and submit a final recommendation.
                        </p>
                    </div>
                </header>
                <EvaluationForm
                    assignmentId={assignment.id}
                    protocolId={project.id}
                    protocolTitle={project.title}
                    dueDate={assignment.dueDate}
                    initialReport={report}
                />
            </div>
        </main>
    );
}
