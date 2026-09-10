import React from 'react';
import { render, screen, cleanup, act, within } from '@testing-library/react';
import { RequestPasswordEmail } from '@/emails/request-password-email';

// Mock top-level document structures
jest.mock('@react-email/components', () => {
    const original = jest.requireActual('@react-email/components');
    return {
        ...original,
        Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Head: () => null,
        Body: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

// Mock Tailwind to avoid extra scheduling
jest.mock('@react-email/tailwind', () => ({
    Tailwind: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('RequestPasswordEmail', () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    it('renders the reset URL as link href', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset?token=abc" to="user@example.com" />,
            );
        });
        const link = await screen.findByRole('link', { name: 'Reset Your Password' });
        expect(link).toHaveAttribute('href', 'https://app.example.com/reset?token=abc');
    });

    it('renders the reset URL as text', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset?token=abc" to="user@example.com" />,
            );
        });
        const urlText = await screen.findByText('https://app.example.com/reset?token=abc');
        expect(urlText).toBeInTheDocument();
    });

    it('renders the recipient email', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    });

    it('renders the reset button', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        expect(await screen.findByRole('link', { name: 'Reset Your Password' })).toBeInTheDocument();
    });

    it('renders security notice', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        expect(await screen.findByText('Security Notice:')).toBeInTheDocument();
    });

    it('renders expiry note in the main content', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        const mainExpiryText = await screen.findByText(
            'Click the button below to reset your password. This link will expire in 1 hour for security reasons.'
        );
        expect(mainExpiryText).toBeInTheDocument();
    });

    it('renders expiry note in the footer', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        const footerExpiryText = await screen.findByText('This password reset link will expire in 1 hour.');
        expect(footerExpiryText).toBeInTheDocument();
    });

    it('renders default appName', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        const matches = await screen.findAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toBeInTheDocument();
    });

    it('renders custom appName', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" appName="My App" />,
            );
        });
        const matches = await screen.findAllByText('My App');
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders current year in copyright', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        const currentYear = new Date().getFullYear().toString();
        expect(await screen.findByText(new RegExp(currentYear))).toBeInTheDocument();
    });

    it('renders the preview text', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        expect(
            await screen.findByText(/Reset your password for/)
        ).toBeInTheDocument();
    });

    it('renders all security notice content', async () => {
        await act(async () => {
            render(
                <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
            );
        });
        const securityNoticeLabel = await screen.findByText('Security Notice:');
        const securitySection = securityNoticeLabel.closest('table');
        if (securitySection) {
            expect(
                within(securitySection as HTMLElement).getByText(/If you did not request a password reset/)
            ).toBeInTheDocument();
        }
    });
});