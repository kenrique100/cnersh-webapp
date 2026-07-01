import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
    Spinner: function Spinner({ className }: { className?: string }) {
        return <span data-testid="spinner" className={className} />;
    },
}));

jest.mock("@/components/ui/card", () => ({
    Card: function Card({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
        return <div data-testid="card" {...props}>{children}</div>;
    },
    CardContent: function CardContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
        return <div data-testid="card-content" {...props}>{children}</div>;
    },
    CardHeader: function CardHeader({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
        return <div {...props}>{children}</div>;
    },
    CardTitle: function CardTitle({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
        return <h3 data-testid="card-title" {...props}>{children}</h3>;
    },
    CardDescription: function CardDescription({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
        return <p {...props}>{children}</p>;
    },
}));

jest.mock("@/components/ui/input", () => ({
    Input: function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
        return <input {...props} />;
    },
}));

jest.mock("@/components/ui/textarea", () => ({
    Textarea: function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
        return <textarea {...props} />;
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
    Badge: function Badge({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
        return <span {...props}>{children}</span>;
    },
}));

// SelectTrigger and SelectValue return null so they don't appear inside <select>.
// SelectContent is a fragment so its <option> children go straight into <select>.
jest.mock("@/components/ui/select", () => {
    function SelectItem({ children, value }: { children: React.ReactNode; value: string }) {
        return <option value={value}>{children}</option>;
    }
    function SelectContent({ children }: { children: React.ReactNode }) {
        return <>{children}</>;
    }
    function SelectTrigger(_props: { children?: React.ReactNode; className?: string }) {
        return null;
    }
    function SelectValue(_props: { placeholder?: string }) {
        return null;
    }
    function Select({
                        children,
                        onValueChange,
                        defaultValue,
                        disabled,
                    }: {
        children: React.ReactNode;
        onValueChange?: (value: string) => void;
        defaultValue?: string;
        disabled?: boolean;
    }) {
        const options: React.ReactNode[] = [];
        React.Children.forEach(children, (child) => {
            if (!React.isValidElement(child)) return;
            const name =
                (child.type as { displayName?: string; name?: string }).displayName ??
                (child.type as { displayName?: string; name?: string }).name;
            if (name === "SelectContent") options.push(child);
        });
        return (
            <div data-testid="select">
                <select
                    defaultValue={defaultValue}
                    disabled={disabled}
                    onChange={(e) => {
                        if (e.target.value) onValueChange?.(e.target.value);
                    }}
                >
                    {options}
                </select>
            </div>
        );
    }
    SelectItem.displayName = "SelectItem";
    SelectContent.displayName = "SelectContent";
    SelectTrigger.displayName = "SelectTrigger";
    SelectValue.displayName = "SelectValue";
    Select.displayName = "Select";
    return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

jest.mock("lucide-react", () => {
    function TrashIcon() { return <span data-testid="trash-icon" />; }
    function Loader2({ className }: { className?: string }) { return <span className={className} data-testid="loader2" />; }
    function UploadIcon() { return <span data-testid="upload-icon" />; }
    function CheckCircleIcon() { return <span data-testid="check-circle" />; }
    function CopyIcon() { return <span data-testid="copy-icon" />; }
    function ChevronLeftIcon() { return <span data-testid="chevron-left" />; }
    function ChevronRightIcon() { return <span data-testid="chevron-right" />; }
    function PlusIcon() { return <span data-testid="plus-icon" />; }
    function FileTextIcon() { return <span data-testid="file-text-icon" />; }
    function SaveIcon() { return <span data-testid="save-icon" />; }
    function AlertCircleIcon() { return <span data-testid="alert-circle" />; }
    function EyeIcon() { return <span data-testid="eye-icon" />; }
    return {
        TrashIcon, Loader2, UploadIcon, CheckCircleIcon, CopyIcon,
        ChevronLeftIcon, ChevronRightIcon, PlusIcon, FileTextIcon,
        SaveIcon, AlertCircleIcon, EyeIcon,
    };
});

// Per-test isolated localStorage — reset fully in beforeEach
let localStore: Record<string, string> = {};
const localStorageMock = {
    getItem: jest.fn((key: string) => localStore[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { localStore[key] = value; }),
    removeItem: jest.fn((key: string) => { delete localStore[key]; }),
    clear: jest.fn(() => { localStore = {}; }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Finds the first input/textarea under the closest .space-y-2 ancestor of
// a label matching the given pattern.
const fillField = (labelPattern: string, value: string) => {
    const labels = screen.getAllByText(new RegExp(labelPattern, "i"));
    for (const label of labels) {
        // Only look at actual <label> elements to avoid matching dot-nav buttons
        if (label.tagName !== "LABEL" && label.tagName !== "SPAN") continue;
        const container = label.closest(".space-y-2") ?? label.closest("div");
        if (!container) continue;
        const input = container.querySelector("input, textarea") as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null;
        if (input) {
            fireEvent.change(input, { target: { value } });
            return;
        }
    }
};

const selectOption = async (labelPattern: string, optionValue: string) => {
    const selects = screen.getAllByTestId("select");
    for (const selectWrapper of selects) {
        const parentDiv = selectWrapper.closest(".space-y-2");
        if (!parentDiv) continue;
        const label = parentDiv.querySelector("label");
        if (label && new RegExp(labelPattern, "i").test(label.textContent ?? "")) {
            const nativeSelect = selectWrapper.querySelector("select")!;
            await act(async () => {
                fireEvent.change(nativeSelect, { target: { value: optionValue } });
            });
            return;
        }
    }
};

// Fills all 18 steps so canSubmit becomes true.
// Literature Review needs > 50 chars (>= 50 in stepValid).
const fillAllSteps = async () => {
    // Step 1 — Protocol Info
    fillField("Protocol Title", "A Test Protocol Title That Is Long Enough");
    await selectOption("Study Type", "Clinical Trial");
    await selectOption("Research Field", "Public Health");
    fillField("Project Description", "This is a project description that is long enough for validation.");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 2 — Principal Investigator
    fillField("Full Name", "Dr. John Doe");
    fillField("Institution", "Some University");
    fillField("Email Address", "john@example.com");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 3 — Co-Investigators (always valid)
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 4 — Sponsor / Funding (always valid)
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 5 — Study Summary
    fillField("Study Summary in English", "This is the English summary that is long enough for validation.");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 6 — Background
    fillField("Research Background", "This is a research background that is long enough for validation requirement.");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 7 — Research Question
    fillField("Main Research Question", "What is the effect of X on Y? This is long enough.");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 8 — Objectives
    fillField("General Objective", "To investigate the effect of X on Y in this study.");
    const objInputs = screen.getAllByPlaceholderText(/Specific objective/i);
    if (objInputs[0]) fireEvent.change(objInputs[0], { target: { value: "Specific objective 1 long enough" } });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 9 — Literature Review (>= 50 chars; use 60 to be safe)
    const litReviewTextarea = screen.getByPlaceholderText(/write or paste your comprehensive literature review/i) as HTMLTextAreaElement;
    fireEvent.change(litReviewTextarea, { target: { value: "a".repeat(60) } });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 10 — Methodology
    fillField("Study Location", "Yaounde");
    fillField("Target Population", "Adults over 18");
    fillField("Sample Size", "200");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 11 — Ethics
    fillField("Participant Protection", "All measures taken for protection of participants.");
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Steps 12–17 are always valid — just click Next
    for (let i = 11; i <= 16; i++) {
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    }

    // Step 18 — Review & Submit: check confirmation checkbox
    fireEvent.click(screen.getByRole("checkbox"));
};

const makeSubmitResult = (trackingCode: string) => ({
    id: "proj-1",
    trackingCode,
    title: "Test Protocol",
    status: "SUBMITTED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

describe("ProtocolFormWizard", () => {
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
        expect(screen.getByText(/% complete/i)).toBeInTheDocument();
    });

    it("renders draft restored banner if localStorage has data", () => {
        localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ protocolTitle: "Saved Draft" }));
        render(<ProtocolFormWizard />);
        expect(screen.getByText(/A saved draft has been restored/i)).toBeInTheDocument();
    });

    it("can start fresh from saved draft", () => {
        localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ protocolTitle: "Saved" }));
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByText("Start fresh"));
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("cnersh-protocol-draft");
        const titleInput = screen.getByPlaceholderText(
            "Enter the full title of your research protocol",
        ) as HTMLInputElement;
        expect(titleInput.value).toBe("");
    });

    it("navigates to next step on Next click", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "A long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "This is a long enough description for validation.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        expect(screen.getByText(/Step 2 of 18/i)).toBeInTheDocument();
    });

    it("cannot go to previous step on first step", () => {
        render(<ProtocolFormWizard />);
        expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    });

    it("can go back to previous step", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "A long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "This is long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
        expect(screen.getByText(/Step 1 of 18/i)).toBeInTheDocument();
    });

    it("shows progress percentage updating", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Observational Study");
        await selectOption("Research Field", "Biomedical Sciences");
        fillField("Project Description", "This is a sufficiently long description for step 0.");
        await waitFor(() => {
            const el = screen.getByText(/% complete/i);
            expect(el).toBeInTheDocument();
            expect(el.textContent).toMatch(/\d+% complete/);
        });
    });

    it("saves draft when clicking Save Draft button", () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Draft Title");
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

    it("submits the form and shows success screen with tracking code", async () => {
        mockSubmitProject.mockResolvedValueOnce(makeSubmitResult("CNERSH-2026-ABC123"));
        render(<ProtocolFormWizard />);
        await fillAllSteps();

        const submitBtn = screen.getByRole("button", { name: /Submit Protocol/i });
        expect(submitBtn).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(submitBtn);
        });
        await waitFor(() => expect(mockSubmitProject).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(screen.getByText("Protocol Submitted Successfully!")).toBeInTheDocument(),
        );
        expect(screen.getByText("CNERSH-2026-ABC123")).toBeInTheDocument();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("cnersh-protocol-draft");
    });

    it("copies tracking code to clipboard", async () => {
        const writeText = jest.fn();
        Object.assign(navigator, { clipboard: { writeText } });
        mockSubmitProject.mockResolvedValueOnce(makeSubmitResult("CNERSH-2026-XYZ"));
        render(<ProtocolFormWizard />);
        await fillAllSteps();

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Submit Protocol/i }));
        });
        await waitFor(() => screen.getByText("CNERSH-2026-XYZ"));
        fireEvent.click(screen.getByTitle("Copy tracking code"));
        expect(writeText).toHaveBeenCalledWith("CNERSH-2026-XYZ");
        expect(mockToastSuccess).toHaveBeenCalledWith("Tracking code copied to clipboard!");
    });

    it("shows error toast on submit failure", async () => {
        mockSubmitProject.mockRejectedValueOnce(new Error("Network error"));
        render(<ProtocolFormWizard />);
        await fillAllSteps();

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Submit Protocol/i }));
        });
        await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Network error"));
    });

    it("shows generic error when rejection is not an Error", async () => {
        mockSubmitProject.mockRejectedValueOnce("some string");
        render(<ProtocolFormWizard />);
        await fillAllSteps();

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Submit Protocol/i }));
        });
        await waitFor(() =>
            expect(mockToastError).toHaveBeenCalledWith(
                "Failed to submit protocol. Please try again.",
            ),
        );
    });

    it("does not submit if canSubmit is false — button is disabled", async () => {
        render(<ProtocolFormWizard />);
        for (let i = 0; i < 17; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        // Without filling required fields the submit button must be disabled
        const submitBtn = screen.getByRole("button", { name: /Submit Protocol/i });
        expect(submitBtn).toBeDisabled();
        expect(mockSubmitProject).not.toHaveBeenCalled();
    });

    it("uploads a file and shows success", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: "https://cdn.example.com/file.pdf", name: "cv.pdf" }),
        });
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description of project.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        const fileInput = document.getElementById("pi-cv-upload") as HTMLInputElement;
        expect(fileInput).toBeInTheDocument();
        await act(async () => {
            fireEvent.change(fileInput, {
                target: { files: [new File(["dummy"], "cv.pdf", { type: "application/pdf" })] },
            });
        });
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(mockToastSuccess).toHaveBeenCalledWith("CV Upload uploaded successfully"),
        );
        expect(screen.getByText("cv.pdf")).toBeInTheDocument();
    });

    it("shows error toast on upload failure", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Server error" }),
        });
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        const fileInput = document.getElementById("pi-cv-upload") as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [new File([], "cv.pdf")] } });
        await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Server error"));
    });

    it("shows error if file size exceeds max", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        const fileInput = document.getElementById("pi-cv-upload") as HTMLInputElement;
        const largeFile = new File(
            ["x".repeat(9 * 1024 * 1024)],
            "large.pdf",
            { type: "application/pdf" },
        );
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
        expect(mockToastError).toHaveBeenCalledWith("File must be less than 8MB");
    });

    it("removes uploaded file", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: "https://cdn.example.com/file.pdf" }),
        });
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        const fileInput = document.getElementById("pi-cv-upload") as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [new File([], "cv.pdf")] } });
        await waitFor(() => expect(screen.getByText("cv.pdf")).toBeInTheDocument());
        fireEvent.click(screen.getAllByTestId("trash-icon")[0]);
        await waitFor(() => expect(screen.queryByText("cv.pdf")).not.toBeInTheDocument());
    });

    it("adds and removes co-investigator", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Full Name", "Dr. Test");
        fillField("Institution", "Inst");
        fillField("Email Address", "test@test.com");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        fireEvent.click(screen.getByRole("button", { name: /Add Co-Investigator/i }));
        expect(screen.getAllByText(/Co-Investigator 1/i).length).toBeGreaterThan(0);
        fireEvent.click(screen.getByTestId("trash-icon"));
        expect(screen.queryByText(/Co-Investigator 1/i)).not.toBeInTheDocument();
    });

    it("shows clinical trial documents when study type is Clinical Trial", async () => {
        render(<ProtocolFormWizard />);
        await fillAllSteps();
        fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
        fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
        expect(screen.getByText("Clinical Trial Documents")).toBeInTheDocument();
    });

    it("shows foreign sponsor documents when sponsor country is not Cameroon", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Full Name", "Dr. Test");
        fillField("Institution", "Inst");
        fillField("Email Address", "test@test.com");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Country", "USA");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        fillField("Study Summary in English", "a".repeat(20));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Research Background", "a".repeat(20));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Main Research Question", "a".repeat(10));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("General Objective", "a".repeat(10));
        fireEvent.change(
            screen.getAllByPlaceholderText(/Specific objective/i)[0],
            { target: { value: "a".repeat(5) } },
        );
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fireEvent.change(
            screen.getByPlaceholderText(/write or paste your comprehensive literature review/i),
            { target: { value: "a".repeat(50) } },
        );
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Study Location", "Yaounde");
        fillField("Target Population", "Adults");
        fillField("Sample Size", "100");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Participant Protection", "a".repeat(10));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        for (let i = 11; i <= 14; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        expect(screen.getByText(/Foreign Sponsor Documents/i)).toBeInTheDocument();
    });

    it("shows no additional documents message when not clinical trial and sponsor is Cameroon", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Observational Study");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Full Name", "Dr. Test");
        fillField("Institution", "Inst");
        fillField("Email Address", "test@test.com");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        fillField("Study Summary in English", "a".repeat(20));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Research Background", "a".repeat(20));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Main Research Question", "a".repeat(10));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("General Objective", "a".repeat(10));
        fireEvent.change(
            screen.getAllByPlaceholderText(/Specific objective/i)[0],
            { target: { value: "a".repeat(5) } },
        );
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fireEvent.change(
            screen.getByPlaceholderText(/write or paste your comprehensive literature review/i),
            { target: { value: "a".repeat(50) } },
        );
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Study Location", "Yaounde");
        fillField("Target Population", "Adults");
        fillField("Sample Size", "100");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        fillField("Participant Protection", "a".repeat(10));
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        for (let i = 11; i <= 14; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        expect(
            screen.getByText("No additional documents required for this submission type."),
        ).toBeInTheDocument();
    });

    it("shows incomplete sections warning on step 17 when not all steps are valid", async () => {
        render(<ProtocolFormWizard />);
        for (let i = 0; i < 17; i++) {
            fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        }
        expect(screen.getByText(/Some required sections are incomplete/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText("Step 1: Protocol Info"));
        expect(screen.getByText(/Step 1 of 18/i)).toBeInTheDocument();
    });

    it("navigates to a step by clicking the dot indicator", () => {
        render(<ProtocolFormWizard />);
        const step2Dot = document.querySelector(
            '[title*="Principal Investigator"]',
        ) as HTMLButtonElement;
        expect(step2Dot).toBeInTheDocument();
        fireEvent.click(step2Dot);
        expect(screen.getByText(/Step 2 of 18/i)).toBeInTheDocument();
    });

    it("turns completed step dot green after finishing step 1", async () => {
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));
        const step1Dot = document.querySelector('[title*="Protocol Info"]');
        expect(step1Dot?.className).toContain("bg-green-500");
    });

    it("autosaves draft every 30 seconds", () => {
        jest.useFakeTimers();
        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Autosave Test");
        act(() => { jest.advanceTimersByTime(30000); });
        expect(localStorageMock.setItem).toHaveBeenCalled();
        jest.useRealTimers();
    });

    it("calls delete blob API when removing file with bunny URL", async () => {
        process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = "https://cdn.example.com";
        const mockDelete = jest.fn().mockResolvedValue({ ok: true });
        global.fetch = jest.fn()
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ url: "https://cdn.example.com/files/cv.pdf" }),
                }),
            )
            .mockImplementationOnce(mockDelete);

        render(<ProtocolFormWizard />);
        fillField("Protocol Title", "Long enough title");
        await selectOption("Study Type", "Clinical Trial");
        await selectOption("Research Field", "Public Health");
        fillField("Project Description", "Long enough description.");
        fireEvent.click(screen.getByRole("button", { name: /Next/i }));

        const fileInput = document.getElementById("pi-cv-upload") as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [new File([], "cv.pdf")] } });
        await waitFor(() => expect(screen.getByText("cv.pdf")).toBeInTheDocument());
        fireEvent.click(screen.getAllByTestId("trash-icon")[0]);
        await waitFor(() =>
            expect(mockDelete).toHaveBeenCalledWith("/api/delete-blob", expect.any(Object)),
        );
    });

    it("navigates to protocols and home on success", async () => {
        mockSubmitProject.mockResolvedValueOnce(makeSubmitResult("CNERSH-2026-XYZ"));
        render(<ProtocolFormWizard />);
        await fillAllSteps();

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Submit Protocol/i }));
        });
        await waitFor(() => screen.getByText("View My Protocols"));
        fireEvent.click(screen.getByText("View My Protocols"));
        expect(mockPush).toHaveBeenCalledWith("/protocols");
        fireEvent.click(screen.getByText("Go to Homepage"));
        expect(mockPush).toHaveBeenCalledWith("/");
    });

    const stepNames = [
        "Protocol Info", "Principal Investigator", "Co-Investigators",
        "Sponsor / Funding", "Study Summary", "Background",
        "Research Question", "Objectives", "Literature Review",
        "Methodology", "Ethics", "Consent Documents",
        "Data Collection Tools", "Budget", "Authorization",
        "Additional Documents", "Payment Proof", "Review & Submit",
    ];

    stepNames.forEach((name, idx) => {
        it(`renders step ${idx + 1} (${name}) without crashing`, () => {
            render(<ProtocolFormWizard />);
            for (let i = 0; i < idx; i++) {
                fireEvent.click(screen.getByRole("button", { name: /Next/i }));
            }
            expect(
                screen.getByText(new RegExp(`Step ${idx + 1} of 18`, "i")),
            ).toBeInTheDocument();
        });
    });

    it("prevents submit if confirmation checkbox is unchecked", async () => {
        render(<ProtocolFormWizard />);
        await fillAllSteps();
        // Uncheck the checkbox that fillAllSteps checked
        fireEvent.click(screen.getByRole("checkbox"));
        // Button should now be disabled because confirmed=false makes step 17 invalid
        const submitBtn = screen.getByRole("button", { name: /Submit Protocol/i });
        expect(submitBtn).toBeDisabled();
        expect(mockSubmitProject).not.toHaveBeenCalled();
    });
});