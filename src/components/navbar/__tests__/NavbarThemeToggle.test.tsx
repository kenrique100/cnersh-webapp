import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NavbarThemeToggle from '../NavbarThemeToggle';

const mockSetTheme = jest.fn();
let mockTheme = 'light';
jest.mock('next-themes', () => ({
    useTheme: () => ({
        theme: mockTheme,
        setTheme: mockSetTheme,
    }),
}));

describe('NavbarThemeToggle', () => {
    beforeEach(() => {
        mockTheme = 'light';
        mockSetTheme.mockClear();
    });

    it('renders moon icon in light mode', () => {
        render(<NavbarThemeToggle />);
        act(() => {}); // wait for useEffect
        expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
    });

    it('renders sun icon in dark mode and toggles to light', () => {
        mockTheme = 'dark';
        render(<NavbarThemeToggle />);
        act(() => {});
        fireEvent.click(screen.getByTitle('Switch to light mode'));
        expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
});