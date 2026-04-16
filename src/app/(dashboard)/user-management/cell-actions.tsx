// cell-actions.tsx (fixed)
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
import { Edit, Trash, ShieldBan, ShieldCheck, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const onRemoveUser = async () => {
        setIsLoading(true);
        try {
            const { error } = await authClient.admin.removeUser({ userId: id });

            if (error) {
                toast.error(error.message);
                setIsLoading(false);
                return;
            }
            toast.success("User removed successfully");
            router.refresh();
            setIsLoading(false);
            setIsDeleteModalOpen(false);
            setIsMobileMenuOpen(false);
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
            setIsMobileMenuOpen(false);
        } catch {
            toast.error("Something went wrong");
            setIsLoading(false);
        }
    };

    const handleEdit = () => {
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
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* Desktop view - horizontal icons */}
            <div className="hidden sm:flex justify-end gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Edit"
                    onClick={handleEdit}
                >
                    <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950 ${
                        banned ? "text-green-600" : "text-orange-500"
                    }`}
                    title={banned ? "Unban user" : "Ban user"}
                    onClick={() => setIsBanModalOpen(true)}
                >
                    {banned ? (
                        <ShieldCheck className="h-4 w-4" />
                    ) : (
                        <ShieldBan className="h-4 w-4" />
                    )}
                </Button>

                {hasDeletePermission && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
                        title="Delete user"
                        onClick={() => setIsDeleteModalOpen(true)}
                    >
                        <Trash className="h-4 w-4 text-rose-500" />
                    </Button>
                )}
            </div>

            {/* Mobile view - dropdown menu */}
            <div className="sm:hidden">
                <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setIsBanModalOpen(true)}
                            className={`cursor-pointer ${banned ? "text-green-600" : "text-orange-500"}`}
                        >
                            {banned ? (
                                <>
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    Unban
                                </>
                            ) : (
                                <>
                                    <ShieldBan className="h-4 w-4 mr-2" />
                                    Ban
                                </>
                            )}
                        </DropdownMenuItem>
                        {hasDeletePermission && (
                            <DropdownMenuItem
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="cursor-pointer text-rose-500"
                            >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Delete Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="w-[90%] sm:w-full max-w-md rounded-lg mx-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">Delete user</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm sm:text-base">
                        Are you sure you want to delete {name}? <br />
                        This action cannot be undone.
                    </DialogDescription>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full sm:w-auto border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="cursor-pointer w-full sm:w-auto font-medium"
                            variant="destructive"
                            onClick={onRemoveUser}
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner className="size-5" /> : (
                                <>
                                    <Trash className="h-4 w-4 mr-1.5" />
                                    Delete User
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ban/Unban Dialog */}
            <Dialog open={isBanModalOpen} onOpenChange={setIsBanModalOpen}>
                <DialogContent className="w-[90%] sm:w-full max-w-md rounded-lg mx-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">
                            {banned ? "Unban" : "Ban"} user
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm sm:text-base">
                        {banned
                            ? `Are you sure you want to unban ${name}? They will regain access to the platform.`
                            : `Are you sure you want to ban ${name}? They will lose access to the platform.`}
                    </DialogDescription>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsBanModalOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className={`cursor-pointer w-full sm:w-auto text-white ${
                                banned
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-rose-600 hover:bg-rose-700"
                            }`}
                            variant={banned ? "default" : "destructive"}
                            onClick={onToggleBan}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Spinner className="size-5" />
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
