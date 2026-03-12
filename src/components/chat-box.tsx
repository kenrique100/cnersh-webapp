"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircleIcon, SendIcon, XIcon } from "lucide-react";
import { submitSupportMessage } from "@/app/actions/support";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatBox() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [message, setMessage] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    const [sent, setSent] = React.useState(false);

    // Listen for custom event to open the chatbox from other components
    React.useEffect(() => {
        const handleOpenChatBox = () => setIsOpen(true);
        window.addEventListener("open-chatbox", handleOpenChatBox);
        return () => window.removeEventListener("open-chatbox", handleOpenChatBox);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            await submitSupportMessage(message);
            toast.success("Message sent to admin successfully");
            setMessage("");
            setSent(true);
            setTimeout(() => setSent(false), 3000);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    isOpen
                        ? "bg-gray-600 hover:bg-gray-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
                title="Submit a problem"
            >
                {isOpen ? (
                    <XIcon className="h-6 w-6" />
                ) : (
                    <MessageCircleIcon className="h-6 w-6" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 px-4 py-3">
                        <h3 className="text-sm font-semibold text-white">Contact Support</h3>
                        <p className="text-xs text-blue-100 mt-0.5">
                            Submit a problem or question to the admin team
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        {sent ? (
                            <div className="text-center py-6">
                                <div className="text-green-500 text-3xl mb-2">✓</div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Message Sent!
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    An admin will review your message shortly.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your problem or question..."
                                    className="w-full h-28 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    disabled={isSending}
                                    maxLength={1000}
                                />
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs text-gray-400">
                                        {message.length}/1000
                                    </span>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!message.trim() || isSending}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {isSending ? (
                                            "Sending..."
                                        ) : (
                                            <>
                                                <SendIcon className="h-4 w-4 mr-1" />
                                                Send
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
