import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import { VerificationEmail } from '@/emails/verification-email';

jest.mock('@react-email/components', () => {
    const original = jest.requireActual('@react-email/components');
    return {
        ...original,
        Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Head: () => null,
        Body: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

jest.mock('@react-email/tailwind', () => ({
    Tailwind: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('VerificationEmail', () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    it('renders userName', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
            );
        });
        expect(await screen.findByText(/Hi Ada/)).toBeInTheDocument();
    });

    it('renders the verification URL as text', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify?token=abc" userName="Ada" />,
            );
        });
        const matches = await screen.findAllByText(/https:\/\/app\.example\.com\/verify\?token=abc/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders the verify button', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
            );
        });
        expect(await screen.findByText('Verify Email Address')).toBeInTheDocument();
    });

    it('renders the ignore notice', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
            );
        });
        expect(await screen.findByText(/safely ignore this email/)).toBeInTheDocument();
    });

    it('renders default appName', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
            );
        });
        const matches = await screen.findAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders custom appName', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" appName="My App" />,
            );
        });
        const matches = await screen.findAllByText(/My App/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders current year in copyright', async () => {
        await act(async () => {
            render(
                <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
            );
        });
        expect(await screen.findByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
    });
});