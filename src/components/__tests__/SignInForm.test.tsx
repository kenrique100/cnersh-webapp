import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInForm } from "../sign-in";

const mockPush = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockSearchParamsGet = jest.fn();

const mockSignInEmail = jest.fn();
const mockSignInSocial = jest.fn();

jest.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            email: (...args: unknown[]) => mockSignInEmail(...args),
            social: (...args: unknown[]) => mockSignInSocial(...args),
        },
    },
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
    // The component also calls useSearchParams(); the mock must provide it
    // or the component throws at render time.
    useSearchParams: () => ({
        get: (key: string) => mockSearchParamsGet(key),
    }),
}));

jest.mock("sonner", () => ({
    toast: {
        success: (msg: string) => mockToastSuccess(msg),
        error: (msg: string, opts?: unknown) => mockToastError(msg, opts),
    },
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => {
        const { priority: _priority, fill: _fill, ...rest } = props;
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...rest} alt={rest.alt as string} />;
    },
}));

describe("SignInForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: no query params present.
        mockSearchParamsGet.mockReturnValue(null);
    });

    const fillForm = (email: string, password: string) => {
        fireEvent.change(screen.getByPlaceholderText("name@agency.gov.cm"), {
            target: { value: email },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
            target: { value: password },
        });
    };

    it("renders all the important parts without ambiguity", () => {
        render(<SignInForm />);

        expect(screen.getByAltText("CNERSH logo")).toBeInTheDocument();
        expect(screen.getByText("Welcome back")).toBeInTheDocument();
        expect(
            screen.getByText("Sign in to your CNERSH account")
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /^sign in$/i })
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("name@agency.gov.cm")
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Enter your password")
        ).toBeInTheDocument();
        expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    });

    it("shows validation errors when submitted with empty fields", async () => {
        render(<SignInForm />);
        fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

        expect(
            await screen.findByText("Email address is required")
        ).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
    });

    it("toggles password visibility when the eye icon is clicked", () => {
        render(<SignInForm />);

        const passwordInput = screen.getByPlaceholderText(
            "Enter your password"
        );
        expect(passwordInput).toHaveAttribute("type", "password");

        fireEvent.click(screen.getByLabelText("Show password"));
        expect(passwordInput).toHaveAttribute("type", "text");

        fireEvent.click(screen.getByLabelText("Hide password"));
        expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("handles successful login via email/password", async () => {
        mockSignInEmail.mockImplementation((_data, options) => {
            options.onSuccess();
            return Promise.resolve();
        });

        const { container } = render(<SignInForm />);
        fillForm("valid.user@gov.cm", "password12345");

        const form = container.querySelector("#signin-form");
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith(
                "Signed in successfully"
            );
            expect(mockPush).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("shows error toast when server returns an auth error", async () => {
        mockSignInEmail.mockImplementation((_data, options) => {
            options.onError({ error: { message: "Invalid credentials" } });
            return Promise.resolve();
        });

        const { container } = render(<SignInForm />);
        fillForm("wrong@gov.cm", "wrongpassword");

        const form = container.querySelector("#signin-form");
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                "Invalid credentials",
                undefined
            );
        });
    });

    it("shows the verification-specific message (with resend action) when the error mentions verify", async () => {
        mockSignInEmail.mockImplementation((_data, options) => {
            options.onError({
                error: { message: "Please verify your account first" },
            });
            return Promise.resolve();
        });

        const { container } = render(<SignInForm />);
        fillForm("unverified@gov.cm", "password12345");

        const form = container.querySelector("#signin-form");
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                "Please verify your email before signing in.",
                expect.objectContaining({
                    action: expect.objectContaining({
                        label: "Resend email",
                        onClick: expect.any(Function),
                    }),
                })
            );
        });

        // The resend action should navigate to the verify-email page
        // with the email encoded.
        const call = mockToastError.mock.calls.find(
            (c) =>
                c[0] === "Please verify your email before signing in."
        );
        const options = call?.[1] as
            | { action?: { onClick?: () => void } }
            | undefined;
        options?.action?.onClick?.();
        expect(mockPush).toHaveBeenCalledWith(
            `/verify-email?email=${encodeURIComponent("unverified@gov.cm")}`
        );
    });

    it("shows the 'verified' success toast when ?verified=1 is present", async () => {
        mockSearchParamsGet.mockImplementation((key: string) => {
            if (key === "verified") return "1";
            if (key === "email") return "user@gov.cm";
            return null;
        });

        render(<SignInForm />);

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith(
                "Email verified for user@gov.cm. You can now sign in."
            );
        });
    });

    it("shows a generic 'verified' toast when ?verified=1 is present without email", async () => {
        mockSearchParamsGet.mockImplementation((key: string) => {
            if (key === "verified") return "1";
            return null;
        });

        render(<SignInForm />);

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith(
                "Email verified. You can now sign in."
            );
        });
    });

    it("does not show any toast on a clean sign-in page", () => {
        mockSearchParamsGet.mockReturnValue(null);

        render(<SignInForm />);

        expect(mockToastSuccess).not.toHaveBeenCalled();
        expect(mockToastError).not.toHaveBeenCalled();
    });

    it("shows a generic error toast if the auth request crashes", async () => {
        mockSignInEmail.mockRejectedValue(new Error("Network Error"));

        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        const { container } = render(<SignInForm />);
        fillForm("crash@gov.cm", "password");

        const form = container.querySelector("#signin-form");
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                "Unable to sign in. Please try again later.",
                undefined
            );
        });

        consoleErrorSpy.mockRestore();
    });

    it("handles successful Google social sign-in with the verify-email callback", async () => {
        mockSignInSocial.mockResolvedValue(undefined);

        render(<SignInForm />);
        fireEvent.click(screen.getByText("Continue with Google"));

        expect(mockSignInSocial).toHaveBeenCalledWith({
            provider: "google",
            callbackURL: "/verify-email",
        });
    });

    it("shows an error if Google sign-in request fails", async () => {
        mockSignInSocial.mockRejectedValue(new Error("Provider Unreachable"));

        render(<SignInForm />);
        fireEvent.click(screen.getByText("Continue with Google"));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                "Unable to sign in with Google. Please try again.",
                undefined
            );
        });
    });

    it("toggles the 'remember me' checkbox state", () => {
        render(<SignInForm />);
        const checkbox = screen.getByLabelText(
            /Remember me/i
        ) as HTMLInputElement;

        expect(checkbox.checked).toBe(false);
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(true);
    });

    it("verifies navigation links have correct destinations", () => {
        render(<SignInForm />);

        const forgotLink = screen.getByText("Forgot password?");
        expect(forgotLink).toHaveAttribute("href", "/request-password");

        const createAccountLink = screen.getByRole("link", {
            name: "Create one",
        });
        expect(createAccountLink).toHaveAttribute("href", "/sign-up");
    });
});