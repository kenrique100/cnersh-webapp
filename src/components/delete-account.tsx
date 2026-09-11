"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import type { AccountDeletionContext } from "@/app/actions/account-deletion";
import { requestMyAccountDeletion } from "@/app/actions/account-deletion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { clearAccountScopedStorage } from "@/lib/client-account-storage";

const CONFIRMATION_PHRASE = "DELETE";

export const DELETION_CONSEQUENCES = [
    "You are signed out of every device immediately and can no longer sign in.",
    "Your name, email address, photo, profession, and other profile details are removed.",
    "Your posts, comments, community topics, and replies are blanked and marked as deleted; your reactions and notifications are removed.",
    "Files you uploaded are deleted from storage, except documents attached to protocols the committee must keep.",
    "Draft protocols that were never submitted are deleted.",
    "The encryption key protecting your protected data is destroyed, so encrypted copies, including those in backups, can no longer be read.",
] as const;

export const RETAINED_RECORDS_NOTICE =
    "Protocols you submitted, their review history, decisions, appeals, and the audit trail are institutional records. " +
    "They are kept in de-identified form under the committee's retention rules and are no longer linked to you.";

interface DeleteAccountProps {
    context: AccountDeletionContext;
}

export function DeleteAccount({ context }: DeleteAccountProps) {
    const [confirmation, setConfirmation] = useState("");
    const [reason, setReason] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const router = useRouter();

    const inProgress = context.status === "IN_PROGRESS" || context.status === "BLOCKED";
    const canSubmit = confirmation.trim() === CONFIRMATION_PHRASE && !pending && !inProgress;

    const signInAgain = async () => {
        clearAccountScopedStorage();
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
    };

    const submit = () => {
        setError(null);
        startTransition(async () => {
            const result = await requestMyAccountDeletion({ confirmation: confirmation.trim(), reason: reason || undefined });
            if (!result.ok) {
                setDialogOpen(false);
                setError(result.error);
                if (result.code === "REAUTH") toast.error(result.error);
                return;
            }
            clearAccountScopedStorage();
            router.push("/account-deleted");
            router.refresh();
        });
    };

    if (context.status === "COMPLETED") {
        return (
            <Alert>
                <ShieldCheckIcon className="h-4 w-4" />
                <AlertTitle>This account has been deleted</AlertTitle>
                <AlertDescription>Personal data has been erased. No further action is possible.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-5" id="delete-account">
            {inProgress && (
                <Alert>
                    <ShieldCheckIcon className="h-4 w-4" />
                    <AlertTitle>Deletion in progress</AlertTitle>
                    <AlertDescription>
                        Your deletion request was accepted
                        {context.requestedAt ? ` on ${new Date(context.requestedAt).toLocaleString()}` : ""} and is being completed.
                        You cannot make further changes to this account.
                    </AlertDescription>
                </Alert>
            )}

            {!context.available && !inProgress && (
                <Alert variant="destructive">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Account deletion is temporarily unavailable</AlertTitle>
                    <AlertDescription>
                        The secure erasure service is not reachable right now. Please try again later or contact the CNERSH
                        secretariat.
                    </AlertDescription>
                </Alert>
            )}

            <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">What happens when you delete your account</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
                    {DELETION_CONSEQUENCES.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{RETAINED_RECORDS_NOTICE}</p>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    Database backups are rotated on the hosting provider&apos;s retention schedule. A reconciliation step runs after
                    any restore so a deleted account is never reinstated
                    {context.keyStoreIsolated
                        ? ", and destroyed encryption keys are kept in a separate store that is not part of those backups."
                        : "."}
                </p>
            </div>

            {context.isSuperAdmin && (
                <Alert>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Super administrator account</AlertTitle>
                    <AlertDescription>
                        Deletion is refused while you are the only active super administrator. Transfer the role first.
                    </AlertDescription>
                </Alert>
            )}

            {!context.recentAuth && !inProgress && context.available && (
                <Alert>
                    <ShieldCheckIcon className="h-4 w-4" />
                    <AlertTitle>Recent sign-in required</AlertTitle>
                    <AlertDescription className="space-y-3">
                        <p>For your security, deleting an account requires that you signed in within the last 15 minutes.</p>
                        <Button type="button" variant="outline" size="sm" onClick={signInAgain}>
                            Sign in again
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="delete-reason">Reason (optional)</Label>
                    <Textarea
                        id="delete-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value.slice(0, 500))}
                        placeholder="Tell us why you are leaving"
                        disabled={pending || inProgress || !context.available}
                        rows={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="delete-confirmation">
                        Type <span className="font-mono font-semibold">{CONFIRMATION_PHRASE}</span> to confirm
                    </Label>
                    <Input
                        id="delete-confirmation"
                        autoComplete="off"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        placeholder={CONFIRMATION_PHRASE}
                        disabled={pending || inProgress || !context.available}
                        aria-describedby={error ? "delete-account-error" : undefined}
                    />
                </div>

                {error && (
                    <p id="delete-account-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

                <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    disabled={!canSubmit || !context.recentAuth || !context.available || context.isSuperAdmin}
                    onClick={() => setDialogOpen(true)}
                >
                    {pending ? <Spinner /> : <Trash2Icon className="h-4 w-4" />}
                    Delete my account
                </Button>
            </div>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone. You will be signed out immediately, your personal data will be erased, and the
                            encryption key protecting your protected data will be destroyed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>Keep my account</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={pending}
                            onClick={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {pending ? "Deleting..." : "Delete permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
