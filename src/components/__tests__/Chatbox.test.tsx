import React from 'react';
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatBox from '@/components/chat-box';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubmitSupportMessage = jest.fn();
jest.mock('@/app/actions/support', () => ({
    submitSupportMessage: (...a: unknown[]) => mockSubmitSupportMessage(...a),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({
                 children,
                 onClick,
                 disabled,
                 type,
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        children: React.ReactNode;
    }) => (
        <button onClick={onClick} disabled={disabled} type={type}>
            {children}
        </button>
    ),
}));

jest.mock('lucide-react', () => {
    const icon = (name: string) => {
        function Icon() {
            return <span data-testid={`icon-${name}`} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    return {
        MessageCircleIcon: icon('MessageCircle'),
        SendIcon: icon('Send'),
        XIcon: icon('X'),
    };
});

jest.mock('@/lib/utils', () => ({
    cn: (...c: (string | boolean | undefined)[]) =>
        c.filter(Boolean).join(' '),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTitle('Submit a problem'));
}

/**
 * Types text into the textarea and clicks Send. Does NOT wrap in
 * extra act() calls — userEvent v14 already wraps each action, and
 * `waitFor` (used by the caller) absorbs any subsequent async state
 * updates from the submit handler's promise chain.
 */
async function submitMessage(
    user: ReturnType<typeof userEvent.setup>,
    text: string,
) {
    const textarea = screen.getByPlaceholderText(/describe your problem/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, text);
    await user.click(sendButton);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ChatBox', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── initial render ─────────────────────────────────────────────────────

    describe('initial render', () => {
        it('renders the floating chat button', () => {
            render(<ChatBox />);
            expect(screen.getByTitle('Submit a problem')).toBeInTheDocument();
        });

        it('does not show the chat panel initially', () => {
            render(<ChatBox />);
            expect(screen.queryByText('Contact Support')).not.toBeInTheDocument();
        });

        it('shows MessageCircle icon when closed', () => {
            render(<ChatBox />);
            expect(screen.getByTestId('icon-MessageCircle')).toBeInTheDocument();
        });
    });

    // ── open / close ───────────────────────────────────────────────────────

    describe('open / close behaviour', () => {
        it('opens the chat panel when floating button is clicked', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            expect(screen.getByText('Contact Support')).toBeInTheDocument();
        });

        it('shows X icon when open', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            expect(screen.getByTestId('icon-X')).toBeInTheDocument();
        });

        it('closes the chat panel on second click', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await user.click(screen.getByTitle('Submit a problem'));
            expect(screen.queryByText('Contact Support')).not.toBeInTheDocument();
        });

        it('opens panel via custom "open-chatbox" event', () => {
            render(<ChatBox />);
            act(() => {
                window.dispatchEvent(new Event('open-chatbox'));
            });
            expect(screen.getByText('Contact Support')).toBeInTheDocument();
        });

        it('removes event listener on unmount', () => {
            const { unmount } = render(<ChatBox />);
            const spy = jest.spyOn(window, 'removeEventListener');
            unmount();
            expect(spy).toHaveBeenCalledWith('open-chatbox', expect.any(Function));
            spy.mockRestore();
        });
    });

    // ── form interaction ───────────────────────────────────────────────────

    describe('form interaction', () => {
        it('shows the textarea placeholder', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            expect(screen.getByPlaceholderText(/describe your problem/i)).toBeInTheDocument();
        });

        it('Send button is disabled when textarea is empty', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
        });

        it('enables Send button when text is typed', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            const textarea = screen.getByPlaceholderText(/describe your problem/i);
            await user.type(textarea, 'Hello');
            expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
        });

        it('shows character count as text is typed', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            const textarea = screen.getByPlaceholderText(/describe your problem/i);
            await user.type(textarea, 'Hi');
            expect(screen.getByText('2/1000')).toBeInTheDocument();
        });

        it('does not submit when message is only whitespace', async () => {
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            const textarea = screen.getByPlaceholderText(/describe your problem/i);
            fireEvent.change(textarea, { target: { value: '   ' } });
            expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
            expect(mockSubmitSupportMessage).not.toHaveBeenCalled();
        });
    });

    // ── message submission ─────────────────────────────────────────────────

    describe('message submission', () => {
        it('calls submitSupportMessage with the message text', async () => {
            mockSubmitSupportMessage.mockResolvedValueOnce(undefined);
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test message');
            await waitFor(() => {
                expect(mockSubmitSupportMessage).toHaveBeenCalledWith('Test message');
            });
        });

        it('shows success toast on successful send', async () => {
            mockSubmitSupportMessage.mockResolvedValueOnce(undefined);
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test');
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('Message sent to admin successfully');
            });
        });

        it('shows success state (Message Sent!) after send', async () => {
            mockSubmitSupportMessage.mockResolvedValueOnce(undefined);
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test');
            await waitFor(() => {
                expect(screen.getByText('Message Sent!')).toBeInTheDocument();
            });
        });

        it('clears the textarea after successful send', async () => {
            mockSubmitSupportMessage.mockResolvedValueOnce(undefined);
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test');
            await waitFor(() => {
                expect(screen.queryByPlaceholderText(/describe your problem/i)).not.toBeInTheDocument();
            });
        });

        it('hides success state after 3 seconds', async () => {
            jest.useFakeTimers({ legacyFakeTimers: false });
            mockSubmitSupportMessage.mockResolvedValueOnce(undefined);
            render(<ChatBox />);
            const user = userEvent.setup({
                advanceTimers: jest.advanceTimersByTime.bind(jest),
            });

            await openPanel(user);
            await submitMessage(user, 'Test');

            await waitFor(() => {
                expect(screen.getByText('Message Sent!')).toBeInTheDocument();
            });

            await act(async () => {
                jest.advanceTimersByTime(3000);
            });

            await waitFor(() => {
                expect(screen.queryByText('Message Sent!')).not.toBeInTheDocument();
                expect(screen.getByPlaceholderText(/describe your problem/i)).toBeInTheDocument();
            });

            jest.useRealTimers();
        });

        it('shows error toast when submitSupportMessage rejects with Error', async () => {
            mockSubmitSupportMessage.mockRejectedValueOnce(new Error('Server error'));
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test');
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Server error');
            });
        });

        it('shows generic error toast when rejection is not an Error instance', async () => {
            mockSubmitSupportMessage.mockRejectedValueOnce('string error');
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test');
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to send message');
            });
        });

        it('re-enables textarea after send fails', async () => {
            mockSubmitSupportMessage.mockRejectedValueOnce(new Error('fail'));
            render(<ChatBox />);
            const user = userEvent.setup();
            await openPanel(user);
            await submitMessage(user, 'Test');
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/describe your problem/i)).not.toBeDisabled();
            });
        });

        it('clears timer on unmount without throwing', async () => {
            jest.useFakeTimers({ legacyFakeTimers: false });
            mockSubmitSupportMessage.mockResolvedValueOnce(undefined);
            const { unmount } = render(<ChatBox />);
            const user = userEvent.setup({
                advanceTimers: jest.advanceTimersByTime.bind(jest),
            });

            await openPanel(user);
            await submitMessage(user, 'Test');

            await waitFor(() => {
                expect(screen.getByText('Message Sent!')).toBeInTheDocument();
            });

            expect(() => unmount()).not.toThrow();
            jest.useRealTimers();
        });
    });
});