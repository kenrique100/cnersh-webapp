import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ProtocolFormWizard from "@/components/protocol-form-wizard";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

const mockSubmitProject = jest.fn();
jest.mock("@/app/actions/project", () => ({
    submitProject: (...a: unknown[]) => mockSubmitProject(...a),
    getProjectById: jest.fn(),
    getUserProjects: jest.fn(),
    getAllProjects: jest.fn(),
    updateProjectStatus: jest.fn(),
    deleteProject: jest.fn(),
    updateProject: jest.fn(),
    forwardProjectToFeed: jest.fn(),
    getAdminUsers: jest.fn(),
    assignProjectReviewer: jest.fn(),
    autoAssignProjectReviewer: jest.fn(),
    reassignProjectReviewer: jest.fn(),
    getProjectReviewAssignments: jest.fn(),
    trackProjectByCode: jest.fn(),
}));

jest.mock("@/components/ui/spinner", () => ({
    Spinner: ({ className }: { className?: string }) => (
        <span data-testid="spinner" className={className} />
    ),
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
        <h3 data-testid="card-title" {...props}>{children}</h3>
    ),
    CardDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p {...props}>{children}</p>
    ),
}));

jest.mock("@/components/ui/input", () => ({
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock("@/components/ui/button", () => ({
    Button: ({
                 children,
                 ...props
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("lucide-react", () => ({
    TrashIcon: () => <span data-testid="trash-icon" />,
    Loader2: ({ className }: { className?: string }) => <span className={className} data-testid="loader2" />,
    UploadIcon: () => <span data-testid="upload-icon" />,
    CheckCircleIcon: () => <span data-testid="check-circle" />,
    CopyIcon: () => <span data-testid="copy-icon" />,
    ChevronLeftIcon: () => <span data-testid="chevron-left" />,
    ChevronRightIcon: () => <span data-testid="chevron-right" />,
    PlusIcon: () => <span data-testid="plus-icon" />,
    FileTextIcon: () => <span data-testid="file-text-icon" />,
    SaveIcon: () => <span data-testid="save-icon" />,
    AlertCircleIcon: () => <span data-testid="alert-circle" />,
    EyeIcon: () => <span data-testid="eye-icon" />,
}));

// Isolated localStorage mock
let localStore: Record<string, string> = {};
const localStorageMock = {
    getItem: jest.fn((key: string) => localStore[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { localStore[key] = value; }),
    removeItem: jest.fn((key: string) => { delete localStore[key]; }),
    clear: jest.fn(() => { localStore = {}; }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("ProtocolFormWizard (skeleton – no form fields)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStore = {};
        localStorageMock.getItem.mockImplementation((key: string) => localStore[key] ?? null);
        localStorageMock.setItem.mockImplementation((key: string, value: string) => { localStore[key] = value; });
        localStorageMock.removeItem.mockImplementation((key: string) => { delete localStore[key]; });
        localStorageMock.clear.mockImplementation(() => { localStore = {}; });
    });

    it("renders step 1 by default", () => {
        render(<ProtocolFormWizard />);
        expect(screen.getByText(/Step 1 of 18/i)).toBeInTheDocument();
        expect(screen.getAllByText("Protocol Info").length).toBeGreaterThan(0);
    });

    it("shows progress bar with 44% complete initially", () => {
        render(<ProtocolFormWizard />);
        const progressText = screen.getByText(/% complete/i);
        expect(progressText).toHaveTextContent("44% complete");
    });

    it("can navigate to the next step and back", () => {
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        expect(screen.getByText(/Step 2 of 18/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
        expect(screen.getByText(/Step 1 of 18/i)).toBeInTheDocument();
    });

    it("Previous button is disabled on first step", () => {
        render(<ProtocolFormWizard />);
        expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    });

    it("Next button changes step title", () => {
        render(<ProtocolFormWizard />);
        for (let i = 0; i < 3; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        const title = screen.getByTestId("card-title");
        expect(title).toHaveTextContent(/Sponsor \/ Funding/i);
    });

    it("can navigate directly to a step using dot indicator", () => {
        render(<ProtocolFormWizard />);
        const secondDot = document.querySelector('[title*="Principal Investigator"]') as HTMLButtonElement;
        expect(secondDot).toBeInTheDocument();
        fireEvent.click(secondDot);
        expect(screen.getByText(/Step 2 of 18/i)).toBeInTheDocument();
    });

    it("shows 'Save Draft' button and clicking it saves to localStorage", () => {
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(mockToastSuccess).toHaveBeenCalledWith("Draft saved successfully");
    });

    it("shows error toast if localStorage fails on save draft", () => {
        localStorageMock.setItem.mockImplementationOnce(() => {
            throw new Error("quota exceeded");
        });
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));
        expect(mockToastError).toHaveBeenCalledWith("Failed to save draft");
    });

    it("shows draft restored banner when localStorage has data", () => {
        localStore["cnersh-protocol-draft"] = JSON.stringify({ protocolTitle: "Saved Draft" });
        render(<ProtocolFormWizard />);
        expect(screen.getByText(/A saved draft has been restored/i)).toBeInTheDocument();
    });

    it("can start fresh from saved draft", () => {
        localStore["cnersh-protocol-draft"] = JSON.stringify({ protocolTitle: "Saved" });
        render(<ProtocolFormWizard />);
        expect(screen.getByText(/A saved draft has been restored/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText("Start fresh"));
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("cnersh-protocol-draft");
        expect(screen.queryByText(/A saved draft has been restored/i)).not.toBeInTheDocument();
    });

    it("autosaves draft every 30 seconds", () => {
        jest.useFakeTimers();
        render(<ProtocolFormWizard />);
        act(() => {
            jest.advanceTimersByTime(30000);
        });
        expect(localStorageMock.setItem).toHaveBeenCalled();
        jest.useRealTimers();
    });

    it("Submit button is disabled because no fields are complete", () => {
        render(<ProtocolFormWizard />);
        for (let i = 0; i < 17; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        const submitBtn = screen.getByRole("button", { name: /Submit Protocol/i });
        expect(submitBtn).toBeDisabled();
    });

    it("does not call submitProject when submit button is clicked (disabled)", () => {
        render(<ProtocolFormWizard />);
        for (let i = 0; i < 17; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        fireEvent.click(screen.getByRole("button", { name: /Submit Protocol/i }));
        expect(mockSubmitProject).not.toHaveBeenCalled();
    });

    it("the step content card renders nothing (null)", () => {
        render(<ProtocolFormWizard />);
        const contentCards = screen.getAllByTestId("card");
        const contentCard = contentCards[1];
        const cardContent = contentCard.querySelector('[data-testid="card-content"]');
        expect(cardContent).toBeEmptyDOMElement();
    });
});