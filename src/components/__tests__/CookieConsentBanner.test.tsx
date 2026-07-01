// CookieConsentBanner.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CookieConsentBanner from '../cookie-consent-banner';

const CONSENT_KEY = 'cookie-consent-choice';
const CONSENT_COOKIE = 'cookie_consent';

const getCookie = (name: string) => {
    const match = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
};

const clearAllCookies = () => {
    document.cookie.split(';').forEach((c) => {
        const eqPos = c.indexOf('=');
        const cname = (eqPos > -1 ? c.substring(0, eqPos) : c).trim();
        if (cname) {
            document.cookie = `${cname}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
    });
};

beforeEach(() => {
    localStorage.clear();
    clearAllCookies();
});

describe('CookieConsentBanner', () => {
    test('renders when no prior choice', () => {
        render(<CookieConsentBanner />);
        expect(
            screen.getByText(/we use cookies to improve your experience/i)
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reject all/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /accept all/i })).toBeInTheDocument();
    });

    test('hidden when previously accepted', () => {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        render(<CookieConsentBanner />);
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    test('hidden when previously rejected', () => {
        localStorage.setItem(CONSENT_KEY, 'rejected');
        render(<CookieConsentBanner />);
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    test('renders if stored value is invalid', () => {
        localStorage.setItem(CONSENT_KEY, 'maybe' as never);
        render(<CookieConsentBanner />);
        expect(
            screen.getByText(/we use cookies to improve your experience/i)
        ).toBeInTheDocument();
    });

    test('accept sets storage, cookie, and hides', async () => {
        const user = userEvent.setup();
        render(<CookieConsentBanner />);
        await user.click(screen.getByRole('button', { name: /accept all/i }));

        expect(localStorage.getItem(CONSENT_KEY)).toBe('accepted');
        expect(getCookie(CONSENT_COOKIE)).toBe('accepted');
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });

    test('reject sets storage, cookie, and hides', async () => {
        const user = userEvent.setup();
        render(<CookieConsentBanner />);
        await user.click(screen.getByRole('button', { name: /reject all/i }));

        expect(localStorage.getItem(CONSENT_KEY)).toBe('rejected');
        expect(getCookie(CONSENT_COOKIE)).toBe('rejected');
        expect(
            screen.queryByText(/we use cookies to improve your experience/i)
        ).not.toBeInTheDocument();
    });
});