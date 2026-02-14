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
            await submitProject(formData);
            toast.success("Project submitted successfully!");
            router.push("/projects");
        } catch {
            toast.error("Failed to submit project");
        } finally {
            setIsSubmitting(false);
        }
    };

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

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Spinner className="size-4" /> : "Submit Project"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
