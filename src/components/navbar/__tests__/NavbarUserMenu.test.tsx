import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NavbarUserMenu from '../NavbarUserMenu';
import type { NavbarProps } from '../types';

jest.mock('@/components/ui/dropdown-menu', () => {
    function DropdownMenuMock({ children }: React.PropsWithChildren) {
        return <div>{children}</div>;
    }
    DropdownMenuMock.displayName = 'DropdownMenuMock';

    function DropdownMenuTriggerMock({
                                         children,
                                         asChild: _asChild,
                                         ...props
                                     }: React.PropsWithChildren<{ asChild?: boolean }>) {
        return <div {...props}>{children}</div>;
    }
    DropdownMenuTriggerMock.displayName = 'DropdownMenuTriggerMock';

    function DropdownMenuContentMock({ children }: React.PropsWithChildren) {
        return <div>{children}</div>;
    }
    DropdownMenuContentMock.displayName = 'DropdownMenuContentMock';

    function DropdownMenuItemMock({
                                      children,
                                      asChild: _asChild,
                                      ...props
                                  }: React.PropsWithChildren<{ asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>>) {
        return <div {...props}>{children}</div>;
    }
    DropdownMenuItemMock.displayName = 'DropdownMenuItemMock';

    function DropdownMenuSeparatorMock() {
        return <hr />;
    }
    DropdownMenuSeparatorMock.displayName = 'DropdownMenuSeparatorMock';

    return {
        DropdownMenu: DropdownMenuMock,
        DropdownMenuTrigger: DropdownMenuTriggerMock,
        DropdownMenuContent: DropdownMenuContentMock,
        DropdownMenuItem: DropdownMenuItemMock,
        DropdownMenuSeparator: DropdownMenuSeparatorMock,
    };
});

jest.mock('@/components/ui/avatar', () => {
    function AvatarMock({ children }: React.PropsWithChildren) {
        return <div>{children}</div>;
    }
    AvatarMock.displayName = 'AvatarMock';

    function AvatarImageMock() {
        return null;
    }
    AvatarImageMock.displayName = 'AvatarImageMock';

    function AvatarFallbackMock({ children }: React.PropsWithChildren) {
        return <span>{children}</span>;
    }
    AvatarFallbackMock.displayName = 'AvatarFallbackMock';

    return {
        Avatar: AvatarMock,
        AvatarImage: AvatarImageMock,
        AvatarFallback: AvatarFallbackMock,
    };
});

jest.mock('next/link', () => {
    function LinkMock({
                          children,
                          ...props
                      }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
        return <a {...props}>{children}</a>;
    }
    LinkMock.displayName = 'LinkMock';
    return LinkMock;
});

jest.mock('lucide-react', () => {
    function LogOutIconMock() { return <span />; }
    LogOutIconMock.displayName = 'LogOutIconMock';
    function UserIconMock() { return <span />; }
    UserIconMock.displayName = 'UserIconMock';
    function SettingsIconMock() { return <span />; }
    SettingsIconMock.displayName = 'SettingsIconMock';

    return {
        LogOutIcon: LogOutIconMock,
        UserIcon: UserIconMock,
        SettingsIcon: SettingsIconMock,
    };
});

const user: NonNullable<NavbarProps['user']> = {
    name: 'John Doe',
    email: 'john@example.com',
    image: null,
    role: 'admin',
};

describe('NavbarUserMenu', () => {
    it('displays user info and logout', () => {
        render(
            <NavbarUserMenu
                user={user}
                userInitials="JD"
                handleSignOut={jest.fn()}
            />
        );

        expect(screen.getAllByText('John Doe')).toHaveLength(2);
        expect(screen.getAllByText('john@example.com')).toHaveLength(2);
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('calls handleSignOut on logout', () => {
        const signOut = jest.fn();
        render(
            <NavbarUserMenu
                user={user}
                userInitials="JD"
                handleSignOut={signOut}
            />
        );
        fireEvent.click(screen.getByText('Logout'));
        expect(signOut).toHaveBeenCalledTimes(1);
    });
});