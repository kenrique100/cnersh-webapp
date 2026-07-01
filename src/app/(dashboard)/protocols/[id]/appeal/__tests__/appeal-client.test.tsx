import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AppealClient from "../appeal-client";
import { fileAppeal } from "@/app/actions/appeal";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/app/actions/appeal", () => ({
    fileAppeal: jest.fn(),
}));

const mockRouter = { push: jest.fn(), back: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const defaultProps = {
    projectId: "proj-1",
    projectTitle: "Test Protocol",
    daysRemaining: 5,
};

describe("AppealClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    it("renders initial state correctly", () => {
        render(<AppealClient {...defaultProps} />);

        // Page heading
        expect(screen.getByText("File an Appeal")).toBeInTheDocument();

        // Protocol subtitle
        expect(screen.getByText("Test Protocol")).toBeInTheDocument();

        // Use testid to get the appeal-window paragraph – it contains the day count
        const notice = screen.getByTestId("days-remaining-notice");
        expect(notice).toHaveTextContent(/You have\s+5\s+days\s+remaining/i);

        // Form fields
        expect(
            screen.getByPlaceholderText(/State the specific reasons/)
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/Provide any additional evidence/)
        ).toBeInTheDocument();

        // Submit button starts disabled (grounds is empty)
        const submitBtn = screen.getByRole("button", { name: /File Appeal/i });
        expect(submitBtn).toBeDisabled();

        // Character counter starts at 0
        expect(screen.getByText(/Current: 0/)).toBeInTheDocument();
    });

    it("renders the appeal window card heading", () => {
        render(<AppealClient {...defaultProps} />);
        expect(screen.getByText("Appeal Window")).toBeInTheDocument();
    });

    it("renders the appeal details card heading", () => {
        render(<AppealClient {...defaultProps} />);
        expect(screen.getByText("Appeal Details")).toBeInTheDocument();
    });

    it("renders back link pointing to the correct protocol", () => {
        render(<AppealClient {...defaultProps} />);
        const link = screen.getByRole("link", { name: /Back to Protocol/i });
        expect(link).toHaveAttribute("href", "/protocols/proj-1");
    });

    it("renders cancel button", () => {
        render(<AppealClient {...defaultProps} />);
        expect(
            screen.getByRole("button", { name: /Cancel/i })
        ).toBeInTheDocument();
    });

    it("displays '5 days' (plural) when daysRemaining is 5", () => {
        render(<AppealClient {...defaultProps} daysRemaining={5} />);
        const notice = screen.getByTestId("days-remaining-notice");
        expect(notice).toHaveTextContent(/You have\s+5\s+days\s+remaining/i);
    });

    it("displays '1 day' (singular) when daysRemaining is 1", () => {
        render(<AppealClient {...defaultProps} daysRemaining={1} />);
        const notice = screen.getByTestId("days-remaining-notice");
        expect(notice).toHaveTextContent(/You have\s+1\s+day\s+remaining/i);
        // Also ensure it does NOT say "days"
        expect(notice.textContent).not.toMatch(/1\s+days/i);
    });

    it("displays '0 days' (plural) when daysRemaining is 0", () => {
        render(<AppealClient {...defaultProps} daysRemaining={0} />);
        const notice = screen.getByTestId("days-remaining-notice");
        expect(notice).toHaveTextContent(/You have\s+0\s+days\s+remaining/i);
    });

    it("displays '10 days' (plural) when daysRemaining is 10", () => {
        render(<AppealClient {...defaultProps} daysRemaining={10} />);
        const notice = screen.getByTestId("days-remaining-notice");
        expect(notice).toHaveTextContent(/You have\s+10\s+days\s+remaining/i);
    });

    it("updates character counter as user types", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/State the specific reasons/);
        await user.type(textarea, "hello");

        expect(screen.getByText(/Current: 5/)).toBeInTheDocument();
    });

    it("keeps submit disabled when grounds has fewer than 50 characters", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/State the specific reasons/);
        await user.type(textarea, "a".repeat(49));

        expect(
            screen.getByRole("button", { name: /File Appeal/i })
        ).toBeDisabled();
    });

    it("enables submit when grounds reaches exactly 50 characters", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/State the specific reasons/);
        await user.type(textarea, "a".repeat(50));

        expect(
            screen.getByRole("button", { name: /File Appeal/i })
        ).toBeEnabled();
    });

    it("enables submit when grounds exceeds 50 characters", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/State the specific reasons/);
        await user.type(textarea, "a".repeat(100));

        expect(
            screen.getByRole("button", { name: /File Appeal/i })
        ).toBeEnabled();
    });

    it("shows error when grounds is empty on form submit", () => {
        render(<AppealClient {...defaultProps} />);

        const form = document.querySelector("form");
        expect(form).toBeInTheDocument();
        fireEvent.submit(form!);

        expect(toast.error).toHaveBeenCalledWith(
            "Please provide the grounds for your appeal"
        );
    });

    it("shows error when grounds is only whitespace on form submit", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/State the specific reasons/);
        await user.type(textarea, "   ");

        const form = document.querySelector("form");
        fireEvent.submit(form!);

        expect(toast.error).toHaveBeenCalledWith(
            "Please provide the grounds for your appeal"
        );
    });

    it("shows error when grounds is fewer than 50 characters on form submit", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        const textarea = screen.getByPlaceholderText(/State the specific reasons/);
        await user.type(textarea, "short");

        const form = document.querySelector("form");
        fireEvent.submit(form!);

        expect(toast.error).toHaveBeenCalledWith(
            "Appeal grounds must be at least 50 characters"
        );
    });

    it("submits successfully with both grounds and evidence", async () => {
        (fileAppeal as jest.Mock).mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );
        await user.type(
            screen.getByPlaceholderText(/Provide any additional evidence/),
            "some evidence"
        );

        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(fileAppeal).toHaveBeenCalledTimes(1);
            expect(fileAppeal).toHaveBeenCalledWith({
                projectId: "proj-1",
                grounds: expect.stringMatching(/^a{50}$/),
                evidence: "some evidence",
            });
            expect(toast.success).toHaveBeenCalledWith(
                "Appeal filed successfully. The committee president will review within 45 days."
            );
            expect(mockRouter.push).toHaveBeenCalledWith("/protocols/proj-1");
        });
    });

    it("submits successfully without evidence (evidence field left empty)", async () => {
        (fileAppeal as jest.Mock).mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );
        // Leave evidence blank

        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(fileAppeal).toHaveBeenCalledWith(
                expect.objectContaining({ evidence: undefined })
            );
            expect(toast.success).toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith("/protocols/proj-1");
        });
    });

    it("trims whitespace from grounds before submitting", async () => {
        (fileAppeal as jest.Mock).mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        // 50 'a' chars + surrounding spaces
        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            `  ${"a".repeat(50)}  `
        );

        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(fileAppeal).toHaveBeenCalledWith(
                expect.objectContaining({
                    grounds: expect.stringMatching(/^a{50}$/),
                })
            );
        });
    });

    it("shows the error message when fileAppeal rejects with an Error instance", async () => {
        (fileAppeal as jest.Mock).mockRejectedValue(new Error("Server error"));
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );
        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Server error");
        });
    });

    it("shows a generic message when fileAppeal rejects with a non-Error value", async () => {
        (fileAppeal as jest.Mock).mockRejectedValue("String error");
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );
        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to file appeal");
        });
    });

    it("does not call router.push when submission fails", async () => {
        (fileAppeal as jest.Mock).mockRejectedValue(new Error("Server error"));
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );
        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });

        expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("disables the submit button and shows 'Submitting...' while the request is in-flight", async () => {
        (fileAppeal as jest.Mock).mockImplementation(
            () => new Promise(() => {})
        );
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );

        const submitBtn = screen.getByRole("button", { name: /File Appeal/i });
        await user.click(submitBtn);

        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent("Submitting...");
    });

    it("re-enables the submit button after a failed submission", async () => {
        (fileAppeal as jest.Mock).mockRejectedValue(new Error("fail"));
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );

        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });

        expect(
            screen.getByRole("button", { name: /File Appeal/i })
        ).toBeEnabled();
    });

    it("calls router.back() when the Cancel button is clicked", async () => {
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.click(screen.getByRole("button", { name: /Cancel/i }));

        expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it("disables the Cancel button while submitting", async () => {
        (fileAppeal as jest.Mock).mockImplementation(
            () => new Promise(() => {})
        );
        const user = userEvent.setup();
        render(<AppealClient {...defaultProps} />);

        await user.type(
            screen.getByPlaceholderText(/State the specific reasons/),
            "a".repeat(50)
        );

        await user.click(screen.getByRole("button", { name: /File Appeal/i }));

        expect(
            screen.getByRole("button", { name: /Cancel/i })
        ).toBeDisabled();
    });
});