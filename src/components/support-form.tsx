"use client";

import React from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    Bug,
    CheckCircle2,
    CreditCard,
    FileText,
    Lightbulb,
    MessageSquare,
    Send,
    User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import { submitSupportMessage } from "@/app/actions/support";
import {SupportCategory} from "@/lib/support-schema";

const CATEGORIES: {
    value: SupportCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    { value: "bug", label: "Bug report", icon: Bug },
    { value: "account", label: "Account issue", icon: UserIcon },
    { value: "protocol", label: "Protocol question", icon: FileText },
    { value: "billing", label: "Billing", icon: CreditCard },
    { value: "feature", label: "Feature request", icon: Lightbulb },
    { value: "other", label: "Other", icon: MessageSquare },
];

const SUBJECT_MIN = 3;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

interface SupportFormProps {
    user: { name: string; email: string };
}

export default function SupportForm({ user }: SupportFormProps) {
    const [category, setCategory] = React.useState<SupportCategory>("bug");
    const [subject, setSubject] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSent, setIsSent] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const canSubmit =
        subject.trim().length >= SUBJECT_MIN &&
        message.trim().length >= MESSAGE_MIN &&
        message.length <= MESSAGE_MAX;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const pageUrl =
                typeof window !== "undefined" ? window.location.href : undefined;

            await submitSupportMessage({
                category,
                subject,
                message,
                pageUrl,
            });

            setIsSent(true);
            toast.success("Message sent — we'll get back to you soon");
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Failed to send message";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setIsSent(false);
        setSubject("");
        setMessage("");
        setCategory("bug");
        setError(null);
    };

    if (isSent) {
        return (
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardContent className="py-14 text-center">
                    <CheckCircle2 className="w-14 h-14 mx-auto text-green-600 dark:text-green-400 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Message sent
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
                        Thanks for reaching out. The CNERSH support team has been
                        notified and will reply to{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                            {user.email}
                        </span>{" "}
                        as soon as possible.
                    </p>
                    <Button variant="outline" onClick={resetForm} className="rounded-md">
                        Send another message
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Contact support</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fill out the form below and we&#39;ll be in touch.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Read-only identity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Your name
                            </label>
                            <Input
                                value={user.name || "—"}
                                disabled
                                readOnly
                                className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Email
                            </label>
                            <Input
                                value={user.email}
                                disabled
                                readOnly
                                className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Category
                        </label>
                        <Select
                            value={category}
                            onValueChange={(v) => setCategory(v as SupportCategory)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => {
                                    const Icon = c.icon;
                                    return (
                                        <SelectItem key={c.value} value={c.value}>
                                            <span className="flex items-center gap-2">
                                                <Icon className="w-3.5 h-3.5" />
                                                {c.label}
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Subject
                        </label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief summary of your issue"
                            maxLength={200}
                            required
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Message
                        </label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Please describe your issue in detail. Include steps to reproduce if reporting a bug."
                            className="min-h-[160px] resize-y"
                            maxLength={MESSAGE_MAX}
                            required
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right tabular-nums">
                            {message.length} / {MESSAGE_MAX}
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            className="bg-blue-700 hover:bg-blue-800 text-white min-w-[150px] rounded-md"
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner className="size-4 mr-2" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send message
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}