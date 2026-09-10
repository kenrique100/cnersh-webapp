import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResetPasswordForm } from "../reset-password-form";

// ---------- Mocks ----------
const mockPush = jest.fn();
const mockGetParam = jest.fn().mockReturnValue("mock-token");

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => ({ get: mockGetParam }),
}));

const mockResetPassword = jest.fn();
jest.mock("@/lib/auth-client", () => ({
    authClient: {
        resetPassword: (...args: unknown[]) => mockResetPassword(...args),
    },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (msg: string) => mockToastSuccess(msg),
        error: (msg: string) => mockToastError(msg),
    },
}));

describe("ResetPasswordForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("toggles password visibility for both fields", () => {
        render(<ResetPasswordForm />);

        const passwordInput = screen.getByPlaceholderText("Enter new password");
        const confirmInput = screen.getByPlaceholderText("Confirm your password");

        expect(passwordInput).toHaveAttribute("type", "password");
        expect(confirmInput).toHaveAttribute("type", "password");

        // Click the eye button inside the same container as the password input
        const passwordToggleBtn = passwordInput.parentElement?.querySelector("button");
        fireEvent.click(passwordToggleBtn!);
        expect(passwordInput).toHaveAttribute("type", "text");

        // Same for confirm password
        const confirmToggleBtn = confirmInput.parentElement?.querySelector("button");
        fireEvent.click(confirmToggleBtn!);
        expect(confirmInput).toHaveAttribute("type", "text");
    });

    it("shows validation error if passwords do not match or are too short", async () => {
        render(<ResetPasswordForm />);

        const pass = screen.getByPlaceholderText("Enter new password");
        const confirm = screen.getByPlaceholderText("Confirm your password");
        const submitBtn = screen.getByRole("button", { name: /Reset Password/i });

        fireEvent.change(pass, { target: { value: "short" } });
        fireEvent.click(submitBtn);
        expect(await screen.findByText("Password must be at least 10 characters")).toBeInTheDocument();

        fireEvent.change(pass, { target: { value: "validPassword123" } });
        fireEvent.change(confirm, { target: { value: "differentPassword123" } });
        fireEvent.click(submitBtn);
        expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    });

    it("successfully resets password via the onSuccess callback", async () => {
        mockResetPassword.mockImplementation((_data, options) => {
            options.onSuccess();
            return Promise.resolve();
        });

        render(<ResetPasswordForm />);

        fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
            target: { value: "securePassword123" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
            target: { value: "securePassword123" },
        });

        fireEvent.submit(document.querySelector("form")!);

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith("Password reset successfully.");
            expect(mockPush).toHaveBeenCalledWith("/sign-in");
        });
    });

    it("handles server error via the onError callback branch", async () => {
        mockResetPassword.mockImplementation((_data, options) => {
            options.onError({ error: { message: "Token has expired" } });
            return Promise.resolve();
        });

        render(<ResetPasswordForm />);

        fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
            target: { value: "securePassword123" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
            target: { value: "securePassword123" },
        });

        fireEvent.submit(document.querySelector("form")!);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith("Token has expired");
        });
    });

    it("handles unexpected catch block errors (e.g. network crash)", async () => {
        mockResetPassword.mockRejectedValue(new Error("Crash"));

        render(<ResetPasswordForm />);

        fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
            target: { value: "securePassword123" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
            target: { value: "securePassword123" },
        });

        fireEvent.submit(document.querySelector("form")!);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
        });
    });
});