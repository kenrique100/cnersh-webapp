import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProjectReviewClient from "@/components/project-review-client";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

const mockAssignProjectReviewer = jest.fn();
const mockAutoAssignProjectReviewer = jest.fn();
const mockReassignProjectReviewer = jest.fn();
jest.mock("@/app/actions/project", () => ({
    assignProjectReviewer: (...a: unknown[]) => mockAssignProjectReviewer(...a),
    autoAssignProjectReviewer: (...a: unknown[]) => mockAutoAssignProjectReviewer(...a),
    reassignProjectReviewer: (...a: unknown[]) => mockReassignProjectReviewer(...a),
}));

jest.mock("@/components/ui/card", () => ({
    Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div data-testid="card" {...props}>{children}</div>
    ),
    CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div data-testid="card-content" {...props}>{children}</div>
    ),
    CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
    ),
    CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 {...props}>{children}</h3>
    ),
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
        <span {...props}>{children}</span>
    ),
}));

jest.mock("@/components/ui/button", () => ({
    Button: function Button({
                                children,
                                ...props
                            }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) {
        return <button {...props}>{children}</button>;
    },
}));

// Extracts a plain text label from React children so it's safe to put inside <option>.
// The real SelectItem passes a <span> with nested elements — <option> can't hold those.
function extractText(node: React.ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (React.isValidElement(node)) {
        const { children } = node.props as { children?: React.ReactNode };
        return extractText(children);
    }
    return "";
}

const CONTENT_DISPLAY_NAME = "SelectContent";

function SelectContentMock({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
SelectContentMock.displayName = CONTENT_DISPLAY_NAME;

function SelectItemMock({ children, value }: { children: React.ReactNode; value: string }) {
    // <option> only allows plain text — strip out any nested elements
    return <option value={value}>{extractText(children)}</option>;
}
SelectItemMock.displayName = "SelectItem";

jest.mock("@/components/ui/select", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const R = require("react") as typeof React;

    function Select({
                        children,
                        onValueChange,
                        disabled,
                    }: {
        children: React.ReactNode;
        onValueChange?: (value: string) => void;
        defaultValue?: string;
        disabled?: boolean;
    }) {
        const options: React.ReactNode[] = [];
        R.Children.forEach(children, (child) => {
            if (!R.isValidElement(child)) return;
            const name = (child.type as { displayName?: string }).displayName;
            if (name === CONTENT_DISPLAY_NAME) options.push(child);
        });

        return (
            <div data-testid="select">
                <select
                    disabled={disabled}
                    onChange={(e) => {
                        if (e.target.value) onValueChange?.(e.target.value);
                    }}
                >
                    <option value="">Select admin...</option>
                    {options}
                </select>
            </div>
        );
    }
    Select.displayName = "Select";

    function SelectTrigger({ children }: { children?: React.ReactNode }) {
        return <>{children}</>;
    }
    SelectTrigger.displayName = "SelectTrigger";

    function SelectValue({ placeholder }: { placeholder?: string }) {
        return <span>{placeholder}</span>;
    }
    SelectValue.displayName = "SelectValue";

    return {
        Select,
        SelectTrigger,
        SelectValue,
        SelectContent: SelectContentMock,
        SelectItem: SelectItemMock,
    };
});

jest.mock("lucide-react", () => {
    function UserCheckIcon() { return <span data-testid="user-check" />; }
    function HashIcon() { return <span data-testid="hash-icon" />; }
    function ZapIcon() { return <span data-testid="zap-icon" />; }
    function RefreshCwIcon() { return <span data-testid="refresh-cw" />; }
    return { UserCheckIcon, HashIcon, ZapIcon, RefreshCwIcon };
});

jest.mock("@/lib/utils", () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(" "),
}));

const PROJECTS = [
    {
        id: "proj-1",
        trackingCode: "CNERSH-2026-001",
        title: "Project Alpha",
        description: "A test project",
        objectives: null,
        category: "Clinical Trial",
        location: "Yaounde",
        timeline: null,
        budget: null,
        document: null,
        status: "SUBMITTED",
        feedback: null,
        assignedToId: null,
        createdAt: new Date("2024-01-01"),
        user: { id: "user-1", name: "John Doe", email: "john@example.com", image: null },
    },
    {
        id: "proj-2",
        trackingCode: "CNERSH-2026-002",
        title: "Project Beta",
        description: "Another project",
        objectives: null,
        category: "Observational",
        location: null,
        timeline: null,
        budget: null,
        document: null,
        status: "PENDING_REVIEW",
        feedback: null,
        assignedToId: "admin-1",
        createdAt: new Date("2024-02-01"),
        user: { id: "user-2", name: "Jane Doe", email: "jane@example.com", image: null },
    },
    {
        id: "proj-3",
        trackingCode: "CNERSH-2026-003",
        title: "Project Gamma",
        description: "Non-assignable status",
        objectives: null,
        category: "Survey",
        location: null,
        timeline: null,
        budget: null,
        document: null,
        status: "DRAFT",
        feedback: null,
        assignedToId: null,
        createdAt: new Date("2024-03-01"),
        user: { id: "user-3", name: "Mike", email: "mike@example.com", image: null },
    },
] as const;

const ADMIN_USERS = [
    {
        id: "admin-1",
        name: "Alice",
        email: "alice@example.com",
        image: null,
        role: "superadmin",
        isAvailable: true,
        activeAssignmentCount: 0,
    },
    {
        id: "admin-2",
        name: "Bob",
        email: "bob@example.com",
        image: null,
        role: "admin",
        isAvailable: false,
        activeAssignmentCount: 2,
    },
];

function changeSelect(container: HTMLElement, value: string, index = 0) {
    const selects = container.querySelectorAll('[data-testid="select"] select');
    fireEvent.change(selects[index], { target: { value } });
}

describe("ProjectReviewClient", () => {
    beforeEach(() => jest.clearAllMocks());

    it("renders empty state when no projects", () => {
        render(<ProjectReviewClient projects={[]} />);
        expect(screen.getByText("No protocols to review")).toBeInTheDocument();
    });

    it("renders project cards", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} />);
        expect(screen.getByText("Project Alpha")).toBeInTheDocument();
        expect(screen.getByText("Project Beta")).toBeInTheDocument();
        expect(screen.getByText("Project Gamma")).toBeInTheDocument();
    });

    it("displays status badge for each project", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} />);
        expect(screen.getByText("SUBMITTED")).toBeInTheDocument();
        expect(screen.getByText("PENDING REVIEW")).toBeInTheDocument();
        expect(screen.getByText("DRAFT")).toBeInTheDocument();
    });

    it("displays tracking codes", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} />);
        expect(screen.getByText("CNERSH-2026-001")).toBeInTheDocument();
    });

    it("shows category and location", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} />);
        expect(screen.getByText(/Clinical Trial/)).toBeInTheDocument();
        expect(screen.getByText(/Yaounde/)).toBeInTheDocument();
    });

    it("shows assign section only for superadmin with ASSIGNABLE_STATUSES", () => {
        render(
            <ProjectReviewClient
                projects={[...PROJECTS]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        expect(screen.getAllByText("Manual Assign:")).toHaveLength(2);
    });

    it("does not show assign section when not superadmin", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} isSuperAdmin={false} />);
        expect(screen.queryByText("Manual Assign:")).not.toBeInTheDocument();
    });

    it("shows assigned-admin info when project has assignedToId", () => {
        render(
            <ProjectReviewClient
                projects={[PROJECTS[1]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        expect(screen.getByText(/Assigned to/)).toBeInTheDocument();
        expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("shows Auto-Assign button when no active assignment", () => {
        render(
            <ProjectReviewClient
                projects={[PROJECTS[0]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        expect(screen.getByText("Auto-Assign")).toBeInTheDocument();
    });

    it("calls autoAssignProjectReviewer on Auto-Assign click", async () => {
        mockAutoAssignProjectReviewer.mockResolvedValueOnce({});
        render(
            <ProjectReviewClient
                projects={[PROJECTS[0]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            fireEvent.click(screen.getByText("Auto-Assign"));
        });
        expect(mockAutoAssignProjectReviewer).toHaveBeenCalledWith("proj-1");
        await waitFor(() =>
            expect(mockToastSuccess).toHaveBeenCalledWith(
                "Protocol auto-assigned to an available reviewer",
            ),
        );
    });

    it("shows error toast on auto-assign failure", async () => {
        mockAutoAssignProjectReviewer.mockRejectedValueOnce(new Error("Auto error"));
        render(
            <ProjectReviewClient
                projects={[PROJECTS[0]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            fireEvent.click(screen.getByText("Auto-Assign"));
        });
        await waitFor(() =>
            expect(mockToastError).toHaveBeenCalledWith("Auto error"),
        );
    });

    it("shows Reassign button when project has active assignment", () => {
        render(
            <ProjectReviewClient
                projects={[PROJECTS[1]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        expect(screen.getByText("Reassign")).toBeInTheDocument();
    });

    it("calls reassignProjectReviewer on Reassign click", async () => {
        mockReassignProjectReviewer.mockResolvedValueOnce({});
        render(
            <ProjectReviewClient
                projects={[PROJECTS[1]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            fireEvent.click(screen.getByText("Reassign"));
        });
        expect(mockReassignProjectReviewer).toHaveBeenCalledWith("proj-2");
        await waitFor(() =>
            expect(mockToastSuccess).toHaveBeenCalledWith(
                "Protocol reassigned to next available reviewer",
            ),
        );
    });

    it("shows error toast on reassign failure", async () => {
        mockReassignProjectReviewer.mockRejectedValueOnce(new Error("Reassign error"));
        render(
            <ProjectReviewClient
                projects={[PROJECTS[1]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            fireEvent.click(screen.getByText("Reassign"));
        });
        await waitFor(() =>
            expect(mockToastError).toHaveBeenCalledWith("Reassign error"),
        );
    });

    it("calls assignProjectReviewer on manual select", async () => {
        mockAssignProjectReviewer.mockResolvedValueOnce({});
        const { container } = render(
            <ProjectReviewClient
                projects={[PROJECTS[0]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            changeSelect(container, "admin-1");
        });
        expect(mockAssignProjectReviewer).toHaveBeenCalledWith("proj-1", "admin-1");
        await waitFor(() =>
            expect(mockToastSuccess).toHaveBeenCalledWith("Reviewer assigned successfully"),
        );
    });

    it("shows error toast on assign failure", async () => {
        mockAssignProjectReviewer.mockRejectedValueOnce(new Error("Assign error"));
        const { container } = render(
            <ProjectReviewClient
                projects={[PROJECTS[0]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            changeSelect(container, "admin-1");
        });
        await waitFor(() =>
            expect(mockToastError).toHaveBeenCalledWith("Assign error"),
        );
    });

    it("navigates to protocol detail on title click", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} />);
        fireEvent.click(screen.getByText("Project Alpha"));
        expect(mockPush).toHaveBeenCalledWith("/protocols/proj-1");
    });

    it("navigates to protocol detail on description click", () => {
        render(<ProjectReviewClient projects={[...PROJECTS]} />);
        fireEvent.click(screen.getAllByText("A test project")[0]);
        expect(mockPush).toHaveBeenCalledWith("/protocols/proj-1");
    });

    it("disables select and buttons while loading", async () => {
        mockAssignProjectReviewer.mockImplementation(() => new Promise(() => {}));
        const { container } = render(
            <ProjectReviewClient
                projects={[PROJECTS[0]]}
                isSuperAdmin={true}
                adminUsers={ADMIN_USERS}
            />,
        );
        await act(async () => {
            changeSelect(container, "admin-1");
        });
        const nativeSelect = container.querySelector(
            '[data-testid="select"] select',
        ) as HTMLSelectElement;
        expect(nativeSelect).toBeDisabled();
        expect(screen.getByText("Auto-Assign")).toBeDisabled();
    });
});