import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AARClient from "../aar-client";
import { submitAARApplication } from "@/app/actions/aar";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/app/actions/aar", () => ({
    submitAARApplication: jest.fn(),
}));

const mockRouter = { refresh: jest.fn(), back: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const defaultProps = {
    projectId: "proj-1",
    projectTitle: "Test Protocol",
    application: {
        id: "app-1",
        status: "DRAFT",
        submittedAt: null,
        aarRefNumber: null,
        notes: null,
    },
};

describe("AARClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders draft state with notes and submit button", () => {
        render(<AARClient {...defaultProps} />);
        expect(screen.getByText("AAR Application")).toBeInTheDocument();
        expect(screen.getByText("Draft")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Add any relevant notes/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Submit AAR Application/i })).toBeInTheDocument();
    });

    it("shows submitted state when not draft", () => {
        const props = {
            ...defaultProps,
            application: {
                ...defaultProps.application,
                status: "SUBMITTED",
                submittedAt: new Date("2025-01-01"),
                aarRefNumber: "AAR-123",
            },
        };
        render(<AARClient {...props} />);

        // There are two elements with this text (badge and paragraph), so use getAllByText
        const statusElements = screen.getAllByText("Submitted to MINSANTE");
        expect(statusElements.length).toBeGreaterThan(0);

        // Verify AAR reference appears
        expect(screen.getByText(/AAR Reference:/)).toHaveTextContent("AAR-123");
        // Verify submitted date info
        expect(screen.getByText(/Application submitted on/)).toBeInTheDocument();
        // Ensure the submit button is not present (draft only)
        expect(screen.queryByRole("button", { name: /Submit AAR Application/i })).not.toBeInTheDocument();
    });

    it("submits notes and calls action, shows success toast", async () => {
        const user = userEvent.setup();
        render(<AARClient {...defaultProps} />);

        const notes = screen.getByPlaceholderText(/Add any relevant notes/i);
        await user.type(notes, "Test notes");

        const submitBtn = screen.getByRole("button", { name: /Submit AAR Application/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(submitAARApplication).toHaveBeenCalledWith("proj-1", "Test notes");
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("AAR application submitted"),
                expect.any(Object)
            );
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("handles submission error", async () => {
        (submitAARApplication as jest.Mock).mockRejectedValue(new Error("Network error"));
        const user = userEvent.setup();
        render(<AARClient {...defaultProps} />);

        await user.click(screen.getByRole("button", { name: /Submit AAR Application/i }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Network error");
        });
    });

    it("disables submit button while submitting", async () => {
        (submitAARApplication as jest.Mock).mockImplementation(() => new Promise(() => {}));
        const user = userEvent.setup();
        render(<AARClient {...defaultProps} />);

        const btn = screen.getByRole("button", { name: /Submit AAR Application/i });
        await user.click(btn);
        expect(btn).toBeDisabled();
        expect(btn).toHaveTextContent("Submitting...");
    });

    it("navigates back on cancel", async () => {
        const user = userEvent.setup();
        render(<AARClient {...defaultProps} />);
        await user.click(screen.getByRole("button", { name: /Cancel/i }));
        expect(mockRouter.back).toHaveBeenCalled();
    });
});