import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsClient } from '@/components/reports-client';

const mockResolveReport       = jest.fn();
const mockSendWarning         = jest.fn();
const mockBanUserById         = jest.fn();
const mockDeleteReportedContent = jest.fn();

jest.mock('@/app/actions/admin', () => ({
    resolveReport:          (...a: unknown[]) => mockResolveReport(...a),
    sendWarning:            (...a: unknown[]) => mockSendWarning(...a),
    banUserById:            (...a: unknown[]) => mockBanUserById(...a),
    deleteReportedContent:  (...a: unknown[]) => mockDeleteReportedContent(...a),
}));

const mockRouterRefresh = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mockRouterRefresh }),
}));

jest.mock('@/components/ui/card', () => ({
    Card:        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardHeader:  ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardTitle:   ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/avatar', () => ({
    Avatar:        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarImage:   () => null,
    AvatarFallback:({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({
                 children, onClick, disabled,
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        children: React.ReactNode;
        variant?: string;
        size?: string;
    }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: ({
                   value, onChange, placeholder,
               }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
    ),
}));

jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({
                 children, open,
             }: { children: React.ReactNode; open: boolean }) =>
        open ? <div role="dialog">{children}</div> : null,
    DialogContent:     ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader:      ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle:       ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter:      ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => {
    const icon = (name: string) => {
        function Icon() { return <span data-testid={`icon-${name}`} />; }
        Icon.displayName = name;
        return Icon;
    };
    return {
        FlagIcon:          icon('Flag'),
        Trash2Icon:        icon('Trash2'),
        BanIcon:           icon('Ban'),
        AlertTriangleIcon: icon('AlertTriangle'),
        XCircleIcon:       icon('XCircle'),
        Loader2Icon:       icon('Loader2'),
    };
});

const baseReport = {
    id:          'r1',
    reason:      'Spam content',
    contentType: 'POST',
    contentId:   'post-1',
    status:      'PENDING',
    createdAt:   new Date('2024-01-01'),
    user: {
        id:    'u1',
        name:  'John Doe',
        email: 'john@example.com',
        image: null,
    },
};

// Helper: finds the Ban User button inside the open dialog (the confirm button),
// distinguished from the trigger button in the report list and the dialog heading.
function getBanConfirmButton(): HTMLElement {
    const dialog = screen.getByRole('dialog');
    // The last button inside the dialog footer is the confirm button.
    const buttons = Array.from(dialog.querySelectorAll('button'));
    return buttons[buttons.length - 1] as HTMLElement;
}

// Helper: finds the Send Warning confirm button inside the open dialog.
function getWarningConfirmButton(): HTMLElement {
    const dialog = screen.getByRole('dialog');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    return buttons[buttons.length - 1] as HTMLElement;
}

// Helper: finds the Ban User trigger button in the report list (outside any dialog).
function getBanTriggerButton(): HTMLElement {
    return screen
        .getAllByRole('button')
        .find(
            (b) =>
                b.textContent?.includes('Ban User') &&
                !b.closest('[role="dialog"]'),
        )!;
}

describe('ReportsClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveReport.mockResolvedValue(undefined);
        mockSendWarning.mockResolvedValue(undefined);
        mockBanUserById.mockResolvedValue(undefined);
        mockDeleteReportedContent.mockResolvedValue(undefined);
    });

    describe('empty state', () => {
        it('shows empty message when no reports', () => {
            render(<ReportsClient reports={[]} />);
            expect(screen.getByText('No reports')).toBeInTheDocument();
            expect(screen.getByText('No content has been reported yet')).toBeInTheDocument();
        });
    });

    describe('report list rendering', () => {
        it('renders reporter name', () => {
            render(<ReportsClient reports={[baseReport]} />);
            expect(screen.getByText('Report by John Doe')).toBeInTheDocument();
        });

        it('renders report reason', () => {
            render(<ReportsClient reports={[baseReport]} />);
            expect(screen.getByText('Spam content')).toBeInTheDocument();
        });

        it('renders content type badge', () => {
            render(<ReportsClient reports={[baseReport]} />);
            expect(screen.getByText('POST')).toBeInTheDocument();
        });

        it('renders status badge', () => {
            render(<ReportsClient reports={[baseReport]} />);
            expect(screen.getByText('PENDING')).toBeInTheDocument();
        });

        it('shows action buttons for pending reports', () => {
            render(<ReportsClient reports={[baseReport]} />);
            expect(screen.getByText('Delete Content')).toBeInTheDocument();
            // Use getAllByText because "Ban User" appears in both the button and later the dialog
            expect(screen.getAllByText('Ban User').length).toBeGreaterThan(0);
            expect(screen.getByText('Send Warning')).toBeInTheDocument();
            expect(screen.getByText('Dismiss')).toBeInTheDocument();
        });

        it('hides action buttons for non-pending reports', () => {
            render(<ReportsClient reports={[{ ...baseReport, status: 'REVIEWED' }]} />);
            expect(screen.queryByText('Delete Content')).not.toBeInTheDocument();
        });

        it('renders avatar fallback initial', () => {
            render(<ReportsClient reports={[baseReport]} />);
            expect(screen.getByText('J')).toBeInTheDocument();
        });

        it('falls back to U when user has no name', () => {
            const noName = { ...baseReport, user: { ...baseReport.user, name: null } };
            render(<ReportsClient reports={[noName]} />);
            expect(screen.getByText('U')).toBeInTheDocument();
        });
    });

    describe('handleDeleteContent', () => {
        it('calls deleteReportedContent and resolveReport then refreshes', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Delete Content'));
            await waitFor(() => {
                expect(mockDeleteReportedContent).toHaveBeenCalledWith('POST', 'post-1');
                expect(mockResolveReport).toHaveBeenCalledWith('r1', 'REVIEWED');
                expect(mockRouterRefresh).toHaveBeenCalled();
            });
        });

        it('logs error when deleteReportedContent fails', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockDeleteReportedContent.mockRejectedValueOnce(new Error('fail'));
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Delete Content'));
            await waitFor(() => expect(spy).toHaveBeenCalled());
            spy.mockRestore();
        });
    });

    describe('ban user flow', () => {
        it('opens ban dialog on Ban User click', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
            expect(screen.getByPlaceholderText('Reason for banning...')).toBeInTheDocument();
        });

        it('shows the reported user name in the ban dialog description', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            // "John Doe" appears in the dialog description inside a <strong>
            expect(
                screen.getByRole('dialog').querySelector('strong')?.textContent,
            ).toBe('John Doe');
        });

        it('disables ban confirm button when reason is empty', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            expect(getBanConfirmButton()).toBeDisabled();
        });

        it('enables ban confirm button when reason is filled', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Reason for banning...'), 'Repeated violations');
            expect(getBanConfirmButton()).not.toBeDisabled();
        });

        it('calls banUserById and resolveReport on confirm', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Reason for banning...'), 'Repeated violations');
            await user.click(getBanConfirmButton());
            await waitFor(() => {
                expect(mockBanUserById).toHaveBeenCalledWith('u1', 'Repeated violations');
                expect(mockResolveReport).toHaveBeenCalledWith('r1', 'REVIEWED');
                expect(mockRouterRefresh).toHaveBeenCalled();
            });
        });

        it('closes dialog and clears reason after successful ban', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Reason for banning...'), 'Bad actor');
            await user.click(getBanConfirmButton());
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('closes ban dialog on cancel and resets reason', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Reason for banning...'), 'something');
            await user.click(screen.getByText('Cancel'));
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('logs error when banUserById fails', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockBanUserById.mockRejectedValueOnce(new Error('fail'));
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(getBanTriggerButton());
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Reason for banning...'), 'reason');
            await user.click(getBanConfirmButton());
            await waitFor(() => expect(spy).toHaveBeenCalled());
            spy.mockRestore();
        });
    });

    describe('send warning flow', () => {
        it('opens warning dialog on Send Warning click', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Send Warning'));
            await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
        });

        it('disables send confirm button when message is empty', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Send Warning'));
            await waitFor(() => screen.getByRole('dialog'));
            expect(getWarningConfirmButton()).toBeDisabled();
        });

        it('calls sendWarning and resolveReport on confirm', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Send Warning'));
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Warning message...'), 'Please follow guidelines');
            await user.click(getWarningConfirmButton());
            await waitFor(() => {
                expect(mockSendWarning).toHaveBeenCalledWith('u1', 'Please follow guidelines');
                expect(mockResolveReport).toHaveBeenCalledWith('r1', 'REVIEWED');
                expect(mockRouterRefresh).toHaveBeenCalled();
            });
        });

        it('closes warning dialog on cancel', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Send Warning'));
            await waitFor(() => screen.getByRole('dialog'));
            await user.click(screen.getByText('Cancel'));
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('logs error when sendWarning fails', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockSendWarning.mockRejectedValueOnce(new Error('fail'));
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Send Warning'));
            await waitFor(() => screen.getByRole('dialog'));
            await user.type(screen.getByPlaceholderText('Warning message...'), 'msg');
            await user.click(getWarningConfirmButton());
            await waitFor(() => expect(spy).toHaveBeenCalled());
            spy.mockRestore();
        });
    });

    describe('dismiss flow', () => {
        it('calls resolveReport with DISMISSED status', async () => {
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Dismiss'));
            await waitFor(() => {
                expect(mockResolveReport).toHaveBeenCalledWith('r1', 'DISMISSED');
                expect(mockRouterRefresh).toHaveBeenCalled();
            });
        });

        it('logs error when dismiss fails', async () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            mockResolveReport.mockRejectedValueOnce(new Error('fail'));
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport]} />);
            await user.click(screen.getByText('Dismiss'));
            await waitFor(() => expect(spy).toHaveBeenCalled());
            spy.mockRestore();
        });
    });

    describe('multiple reports', () => {
        it('renders multiple report cards', () => {
            const second = {
                ...baseReport,
                id:   'r2',
                user: { ...baseReport.user, name: 'Jane Smith' },
            };
            render(<ReportsClient reports={[baseReport, second]} />);
            expect(screen.getByText('Report by John Doe')).toBeInTheDocument();
            expect(screen.getByText('Report by Jane Smith')).toBeInTheDocument();
        });

        it('disables only the buttons for the report currently loading', async () => {
            let resolveDelete!: () => void;
            mockDeleteReportedContent.mockReturnValue(
                new Promise<void>((r) => { resolveDelete = r; }),
            );
            const second = { ...baseReport, id: 'r2' };
            const user = userEvent.setup();
            render(<ReportsClient reports={[baseReport, second]} />);
            const deleteButtons = screen.getAllByText('Delete Content');
            await user.click(deleteButtons[0]);
            await waitFor(() => {
                expect(deleteButtons[0].closest('button')).toBeDisabled();
            });
            expect(deleteButtons[1].closest('button')).not.toBeDisabled();
            // Settle pending promise so no act() warning fires after the test
            resolveDelete();
            await waitFor(() => expect(mockRouterRefresh).toHaveBeenCalled());
        });
    });
});