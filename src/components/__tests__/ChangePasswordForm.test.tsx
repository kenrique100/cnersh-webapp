import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}))

const mockChangePassword = jest.fn()
jest.mock('@/lib/auth-client', () => ({
    authClient: {
        changePassword: (...args: unknown[]) => mockChangePassword(...args),
    },
}))

jest.mock('@/components/ui/spinner', () => ({
    Spinner: () => <span data-testid="spinner">Loading</span>,
}))

jest.mock('@/components/ui/progress', () => ({
    Progress: ({ value }: { value: number }) => (
        <div data-testid="progress-bar" data-value={value} />
    ),
}))

import { ChangePasswordForm } from '@/components/change-password'

const setup = () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    const currentPasswordInput = () =>
        screen.getByPlaceholderText('Enter current password')
    const newPasswordInput = () =>
        screen.getByPlaceholderText('Enter new password')
    const confirmPasswordInput = () =>
        screen.getByPlaceholderText('Confirm new password')
    const submitButton = () => screen.getByTestId('submit-button')

    return {
        user,
        currentPasswordInput,
        newPasswordInput,
        confirmPasswordInput,
        submitButton,
    }
}

// react-hook-form fires its subject-based re-renders asynchronously even
// when the calling code is synchronous. userEvent v14 already wraps each
// of its own actions in act(), so the mock implementations below resolve
// IMMEDIATELY (no setTimeout) — letting userEvent's own act() boundary
// cover the resulting state updates. waitFor() is used afterwards for any
// assertion that depends on the promise chain settling.
const createSuccessMock = () => {
    mockChangePassword.mockImplementation(
        (
            _data: unknown,
            callbacks: {
                onSuccess: () => Promise<void> | void
                onError: (ctx: { error: { message: string } }) => void
            }
        ) => {
            return Promise.resolve().then(() => callbacks.onSuccess())
        }
    )
}

const createErrorMock = (message: string) => {
    mockChangePassword.mockImplementation(
        (
            _data: unknown,
            callbacks: {
                onSuccess: () => void
                onError: (ctx: { error: { message: string } }) => void
            }
        ) => {
            return Promise.resolve().then(() => callbacks.onError({ error: { message } }))
        }
    )
}

describe('ChangePasswordForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Rendering', () => {
        it('renders the card heading', () => {
            render(<ChangePasswordForm />)
            expect(
                screen.getByRole('heading', { name: /change password/i })
            ).toBeInTheDocument()
        })

        it('renders the card description', () => {
            render(<ChangePasswordForm />)
            expect(
                screen.getByText(/keep your cnersh account secure/i)
            ).toBeInTheDocument()
        })

        it('renders the logo image', () => {
            render(<ChangePasswordForm />)
            expect(screen.getByAltText('CNERSH Logo')).toBeInTheDocument()
        })

        it('renders all three password inputs', () => {
            const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
                setup()
            expect(currentPasswordInput()).toBeInTheDocument()
            expect(newPasswordInput()).toBeInTheDocument()
            expect(confirmPasswordInput()).toBeInTheDocument()
        })

        it('renders the submit button', () => {
            const { submitButton } = setup()
            expect(submitButton()).toBeInTheDocument()
        })

        it('all password inputs start as type password', () => {
            const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
                setup()
            expect(currentPasswordInput()).toHaveAttribute('type', 'password')
            expect(newPasswordInput()).toHaveAttribute('type', 'password')
            expect(confirmPasswordInput()).toHaveAttribute('type', 'password')
        })

        it('does not show the password-strength meter initially', () => {
            render(<ChangePasswordForm />)
            expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument()
        })
    })

    describe('Toggle password visibility', () => {
        it('toggles current password visibility', async () => {
            const { user, currentPasswordInput } = setup()
            const toggleButtons = screen.getAllByRole('button', { name: '' })
            await user.click(toggleButtons[0])
            expect(currentPasswordInput()).toHaveAttribute('type', 'text')
            await user.click(toggleButtons[0])
            expect(currentPasswordInput()).toHaveAttribute('type', 'password')
        })

        it('toggles new password visibility', async () => {
            const { user, newPasswordInput } = setup()
            const toggleButtons = screen.getAllByRole('button', { name: '' })
            await user.click(toggleButtons[1])
            expect(newPasswordInput()).toHaveAttribute('type', 'text')
            await user.click(toggleButtons[1])
            expect(newPasswordInput()).toHaveAttribute('type', 'password')
        })

        it('toggles confirm password visibility', async () => {
            const { user, confirmPasswordInput } = setup()
            const toggleButtons = screen.getAllByRole('button', { name: '' })
            await user.click(toggleButtons[2])
            expect(confirmPasswordInput()).toHaveAttribute('type', 'text')
            await user.click(toggleButtons[2])
            expect(confirmPasswordInput()).toHaveAttribute('type', 'password')
        })
    })

    describe('Password strength meter', () => {
        it('shows strength meter after typing in new password field', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'hello')
            expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
        })

        it('hides strength meter when new password is cleared', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'hello')
            await user.clear(newPasswordInput())
            expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument()
        })

        it('shows Too weak for a very short password', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'abc')
            expect(screen.getByText(/too weak/i)).toBeInTheDocument()
        })

        it('shows Fair for a moderately complex password', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'abcdefghij')
            expect(screen.getByText(/fair/i)).toBeInTheDocument()
        })

        it('shows Good for a reasonably complex password', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'Abcdefghij1')
            expect(screen.getByText(/good/i)).toBeInTheDocument()
        })

        it('shows Strong for a highly complex password', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'Abcdefgh1!@#')
            expect(screen.getByText(/strong/i)).toBeInTheDocument()
        })

        it('shows the hint text about password requirements', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'somepass')
            expect(screen.getByText(/use 10\+ characters/i)).toBeInTheDocument()
        })

        it('progress bar value is at least 75 for a strong password', async () => {
            const { user, newPasswordInput } = setup()
            await user.type(newPasswordInput(), 'Abcdef1!@#gh')
            const bar = screen.getByTestId('progress-bar')
            expect(Number(bar.getAttribute('data-value'))).toBeGreaterThanOrEqual(75)
        })
    })

    describe('Validation', () => {
        it('shows error when current password is empty on submit', async () => {
            const { user, submitButton } = setup()
            await user.click(submitButton())
            expect(
                await screen.findByText(/enter your current password/i)
            ).toBeInTheDocument()
        })

        it('shows error when new password is too short', async () => {
            const { user, currentPasswordInput, newPasswordInput, submitButton } =
                setup()
            await user.type(currentPasswordInput(), 'oldpass')
            await user.type(newPasswordInput(), 'short')
            await user.click(submitButton())
            expect(
                await screen.findByText(/at least 10 characters/i)
            ).toBeInTheDocument()
        })

        it('shows error when passwords do not match', async () => {
            const {
                user,
                currentPasswordInput,
                newPasswordInput,
                confirmPasswordInput,
                submitButton,
            } = setup()
            await user.type(currentPasswordInput(), 'OldPass123!')
            await user.type(newPasswordInput(), 'NewPassword1!')
            await user.type(confirmPasswordInput(), 'DifferentPass1!')
            await user.click(submitButton())
            expect(
                await screen.findByText(/passwords do not match/i)
            ).toBeInTheDocument()
        })

        it('does not call changePassword when validation fails', async () => {
            const { user, submitButton } = setup()
            await user.click(submitButton())
            await screen.findByText(/enter your current password/i)
            expect(mockChangePassword).not.toHaveBeenCalled()
        })
    })

    describe('Submission success', () => {
        const fillAndSubmit = async () => {
            const {
                user,
                currentPasswordInput,
                newPasswordInput,
                confirmPasswordInput,
                submitButton,
            } = setup()

            createSuccessMock()

            await user.type(currentPasswordInput(), 'OldPassword1!')
            await user.type(newPasswordInput(), 'NewPassword1!')
            await user.type(confirmPasswordInput(), 'NewPassword1!')
            await user.click(submitButton())

            return { submitButton }
        }

        it('calls authClient.changePassword with correct arguments', async () => {
            await fillAndSubmit()
            await waitFor(() => {
                expect(mockChangePassword).toHaveBeenCalledWith(
                    {
                        newPassword: 'NewPassword1!',
                        currentPassword: 'OldPassword1!',
                    },
                    expect.objectContaining({
                        onSuccess: expect.any(Function),
                        onError: expect.any(Function),
                    })
                )
            })
        })

        it('shows success toast on successful password change', async () => {
            await fillAndSubmit()
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith(
                    expect.stringMatching(/password has been changed/i)
                )
            })
        })

        it('resets the form after success and shows submit button again', async () => {
            const { submitButton } = await fillAndSubmit()
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalled()
            })
            expect(submitButton()).toBeInTheDocument()
        })
    })

    describe('Submission server error', () => {
        it('shows error toast when onError is called', async () => {
            const {
                user,
                currentPasswordInput,
                newPasswordInput,
                confirmPasswordInput,
                submitButton,
            } = setup()

            createErrorMock('Incorrect password')

            await user.type(currentPasswordInput(), 'WrongOldPass1!')
            await user.type(newPasswordInput(), 'NewPassword1!')
            await user.type(confirmPasswordInput(), 'NewPassword1!')
            await user.click(submitButton())

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Incorrect password')
            })
        })

        it('shows generic error toast when changePassword throws', async () => {
            const {
                user,
                currentPasswordInput,
                newPasswordInput,
                confirmPasswordInput,
                submitButton,
            } = setup()

            mockChangePassword.mockRejectedValue(new Error('Network error'))

            await user.type(currentPasswordInput(), 'OldPassword1!')
            await user.type(newPasswordInput(), 'NewPassword1!')
            await user.type(confirmPasswordInput(), 'NewPassword1!')
            await user.click(submitButton())

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Something went wrong')
            })
        })
    })

    describe('Submitting state', () => {
        it('disables the submit button while submitting', async () => {
            const {
                user,
                currentPasswordInput,
                newPasswordInput,
                confirmPasswordInput,
                submitButton,
            } = setup()

            let resolvePromise!: () => void
            mockChangePassword.mockReturnValue(
                new Promise<void>((resolve) => {
                    resolvePromise = resolve
                })
            )

            await user.type(currentPasswordInput(), 'OldPassword1!')
            await user.type(newPasswordInput(), 'NewPassword1!')
            await user.type(confirmPasswordInput(), 'NewPassword1!')
            await user.click(submitButton())

            await waitFor(() => {
                expect(submitButton()).toBeDisabled()
            })

            resolvePromise()
            await waitFor(() => {
                expect(submitButton()).not.toBeDisabled()
            })
        })

        it('shows spinner while submitting', async () => {
            const {
                user,
                currentPasswordInput,
                newPasswordInput,
                confirmPasswordInput,
                submitButton,
            } = setup()

            let resolvePromise!: () => void
            mockChangePassword.mockReturnValue(
                new Promise<void>((resolve) => {
                    resolvePromise = resolve
                })
            )

            await user.type(currentPasswordInput(), 'OldPassword1!')
            await user.type(newPasswordInput(), 'NewPassword1!')
            await user.type(confirmPasswordInput(), 'NewPassword1!')
            await user.click(submitButton())

            await waitFor(() => {
                expect(screen.getByTestId('spinner')).toBeInTheDocument()
            })

            resolvePromise()
            await waitFor(() => {
                expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
            })
        })
    })

    it('matches snapshot', () => {
        const { asFragment } = render(<ChangePasswordForm />)
        expect(asFragment()).toMatchSnapshot()
    })
})