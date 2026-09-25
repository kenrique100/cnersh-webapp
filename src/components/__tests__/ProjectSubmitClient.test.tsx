import React from "react";
import { render, screen } from "@testing-library/react";

// Mock crypto.randomUUID for Jest jsdom environment to prevent ReferenceError
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    },
    configurable: true,
});

jest.mock("@/app/actions/project", () => ({
    __esModule: true,
    submitProject: jest.fn(),
}));

jest.mock("next/navigation", () => ({
    __esModule: true,
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        refresh: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

jest.mock("sonner", () => ({
    __esModule: true,
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warning: jest.fn(),
    },
}));

jest.mock("@/components/protocol-form-wizard", () => ({
    __esModule: true,
    default: () => <div data-testid="protocol-form-wizard" />,
}));

import ProjectSubmitClient from "@/components/project-submit-client";

describe("ProjectSubmitClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders ProtocolFormWizard", () => {
        render(<ProjectSubmitClient />);
        expect(screen.getByTestId("protocol-form-wizard")).toBeInTheDocument();
    });

    it("generates an idempotency key on mount", () => {
        render(<ProjectSubmitClient />);
        expect(global.crypto.randomUUID).toHaveBeenCalled();
    });
});