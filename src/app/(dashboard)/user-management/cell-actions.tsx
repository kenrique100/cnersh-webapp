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
import { Edit, Trash } from "lucide-react";
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
                            }: UserProps) => {
    const router = useRouter();

    const { setIsOpen, setUser } = useUsers();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onRemoveUser = async () => {
        try {
            const { error } = await authClient.admin.removeUser({ userId: id });

            if (error) {
                toast.error(error.message);
            }
        } catch {
            throw new Error("Something went wrong");
        } finally {
            router.refresh();
            setIsLoading(false);
            setIsDeleteModalOpen(false);
        }
    };
    return (
        <>
            <div className="flex justify-end gap-6">
                <div
                    className="cursor-pointer"
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
                        });
                    }}
                >
                    <Edit />
                </div>

                {hasDeletePermission && (
                    <div
                        className="cursor-pointer"
                        onClick={() => {
                            setIsDeleteModalOpen(true);
                        }}
                    >
                        <Trash className="text-rose-500 " />
                    </div>
                )}
            </div>

            <Dialog
                open={isDeleteModalOpen}
                onOpenChange={(isOpen) => {
                    setIsDeleteModalOpen(isOpen);
                }}
            >
                <DialogContent className="flex flex-col items-start justify-center">
                    <DialogHeader>
                        <DialogTitle> Delete user </DialogTitle>
                    </DialogHeader>

                    <DialogDescription>
                        Are you sure you want to delete {name} ? <br />
                        This action cannot be undone.
                    </DialogDescription>

                    <Button
                        type="submit"
                        className="cursor-pointer max-w-40 self-end my-6"
                        variant="destructive"
                        onClick={onRemoveUser}
                    >
                        {isLoading ? <Spinner className="size-6" /> : "Save changes"}
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
};