import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProtocolFormWizard, {
    AUTOSAVE_KEY,
    initialProtocolFormState,
    STEP_LABELS,
    type ProtocolFormPayload,
} from "@/components/protocol-form-wizard";

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockOnSubmit = jest.fn<Promise<void>, [ProtocolFormPayload]>();

jest.mock("sonner", () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

function renderWizard(
    props: Partial<React.ComponentProps<typeof ProtocolFormWizard>> = {}
) {
    return render(
        <ProtocolFormWizard
            onSubmit={mockOnSubmit}
            isSubmitting={false}
            disabled={false}
            {...props}
        />
    );
}

describe("ProtocolFormWizard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.localStorage.clear();
        window.scrollTo = jest.fn();
        mockOnSubmit.mockResolvedValue(undefined);
    });

    // ── initial render ────────────────────────────────────────────────

    it("renders the first step with accessible required controls", () => {
        renderWizard();

        expect(screen.getByText("Step 1 of 18:")).toBeInTheDocument();
        expect(screen.getByLabelText("Protocol title")).toBeRequired();
        expect(screen.getByLabelText("Study type")).toBeRequired();
        expect(screen.getByLabelText("Research field")).toBeRequired();
        expect(screen.getByLabelText("Protocol description")).toBeRequired();
        expect(
            screen.getByRole("progressbar", { name: "Protocol completion" })
        ).toBeInTheDocument();
    });

    it("exposes all 18 steps and their controls", () => {
        renderWizard();

        STEP_LABELS.forEach((label, index) => {
            fireEvent.click(
                screen.getByRole("button", {
                    name: new RegExp(`Step ${index + 1}: ${label}`),
                })
            );
            expect(
                screen.getByRole("heading", { name: label })
            ).toBeInTheDocument();
        });
        expect(
            screen.getByLabelText(/I confirm that the information/i)
        ).toBeInTheDocument();
    });

    // ── validation ────────────────────────────────────────────────────

    it("validates the current step before continuing", () => {
        renderWizard();

        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Enter a protocol title"
        );
        expect(screen.getByText("Step 1 of 18:")).toBeInTheDocument();
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("does not submit while an earlier step is incomplete", () => {
        renderWizard();
        fireEvent.click(
            screen.getByRole("button", { name: /Step 18: Review & Submit/ })
        );
        // The submit button is present but disabled because the form is incomplete.
        expect(
            screen.getByRole("button", { name: "Submit protocol" })
        ).toBeDisabled();
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    // ── dynamic list controls ─────────────────────────────────────────

    it("supports multiple specific objectives", () => {
        renderWizard();
        fireEvent.click(
            screen.getByRole("button", { name: /Step 8: Objectives/ })
        );

        expect(screen.getByLabelText("Specific objective 1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Add objective" }));
        expect(screen.getByLabelText("Specific objective 2")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Specific objective 2"), {
            target: { value: "Measure participant retention" },
        });
        expect(
            screen.getByDisplayValue("Measure participant retention")
        ).toBeInTheDocument();
    });

    it("adds and removes co-investigators", () => {
        renderWizard();
        fireEvent.click(
            screen.getByRole("button", { name: /Step 3: Co-Investigators/ })
        );

        expect(screen.getByText("No co-investigators added")).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole("button", { name: "Add co-investigator" })
        );
        expect(
            screen.getByRole("group", { name: "Co-investigator 1" })
        ).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole("button", { name: "Remove co-investigator 1" })
        );
        expect(screen.getByText("No co-investigators added")).toBeInTheDocument();
    });

    // ── draft persistence ─────────────────────────────────────────────

    it("saves manually and autosaves every 30 seconds", () => {
        jest.useFakeTimers();
        const setItem = jest.spyOn(Storage.prototype, "setItem");
        renderWizard();

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
            JSON.stringify({
                ...initialProtocolFormState,
                protocolTitle: "Restored protocol",
            })
        );
        renderWizard();

        expect(
            screen.getByText("A saved draft has been restored.")
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Protocol title")).toHaveValue(
            "Restored protocol"
        );
        fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
        expect(screen.getByLabelText("Protocol title")).toHaveValue("");
        expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
    });

    // ── document upload ───────────────────────────────────────────────

    it("uploads a protocol document through the existing upload endpoint", async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                url: "https://files.example/protocol.pdf",
                name: "protocol.pdf",
            }),
        } as Response);
        global.fetch = fetchMock;
        renderWizard();

        const file = new File(["protocol"], "protocol.pdf", {
            type: "application/pdf",
        });
        fireEvent.change(screen.getByTestId("file-protocolDocument"), {
            target: { files: [file] },
        });

        await waitFor(() =>
            expect(
                screen.getByLabelText("Complete protocol document")
            ).toHaveValue("https://files.example/protocol.pdf")
        );
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/upload",
            expect.objectContaining({ method: "POST" })
        );
    });

    // ── submission via onSubmit prop ──────────────────────────────────

    it("calls onSubmit with a normalized payload when the form is complete", async () => {
        const completeDraft = {
            ...initialProtocolFormState,
            protocolTitle: "Community malaria prevention study",
            studyType: "Public Health Research",
            researchField: "Public Health",
            projectDescription:
                "A community study evaluating a malaria prevention strategy.",
            piFullName: "Dr Alice Nkeng",
            piInstitution: "University of Yaounde",
            piEmail: "alice@example.com",
            piQualification: "MD",
            studySummaryEnglish:
                "This study evaluates a community malaria prevention strategy.",
            researchBackground:
                "Malaria remains a substantial health burden in the proposed study communities.",
            studyRationale:
                "Evidence is needed to guide local prevention programs.",
            mainResearchQuestion:
                "Does the intervention reduce malaria incidence?",
            generalObjective:
                "Evaluate the effect of the malaria prevention intervention.",
            specificObjectives: [
                "Measure malaria incidence after implementation.",
            ],
            literatureReview:
                "Published studies support community prevention, but local implementation evidence remains limited.",
            methodStudyType: "Cohort",
            studyLocation: "Yaounde",
            targetPopulation: "Community residents",
            sampleSize: "250",
            dataCollectionMethods:
                "Trained staff will administer structured questionnaires.",
            dataAnalysisPlan:
                "Regression models will estimate adjusted intervention effects.",
            participantProtection:
                "Participation is voluntary and withdrawal is permitted at any time.",
            confidentialityMeasures:
                "Records will use study IDs and encrypted access-controlled storage.",
            potentialRisks:
                "Minimal interview discomfort will be mitigated by trained staff.",
            expectedBenefits:
                "The study may improve future community prevention services.",
            dataCollectionToolsDescription:
                "A structured questionnaire and case report form will be used.",
            totalBudget: "1200000",
            budgetCurrency: "XAF",
            authorizationInstitution: "University of Yaounde",
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(completeDraft));
        renderWizard();
        fireEvent.click(
            screen.getByRole("button", { name: /Step 18: Review & Submit/ })
        );
        fireEvent.click(
            screen.getByLabelText(/I confirm that the information/i)
        );
        fireEvent.click(
            screen.getByRole("button", { name: "Submit protocol" })
        );

        await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
        expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                title: completeDraft.protocolTitle,
                category: completeDraft.studyType,
                location: completeDraft.studyLocation,
                budget: "1200000 XAF",
                objectives: expect.stringContaining(
                    "Measure malaria incidence"
                ),
                formData: expect.objectContaining({
                    piFullName: "Dr Alice Nkeng",
                    confirmed: true,
                }),
            })
        );
    });

    // ── controlled submitting state ───────────────────────────────────

    it("disables the submit button and shows a spinner while isSubmitting", () => {
        const completeDraft = {
            ...initialProtocolFormState,
            protocolTitle: "Test protocol",
            studyType: "Clinical Trial",
            researchField: "Public Health",
            projectDescription: "A description long enough to pass validation.",
            piFullName: "Dr X",
            piInstitution: "Inst",
            piEmail: "x@example.com",
            piQualification: "MD",
            studySummaryEnglish: "An English summary long enough to pass.",
            researchBackground: "Background long enough to pass validation.",
            studyRationale: "Rationale that passes validation length checks.",
            mainResearchQuestion: "What is the effect?",
            generalObjective: "Assess the effect of the intervention.",
            specificObjectives: ["Measure the primary outcome."],
            literatureReview:
                "A review of the literature long enough to pass validation.",
            methodStudyType: "Cohort",
            studyLocation: "Site",
            targetPopulation: "Adults",
            sampleSize: "100",
            dataCollectionMethods: "Questionnaires will be administered.",
            dataAnalysisPlan: "Regression will be used for analysis.",
            participantProtection: "Participation is fully voluntary.",
            confidentialityMeasures: "Data will be stored encrypted.",
            potentialRisks: "Minimal risks.",
            expectedBenefits: "Potential benefits include policy insight.",
            dataCollectionToolsDescription:
                "Structured questionnaire and CRF will be used.",
            totalBudget: "1000",
            budgetCurrency: "XAF",
            authorizationInstitution: "Inst",
            confirmed: true,
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(completeDraft));
        renderWizard({ isSubmitting: true });
        fireEvent.click(
            screen.getByRole("button", { name: /Step 18: Review & Submit/ })
        );

        const submit = screen.getByRole("button", { name: /Submitting/i });
        expect(submit).toBeDisabled();
        expect(submit).toHaveAttribute("aria-busy", "true");
    });

    it("disables the submit button when the disabled prop is set", () => {
        const completeDraft = {
            ...initialProtocolFormState,
            protocolTitle: "Test protocol",
            studyType: "Clinical Trial",
            researchField: "Public Health",
            projectDescription: "A description long enough to pass validation.",
            piFullName: "Dr X",
            piInstitution: "Inst",
            piEmail: "x@example.com",
            piQualification: "MD",
            studySummaryEnglish: "An English summary long enough to pass.",
            researchBackground: "Background long enough to pass validation.",
            studyRationale: "Rationale that passes validation length checks.",
            mainResearchQuestion: "What is the effect?",
            generalObjective: "Assess the effect of the intervention.",
            specificObjectives: ["Measure the primary outcome."],
            literatureReview:
                "A review of the literature long enough to pass validation.",
            methodStudyType: "Cohort",
            studyLocation: "Site",
            targetPopulation: "Adults",
            sampleSize: "100",
            dataCollectionMethods: "Questionnaires will be administered.",
            dataAnalysisPlan: "Regression will be used for analysis.",
            participantProtection: "Participation is fully voluntary.",
            confidentialityMeasures: "Data will be stored encrypted.",
            potentialRisks: "Minimal risks.",
            expectedBenefits: "Potential benefits include policy insight.",
            dataCollectionToolsDescription:
                "Structured questionnaire and CRF will be used.",
            totalBudget: "1000",
            budgetCurrency: "XAF",
            authorizationInstitution: "Inst",
            confirmed: true,
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(completeDraft));
        renderWizard({ disabled: true });
        fireEvent.click(
            screen.getByRole("button", { name: /Step 18: Review & Submit/ })
        );

        expect(
            screen.getByRole("button", { name: "Submit protocol" })
        ).toBeDisabled();
    });
});