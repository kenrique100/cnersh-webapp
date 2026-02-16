"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckIcon, XIcon, ClockIcon, FileTextIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { updateProjectStatus } from "@/app/actions/project";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProjectUser {
    id: string;
    name: string;
    email: string;
    image: string | null;
}

interface ProjectData {
    id: string;
    title: string;
    description: string;
    objectives: string | null;
    category: string;
    location: string | null;
    timeline: string | null;
    budget: string | null;
    document: string | null;
    status: string;
    feedback: string | null;
    createdAt: Date;
    user: ProjectUser;
}

interface ProjectReviewClientProps {
    projects: ProjectData[];
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
};

export default function ProjectReviewClient({ projects }: ProjectReviewClientProps) {
    const router = useRouter();
    const [selectedProject, setSelectedProject] = React.useState<ProjectData | null>(null);
    const [feedback, setFeedback] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleStatusUpdate = async (
        status: "APPROVED" | "REJECTED" | "PENDING_REVIEW"
    ) => {
        if (!selectedProject) return;
        if (status === "REJECTED" && !feedback.trim()) {
            toast.error("Please provide feedback for rejection");
            return;
        }
        setIsSubmitting(true);
        try {
            await updateProjectStatus(selectedProject.id, status, feedback || undefined);
            toast.success(`Project ${status.toLowerCase().replace("_", " ")}`);
            setSelectedProject(null);
            setFeedback("");
            router.refresh();
        } catch {
            toast.error("Failed to update project status");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    return (
        <>
            <Dialog
                open={!!selectedProject}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedProject(null);
                        setFeedback("");
                    }
                }}
            >
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {selectedProject && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <DialogTitle>{selectedProject.title}</DialogTitle>
                                    <Link
                                        href={`/projects/${selectedProject.id}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 text-xs font-medium transition-colors"
                                    >
                                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                                        View Full Project
                                    </Link>
                                </div>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={selectedProject.user.image || undefined} />
                                        <AvatarFallback className="bg-blue-700 text-white text-xs">
                                            {selectedProject.user.name?.charAt(0)?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{selectedProject.user.name}</p>
                                        <p className="text-xs text-gray-500">{selectedProject.user.email}</p>
                                    </div>
                                    <Badge className={`ml-auto ${statusColors[selectedProject.status] || ""}`}>
                                        {selectedProject.status.replace("_", " ")}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div>
                                        <strong>Description:</strong>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedProject.description}</p>
                                    </div>
                                    {selectedProject.objectives && (
                                        <div>
                                            <strong>Objectives:</strong>
                                            <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedProject.objectives}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><strong>Category:</strong> {selectedProject.category}</div>
                                        {selectedProject.location && <div><strong>Location:</strong> {selectedProject.location}</div>}
                                        {selectedProject.timeline && <div><strong>Timeline:</strong> {selectedProject.timeline}</div>}
                                        {selectedProject.budget && <div><strong>Budget:</strong> {selectedProject.budget}</div>}
                                    </div>
                                    {selectedProject.document && (
                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileTextIcon className="h-4 w-4 text-blue-600" />
                                                <strong className="text-sm text-blue-800 dark:text-blue-200">Project Document</strong>
                                            </div>
                                            <div className="flex gap-2">
                                                <a
                                                    href={selectedProject.document}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                                                >
                                                    <FileTextIcon className="h-3.5 w-3.5" />
                                                    View Document
                                                </a>
                                                <a
                                                    href={selectedProject.document}
                                                    download
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-medium transition-colors"
                                                >
                                                    <DownloadIcon className="h-3.5 w-3.5" />
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <label className="text-sm font-medium">Feedback</label>
                                    <Textarea
                                        placeholder="Provide feedback (required for rejection)"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                    <div className="flex gap-2">
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
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {projects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">No projects to review</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedProject(project)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">{project.title}</CardTitle>
                                        <p className="text-xs text-gray-500 mt-1">
                                            by {project.user.name} • {formatDate(project.createdAt)}
                                        </p>
                                    </div>
                                    <Badge className={statusColors[project.status] || ""}>
                                        {project.status.replace("_", " ")}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {project.description}
                                </p>
                                <div className="mt-2 text-xs text-gray-500">
                                    {project.category}
                                    {project.location && ` • ${project.location}`}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );
}
