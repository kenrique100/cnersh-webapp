"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { UserProps, useUsers } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import { Edit, Trash, ShieldBan, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const CellActions = ({
                                id,
                                name,
                                role,
                                email,
                                emailVerified,
                                hasDeletePermission,
                                image,
                                banned,
                            }: UserProps) => {
    const router = useRouter();

    const { setIsOpen, setUser } = useUsers();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onRemoveUser = async () => {
        setIsLoading(true);
        
        try {
            const { error } = await authClient.admin.removeUser({ userId: id });

            if (error) {
                toast.error(error.message);
                setIsLoading(false);
                return;
            }
            
            // Only cleanup on success
            toast.success("User removed successfully");
            router.refresh();
            setIsLoading(false);
            setIsDeleteModalOpen(false);
        } catch {
            toast.error("Something went wrong");
            setIsLoading(false);
        }
    };

    const onToggleBan = async () => {
        setIsLoading(true);
        try {
            if (banned) {
                const { error } = await authClient.admin.unbanUser({ userId: id });
                if (error) {
                    toast.error(error.message);
                    setIsLoading(false);
                    return;
                }
                toast.success(`${name} has been unbanned`);
            } else {
                const { error } = await authClient.admin.banUser({
                    userId: id,
                    banReason: "Banned by admin",
                });
                if (error) {
                    toast.error(error.message);
                    setIsLoading(false);
                    return;
                }
                toast.success(`${name} has been banned`);
            }
            router.refresh();
            setIsLoading(false);
            setIsBanModalOpen(false);
        } catch {
            toast.error("Something went wrong");
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="flex justify-end gap-3">
                <div
                    className="cursor-pointer p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Edit"
                    onClick={() => {
                        setIsOpen(true);
                        setUser({
                            id,
                            name,
                            role,
                            email,
                            emailVerified,
                            hasDeletePermission,
                            image,
                            banned,
                        });
                    }}
                >
                    <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>

                <div
                    className="cursor-pointer p-1.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                    title={banned ? "Unban user" : "Ban user"}
                    onClick={() => setIsBanModalOpen(true)}
                >
                    {banned ? (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                    ) : (
                        <ShieldBan className="h-4 w-4 text-orange-500" />
                    )}
                </div>

                {hasDeletePermission && (
                    <div
                        className="cursor-pointer p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title="Delete user"
                        onClick={() => {
                            setIsDeleteModalOpen(true);
                        }}
                    >
                        <Trash className="h-4 w-4 text-rose-500" />
                    </div>
                )}
            </div>

            {/* Delete Dialog */}
            <Dialog
                open={isDeleteModalOpen}
                onOpenChange={(isOpen) => {
                    setIsDeleteModalOpen(isOpen);
                }}
            >
                <DialogContent className="flex flex-col items-start justify-center">
                    <DialogHeader>
                        <DialogTitle>Delete user</DialogTitle>
                    </DialogHeader>

                    <DialogDescription>
                        Are you sure you want to delete {name}? <br />
                        This action cannot be undone.
                    </DialogDescription>

                    <div className="flex gap-2 self-end my-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="cursor-pointer"
                            variant="destructive"
                            onClick={onRemoveUser}
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner className="size-6" /> : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ban/Unban Dialog */}
            <Dialog
                open={isBanModalOpen}
                onOpenChange={(isOpen) => {
                    setIsBanModalOpen(isOpen);
                }}
            >
                <DialogContent className="flex flex-col items-start justify-center">
                    <DialogHeader>
                        <DialogTitle>{banned ? "Unban" : "Ban"} user</DialogTitle>
                    </DialogHeader>

                    <DialogDescription>
                        {banned
                            ? `Are you sure you want to unban ${name}? They will regain access to the platform.`
                            : `Are you sure you want to ban ${name}? They will lose access to the platform.`}
                    </DialogDescription>

                    <div className="flex gap-2 self-end my-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsBanModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="cursor-pointer"
                            variant={banned ? "default" : "destructive"}
                            onClick={onToggleBan}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Spinner className="size-6" />
                            ) : banned ? (
                                "Unban"
                            ) : (
                                "Ban"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};