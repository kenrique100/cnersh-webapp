import { render, screen } from "@testing-library/react";
import * as React from "react";
import ProjectDetailPage from "../page";
import { authIsRequired } from "@/lib/auth-utils";
import { getProjectById } from "@/app/actions/project";
import { notFound } from "next/navigation";

jest.mock("@/lib/auth-utils", () => ({
    authIsRequired: jest.fn(),
}));

jest.mock("@/app/actions/project", () => ({
    getProjectById: jest.fn(),
}));

jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

jest.mock("next/link", () => {
    return function MockLink({
                                 href,
                                 children,
                                 ...rest
                             }: {
        href: string | { pathname?: string };
        children: React.ReactNode;
        [key: string]: unknown;
    }) {
        const resolvedHref = typeof href === "string" ? href : href?.pathname ?? "#";
        return (
            <a href={resolvedHref} {...rest}>
                {children}
            </a>
        );
    };
});

// Simplify the child client components - they are covered by their own test suites.
jest.mock("../project-detail-actions", () => ({
    __esModule: true,
    default: (props: {
        projectId: string;
        currentStatus: string;
        isOwner: boolean;
        isAdmin: boolean;
        projectTitle: string;
        projectObjectives: string | null;
        projectDescription: string;
    }) => (
        <div data-testid="project-detail-actions">
            {JSON.stringify({
                projectId: props.projectId,
                currentStatus: props.currentStatus,
                isOwner: props.isOwner,
                isAdmin: props.isAdmin,
            })}
        </div>
    ),
}));

jest.mock("../tracking-code-copy-button", () => ({
    __esModule: true,
    default: ({ trackingCode }: { trackingCode: string }) => (
        <button data-testid="tracking-copy-button">{trackingCode}</button>
    ),
}));

const mockedAuthIsRequired = jest.mocked(authIsRequired);
const mockedGetProjectById = jest.mocked(getProjectById);
const mockedNotFound = jest.mocked(notFound);

type ProjectFixtureOverrides = Record<string, unknown>;

function makeProject(overrides: ProjectFixtureOverrides = {}) {
    return {
        id: "project-1",
        trackingCode: "CNERSH-2026-ABCD1234",
        title: "Malaria Vaccine Trial",
        description: "A study into malaria vaccine efficacy in children.",
        objectives: "Reduce malaria incidence by 40%.",
        category: "Clinical Trial",
        location: "Yaoundé Regional Hospital",
        timeline: "12 months",
        budget: "$50,000",
        document: null,
        formData: null,
        feedback: null,
        status: "SUBMITTED",
        userId: "user-1",
        createdAt: "2026-01-15T10:00:00.000Z",
        updatedAt: "2026-01-15T10:00:00.000Z",
        user: { id: "user-1", name: "Dr. Alice Nkeng", email: "alice@example.com" },
        assignedTo: null,
        reviewAssignments: [],
        statusHistory: [
            {
                id: "hist-1",
                status: "SUBMITTED",
                comment: "Protocol submitted",
                createdAt: "2026-01-15T10:00:00.000Z",
            },
        ],
        appeal: null,
        aarApplication: null,
        saeReports: [],
        ...overrides,
    };
}

function makeSession(overrides: ProjectFixtureOverrides = {}) {
    return {
        user: {
            id: "user-1",
            name: "Dr. Alice Nkeng",
            email: "alice@example.com",
            role: "user",
            ...overrides,
        },
    };
}

async function renderPage(id = "project-1") {
    const ui = await ProjectDetailPage({ params: Promise.resolve({ id }) });
    return render(ui as React.ReactElement);
}

describe("ProjectDetailPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAuthIsRequired.mockResolvedValue(makeSession() as never);
    });

    it("calls notFound when getProjectById throws", async () => {
        mockedGetProjectById.mockRejectedValue(new Error("db error"));
        await expect(
            ProjectDetailPage({ params: Promise.resolve({ id: "project-1" }) }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockedNotFound).toHaveBeenCalled();
    });

    it("calls notFound when project is null", async () => {
        mockedGetProjectById.mockResolvedValue(null as never);
        await expect(
            ProjectDetailPage({ params: Promise.resolve({ id: "project-1" }) }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockedNotFound).toHaveBeenCalled();
    });

    it("renders the tracking code, title, and submitter info", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject() as never);
        await renderPage();
        expect(
            screen.getByText("CNERSH-2026-ABCD1234", { selector: "code" })
        ).toBeInTheDocument();
        expect(screen.getByText("Malaria Vaccine Trial")).toBeInTheDocument();
        expect(screen.getByText(/Submitted by Dr\. Alice Nkeng on/)).toBeInTheDocument();
        expect(screen.getByTestId("tracking-copy-button")).toBeInTheDocument();
    });

    it("renders the correct status badge label for a known status", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ status: "APPROVED_WITH_CONDITIONS" }) as never,
        );
        await renderPage();
        expect(screen.getByText("Approved with Conditions")).toBeInTheDocument();
    });

    it("falls back to the Draft status config for an unrecognized status", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ status: "SOME_UNKNOWN_STATUS" }) as never,
        );
        await renderPage();
        expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("renders description and objectives", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject() as never);
        await renderPage();
        expect(
            screen.getByText("A study into malaria vaccine efficacy in children."),
        ).toBeInTheDocument();
        expect(screen.getByText("Reduce malaria incidence by 40%.")).toBeInTheDocument();
    });

    it("does not render the Objectives card when objectives are absent", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ objectives: null }) as never,
        );
        await renderPage();
        expect(screen.queryByText("Objectives")).not.toBeInTheDocument();
    });

    it("renders location, timeline, and budget cards when present", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject() as never);
        await renderPage();
        expect(screen.getByText("Yaoundé Regional Hospital")).toBeInTheDocument();
        expect(screen.getByText("12 months")).toBeInTheDocument();
        expect(screen.getByText("$50,000")).toBeInTheDocument();
        expect(screen.getByText("Clinical Trial")).toBeInTheDocument();
    });

    it("omits location, timeline, and budget cards when not provided", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ location: null, timeline: null, budget: null }) as never,
        );
        await renderPage();
        expect(screen.queryByText("Location")).not.toBeInTheDocument();
        expect(screen.queryByText("Timeline")).not.toBeInTheDocument();
        expect(screen.queryByText("Budget")).not.toBeInTheDocument();
    });

    it("renders ProjectDetailActions for the owner with correct props", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ userId: "user-1" }) as never);
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "user" }) as never);
        await renderPage();
        const actions = screen.getByTestId("project-detail-actions");
        expect(actions).toHaveTextContent('"isOwner":true');
        expect(actions).toHaveTextContent('"isAdmin":false');
    });

    it("renders ProjectDetailActions for an admin who is not the owner", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ userId: "someone-else" }) as never);
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "admin" }) as never);
        await renderPage();
        const actions = screen.getByTestId("project-detail-actions");
        expect(actions).toHaveTextContent('"isOwner":false');
        expect(actions).toHaveTextContent('"isAdmin":true');
    });

    it("does not render ProjectDetailActions for a non-owner, non-admin viewer", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ userId: "someone-else" }) as never);
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "user" }) as never);
        await renderPage();
        expect(screen.queryByTestId("project-detail-actions")).not.toBeInTheDocument();
    });

    it("shows the Report SAE action for an owner with an approved protocol", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ userId: "user-1", status: "APPROVED" }) as never,
        );
        await renderPage();
        expect(screen.getByText("Available Actions")).toBeInTheDocument();
        expect(screen.getByText("Report SAE")).toBeInTheDocument();
    });

    it("shows the Start AAR Application action when approved and no AAR exists yet", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "user-1",
                status: "APPROVED",
                aarApplication: null,
            }) as never,
        );
        await renderPage();
        expect(screen.getByText("Start AAR Application")).toBeInTheDocument();
    });

    it("hides the Start AAR Application action once an AAR application exists", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "user-1",
                status: "APPROVED",
                aarApplication: { id: "aar-1", status: "PENDING", aarRefNumber: "AAR-1" },
            }) as never,
        );
        await renderPage();
        expect(screen.queryByText("Start AAR Application")).not.toBeInTheDocument();
    });

    it("shows File Appeal when status is RESUBMIT, no appeal filed yet, and within 30 days", async () => {
        const recentRejection = new Date();
        recentRejection.setDate(recentRejection.getDate() - 5);
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "user-1",
                status: "RESUBMIT",
                appeal: null,
                statusHistory: [
                    {
                        id: "hist-1",
                        status: "RESUBMIT",
                        comment: "Not sufficient detail",
                        createdAt: recentRejection.toISOString(),
                    },
                ],
            }) as never,
        );
        await renderPage();
        expect(screen.getByText("File Appeal")).toBeInTheDocument();
    });

    it("hides File Appeal once the 30-day window has closed", async () => {
        const staleRejection = new Date();
        staleRejection.setDate(staleRejection.getDate() - 45);
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "user-1",
                status: "RESUBMIT",
                appeal: null,
                statusHistory: [
                    {
                        id: "hist-1",
                        status: "RESUBMIT",
                        comment: "Not sufficient detail",
                        createdAt: staleRejection.toISOString(),
                    },
                ],
            }) as never,
        );
        await renderPage();
        expect(screen.queryByText("File Appeal")).not.toBeInTheDocument();
    });

    it("hides File Appeal when an appeal has already been filed", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "user-1",
                status: "RESUBMIT",
                appeal: { id: "appeal-1", status: "PENDING", filedAt: new Date().toISOString(), deadlineAt: null, decision: null },
            }) as never,
        );
        await renderPage();
        expect(screen.queryByText("File Appeal")).not.toBeInTheDocument();
    });

    it("does not render the Available Actions panel for non-owners", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ userId: "someone-else", status: "APPROVED" }) as never,
        );
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "admin" }) as never);
        await renderPage();
        expect(screen.queryByText("Available Actions")).not.toBeInTheDocument();
    });

    it("renders the admin assignment panel with assignment and reviewer details", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "someone-else",
                assignedTo: { id: "admin-1", name: "Admin Bob", email: "bob@example.com" },
                reviewAssignments: [
                    {
                        status: "ACTIVE",
                        reviewer: { id: "admin-1", name: "Admin Bob", email: "bob@example.com" },
                    },
                ],
            }) as never,
        );
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "admin" }) as never);
        await renderPage();
        expect(screen.getByText("Admin - Assignment & Review Details")).toBeInTheDocument();
        expect(screen.getAllByText("Admin Bob").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Status: ACTIVE")).toBeInTheDocument();
    });

    it("shows 'Not assigned' and 'No reviewer yet' when there is no assignment", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "someone-else",
                assignedTo: null,
                reviewAssignments: [],
            }) as never,
        );
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "superadmin" }) as never);
        await renderPage();
        expect(screen.getByText("Not assigned")).toBeInTheDocument();
        expect(screen.getByText("No reviewer yet")).toBeInTheDocument();
    });

    it("does not render the admin assignment panel for regular users", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ userId: "user-1" }) as never);
        mockedAuthIsRequired.mockResolvedValue(makeSession({ role: "user" }) as never);
        await renderPage();
        expect(
            screen.queryByText("Admin - Assignment & Review Details"),
        ).not.toBeInTheDocument();
    });

    it("shows the evaluation action only to the active assigned reviewer", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                userId: "protocol-owner",
                reviewAssignments: [
                    {
                        id: "assignment-1",
                        reviewerId: "reviewer-1",
                        status: "ACTIVE",
                        dueDate: "2026-10-01T00:00:00.000Z",
                        reviewer: {
                            id: "reviewer-1",
                            name: "Reviewer One",
                            email: "reviewer@example.com",
                        },
                        evaluationReport: { id: "report-1", status: "DRAFT" },
                    },
                ],
            }) as never,
        );
        mockedAuthIsRequired.mockResolvedValue(
            makeSession({ id: "reviewer-1", role: "admin" }) as never,
        );
        await renderPage();

        expect(screen.getByText("Your ethics review")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Continue evaluation" })).toHaveAttribute(
            "href",
            "/protocols/project-1/evaluation/assignment-1",
        );
    });

    it("renders document view and download links when a document is present", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ document: "https://files.example.com/protocol.pdf" }) as never,
        );
        await renderPage();
        expect(screen.getByText("Protocol Document")).toBeInTheDocument();
        const viewLink = screen.getByText("View Document").closest("a");
        const downloadLink = screen.getByText("Download").closest("a");
        expect(viewLink).toHaveAttribute("href", "https://files.example.com/protocol.pdf");
        expect(downloadLink).toHaveAttribute("href", "https://files.example.com/protocol.pdf");
    });

    it("does not render the document card when no document is attached", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ document: null }) as never);
        await renderPage();
        expect(screen.queryByText("Protocol Document")).not.toBeInTheDocument();
    });

    it("renders detailed formData sections when present", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                formData: {
                    piFullName: "Dr. Alice Nkeng",
                    piInstitution: "University of Yaoundé",
                    piEmail: "alice@example.com",
                    coInvestigators: [
                        { name: "Dr. Bob Eto", institution: "CHU", email: "bob@chu.cm", role: "Co-PI" },
                    ],
                    sponsorName: "Global Health Fund",
                    sponsorCountry: "Cameroon",
                    studySummaryEnglish: "A summary of the study in English.",
                    mainResearchQuestion: "Does the vaccine reduce incidence?",
                    generalObjective: "Improve child health outcomes.",
                    specificObjectives: ["Reduce cases by 40%", "Improve survey coverage"],
                    literatureReview: "Prior studies suggest a strong effect.",
                    studyLocation: "Yaoundé",
                    targetPopulation: "Children 2-10",
                    sampleSize: "500",
                    participantProtection: "Informed consent obtained from guardians.",
                    potentialRisks: "Minor injection site reactions.",
                    infoSheetEnglish: { url: "https://files.example.com/info-en.pdf", name: "Info Sheet EN" },
                },
            }) as never,
        );
        await renderPage();

        expect(screen.getByText("Principal Investigator")).toBeInTheDocument();
        // "Dr. Alice Nkeng" also appears in the "Submitted by" info card, so allow multiple matches.
        expect(screen.getAllByText("Dr. Alice Nkeng").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Co-Investigators")).toBeInTheDocument();
        expect(screen.getByText("Dr. Bob Eto")).toBeInTheDocument();
        expect(screen.getByText("Sponsor / Funding")).toBeInTheDocument();
        expect(screen.getByText("Global Health Fund")).toBeInTheDocument();
        expect(screen.getByText("Study Summary")).toBeInTheDocument();
        expect(screen.getByText("Research Question & Hypothesis")).toBeInTheDocument();
        expect(screen.getByText("Research Objectives")).toBeInTheDocument();
        expect(screen.getByText("Reduce cases by 40%")).toBeInTheDocument();
        expect(screen.getByText("Literature Review")).toBeInTheDocument();
        expect(screen.getByText("Methodology")).toBeInTheDocument();
        expect(screen.getByText("Ethical Considerations")).toBeInTheDocument();
        expect(screen.getByText("Uploaded Documents")).toBeInTheDocument();
        const infoLink = screen.getByText("Info Sheet EN").closest("a");
        expect(infoLink).toHaveAttribute("href", "https://files.example.com/info-en.pdf");
    });

    it("renders no formData sections when formData is absent", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ formData: null }) as never);
        await renderPage();
        expect(screen.queryByText("Principal Investigator")).not.toBeInTheDocument();
        expect(screen.queryByText("Sponsor / Funding")).not.toBeInTheDocument();
        expect(screen.queryByText("Uploaded Documents")).not.toBeInTheDocument();
    });

    it("renders reviewer feedback when present", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({ feedback: "Please clarify the sample size calculation." }) as never,
        );
        await renderPage();
        expect(screen.getByText("Reviewer Feedback")).toBeInTheDocument();
        expect(
            screen.getByText("Please clarify the sample size calculation."),
        ).toBeInTheDocument();
    });

    it("does not render the feedback card when there is no feedback", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ feedback: null }) as never);
        await renderPage();
        expect(screen.queryByText("Reviewer Feedback")).not.toBeInTheDocument();
    });

    it("renders status history entries with labels and comments", async () => {
        mockedGetProjectById.mockResolvedValue(
            makeProject({
                statusHistory: [
                    {
                        id: "hist-2",
                        status: "UNDER_REVIEW",
                        comment: "Assigned to reviewer",
                        createdAt: "2026-02-01T09:00:00.000Z",
                    },
                    {
                        id: "hist-1",
                        status: "SUBMITTED",
                        comment: "Protocol submitted",
                        createdAt: "2026-01-15T10:00:00.000Z",
                    },
                ],
            }) as never,
        );
        await renderPage();
        expect(screen.getByText("Status History")).toBeInTheDocument();
        expect(screen.getByText("Under Review")).toBeInTheDocument();
        expect(screen.getByText("Assigned to reviewer")).toBeInTheDocument();
        expect(screen.getByText("Protocol submitted")).toBeInTheDocument();
    });

    it("does not render the Status History card when there is no history", async () => {
        mockedGetProjectById.mockResolvedValue(makeProject({ statusHistory: [] }) as never);
        await renderPage();
        expect(screen.queryByText("Status History")).not.toBeInTheDocument();
    });
});
