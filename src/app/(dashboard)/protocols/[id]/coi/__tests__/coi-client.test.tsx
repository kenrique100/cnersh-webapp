import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import COIDeclarationClient from "../coi-client";
import { submitCOIDeclaration } from "@/app/actions/coi";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));
jest.mock("@/app/actions/coi", () => ({
    submitCOIDeclaration: jest.fn(),
}));

const mockRouter = { push: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const defaultProps = {
    assignmentId: "assign-1",
    projectId: "proj-1",
    projectTitle: "Test Protocol",
    projectCategory: "Clinical Trial",
};

describe("COIDeclarationClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders initial state", () => {
        render(<COIDeclarationClient {...defaultProps} />);
        expect(screen.getByText("Conflict of Interest Declaration")).toBeInTheDocument();
        expect(screen.getByText("No Conflict of Interest")).toBeInTheDocument();
        expect(screen.getByText("Conflict of Interest")).toBeInTheDocument();
        const submitBtn = screen.getByRole("button", { name: /Submit Declaration/i });
        expect(submitBtn).toBeDisabled();
        expect(screen.queryByPlaceholderText(/Describe the nature of your conflict/i)).not.toBeInTheDocument();
    });

    it("shows details textarea when Conflict selected", async () => {
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const coiBtn = screen.getByText("Conflict of Interest").closest("button")!;
        await user.click(coiBtn);
        expect(screen.getByPlaceholderText(/Describe the nature of your conflict/i)).toBeInTheDocument();
        const submitBtn = screen.getByRole("button", { name: /Declare Conflict of Interest/i });
        expect(submitBtn).toBeEnabled();
    });

    it("hides details textarea when No Conflict selected", async () => {
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const noBtn = screen.getByText("No Conflict of Interest").closest("button")!;
        await user.click(noBtn);
        expect(screen.queryByPlaceholderText(/Describe the nature of your conflict/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Confirm No Conflict of Interest/i })).toBeEnabled();
    });

    it("button is disabled initially; cannot submit without selection", () => {
        render(<COIDeclarationClient {...defaultProps} />);
        const submitBtn = screen.getByRole("button", { name: /Submit Declaration/i });
        expect(submitBtn).toBeDisabled();
        // No toast called because click does nothing
    });

    it("shows error if COI selected but no details", async () => {
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const coiBtn = screen.getByText("Conflict of Interest").closest("button")!;
        await user.click(coiBtn);
        const submitBtn = screen.getByRole("button", { name: /Declare Conflict of Interest/i });
        await user.click(submitBtn);
        expect(toast.error).toHaveBeenCalledWith("Please describe your conflict of interest");
    });

    it("submits No COI successfully", async () => {
        (submitCOIDeclaration as jest.Mock).mockResolvedValue({ hasCOI: false });
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const noBtn = screen.getByText("No Conflict of Interest").closest("button")!;
        await user.click(noBtn);
        const submitBtn = screen.getByRole("button", { name: /Confirm No Conflict of Interest/i });
        await user.click(submitBtn);
        await waitFor(() => {
            expect(submitCOIDeclaration).toHaveBeenCalledWith({
                assignmentId: "assign-1",
                hasCOI: false,
                details: undefined,
            });
            expect(toast.success).toHaveBeenCalledWith("No-COI declaration submitted. You now have access to the protocol documents.");
            expect(mockRouter.push).toHaveBeenCalledWith("/protocols/proj-1");
        });
    });

    it("submits COI successfully", async () => {
        (submitCOIDeclaration as jest.Mock).mockResolvedValue({ hasCOI: true });
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const coiBtn = screen.getByText("Conflict of Interest").closest("button")!;
        await user.click(coiBtn);
        const details = screen.getByPlaceholderText(/Describe the nature of your conflict/i);
        await user.type(details, "Personal relationship");
        const submitBtn = screen.getByRole("button", { name: /Declare Conflict of Interest/i });
        await user.click(submitBtn);
        await waitFor(() => {
            expect(submitCOIDeclaration).toHaveBeenCalledWith({
                assignmentId: "assign-1",
                hasCOI: true,
                details: "Personal relationship",
            });
            expect(toast.warning).toHaveBeenCalledWith("COI declared. You have been excluded from this review. The secretariat has been notified.");
            expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("handles submission error", async () => {
        (submitCOIDeclaration as jest.Mock).mockRejectedValue(new Error("Server error"));
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const noBtn = screen.getByText("No Conflict of Interest").closest("button")!;
        await user.click(noBtn);
        const submitBtn = screen.getByRole("button", { name: /Confirm No Conflict of Interest/i });
        await user.click(submitBtn);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Server error");
        });
    });

    it("handles non-Error exception", async () => {
        (submitCOIDeclaration as jest.Mock).mockRejectedValue("String error");
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const noBtn = screen.getByText("No Conflict of Interest").closest("button")!;
        await user.click(noBtn);
        const submitBtn = screen.getByRole("button", { name: /Confirm No Conflict of Interest/i });
        await user.click(submitBtn);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to submit declaration");
        });
    });

    it("disables button while submitting", async () => {
        (submitCOIDeclaration as jest.Mock).mockImplementation(() => new Promise(() => {}));
        const user = userEvent.setup();
        render(<COIDeclarationClient {...defaultProps} />);
        const noBtn = screen.getByText("No Conflict of Interest").closest("button")!;
        await user.click(noBtn);
        const submitBtn = screen.getByRole("button", { name: /Confirm No Conflict of Interest/i });
        await user.click(submitBtn);
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent("Submitting...");
    });

    it("renders back link to dashboard", () => {
        render(<COIDeclarationClient {...defaultProps} />);
        const link = screen.getByRole("link", { name: /Back to Dashboard/i });
        expect(link).toHaveAttribute("href", "/dashboard");
    });
});