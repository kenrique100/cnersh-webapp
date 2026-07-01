import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import { NotificationEmail } from '@/emails/notification-email';

jest.mock('@react-email/components', () => {
    const actual = jest.requireActual('@react-email/components');
    return {
        ...actual,
        Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Head: () => null,
        Body: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Tailwind: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        Preview: () => null,
    };
});

jest.mock('@react-email/tailwind', () => ({
    Tailwind: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('NotificationEmail', () => {
    afterEach(async () => {
        cleanup();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    });

    it('renders userName', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Your protocol was approved."
                    notificationType="PROJECT_STATUS"
                />,
            );
        });
        expect(screen.getByText(/Hi\s+Ada/)).toBeInTheDocument();
    });

    it('renders notificationMessage', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Your protocol was approved."
                    notificationType="PROJECT_STATUS"
                />,
            );
        });
        expect(screen.getByText('Your protocol was approved.')).toBeInTheDocument();
    });

    it('renders notificationType in lowercase', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Hello"
                    notificationType="PROJECT_STATUS"
                />,
            );
        });
        expect(screen.getByText(/project status/)).toBeInTheDocument();
    });

    it('renders action button when actionUrl is provided', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Hello"
                    notificationType="SYSTEM"
                    actionUrl="https://app.example.com/dashboard"
                />,
            );
        });
        expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('does not render action button when actionUrl is not provided', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Hello"
                    notificationType="SYSTEM"
                />,
            );
        });
        expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });

    it('renders default appName', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Hello"
                    notificationType="SYSTEM"
                />,
            );
        });
        const matches = screen.getAllByText(/National Ethics Committee/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders custom appName', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Hello"
                    notificationType="SYSTEM"
                    appName="My App"
                />,
            );
        });
        const matches = screen.getAllByText(/My App/);
        expect(matches.length).toBeGreaterThan(0);
    });

    it('renders current year in copyright', async () => {
        await act(async () => {
            render(
                <NotificationEmail
                    userName="Ada"
                    notificationMessage="Hello"
                    notificationType="SYSTEM"
                />,
            );
        });
        expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
    });
});