"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { submitProject } from "@/app/actions/project";
import { FileTextIcon, TrashIcon, Loader2, UploadIcon, CheckCircleIcon, CopyIcon } from "lucide-react";

const PROJECT_CATEGORIES = [
    "Health",
    "Education",
    "Environment",
    "Technology",
    "Social Development",
    "Agriculture",
    "Infrastructure",
    "Other",
];

export default function ProjectSubmitClient() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = React.useState(false);
    const [documentUrl, setDocumentUrl] = React.useState<string | null>(null);
    const [documentName, setDocumentName] = React.useState<string | null>(null);
    const [submittedTrackingCode, setSubmittedTrackingCode] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState({
        title: "",
        description: "",
        objectives: "",
        category: "",
        location: "",
        timeline: "",
        budget: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
            toast.error("Please fill in all required fields");
            return;
        }
        setIsSubmitting(true);
        try {
            const project = await submitProject({ ...formData, document: documentUrl || undefined });
            setSubmittedTrackingCode(project.trackingCode);
            toast.success("Project submitted successfully!");
        } catch {
            toast.error("Failed to submit project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyCode = () => {
        if (submittedTrackingCode) {
            navigator.clipboard.writeText(submittedTrackingCode);
            toast.success("Tracking code copied to clipboard!");
        }
    };

    // Success screen after submission
    if (submittedTrackingCode) {
        return (
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                <CardContent className="py-12 flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Project Submitted Successfully!
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your project has been submitted for ethical review. Use the tracking code below to check your project status.
                        </p>
                    </div>
                    <div className="w-full max-w-sm p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 uppercase tracking-wide">
                            Your Project Tracking Code
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="flex-1 text-xl font-bold font-mono text-blue-900 dark:text-blue-100 tracking-widest">
                                {submittedTrackingCode}
                            </span>
                            <button
                                onClick={handleCopyCode}
                                className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                title="Copy tracking code"
                            >
                                <CopyIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        Save this code. You can use it on the homepage to track your project status at any time — even without logging in.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => router.push("/projects")}>
                            View My Projects
                        </Button>
                        <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={() => router.push("/")}>
                            Go to Homepage
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
            <CardHeader>
                <CardTitle>Submit New Project</CardTitle>
                <CardDescription>
                    Fill in the details below to submit your project for review
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Project Title <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Enter project title"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                            placeholder="Describe your project"
                            className="min-h-[120px]"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Objectives</label>
                        <Textarea
                            value={formData.objectives}
                            onChange={(e) => setFormData((p) => ({ ...p, objectives: e.target.value }))}
                            placeholder="What are the objectives of this project?"
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData((p) => ({ ...p, category: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROJECT_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location</label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                                placeholder="Project location"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Timeline</label>
                            <Input
                                value={formData.timeline}
                                onChange={(e) => setFormData((p) => ({ ...p, timeline: e.target.value }))}
                                placeholder="e.g., 6 months"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Budget (optional)</label>
                        <Input
                            value={formData.budget}
                            onChange={(e) => setFormData((p) => ({ ...p, budget: e.target.value }))}
                            placeholder="Estimated budget"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Project Document <span className="text-gray-400 text-xs">(optional — PDF or Word)</span>
                        </label>
                        {documentUrl ? (
                            <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                                <FileTextIcon className="h-5 w-5 text-blue-600 shrink-0" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                                    {documentName || "Document uploaded"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDocumentUrl(null);
                                        setDocumentName(null);
                                    }}
                                    className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-red-500 transition-colors cursor-pointer"
                                    title="Remove document"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    className="hidden"
                                    id="document-upload"
                                    disabled={isUploadingDoc}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (file.size > 8 * 1024 * 1024) {
                                            toast.error("Document must be less than 8MB");
                                            return;
                                        }
                                        setIsUploadingDoc(true);
                                        try {
                                            const uploadFormData = new FormData();
                                            uploadFormData.append("file", file);
                                            const res = await fetch("/api/upload", {
                                                method: "POST",
                                                body: uploadFormData,
                                            });
                                            if (!res.ok) throw new Error("Upload failed");
                                            const data = await res.json();
                                            if (data.url) {
                                                setDocumentUrl(data.url);
                                                setDocumentName(data.name || file.name);
                                                toast.success("Document uploaded successfully");
                                            }
                                        } catch {
                                            toast.error("Document upload failed");
                                        } finally {
                                            setIsUploadingDoc(false);
                                            e.target.value = "";
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => document.getElementById("document-upload")?.click()}
                                    disabled={isUploadingDoc}
                                    className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-6 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploadingDoc ? (
                                        <>
                                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadIcon className="h-8 w-8 text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Drop or click to upload a document (PDF, DOC, DOCX)</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">PDF, DOC, DOCX up to 8MB</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Spinner className="size-4" />
                                Submitting...
                            </span>
                        ) : (
                            "Submit Project"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
