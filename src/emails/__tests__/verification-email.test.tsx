import React from 'react';
import { render, screen } from '@testing-library/react';
import { VerificationEmail } from '@/emails/verification-email';

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

describe('VerificationEmail', () => {
    it('renders userName', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
        );
        // Using async findByText to wait for the Tailwind suspense boundary to clear
        expect(await screen.findByText(/Hi Ada/)).toBeInTheDocument();
    });

    it('renders the verification URL as text', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify?token=abc" userName="Ada" />,
        );
        const matches = await screen.findAllByText(/https:\/\/app\.example\.com\/verify\?token=abc/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders the verify button', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
        );
        expect(await screen.findByText('Verify Email Address')).toBeInTheDocument();
    });

    it('renders the ignore notice', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
        );
        expect(await screen.findByText(/safely ignore this email/)).toBeInTheDocument();
    });

    it('renders default appName', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
        );
        const matches = await screen.findAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders custom appName', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" appName="My App" />,
        );
        const matches = await screen.findAllByText(/My App/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders current year in copyright', async () => {
        render(
            <VerificationEmail verificationUrl="https://app.example.com/verify" userName="Ada" />,
        );
        expect(await screen.findByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
    });
});