import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    EthicalClearanceDesktopDropdown,
    EthicalClearanceMobileDropdown,
} from '../NavbarEthicalClearanceDropdown';

jest.mock('lucide-react', () => ({
    ChevronDownIcon: () => <span data-testid="chevron" />,
    DownloadIcon: () => <span data-testid="download" />,
    ScaleIcon: () => <span data-testid="scale" />,
}));

describe('EthicalClearanceDesktopDropdown', () => {
    it('toggles dropdown and closes on outside click', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(screen.getByRole('button'));
        // Match the decoded text — React renders & not &amp; in the DOM
        expect(screen.getByText('Documents & Calendar')).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Documents & Calendar')).not.toBeInTheDocument();
    });

    it('closes on link click', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Clearance Form'));
        expect(screen.queryByText('Clearance Form')).not.toBeInTheDocument();
    });
});

describe('EthicalClearanceMobileDropdown', () => {
    const onNavigate = jest.fn();

    it('expands nested sections', () => {
        render(<EthicalClearanceMobileDropdown onNavigate={onNavigate} />);
        fireEvent.click(screen.getByText('Ethical Clearance'));
        expect(screen.getByText('Documents & Calendar')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Application Guidelines'));
        expect(screen.getByText('Dossier Composition')).toBeInTheDocument();
    });
});