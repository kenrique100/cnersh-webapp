import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AccountDeletionContext, RequestMyAccountDeletionResult } from "@/app/actions/account-deletion";
import { requestMyAccountDeletion } from "@/app/actions/account-deletion";
import AccountDeletedPage from "@/app/(auth)/account-deleted/page";
import { DeleteAccount, RETAINED_RECORDS_NOTICE } from "@/components/delete-account";
import { clearAccountScopedStorage } from "@/lib/client-account-storage";
import { toast } from "sonner";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSignOut = jest.fn();

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("@/app/actions/account-deletion", () => ({
    requestMyAccountDeletion: jest.fn(),
}));

jest.mock("@/lib/auth-client", () => ({
    authClient: { signOut: (...args: unknown[]) => mockSignOut(...args) },
}));

jest.mock("@/lib/client-account-storage", () => ({
    clearAccountScopedStorage: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: { error: jest.fn() },
}));

const mockRequestDeletion = jest.mocked(requestMyAccountDeletion);
const mockClearStorage = jest.mocked(clearAccountScopedStorage);

const defaultContext: AccountDeletionContext = {
    status: "NONE",
    requestedAt: null,
    recentAuth: true,
    available: true,
    keyStoreIsolated: true,
    isSuperAdmin: false,
};

function setup(overrides: Partial<AccountDeletionContext> = {}) {
    const user = userEvent.setup();
    render(<DeleteAccount context={{ ...defaultContext, ...overrides }} />);
    return user;
}

async function confirmDeletion(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/type DELETE to confirm/i), "DELETE");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete permanently" }));
}

describe("DeleteAccount", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockSignOut.mockResolvedValue({});
    });

    it.each(["", "delete", "DELETE ACCOUNT"])("does not submit with missing or incorrect confirmation: %j", async (confirmation) => {
        const user = setup();
        if (confirmation) {
            await user.type(screen.getByLabelText(/type DELETE to confirm/i), confirmation);
        }

        const button = screen.getByRole("button", { name: "Delete my account" });
        expect(button).toBeDisabled();
        await user.click(button);

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(mockRequestDeletion).not.toHaveBeenCalled();
        expect(mockClearStorage).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("requires the final dialog confirmation and lets the user cancel", async () => {
        const user = setup();
        await user.type(screen.getByLabelText(/type DELETE to confirm/i), "DELETE");
        await user.click(screen.getByRole("button", { name: "Delete my account" }));

        const dialog = screen.getByRole("alertdialog");
        expect(mockRequestDeletion).not.toHaveBeenCalled();
        expect(dialog).toHaveTextContent("Retained records may contain identifying information.");
        await user.click(within(dialog).getByRole("button", { name: "Keep my account" }));

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(mockRequestDeletion).not.toHaveBeenCalled();
    });

    it.each([
        ["BLOCKED", "Deletion accepted — temporarily blocked"],
        ["IN_PROGRESS", "Deletion in progress"],
        ["NONE", "Deletion in progress"],
    ] as const)("shows accepted %s without redirecting or refreshing", async (status, title) => {
        mockRequestDeletion.mockResolvedValueOnce({ ok: true, status });
        const user = setup();
        await user.type(screen.getByLabelText("Reason (optional)"), "Leaving the committee");
        await confirmDeletion(user);

        const notice = await screen.findByRole("status");
        expect(notice).toHaveTextContent(title);
        expect(notice).toHaveTextContent("Your deletion request was accepted");
        expect(notice).toHaveTextContent("Deletion is not yet complete");
        expect(notice).toHaveTextContent("destruction of your encryption key have not been confirmed");
        expect(notice).not.toHaveTextContent(/key (?:is|has been) destroyed/i);
        expect(mockRequestDeletion).toHaveBeenCalledWith({
            confirmation: "DELETE",
            reason: "Leaving the committee",
        });
        expect(mockClearStorage).toHaveBeenCalledTimes(1);
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(mockSignOut).not.toHaveBeenCalled();
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(screen.getByText(RETAINED_RECORDS_NOTICE)).toBeVisible();
        expect(screen.getByLabelText(/type DELETE to confirm/i)).toBeDisabled();
        expect(screen.getByLabelText(/type DELETE to confirm/i)).toHaveValue("");
        expect(screen.getByLabelText("Reason (optional)")).toBeDisabled();
        expect(screen.getByLabelText("Reason (optional)")).toHaveValue("");

        const button = screen.getByRole("button", { name: "Delete my account" });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(mockRequestDeletion).toHaveBeenCalledTimes(1);
    });

    it("redirects only a completed outcome after clearing account-scoped storage, without refreshing", async () => {
        mockRequestDeletion.mockResolvedValueOnce({ ok: true, status: "COMPLETED" });
        const user = setup();
        await confirmDeletion(user);

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/account-deleted"));
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockClearStorage).toHaveBeenCalledTimes(1);
        expect(mockClearStorage.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
    });

    it("disables duplicate submissions while the request is pending and after acceptance", async () => {
        let resolveRequest!: (result: RequestMyAccountDeletionResult) => void;
        mockRequestDeletion.mockReturnValueOnce(new Promise((resolve) => {
            resolveRequest = resolve;
        }));
        const user = setup();
        await user.type(screen.getByLabelText(/type DELETE to confirm/i), "DELETE");
        await user.click(screen.getByRole("button", { name: "Delete my account" }));
        const submitButton = within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete permanently" });

        // Both clicks happen before React can render the pending state.
        act(() => {
            fireEvent.click(submitButton);
            fireEvent.click(submitButton);
        });

        expect(mockRequestDeletion).toHaveBeenCalledTimes(1);
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent("Requesting deletion...");
        expect(screen.getByRole("button", { name: "Keep my account" })).toBeDisabled();
        expect(screen.getByLabelText(/type DELETE to confirm/i)).toBeDisabled();
        expect(screen.getByLabelText("Reason (optional)")).toBeDisabled();
        expect(mockClearStorage).not.toHaveBeenCalled();
        await user.keyboard("{Escape}");
        expect(screen.getByRole("alertdialog")).toBeInTheDocument();

        await act(async () => {
            resolveRequest({ ok: true, status: "BLOCKED" });
        });

        expect(screen.getByRole("status")).toHaveTextContent("temporarily blocked");
        expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
        expect(mockRequestDeletion).toHaveBeenCalledTimes(1);
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it.each(["BLOCKED", "IN_PROGRESS"] as const)("renders an existing %s request as incomplete with submission disabled", (status) => {
        setup({ status, available: false, recentAuth: false, requestedAt: "2026-01-01T12:00:00.000Z" });

        expect(screen.getByRole("status")).toHaveTextContent("Your deletion request was accepted on");
        expect(screen.getByRole("status")).toHaveTextContent("Deletion is not yet complete");
        expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Sign in again" })).not.toBeInTheDocument();
        expect(screen.queryByText("Account deletion is temporarily unavailable")).not.toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("retains the recent sign-in flow without requesting deletion", async () => {
        const user = setup({ recentAuth: false });
        await user.type(screen.getByLabelText(/type DELETE to confirm/i), "DELETE");
        expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Sign in again" }));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/sign-in"));
        expect(mockClearStorage).toHaveBeenCalledTimes(1);
        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(mockRequestDeletion).not.toHaveBeenCalled();
    });

    it("shows an actionable REAUTH response instead of treating it as acceptance", async () => {
        const error = "For your security, sign in again and return to Settings to delete your account.";
        mockRequestDeletion.mockResolvedValueOnce({ ok: false, code: "REAUTH", error });
        const user = setup();
        await confirmDeletion(user);

        expect(await screen.findByText(error)).toBeVisible();
        expect(toast.error).toHaveBeenCalledWith(error);
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete my account" })).toBeDisabled();
        expect(mockClearStorage).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Sign in again" }));
        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/sign-in"));
        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(mockClearStorage).toHaveBeenCalledTimes(1);
    });

    it("shows a refused response without clearing storage or navigating and permits another attempt", async () => {
        mockRequestDeletion.mockResolvedValueOnce({ ok: false, code: "UNAVAILABLE", error: "Deletion is unavailable." });
        const user = setup();
        await confirmDeletion(user);

        expect(await screen.findByText("Deletion is unavailable.")).toBeVisible();
        expect(screen.getByRole("button", { name: "Delete my account" })).toBeEnabled();
        expect(mockClearStorage).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();

        mockRequestDeletion.mockResolvedValueOnce({ ok: true, status: "IN_PROGRESS" });
        await user.click(screen.getByRole("button", { name: "Delete my account" }));
        await user.click(screen.getByRole("button", { name: "Delete permanently" }));
        expect(await screen.findByRole("status")).toHaveTextContent("Deletion in progress");
        expect(mockRequestDeletion).toHaveBeenCalledTimes(2);
    });

    it("handles a rejected server action without claiming deletion succeeded", async () => {
        mockRequestDeletion.mockRejectedValueOnce(new Error("Connection lost"));
        const user = setup();
        await confirmDeletion(user);

        expect(await screen.findByText(/we could not confirm the deletion status/i)).toBeVisible();
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(mockClearStorage).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("does not describe retained records as anonymous or identity-free in the completed context", () => {
        setup({ status: "COMPLETED" });

        expect(screen.getByRole("alert")).toHaveTextContent("Retained records may contain identifying information.");
        expect(screen.getByRole("alert")).not.toHaveTextContent(/de-identified|anonymous|no longer linked to you/i);
        expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
    });

    it.each([
        { available: false },
        { isSuperAdmin: true },
    ])("preserves existing availability and administrator safeguards: %j", async (overrides) => {
        const user = setup(overrides);
        fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), { target: { value: "DELETE" } });

        const button = screen.getByRole("button", { name: "Delete my account" });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(mockRequestDeletion).not.toHaveBeenCalled();
    });
});

describe("AccountDeletedPage", () => {
    it("clearly warns that retained institutional records may still identify someone", () => {
        render(<AccountDeletedPage />);

        expect(screen.getByText(/retained records may contain identifying information/i)).toBeVisible();
        expect(screen.queryByText(/de-identified|anonymous|no longer linked to you/i)).not.toBeInTheDocument();
    });
});
