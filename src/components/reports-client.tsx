"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    FlagIcon,
    Trash2Icon,
    BanIcon,
    AlertTriangleIcon,
    XCircleIcon,
    Loader2Icon,
} from "lucide-react";
import {
    resolveReport,
    sendWarning,
    banUserById,
    deleteReportedContent,
} from "@/app/actions/admin";

type Report = {
    id: string;
    reason: string;
    contentType: string;
    contentId: string;
    status: string;
    createdAt: Date;
    user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    };
};

const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    REVIEWED: "bg-green-100 text-green-800",
    DISMISSED: "bg-gray-100 text-gray-800",
};

export function ReportsClient({ reports }: { reports: Report[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [banDialog, setBanDialog] = useState<Report | null>(null);
    const [banReason, setBanReason] = useState("");
    const [warningDialog, setWarningDialog] = useState<Report | null>(null);
    const [warningMessage, setWarningMessage] = useState("");

    async function handleDeleteContent(report: Report) {
        setLoading(`delete-${report.id}`);
        try {
            await deleteReportedContent(report.contentType, report.contentId);
            await resolveReport(report.id, "REVIEWED");
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    async function handleBanUser() {
        if (!banDialog) return;
        setLoading(`ban-${banDialog.id}`);
        try {
            await banUserById(banDialog.user.id, banReason);
            await resolveReport(banDialog.id, "REVIEWED");
            setBanDialog(null);
            setBanReason("");
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    async function handleSendWarning() {
        if (!warningDialog) return;
        setLoading(`warn-${warningDialog.id}`);
        try {
            await sendWarning(warningDialog.user.id, warningMessage);
            await resolveReport(warningDialog.id, "REVIEWED");
            setWarningDialog(null);
            setWarningMessage("");
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    async function handleDismiss(report: Report) {
        setLoading(`dismiss-${report.id}`);
        try {
            await resolveReport(report.id, "DISMISSED");
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    }

    if (reports.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <FlagIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No reports
                    </p>
                    <p className="text-sm text-gray-500">
                        No content has been reported yet
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {reports.map((report) => {
                    const isLoading = loading?.endsWith(report.id) ?? false;
                    const isPending = report.status === "PENDING";

                    return (
                        <Card
                            key={report.id}
                            className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={
                                                    report.user.image ||
                                                    undefined
                                                }
                                            />
                                            <AvatarFallback className="bg-blue-700 text-white text-xs">
                                                {report.user.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-sm">
                                                Report by {report.user.name}
                                            </CardTitle>
                                            <p className="text-xs text-gray-500">
                                                {new Date(
                                                    report.createdAt,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary">
                                            {report.contentType}
                                        </Badge>
                                        <Badge
                                            className={
                                                statusColors[report.status] ||
                                                ""
                                            }
                                        >
                                            {report.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                    {report.reason}
                                </p>
                                {isPending && (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={isLoading}
                                            onClick={() =>
                                                handleDeleteContent(report)
                                            }
                                        >
                                            {loading ===
                                            `delete-${report.id}` ? (
                                                <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <Trash2Icon className="h-4 w-4 mr-1" />
                                            )}
                                            Delete Content
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={isLoading}
                                            onClick={() =>
                                                setBanDialog(report)
                                            }
                                        >
                                            <BanIcon className="h-4 w-4 mr-1" />
                                            Ban User
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={isLoading}
                                            onClick={() =>
                                                setWarningDialog(report)
                                            }
                                        >
                                            <AlertTriangleIcon className="h-4 w-4 mr-1" />
                                            Send Warning
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isLoading}
                                            onClick={() =>
                                                handleDismiss(report)
                                            }
                                        >
                                            {loading ===
                                            `dismiss-${report.id}` ? (
                                                <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <XCircleIcon className="h-4 w-4 mr-1" />
                                            )}
                                            Dismiss
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Ban User Dialog */}
            <Dialog
                open={!!banDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setBanDialog(null);
                        setBanReason("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ban User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to ban{" "}
                            <strong>{banDialog?.user.name}</strong>? This will
                            prevent them from accessing the platform.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Reason for banning..."
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setBanDialog(null);
                                setBanReason("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!banReason.trim() || loading !== null}
                            onClick={handleBanUser}
                        >
                            {loading?.startsWith("ban-") ? (
                                <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Ban User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Send Warning Dialog */}
            <Dialog
                open={!!warningDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setWarningDialog(null);
                        setWarningMessage("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Warning</DialogTitle>
                        <DialogDescription>
                            Send a warning notification to{" "}
                            <strong>{warningDialog?.user.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Warning message..."
                        value={warningMessage}
                        onChange={(e) => setWarningMessage(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setWarningDialog(null);
                                setWarningMessage("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                !warningMessage.trim() || loading !== null
                            }
                            onClick={handleSendWarning}
                        >
                            {loading?.startsWith("warn-") ? (
                                <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Send Warning
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
