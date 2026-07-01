import React from "react";
import { render, screen } from "@testing-library/react";
import ProjectSubmitClient from "@/components/project-submit-client";

jest.mock("@/components/protocol-form-wizard", () => ({
    __esModule: true,
    default: () => <div data-testid="protocol-form-wizard" />,
}));

describe("ProjectSubmitClient", () => {
    it("renders ProtocolFormWizard", () => {
        render(<ProjectSubmitClient />);
        expect(screen.getByTestId("protocol-form-wizard")).toBeInTheDocument();
    });
});