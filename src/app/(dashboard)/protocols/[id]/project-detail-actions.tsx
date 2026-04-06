"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckIcon, XIcon, ClockIcon, TrashIcon, PencilIcon, SendIcon, ImageIcon, VideoIcon, Loader2, RotateCcwIcon, CalendarIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { updateProjectStatus, deleteProject, updateProject, forwardProjectToFeed } from "@/app/actions/project";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageUpload from "@/components/image-upload";

interface ProjectDetailActionsProps {
    projectId: string;
    currentStatus: string;
    isOwner: boolean;
    isAdmin: boolean;
    projectTitle: string;
    projectObjectives: string | null;
    projectDescription: string;
}

export default function ProjectDetailActions({
    projectId,
    currentStatus,
    isOwner,
    isAdmin,
    projectTitle,
    projectObjectives,
    projectDescription,
}: ProjectDetailActionsProps) {
    const router = useRouter();
    const [feedback, setFeedback] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showEditForm, setShowEditForm] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(projectTitle);
    const [editDescription, setEditDescription] = React.useState(projectDescription);

    // Forward to feed state
    const [showForwardForm, setShowForwardForm] = React.useState(false);
    const [forwardContent, setForwardContent] = React.useState(projectObjectives || projectDescription);
    const [forwardImages, setForwardImages] = React.useState<string[]>([]);
    const [forwardVideos, setForwardVideos] = React.useState<string[]>([]);
    const [forwardTags, setForwardTags] = React.useState<string[]>([]);
    const [forwardTagInput, setForwardTagInput] = React.useState("");
    const [showForwardImageUpload, setShowForwardImageUpload] = React.useState(false);
    const [showForwardVideoUpload, setShowForwardVideoUpload] = React.useState(false);
    const [isForwarding, setIsForwarding] = React.useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = React.useState(false);
    const videoInputRef = React.useRef<HTMLInputElement>(null);

    // Only show admin review for projects NOT owned by the viewing admin
    const showAdminReview = isAdmin && !isOwner;

    const handleStatusUpdate = async (status: "APPROVED" | "REJECTED" | "RETURNED_INCOMPLETE" | "APPROVED_WITH_CONDITIONS" | "SESSION_SCHEDULED" | "PENDING_REVIEW") => {
        if (status === "REJECTED" && !feedback.trim()) {
            toast.error("Please provide a rejection reason before rejecting");
            return;
        }
        if (status === "RETURNED_INCOMPLETE" && !feedback.trim()) {
            toast.error("Please specify what is missing or incomplete before returning");
            return;
        }
        if (status === "APPROVED_WITH_CONDITIONS" && !feedback.trim()) {
            toast.error("Please specify the conditions for approval");
            return;
        }
        setIsSubmitting(true);
        try {
            await updateProjectStatus(projectId, status, feedback || undefined);
            toast.success(`Protocol ${status.toLowerCase().replace("_", " ")}`);
            setFeedback("");
            router.refresh();
        } catch {
            toast.error("Failed to update protocol status");
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
            router.push("/protocols");
        } catch {
            toast.error("Failed to delete protocol");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = async () => {
        setIsSubmitting(true);
        try {
            await updateProject(projectId, { title: editTitle, description: editDescription });
            toast.success("Protocol updated");
            setShowEditForm(false);
            router.refresh();
        } catch {
            toast.error("Failed to update protocol");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForwardToFeed = async () => {
        if (!forwardContent.trim()) {
            toast.error("Please add some content for the feed post");
            return;
        }
        setIsForwarding(true);
        try {
            await forwardProjectToFeed(projectId, {
                content: forwardContent,
                images: forwardImages.length > 0 ? forwardImages : undefined,
                videos: forwardVideos.length > 0 ? forwardVideos : undefined,
                tags: forwardTags.length > 0 ? forwardTags : undefined,
            });
            toast.success("Protocol posted to feeds!");
            setShowForwardForm(false);
            router.push("/feeds");
        } catch {
            toast.error("Failed to post to feeds");
        } finally {
            setIsForwarding(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("video/")) {
            toast.error("Please select a video file");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            toast.error("Video must be less than 50MB");
            return;
        }
        setIsUploadingVideo(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                let errorMessage = "Upload failed";
                try {
                    const data = await res.json();
                    errorMessage = data.error || errorMessage;
                } catch {
                    if (res.status === 413) {
                        errorMessage = "Video file is too large for the server. Please try a smaller file.";
                    }
                }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            if (data.url) {
                setForwardVideos((prev) => [...prev, data.url]);
                setShowForwardVideoUpload(false);
            }
        } catch {
            toast.error("Video upload failed");
        } finally {
            setIsUploadingVideo(false);
            if (videoInputRef.current) videoInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-4">
            {/* Owner Actions: Edit, Delete, Forward to Feed */}
            {isOwner && (
                <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Project Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        {showEditForm ? (
                            <div className="space-y-3">
                                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Protocol title" />
                                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="min-h-[80px]" />
                                <div className="flex gap-2">
                                    <Button onClick={handleEdit} disabled={isSubmitting} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                        {isSubmitting ? "Saving..." : "Save Changes"}
                                    </Button>
                                    <Button onClick={() => setShowEditForm(false)} variant="outline" size="sm">Cancel</Button>
                                </div>
                            </div>
                        ) : showForwardForm ? (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500">Compose your feed post. Protocol objectives are pre-filled below.</p>
                                <Textarea
                                    value={forwardContent}
                                    onChange={(e) => setForwardContent(e.target.value)}
                                    placeholder="Write your post content... (use @ to mention users)"
                                    className="min-h-[100px]"
                                />
                                {/* Forward images preview */}
                                {forwardImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {forwardImages.map((img, idx) => (
                                            <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-[calc(50%-4px)]">
                                                <Image src={img} alt={`Preview ${idx + 1}`} width={200} height={150} className="w-full h-[100px] object-cover" unoptimized />
                                                <button type="button" onClick={() => setForwardImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer">
                                                    <XIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Forward videos preview */}
                                {forwardVideos.length > 0 && (
                                    <div className="space-y-2">
                                        {forwardVideos.map((vid, idx) => (
                                            <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                <video src={vid} controls className="w-full max-h-[150px] object-contain bg-black" />
                                                <button type="button" onClick={() => setForwardVideos((prev) => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer">
                                                    <XIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Image upload */}
                                {showForwardImageUpload && (
                                    <ImageUpload
                                        variant="feed"
                                        onChange={(url) => {
                                            if (url) {
                                                setForwardImages((prev) => [...prev, url]);
                                                setShowForwardImageUpload(false);
                                            }
                                        }}
                                    />
                                )}
                                {/* Video upload */}
                                {showForwardVideoUpload && (
                                    <div>
                                        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                                        <button type="button" onClick={() => videoInputRef.current?.click()} disabled={isUploadingVideo} className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-4 flex flex-col items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                                            {isUploadingVideo ? <Loader2 className="h-6 w-6 text-blue-600 animate-spin" /> : <VideoIcon className="h-6 w-6 text-gray-400" />}
                                            <span className="text-xs text-gray-500">{isUploadingVideo ? "Uploading..." : "Upload video (up to 32MB)"}</span>
                                        </button>
                                    </div>
                                )}
                                {/* Tags */}
                                {forwardTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {forwardTags.map((tag, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
                                                #{tag}
                                                <button type="button" onClick={() => setForwardTags((prev) => prev.filter((_, i) => i !== idx))}><XIcon className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setShowForwardImageUpload(!showForwardImageUpload)} className="text-gray-500 h-8 px-2">
                                        <ImageIcon className="h-4 w-4 mr-1" /> Photo
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setShowForwardVideoUpload(!showForwardVideoUpload)} className="text-gray-500 h-8 px-2">
                                        <VideoIcon className="h-4 w-4 mr-1" /> Video
                                    </Button>
                                    <input
                                        type="text"
                                        placeholder="Add tag..."
                                        value={forwardTagInput}
                                        onChange={(e) => setForwardTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.key === "Enter" || e.key === ",") && forwardTagInput.trim()) {
                                                e.preventDefault();
                                                const tag = forwardTagInput.trim().replace(/^#/, "");
                                                if (tag && !forwardTags.includes(tag)) setForwardTags((prev) => [...prev, tag]);
                                                setForwardTagInput("");
                                            }
                                        }}
                                        className="h-8 w-24 px-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleForwardToFeed} disabled={isForwarding} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <SendIcon className="h-4 w-4 mr-1" />
                                        {isForwarding ? "Posting..." : "Post to Feed"}
                                    </Button>
                                    <Button onClick={() => setShowForwardForm(false)} variant="outline" size="sm">Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setShowEditForm(true)} variant="outline" size="sm">
                                    <PencilIcon className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" size="sm">
                                    <TrashIcon className="h-4 w-4 mr-1" />
                                    {isDeleting ? "Deleting..." : "Delete"}
                                </Button>
                                <Button onClick={() => setShowForwardForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <SendIcon className="h-4 w-4 mr-1" />
                                    Post to Feed
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Admin Review Actions (only for non-owned projects) */}
            {showAdminReview && (
                <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 rounded-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Review Actions
                        </CardTitle>
                        <p className="text-xs text-gray-500">
                            Current status: <span className="font-medium">{currentStatus.replace(/_/g, " ")}</span>
                        </p>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        <Textarea
                            placeholder="Required for rejection, return, or conditional approval — add a reason, specify missing items, or list the conditions"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Feedback is required when rejecting, returning incomplete, or approving with conditions.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {/* SUBMITTED: can return incomplete or move to pending review */}
                            {currentStatus === "SUBMITTED" && (
                                <Button
                                    onClick={() => handleStatusUpdate("RETURNED_INCOMPLETE")}
                                    disabled={isSubmitting}
                                    variant="outline"
                                    className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                                >
                                    <RotateCcwIcon className="h-4 w-4 mr-1" />
                                    Return — Incomplete
                                </Button>
                            )}
                            {/* SESSION_SCHEDULED: can schedule for statuses ready for committee */}
                            {["REVIEW_COMPLETE", "PENDING_REVIEW", "UNDER_REVIEW"].includes(currentStatus) && (
                                <Button
                                    onClick={() => handleStatusUpdate("SESSION_SCHEDULED")}
                                    disabled={isSubmitting}
                                    variant="outline"
                                    className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-950"
                                >
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    Schedule Session
                                </Button>
                            )}
                            <Button
                                onClick={() => handleStatusUpdate("APPROVED")}
                                disabled={isSubmitting}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Approve
                            </Button>
                            {/* APPROVED_WITH_CONDITIONS: available for review-stage protocols */}
                            {["REVIEW_COMPLETE", "SESSION_SCHEDULED"].includes(currentStatus) && (
                                <Button
                                    onClick={() => handleStatusUpdate("APPROVED_WITH_CONDITIONS")}
                                    disabled={isSubmitting}
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                >
                                    <CheckCircle2Icon className="h-4 w-4 mr-1" />
                                    Approve with Conditions
                                </Button>
                            )}
                            <Button
                                onClick={() => handleStatusUpdate("REJECTED")}
                                disabled={isSubmitting}
                                variant="destructive"
                            >
                                <XIcon className="h-4 w-4 mr-1" />
                                Reject
                            </Button>
                            {/* Legacy: pending review assignment (only when submitted) */}
                            {currentStatus === "SUBMITTED" && (
                                <Button
                                    onClick={() => handleStatusUpdate("PENDING_REVIEW")}
                                    disabled={isSubmitting}
                                    variant="outline"
                                >
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    Mark Pending Review
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
