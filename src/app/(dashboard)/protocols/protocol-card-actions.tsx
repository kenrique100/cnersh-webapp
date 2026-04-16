"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, PencilIcon, TrashIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteProject, updateProject } from "@/app/actions/project";

interface ProtocolCardActionsProps {
    projectId: string;
    initialTitle: string;
    initialDescription: string;
}

export default function ProtocolCardActions({
    projectId,
    initialTitle,
    initialDescription,
}: ProtocolCardActionsProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [title, setTitle] = React.useState(initialTitle);
    const [description, setDescription] = React.useState(initialDescription);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await updateProject(projectId, {
                title: title.trim(),
                description: description.trim(),
            });
            toast.success("Protocol updated");
            setIsEditing(false);
            router.refresh();
        } catch {
            toast.error("Failed to update protocol");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this protocol?")) return;
        setIsDeleting(true);
        try {
            await deleteProject(projectId);
            toast.success("Protocol deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete protocol");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                    <Link href={`/protocols/${projectId}`}>
                        <EyeIcon className="h-4 w-4 mr-1.5" />
                        View
                    </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
                    <PencilIcon className="h-4 w-4 mr-1.5" />
                    Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <TrashIcon className="h-4 w-4 mr-1.5" />}
                    {isDeleting ? "Deleting..." : "Delete"}
                </Button>
            </div>

            {isEditing && (
                <div className="space-y-2">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Protocol title"
                    />
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Protocol description"
                        className="min-h-[90px]"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleSave}
                            disabled={isSubmitting || !title.trim() || !description.trim()}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setTitle(initialTitle);
                                setDescription(initialDescription);
                                setIsEditing(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
