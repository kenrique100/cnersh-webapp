import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotificationEmail } from '@/emails/notification-email';

// Mock structural email layers to avoid JSDOM errors, text duplication, and async suspensions
jest.mock('@react-email/components', () => {
    const actual = jest.requireActual('@react-email/components');
    return {
        ...actual,
        Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Head: () => null,
        Body: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Tailwind: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Preview: () => null, // Suppresses duplicate snippet text safely
    };
});

describe('NotificationEmail', () => {
    it('renders userName', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Your protocol was approved."
                notificationType="PROJECT_STATUS"
            />,
        );
        // Using regex to safely bridge text split across dynamic nodes
        expect(screen.getByText(/Hi\s+Ada/)).toBeInTheDocument();
    });

    it('renders notificationMessage', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Your protocol was approved."
                notificationType="PROJECT_STATUS"
            />,
        );
        // Preview is mocked out, leaving exactly 1 deterministic text match
        expect(screen.getByText('Your protocol was approved.')).toBeInTheDocument();
    });

    it('renders notificationType in lowercase', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Hello"
                notificationType="PROJECT_STATUS"
            />,
        );
        expect(screen.getByText(/project status/)).toBeInTheDocument();
    });

    it('renders action button when actionUrl is provided', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Hello"
                notificationType="SYSTEM"
                actionUrl="https://app.example.com/dashboard"
            />,
        );
        expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('does not render action button when actionUrl is not provided', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Hello"
                notificationType="SYSTEM"
            />,
        );
        expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });

    it('renders default appName', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Hello"
                notificationType="SYSTEM"
            />,
        );
        const matches = screen.getAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders custom appName', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Hello"
                notificationType="SYSTEM"
                appName="My App"
            />,
        );
        const matches = screen.getAllByText(/My App/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders current year in copyright', () => {
        render(
            <NotificationEmail
                userName="Ada"
                notificationMessage="Hello"
                notificationType="SYSTEM"
            />,
        );
        expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
    });
});