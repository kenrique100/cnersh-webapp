import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityPostModal } from "../CommunityPostModal";
import { CommunityUser } from "../types";

const mockUser: CommunityUser = { id: "u1", name: "Test User", image: null, role: "member" };

const defaultProps = {
    userProfileId: null,
    selectedUser: null,
    showBanDialog: false,
    setShowBanDialog: jest.fn(),
    showWarningDialog: false,
    setShowWarningDialog: jest.fn(),
    warningMessage: "",
    setWarningMessage: jest.fn(),
    banReason: "",
    setBanReason: jest.fn(),
    onSendWarning: jest.fn(),
    onBanUser: jest.fn(),
    onCloseUserProfile: jest.fn(),
    reportingReplyId: null,
    reportCategory: "",
    setReportCategory: jest.fn(),
    reportDetails: "",
    setReportDetails: jest.fn(),
    onSubmitReport: jest.fn(),
    onCloseReport: jest.fn(),
};

describe("CommunityPostModal", () => {
    beforeEach(() => jest.clearAllMocks());

    it("does not render any dialog when all IDs are null", () => {
        render(<CommunityPostModal {...defaultProps} />);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("opens user profile dialog when userProfileId is set", () => {
        render(<CommunityPostModal {...defaultProps} userProfileId="u1" selectedUser={mockUser} />);
        expect(screen.getByText("Test User")).toBeInTheDocument();
        expect(screen.getByText("Send Warning")).toBeInTheDocument();
        expect(screen.getByText("Ban User")).toBeInTheDocument();
    });

    it("clicking 'Send Warning' calls setShowWarningDialog(true)", () => {
        const setShowWarningDialog = jest.fn();
        render(
            <CommunityPostModal
                {...defaultProps}
                userProfileId="u1"
                selectedUser={mockUser}
                setShowWarningDialog={setShowWarningDialog}
            />
        );
        fireEvent.click(screen.getByText("Send Warning"));
        expect(setShowWarningDialog).toHaveBeenCalledWith(true);
    });

    it("opens the report dialog when reportingReplyId is set", () => {
        render(<CommunityPostModal {...defaultProps} reportingReplyId="r1" />);
        expect(screen.getByText("Report Message")).toBeInTheDocument();
        expect(screen.getByText("Submit Report")).toBeInTheDocument();
    });

    it("calls onSubmitReport when submit is clicked", async () => {
        const onSubmitReport = jest.fn();
        render(
            <CommunityPostModal
                {...defaultProps}
                reportingReplyId="r1"
                reportCategory="Spam"
                onSubmitReport={onSubmitReport}
            />
        );
        fireEvent.click(screen.getByText("Submit Report"));
        expect(onSubmitReport).toHaveBeenCalled();
    });

    it("disables submit report when no category selected", () => {
        render(<CommunityPostModal {...defaultProps} reportingReplyId="r1" />);
        expect(screen.getByText("Submit Report")).toBeDisabled();
    });

    it("calls onCloseReport when cancel in report dialog", () => {
        render(<CommunityPostModal {...defaultProps} reportingReplyId="r1" />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(defaultProps.onCloseReport).toHaveBeenCalled();
    });
});