import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EvaluationForm from "@/components/evaluation-form";

const mockSaveDraft = jest.fn();
const mockSubmitReport = jest.fn();
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/app/actions/evaluation", () => ({
    saveEvaluationDraft: (...args: unknown[]) => mockSaveDraft(...args),
    submitEvaluationReport: (...args: unknown[]) => mockSubmitReport(...args),
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("sonner", () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

const scoreKeys = [
    "socialValue",
    "scientificValidity",
    "riskBenefitAnalysis",
    "participantSelection",
    "informedConsentProcess",
    "confidentialityDataProtection",
    "collaborativePartnership",
];

const commentLabels = [
    "socialValueComment",
    "scientificValidityComment",
    "riskBenefitAnalysisComment",
    "participantSelectionComment",
    "informedConsentProcessComment",
    "confidentialityDataProtectionComment",
    "collaborativePartnershipComment",
];

function renderForm() {
    return render(
        <EvaluationForm
            assignmentId="assignment-1"
            protocolId="protocol-1"
            protocolTitle="Malaria prevention protocol"
            dueDate="2026-10-01T00:00:00.000Z"
        />
    );
}

describe("EvaluationForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSaveDraft.mockResolvedValue({ id: "report-1", status: "DRAFT" });
        mockSubmitReport.mockResolvedValue({ id: "report-1" });
    });

    it("renders all seven rubric criteria with labeled scores and comments", () => {
        renderForm();

        expect(screen.getByText("Malaria prevention protocol")).toBeInTheDocument();
        expect(screen.getAllByLabelText(/Score/)).toHaveLength(7);
        expect(screen.getAllByLabelText(/Reviewer comment/)).toHaveLength(7);
        expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("saves an incomplete evaluation as a draft", async () => {
        renderForm();
        fireEvent.change(screen.getByTestId("select-socialValue"), { target: { value: "4" } });
        fireEvent.change(screen.getByTestId("textarea-socialValueComment"), {
            target: { value: "The study addresses an important local need." },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

        await waitFor(() =>
            expect(mockSaveDraft).toHaveBeenCalledWith(
                "assignment-1",
                expect.objectContaining({
                    socialValue: 4,
                    socialValueComment: "The study addresses an important local need.",
                })
            )
        );
        expect(mockToastSuccess).toHaveBeenCalledWith("Evaluation draft saved");
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("shows validation errors instead of submitting incomplete scores", () => {
        renderForm();
        fireEvent.click(screen.getByRole("button", { name: "Submit evaluation" }));

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Social value: select a score from 1 to 5."
        );
        expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it("calculates an average and submits a complete validated evaluation", async () => {
        renderForm();
        scoreKeys.forEach((key, index) => {
            fireEvent.change(screen.getByTestId(`select-${key}`), {
                target: { value: String(index % 2 === 0 ? 4 : 3) },
            });
        });
        commentLabels.forEach((key) => {
            fireEvent.change(screen.getByTestId(`textarea-${key}`), {
                target: { value: "The criterion is adequately addressed in the protocol." },
            });
        });
        fireEvent.click(screen.getByLabelText("Favorable with conditions"));
        fireEvent.change(screen.getByLabelText(/General comments/), {
            target: {
                value: "The protocol is acceptable after the listed conditions are addressed.",
            },
        });
        fireEvent.click(screen.getByLabelText(/I confirm that I completed this evaluation/i));

        expect(screen.getByTestId("overall-score")).toHaveTextContent("3.6 / 5");
        fireEvent.click(screen.getByRole("button", { name: "Submit evaluation" }));

        await waitFor(() => expect(mockSubmitReport).toHaveBeenCalledTimes(1));
        expect(mockSubmitReport).toHaveBeenCalledWith(
            "assignment-1",
            expect.objectContaining({
                socialValue: 4,
                scientificValidity: 3,
                overallScore: 3.6,
                recommendation: "FAVORABLE_WITH_CONDITIONS",
            })
        );
        expect(mockPush).toHaveBeenCalledWith("/protocols/protocol-1");
        expect(mockToastSuccess).toHaveBeenCalledWith("Evaluation report submitted");
    });

    it("loads an existing draft", () => {
        render(
            <EvaluationForm
                assignmentId="assignment-1"
                protocolId="protocol-1"
                protocolTitle="Draft protocol"
                initialReport={{
                    socialValue: 5,
                    socialValueComment: "Strong and clearly described social value.",
                    recommendation: "FAVORABLE",
                    generalComments: "A partially completed reviewer draft.",
                }}
            />
        );

        expect(screen.getByTestId("select-socialValue")).toHaveValue("5");
        expect(screen.getByTestId("textarea-socialValueComment")).toHaveValue(
            "Strong and clearly described social value."
        );
        expect(screen.getByLabelText("Favorable")).toBeChecked();
        expect(screen.getByLabelText(/General comments/)).toHaveValue(
            "A partially completed reviewer draft."
        );
    });
});
