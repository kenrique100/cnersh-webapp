import React from 'react';
import { render, screen } from '@testing-library/react';
import { WelcomeEmail } from '@/emails/welcome-email';

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

describe('WelcomeEmail', () => {
    it('renders userName', async () => {
        render(<WelcomeEmail userName="Ada" />);
        // Using async findByText to wait for the Tailwind engine to clear its suspense boundary
        expect(await screen.findByText(/Hi Ada/)).toBeInTheDocument();
    });

    it('renders default appName', async () => {
        render(<WelcomeEmail userName="Ada" />);
        const matches = await screen.findAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders custom appName', async () => {
        render(<WelcomeEmail userName="Ada" appName="My App" />);
        const matches = await screen.findAllByText(/My App/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders the welcome message', async () => {
        render(<WelcomeEmail userName="Ada" />);
        expect(await screen.findByText(/thrilled to have you/)).toBeInTheDocument();
    });

    it('renders unsubscribe link', async () => {
        render(<WelcomeEmail userName="Ada" />);
        expect(await screen.findByText('Unsubscribe')).toBeInTheDocument();
    });

    it('renders current year in copyright', async () => {
        render(<WelcomeEmail userName="Ada" />);
        expect(await screen.findByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
    });

    it('renders the bullet points list', async () => {
        render(<WelcomeEmail userName="Ada" />);
        expect(await screen.findByText(/Submit research protocols/)).toBeInTheDocument();
        expect(await screen.findByText(/Track the status/)).toBeInTheDocument();
        expect(await screen.findByText(/Collaborate with fellow researchers/)).toBeInTheDocument();
    });
});