import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectTracker from "@/components/project-tracker";

const mockTrackProjectByCode = jest.fn();
jest.mock("@/app/actions/project", () => ({
    trackProjectByCode: (...a: unknown[]) => mockTrackProjectByCode(...a),
}));

jest.mock("lucide-react", () => {
    function SearchIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="search-icon" {...props} />; }
    function FolderIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="folder-icon" {...props} />; }
    function TagIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="tag-icon" {...props} />; }
    function MapPinIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="map-pin-icon" {...props} />; }
    function CalendarIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="calendar-icon" {...props} />; }
    function Loader2({ className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { className?: string }) {
        return <span data-testid="loader2" className={className} {...props} />;
    }
    function CheckCircle2Icon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="check-circle" {...props} />; }
    function XCircleIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="x-circle" {...props} />; }
    function ClockIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="clock-icon" {...props} />; }
    function FileEditIcon(props: React.HTMLAttributes<HTMLSpanElement>) { return <span data-testid="file-edit" {...props} />; }
    return {
        SearchIcon,
        FolderIcon,
        TagIcon,
        MapPinIcon,
        CalendarIcon,
        Loader2,
        CheckCircle2Icon,
        XCircleIcon,
        ClockIcon,
        FileEditIcon,
    };
});

// Plain wrappers - forwardRef not needed for these tests
jest.mock("@/components/ui/input", () => ({
    Input: function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
        return <input {...props} />;
    },
}));

jest.mock("@/components/ui/button", () => ({
    Button: function Button({
                                children,
                                ...props
                            }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) {
        return <button {...props}>{children}</button>;
    },
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: function Badge({
                              children,
                              ...props
                          }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) {
        return <span {...props}>{children}</span>;
    },
}));

const mockProject = {
    trackingCode: "CNERSH-2026-ABC123",
    status: "SUBMITTED" as const,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-02-10T00:00:00.000Z",
};

describe("ProjectTracker", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders tracking form", () => {
        render(<ProjectTracker />);
        expect(screen.getByPlaceholderText(/CNERSH-2026-/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Track/i })).toBeInTheDocument();
    });

    it("disables track button when input is empty", () => {
        render(<ProjectTracker />);
        expect(screen.getByRole("button", { name: /Track/i })).toBeDisabled();
    });

    it("calls trackProjectByCode on submit", async () => {
        mockTrackProjectByCode.mockResolvedValueOnce(mockProject);
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "CNERSH-2026-ABC123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        await waitFor(() =>
            expect(mockTrackProjectByCode).toHaveBeenCalledWith("CNERSH-2026-ABC123"),
        );
    });

    it("shows result when project found", async () => {
        mockTrackProjectByCode.mockResolvedValueOnce(mockProject);
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "ABC" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        await waitFor(() =>
            expect(screen.getByText("CNERSH-2026-ABC123")).toBeInTheDocument(),
        );
    });

    it("shows error when project not found", async () => {
        mockTrackProjectByCode.mockResolvedValueOnce(null);
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "INVALID" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        await waitFor(() =>
            expect(screen.getByText(/No protocol found/i)).toBeInTheDocument(),
        );
    });

    it("shows error on network failure", async () => {
        mockTrackProjectByCode.mockRejectedValueOnce(new Error("Network error"));
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "ANY" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        await waitFor(() =>
            expect(screen.getByText(/Network error/i)).toBeInTheDocument(),
        );
    });

    it("clears error when user starts typing again", async () => {
        mockTrackProjectByCode.mockResolvedValueOnce(null);
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "INVALID" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        await waitFor(() => screen.getByText(/No protocol found/));

        fireEvent.change(input, {
            target: { value: "NEW" },
        });
        expect(screen.queryByText(/No protocol found/)).not.toBeInTheDocument();
    });

    it("shows loader while fetching", async () => {
        mockTrackProjectByCode.mockImplementationOnce(
            () => new Promise((resolve) => setTimeout(() => resolve(mockProject), 100)),
        );
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "ABC" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        expect(screen.getByTestId("loader2")).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.queryByTestId("loader2")).not.toBeInTheDocument(),
        );
    });

    it("displays unknown status if not in config", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockTrackProjectByCode.mockResolvedValueOnce({ ...mockProject, status: "UNKNOWN" as any });
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, {
            target: { value: "ABC" },
        });
        fireEvent.click(screen.getByRole("button", { name: /Track/i }));
        await waitFor(() =>
            expect(screen.getByText("Unknown Status")).toBeInTheDocument(),
        );
    });

    it("converts input to uppercase", () => {
        render(<ProjectTracker />);
        const input = screen.getByPlaceholderText(/CNERSH-2026-/i);
        fireEvent.change(input, { target: { value: "abc" } });
        expect((input as HTMLInputElement).value).toBe("ABC");
    });
});