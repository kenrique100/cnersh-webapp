"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ShieldAlertIcon, BanIcon } from "lucide-react";
import { CommunityUser } from "./types";

interface CommunityPostModalProps {
    userProfileId: string | null;
    selectedUser: CommunityUser | null | undefined;
    showBanDialog: boolean;
    setShowBanDialog: (open: boolean) => void;
    showWarningDialog: boolean;
    setShowWarningDialog: (open: boolean) => void;
    warningMessage: string;
    setWarningMessage: (msg: string) => void;
    banReason: string;
    setBanReason: (reason: string) => void;
    onSendWarning: () => void;
    onBanUser: () => void;
    onCloseUserProfile: () => void;
    reportingReplyId: string | null;
    reportCategory: string;
    setReportCategory: (cat: string) => void;
    reportDetails: string;
    setReportDetails: (details: string) => void;
    onSubmitReport: () => void;
    onCloseReport: () => void;
}

export function CommunityPostModal({
    userProfileId,
    selectedUser,
    showBanDialog,
    setShowBanDialog,
    showWarningDialog,
    setShowWarningDialog,
    warningMessage,
    setWarningMessage,
    banReason,
    setBanReason,
    onSendWarning,
    onBanUser,
    onCloseUserProfile,
    reportingReplyId,
    reportCategory,
    setReportCategory,
    reportDetails,
    setReportDetails,
    onSubmitReport,
    onCloseReport,
}: CommunityPostModalProps) {
    return (
        <>
            {/* Admin User Profile Dialog */}
            <Dialog
                open={!!userProfileId && !showBanDialog && !showWarningDialog}
                onOpenChange={(open) => { if (!open) onCloseUserProfile(); }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>User Profile</DialogTitle>
                        <DialogDescription className="sr-only">View user profile details and admin actions</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-14 w-14">
                                    <AvatarImage src={selectedUser.image || undefined} />
                                    <AvatarFallback className="bg-indigo-500 text-white text-lg">
                                        {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-lg">
                                        {selectedUser.role === "admin" || selectedUser.role === "superadmin"
                                            ? "CNERSH Admin"
                                            : selectedUser.name || "Unknown"}
                                    </p>
                                    <Badge className="text-xs mt-0.5">{selectedUser.role || "user"}</Badge>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowWarningDialog(true)}
                                    className="flex-1"
                                >
                                    <ShieldAlertIcon className="h-4 w-4 mr-1.5" />
                                    Send Warning
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowBanDialog(true)}
                                    className="flex-1"
                                >
                                    <BanIcon className="h-4 w-4 mr-1.5" />
                                    Ban User
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Warning Dialog */}
            <Dialog
                open={showWarningDialog}
                onOpenChange={(open) => { if (!open) { setShowWarningDialog(false); setWarningMessage(""); } }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Send Warning to {selectedUser?.name}</DialogTitle>
                        <DialogDescription className="sr-only">Send a warning message to this user</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Warning message..."
                            value={warningMessage}
                            onChange={(e) => setWarningMessage(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setShowWarningDialog(false); setWarningMessage(""); }}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={onSendWarning} disabled={!warningMessage.trim()}>
                                Send Warning
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ban Dialog */}
            <Dialog
                open={showBanDialog}
                onOpenChange={(open) => { if (!open) { setShowBanDialog(false); setBanReason(""); } }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ban {selectedUser?.name}</DialogTitle>
                        <DialogDescription className="sr-only">Ban this user from the community</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Reason for ban..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setShowBanDialog(false); setBanReason(""); }}>
                                Cancel
                            </Button>
                            <Button variant="destructive" size="sm" onClick={onBanUser} disabled={!banReason.trim()}>
                                Ban User
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Report Chat Dialog */}
            <Dialog
                open={reportingReplyId !== null}
                onOpenChange={(open) => { if (!open) onCloseReport(); }}
            >
                <DialogContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Report Message</DialogTitle>
                        <DialogDescription className="sr-only">Report this message for review</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Select value={reportCategory} onValueChange={setReportCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Spam">Spam</SelectItem>
                                <SelectItem value="Harassment or Bullying">Harassment or Bullying</SelectItem>
                                <SelectItem value="Hate Speech">Hate Speech</SelectItem>
                                <SelectItem value="Misinformation">Misinformation</SelectItem>
                                <SelectItem value="Violence or Threats">Violence or Threats</SelectItem>
                                <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder="Additional details (optional)..."
                            value={reportDetails}
                            onChange={(e) => setReportDetails(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={onCloseReport}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={onSubmitReport} disabled={!reportCategory} className="bg-red-600 hover:bg-red-700 text-white">
                                Submit Report
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
