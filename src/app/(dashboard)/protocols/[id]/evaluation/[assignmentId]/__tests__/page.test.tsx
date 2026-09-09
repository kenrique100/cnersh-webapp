import React from "react";
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { getMyEvaluationReport } from "@/app/actions/evaluation";
import { getProjectById } from "@/app/actions/project";
import { authIsRequired } from "@/lib/auth-utils";
import EvaluationPage from "../page";

jest.mock("@/lib/auth-utils", () => ({ authIsRequired: jest.fn() }));
jest.mock("@/app/actions/project", () => ({ getProjectById: jest.fn() }));
jest.mock("@/app/actions/evaluation", () => ({ getMyEvaluationReport: jest.fn() }));
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
        <a href={String(href)} {...props}>{children}</a>
    ),
}));
jest.mock("@/components/evaluation-form", () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => (
        <div data-testid="evaluation-form">{JSON.stringify(props)}</div>
    ),
}));

const mockAuth = jest.mocked(authIsRequired);
const mockGetProject = jest.mocked(getProjectById);
const mockGetReport = jest.mocked(getMyEvaluationReport);
const mockNotFound = jest.mocked(notFound);

const project = {
    id: "protocol-1",
    title: "Malaria protocol",
    reviewAssignments: [
        {
            id: "assignment-1",
            reviewerId: "reviewer-1",
            status: "ACTIVE",
            dueDate: new Date("2026-10-01T00:00:00.000Z"),
        },
    ],
};

describe("EvaluationPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "reviewer-1" } } as never);
        mockGetProject.mockResolvedValue(project as never);
        mockGetReport.mockResolvedValue({ id: "report-1", status: "DRAFT", socialValue: 4 } as never);
    });

    it("loads the assigned reviewer's report into the evaluation form", async () => {
        const ui = await EvaluationPage({
            params: Promise.resolve({ id: "protocol-1", assignmentId: "assignment-1" }),
        });
        render(ui);

        expect(screen.getByRole("heading", { name: "Reviewer evaluation" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to protocol" })).toHaveAttribute(
            "href",
            "/protocols/protocol-1"
        );
        expect(screen.getByTestId("evaluation-form")).toHaveTextContent('"assignmentId":"assignment-1"');
        expect(mockGetReport).toHaveBeenCalledWith("assignment-1");
    });

    it("rejects a different reviewer or non-active assignment", async () => {
        mockAuth.mockResolvedValue({ user: { id: "other-reviewer" } } as never);

        await expect(
            EvaluationPage({
                params: Promise.resolve({ id: "protocol-1", assignmentId: "assignment-1" }),
            })
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
        expect(mockGetReport).not.toHaveBeenCalled();
    });
});
