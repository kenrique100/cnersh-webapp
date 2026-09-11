import React from 'react';
import { render, screen } from '@testing-library/react';
import FeedLeftSidebar from '@/components/feed-left-sidebar';

jest.mock('next/link', () => {
    function LinkMock({ children, href }: React.PropsWithChildren<{ href: string }>) {
        return <a href={href}>{children}</a>;
    }
    LinkMock.displayName = 'LinkMock';
    return LinkMock;
});
jest.mock('next/image', () => {
    function NextImage({ src, alt }: { src: string; alt: string }) {
        return <img src={src} alt={alt} />;
    }
    NextImage.displayName = 'NextImage';
    return NextImage;
});
jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => <img src={src} alt={alt} />,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; size?: string; variant?: string }) => (
        <button {...props}>{children}</button>
    ),
}));
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/lib/utils', () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(' '),
}));
jest.mock('lucide-react', () => {
    const icon = (name: string) => {
        function Icon() { return <span data-testid={`icon-${name}`} />; }
        Icon.displayName = name;
        return Icon;
    };
    return {
        User: icon('User'),
        Rss: icon('Rss'),
        FolderOpen: icon('FolderOpen'),
        Settings: icon('Settings'),
        Users: icon('Users'),
        ShieldCheckIcon: icon('ShieldCheck'),
        UsersIcon: icon('Users'),
        FolderIcon: icon('Folder'),
    };
});

const guestProps = { isAdmin: false, isGuest: true };
const userProps = {
    userName: 'John Doe',
    userEmail: 'john@example.com',
    userGender: 'male',
    userRole: 'researcher',
    isAdmin: false,
    isGuest: false,
};
const adminProps = { ...userProps, isAdmin: true };

describe('FeedLeftSidebar', () => {
    describe('guest mode', () => {
        it('renders the CNERSH branding', () => {
            render(<FeedLeftSidebar {...guestProps} />);
            expect(screen.getAllByText('CNERSH').length).toBeGreaterThan(0);
        });

        it('renders Create account and Sign In buttons', () => {
            render(<FeedLeftSidebar {...guestProps} />);
            expect(screen.getByText('Create account')).toBeInTheDocument();
            expect(screen.getByText('Sign In')).toBeInTheDocument();
        });

        it('Create account links to /sign-up', () => {
            render(<FeedLeftSidebar {...guestProps} />);
            expect(screen.getByText('Create account').closest('a')).toHaveAttribute('href', '/sign-up');
        });

        it('Sign In links to /sign-in', () => {
            render(<FeedLeftSidebar {...guestProps} />);
            expect(screen.getByText('Sign In').closest('a')).toHaveAttribute('href', '/sign-in');
        });

        it('renders feature cards: Secure Access, Community, Protocol Submissions', () => {
            render(<FeedLeftSidebar {...guestProps} />);
            expect(screen.getByText('Secure Access')).toBeInTheDocument();
            expect(screen.getByText('Community')).toBeInTheDocument();
            expect(screen.getByText('Protocol Submissions')).toBeInTheDocument();
        });

        it('does not render user nav links in guest mode', () => {
            render(<FeedLeftSidebar {...guestProps} />);
            expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
            expect(screen.queryByText('Feeds')).not.toBeInTheDocument();
        });
    });

    describe('authenticated user (non-admin)', () => {
        it('renders user name', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('renders user email', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.getByText('john@example.com')).toBeInTheDocument();
        });

        it('renders user gender', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.getByText('male')).toBeInTheDocument();
        });

        it('renders user role badge', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.getByText('researcher')).toBeInTheDocument();
        });

        it('renders standard nav links', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.getByText('My Profile')).toBeInTheDocument();
            expect(screen.getByText('Feeds')).toBeInTheDocument();
            expect(screen.getByText('My Protocols')).toBeInTheDocument();
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });

        it('does not render admin Community link for regular user', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.queryByText('Community')).not.toBeInTheDocument();
        });

        it('does not render footer links for non-admin', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.queryByText('About')).not.toBeInTheDocument();
            expect(screen.queryByText('Privacy & Terms')).not.toBeInTheDocument();
        });

        it('shows avatar fallback initial', () => {
            render(<FeedLeftSidebar {...userProps} />);
            expect(screen.getByText('J')).toBeInTheDocument();
        });

        it('falls back to "Community Member" when no role provided', () => {
            render(<FeedLeftSidebar {...userProps} userRole={undefined} />);
            expect(screen.getByText('Community Member')).toBeInTheDocument();
        });

        it('falls back to "U" avatar initial when no name', () => {
            render(<FeedLeftSidebar {...userProps} userName={undefined} />);
            expect(screen.getByText('U')).toBeInTheDocument();
        });
    });

    describe('admin user', () => {
        it('renders Community nav link for admin', () => {
            render(<FeedLeftSidebar {...adminProps} />);
            expect(screen.getByText('Community')).toBeInTheDocument();
        });

        it('renders footer links for admin', () => {
            render(<FeedLeftSidebar {...adminProps} />);
            expect(screen.getByText('About')).toBeInTheDocument();
            expect(screen.getByText('Accessibility')).toBeInTheDocument();
            expect(screen.getByText('Privacy & Terms')).toBeInTheDocument();
        });

        it('renders copyright notice for admin', () => {
            render(<FeedLeftSidebar {...adminProps} />);
            expect(screen.getByText(/CNERSH ©/)).toBeInTheDocument();
        });

        it('shows Admin role when no explicit role for admin', () => {
            render(<FeedLeftSidebar {...adminProps} userRole={undefined} />);
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        it('nav links point to correct hrefs', () => {
            render(<FeedLeftSidebar {...adminProps} />);
            expect(screen.getByText('My Profile').closest('a')).toHaveAttribute('href', '/update-profile');
            expect(screen.getByText('Feeds').closest('a')).toHaveAttribute('href', '/feeds');
            expect(screen.getByText('My Protocols').closest('a')).toHaveAttribute('href', '/protocols');
            expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
            expect(screen.getByText('Community').closest('a')).toHaveAttribute('href', '/community');
        });
    });
});
