import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProtocolFormWizard, {
    AUTOSAVE_KEY,
    initialProtocolFormState,
    STEP_LABELS,
} from "@/components/protocol-form-wizard";

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockSubmitProject = jest.fn();

jest.mock("sonner", () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

jest.mock("@/app/actions/project", () => ({
    submitProject: (...args: unknown[]) => mockSubmitProject(...args),
}));

describe("ProtocolFormWizard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.localStorage.clear();
        window.scrollTo = jest.fn();
        mockSubmitProject.mockResolvedValue({
            id: "project-1",
            trackingCode: "CNERSH-2026-TEST",
        });
    });

    it("renders the first step with accessible required controls", () => {
        render(<ProtocolFormWizard />);

        expect(screen.getByText("Step 1 of 18:")).toBeInTheDocument();
        expect(screen.getByLabelText("Protocol title")).toBeRequired();
        expect(screen.getByLabelText("Study type")).toBeRequired();
        expect(screen.getByLabelText("Research field")).toBeRequired();
        expect(screen.getByLabelText("Protocol description")).toBeRequired();
        expect(screen.getByRole("progressbar", { name: "Protocol completion" })).toBeInTheDocument();
    });

    it("exposes all 18 steps and their controls", () => {
        render(<ProtocolFormWizard />);

        STEP_LABELS.forEach((label, index) => {
            fireEvent.click(screen.getByRole("button", { name: new RegExp(`Step ${index + 1}: ${label}`) }));
            expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
        });
        expect(screen.getByLabelText(/I confirm that the information/i)).toBeInTheDocument();
    });

    it("validates the current step before continuing", () => {
        render(<ProtocolFormWizard />);

        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Enter a protocol title");
        expect(screen.getByText("Step 1 of 18:")).toBeInTheDocument();
    });

    it("supports multiple specific objectives", () => {
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByRole("button", { name: /Step 8: Objectives/ }));

        expect(screen.getByLabelText("Specific objective 1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Add objective" }));
        expect(screen.getByLabelText("Specific objective 2")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Specific objective 2"), {
            target: { value: "Measure participant retention" },
        });
        expect(screen.getByDisplayValue("Measure participant retention")).toBeInTheDocument();
    });

    it("adds and removes co-investigators", () => {
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByRole("button", { name: /Step 3: Co-Investigators/ }));

        expect(screen.getByText("No co-investigators added")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Add co-investigator" }));
        expect(screen.getByRole("group", { name: "Co-investigator 1" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Remove co-investigator 1" }));
        expect(screen.getByText("No co-investigators added")).toBeInTheDocument();
    });

    it("saves manually and autosaves every 30 seconds", () => {
        jest.useFakeTimers();
        const setItem = jest.spyOn(Storage.prototype, "setItem");
        render(<ProtocolFormWizard />);

        fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
        expect(setItem).toHaveBeenCalledWith(AUTOSAVE_KEY, expect.any(String));
        expect(mockToastSuccess).toHaveBeenCalledWith("Draft saved successfully");

        setItem.mockClear();
        act(() => {
            jest.advanceTimersByTime(30_000);
        });
        expect(setItem).toHaveBeenCalledWith(AUTOSAVE_KEY, expect.any(String));
        jest.useRealTimers();
    });

    it("restores and clears a compatible saved draft", () => {
        window.localStorage.setItem(
            AUTOSAVE_KEY,
            JSON.stringify({ ...initialProtocolFormState, protocolTitle: "Restored protocol" })
        );
        render(<ProtocolFormWizard />);

        expect(screen.getByText("A saved draft has been restored.")).toBeInTheDocument();
        expect(screen.getByLabelText("Protocol title")).toHaveValue("Restored protocol");
        fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
        expect(screen.getByLabelText("Protocol title")).toHaveValue("");
        expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
    });

    it("uploads a protocol document through the existing upload endpoint", async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://files.example/protocol.pdf", name: "protocol.pdf" }),
        } as Response);
        global.fetch = fetchMock;
        render(<ProtocolFormWizard />);

        const file = new File(["protocol"], "protocol.pdf", { type: "application/pdf" });
        fireEvent.change(screen.getByTestId("file-protocolDocument"), {
            target: { files: [file] },
        });

        await waitFor(() =>
            expect(screen.getByLabelText("Complete protocol document")).toHaveValue(
                "https://files.example/protocol.pdf"
            )
        );
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/upload",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("submits a complete protocol with normalized project fields and full form data", async () => {
        const completeDraft = {
            ...initialProtocolFormState,
            protocolTitle: "Community malaria prevention study",
            studyType: "Public Health Research",
            researchField: "Public Health",
            projectDescription: "A community study evaluating a malaria prevention strategy.",
            piFullName: "Dr Alice Nkeng",
            piInstitution: "University of Yaounde",
            piEmail: "alice@example.com",
            piQualification: "MD",
            studySummaryEnglish: "This study evaluates a community malaria prevention strategy.",
            researchBackground: "Malaria remains a substantial health burden in the proposed study communities.",
            studyRationale: "Evidence is needed to guide local prevention programs.",
            mainResearchQuestion: "Does the intervention reduce malaria incidence?",
            generalObjective: "Evaluate the effect of the malaria prevention intervention.",
            specificObjectives: ["Measure malaria incidence after implementation."],
            literatureReview:
                "Published studies support community prevention, but local implementation evidence remains limited.",
            methodStudyType: "Cohort",
            studyLocation: "Yaounde",
            targetPopulation: "Community residents",
            sampleSize: "250",
            dataCollectionMethods: "Trained staff will administer structured questionnaires.",
            dataAnalysisPlan: "Regression models will estimate adjusted intervention effects.",
            participantProtection: "Participation is voluntary and withdrawal is permitted at any time.",
            confidentialityMeasures: "Records will use study IDs and encrypted access-controlled storage.",
            potentialRisks: "Minimal interview discomfort will be mitigated by trained staff.",
            expectedBenefits: "The study may improve future community prevention services.",
            dataCollectionToolsDescription: "A structured questionnaire and case report form will be used.",
            totalBudget: "1200000",
            budgetCurrency: "XAF",
            authorizationInstitution: "University of Yaounde",
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(completeDraft));
        render(<ProtocolFormWizard />);
        fireEvent.click(screen.getByRole("button", { name: /Step 18: Review & Submit/ }));
        fireEvent.click(screen.getByLabelText(/I confirm that the information/i));
        fireEvent.click(screen.getByRole("button", { name: "Submit protocol" }));

        await waitFor(() => expect(mockSubmitProject).toHaveBeenCalledTimes(1));
        expect(mockSubmitProject).toHaveBeenCalledWith(
            expect.objectContaining({
                title: completeDraft.protocolTitle,
                category: completeDraft.studyType,
                location: completeDraft.studyLocation,
                budget: "1200000 XAF",
                objectives: expect.stringContaining("Measure malaria incidence"),
                formData: expect.objectContaining({
                    piFullName: "Dr Alice Nkeng",
                    confirmed: true,
                }),
            })
        );
        expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
        expect(mockToastSuccess).toHaveBeenCalledWith("Protocol submitted successfully");
    });
});
