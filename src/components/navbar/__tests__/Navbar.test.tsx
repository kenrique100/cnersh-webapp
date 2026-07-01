import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from '@/components/navbar';

jest.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('next-themes', () => ({
    useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));
jest.mock('@/lib/auth-client', () => ({
    authClient: { signOut: jest.fn() },
}));
jest.mock('next/image', () => {
    function NextImageMock({ alt }: { alt: string }) {
        return <img alt={alt} />;
    }
    NextImageMock.displayName = 'NextImageMock';
    return NextImageMock;
});
jest.mock('@/components/notification-dropdown', () => {
    function NotifMock() { return <div data-testid="notif" />; }
    NotifMock.displayName = 'NotifMock';
    return NotifMock;
});

jest.mock('@/components/navbar/NavbarSOPsDropdown', () => {
    function SOPsMock() { return <div>SOPs</div>; }
    SOPsMock.displayName = 'SOPsMock';
    return SOPsMock;
});
jest.mock('@/components/navbar/NavbarOurPagesDropdown', () => {
    function OurPagesMock() { return <div>OurPages</div>; }
    OurPagesMock.displayName = 'OurPagesMock';
    return OurPagesMock;
});
jest.mock('@/components/navbar/NavbarResourcesDropdown', () => ({
    ResourcesDesktopDropdown() { return <div>Resources</div>; },
}));
jest.mock('@/components/navbar/NavbarEthicalClearanceDropdown', () => ({
    EthicalClearanceDesktopDropdown() { return <div>Ethical</div>; },
}));
jest.mock('@/components/navbar/NavbarDynamicPageDropdown', () => ({
    DynamicPageDesktopDropdown() { return <div>Dynamic</div>; },
}));
jest.mock('@/components/navbar/NavbarUserMenu', () => {
    function UserMenuMock() { return <div>UserMenu</div>; }
    UserMenuMock.displayName = 'UserMenuMock';
    return UserMenuMock;
});
jest.mock('@/components/navbar/NavbarMobileMenu', () => {
    function MobileMenuMock() { return <div>MobileMenu</div>; }
    MobileMenuMock.displayName = 'MobileMenuMock';
    return MobileMenuMock;
});
jest.mock('@/components/navbar/NavbarLanguageSwitcher', () => {
    function LangSwitcherMock() { return <div>LangSwitcher</div>; }
    LangSwitcherMock.displayName = 'LangSwitcherMock';
    return LangSwitcherMock;
});

describe('Navbar', () => {
    it('renders logo and sign-in when no user', () => {
        render(<Navbar user={null} />);
        expect(screen.getByText('CNERSH')).toBeInTheDocument();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('renders user menu and notifications when authenticated', () => {
        render(<Navbar user={{ name: 'John', email: 'j@j.com', image: null }} />);
        expect(screen.getByText('UserMenu')).toBeInTheDocument();
        expect(screen.getByTestId('notif')).toBeInTheDocument();
    });
});