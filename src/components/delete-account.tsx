"use client";

import { useRef, useState, useTransition } from "react";
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
    "Once your request is accepted, you are signed out of every device and can no longer sign in, even if deletion is still pending.",
    "Your name, email address, photo, profession, and other account profile details will be removed.",
    "Your posts, comments, community topics, and replies will be blanked and marked as deleted; your reactions and notifications will be removed.",
    "Files you uploaded will be deleted from storage, except documents attached to protocols the committee must keep.",
    "Draft protocols that were never submitted will be deleted.",
    "Deletion is only complete after destruction of the encryption key protecting your protected data has been verified. Encrypted copies protected solely by that key, including those in backups, will then be unreadable.",
] as const;

export const RETAINED_RECORDS_NOTICE =
    "Protocols you submitted, their attachments, review history, decisions, appeals, and the audit trail are institutional records. " +
    "They are kept under the committee's retention rules. Retained records may contain identifying information.";

interface DeleteAccountProps {
    context: AccountDeletionContext;
}

export function DeleteAccount({ context }: DeleteAccountProps) {
    const [confirmation, setConfirmation] = useState("");
    const [reason, setReason] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptedStatus, setAcceptedStatus] = useState<AccountDeletionContext["status"] | null>(null);
    const [reauthRequired, setReauthRequired] = useState(false);
    const [pending, startTransition] = useTransition();
    const submissionLocked = useRef(false);
    const router = useRouter();

    const status = acceptedStatus ?? context.status;
    const inProgress = status === "IN_PROGRESS" || status === "BLOCKED";
    const needsReauth = !context.recentAuth || reauthRequired;
    const canSubmit = confirmation.trim() === CONFIRMATION_PHRASE
        && !pending && !inProgress && status !== "COMPLETED"
        && !needsReauth && context.available && !context.isSuperAdmin;

    const signInAgain = async () => {
        clearAccountScopedStorage();
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
    };

    const submit = () => {
        if (!canSubmit || submissionLocked.current) return;
        submissionLocked.current = true;
        setError(null);
        startTransition(async () => {
            let accepted = false;
            try {
                const result = await requestMyAccountDeletion({ confirmation: confirmation.trim(), reason: reason || undefined });
                if (!result.ok) {
                    setDialogOpen(false);
                    setError(result.error);
                    if (result.code === "REAUTH") {
                        setReauthRequired(true);
                        toast.error(result.error);
                    }
                    return;
                }
                accepted = true;
                // An accepted request revokes the session even when erasure is
                // blocked. Keep its status locally instead of refreshing away.
                setAcceptedStatus(result.status === "NONE" ? "IN_PROGRESS" : result.status);
                setDialogOpen(false);
                setConfirmation("");
                setReason("");
                clearAccountScopedStorage();
                if (result.status === "COMPLETED") {
                    router.push("/account-deleted");
                }
            } catch {
                setDialogOpen(false);
                setError("We could not confirm the deletion status. Contact the CNERSH secretariat if you need help.");
            } finally {
                // Prevent another submission after acceptance, including before
                // the state update has rendered.
                submissionLocked.current = accepted;
            }
        });
    };

    if (status === "COMPLETED") {
        return (
            <Alert>
                <ShieldCheckIcon className="h-4 w-4" />
                <AlertTitle>This account has been deleted</AlertTitle>
                <AlertDescription>
                    Account deletion is complete. No further action is possible. {RETAINED_RECORDS_NOTICE}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-5" id="delete-account">
            {inProgress && (
                <Alert role="status" aria-live="polite" aria-atomic="true">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle>{status === "BLOCKED" ? "Deletion accepted — temporarily blocked" : "Deletion in progress"}</AlertTitle>
                    <AlertDescription>
                        Your deletion request was accepted
                        {context.requestedAt ? ` on ${new Date(context.requestedAt).toLocaleString()}` : ""}.
                        {" "}{status === "BLOCKED"
                            ? "Deletion is not yet complete. Some steps are temporarily blocked and will be retried."
                            : "Deletion is not yet complete and is still being processed."}
                        {" "}Erasure of your personal data and destruction of your encryption key have not been confirmed.
                        You cannot make further changes to this account. Do not submit another request.
                        Contact the CNERSH secretariat if you need help.
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
                        ? ", and the encryption key store is separate from those backups."
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

            {needsReauth && !inProgress && context.available && (
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
                    disabled={!canSubmit}
                    onClick={() => setDialogOpen(true)}
                >
                    {pending ? <Spinner /> : <Trash2Icon className="h-4 w-4" />}
                    Delete my account
                </Button>
            </div>

            <AlertDialog open={dialogOpen} onOpenChange={(open) => {
                if (!submissionLocked.current) setDialogOpen(open);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This cannot be undone. Once your request is accepted, you will be signed out immediately.
                            Erasure may take longer and is only complete after all required steps, including encryption key
                            destruction, have been verified. {RETAINED_RECORDS_NOTICE}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>Keep my account</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={!canSubmit}
                            onClick={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {pending ? "Requesting deletion..." : "Delete permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
