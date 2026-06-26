import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { RequestPasswordEmail } from '@/emails/request-password-email';

// Mock top-level document structures to prevent <div><html> nesting validation errors in JSDOM
jest.mock('@react-email/components', () => {
    const original = jest.requireActual('@react-email/components');
    return {
        ...original,
        Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Head: () => null,
        Body: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

describe('RequestPasswordEmail', () => {
    it('renders the reset URL as link href', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset?token=abc" to="user@example.com" />,
        );

        // Uses findByRole to wait for the Tailwind Suspense boundary to resolve
        const link = await screen.findByRole('link', { name: 'Reset Your Password' });
        expect(link).toHaveAttribute('href', 'https://app.example.com/reset?token=abc');
    });

    it('renders the reset URL as text when shown in plain text', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset?token=abc" to="user@example.com" />,
        );

        const urlText = await screen.findByText('https://app.example.com/reset?token=abc');
        expect(urlText).toBeInTheDocument();
    });

    it('renders the recipient email', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    });

    it('renders the reset button', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        expect(await screen.findByRole('link', { name: 'Reset Your Password' })).toBeInTheDocument();
    });

    it('renders security notice', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        expect(await screen.findByText('Security Notice:')).toBeInTheDocument();
    });

    it('renders expiry note in the main content', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        const mainExpiryText = await screen.findByText(
            'Click the button below to reset your password. This link will expire in 1 hour for security reasons.'
        );
        expect(mainExpiryText).toBeInTheDocument();
    });

    it('renders expiry note in the footer', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        const footerExpiryText = await screen.findByText('This password reset link will expire in 1 hour.');
        expect(footerExpiryText).toBeInTheDocument();
    });

    it('renders default appName', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        // Use findAllByText for elements appearing multiple times asynchronously
        const matches = await screen.findAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toBeInTheDocument();
    });

    it('renders custom appName', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" appName="My App" />,
        );

        const matches = await screen.findAllByText('My App');
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders current year in copyright', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        const currentYear = new Date().getFullYear().toString();
        expect(await screen.findByText(new RegExp(currentYear))).toBeInTheDocument();
    });

    it('renders the preview text', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        expect(
            await screen.findByText(/Reset your password for/)
        ).toBeInTheDocument();
    });

    it('renders all security notice content', async () => {
        render(
            <RequestPasswordEmail url="https://app.example.com/reset" to="user@example.com" />,
        );

        // Await the initial label node to ensure JSDOM has populated the structural trees
        const securityNoticeLabel = await screen.findByText('Security Notice:');
        const securitySection = securityNoticeLabel.closest('table');

        if (securitySection) {
            expect(
                within(securitySection as HTMLElement).getByText(/If you did not request a password reset/)
            ).toBeInTheDocument();
        }
    });
});