import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
    EthicalClearanceDesktopDropdown,
    EthicalClearanceMobileDropdown,
} from '../NavbarEthicalClearanceDropdown';

jest.mock('@/lib/utils', () => ({
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
    ChevronDownIcon: () => <span data-testid="chevron" />,
    DownloadIcon: () => <span data-testid="download" />,
    ScaleIcon: () => <span data-testid="scale" />,
}));

const FORMS_SECTION = /forms\s*&\s*questionnaires/i;
const GUIDELINES_SECTION = /application guidelines/i;
const ETHICAL_CLEARANCE_TRIGGER = /ethical clearance/i;

describe('EthicalClearanceDesktopDropdown', () => {
    it('renders the trigger button', () => {
        render(<EthicalClearanceDesktopDropdown />);
        expect(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        ).toBeInTheDocument();
    });

    it('is closed by default', () => {
        render(<EthicalClearanceDesktopDropdown />);
        expect(
            screen.queryByText('Documents & Calendar')
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Clearance Form')).not.toBeInTheDocument();
    });

    it('opens and shows all grouped items', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );

        // Top-level
        expect(screen.getByText('Documents & Calendar')).toBeInTheDocument();

        // Application Guidelines section
        expect(screen.getByText('Application Guidelines')).toBeInTheDocument();
        expect(screen.getByText('Dossier Composition')).toBeInTheDocument();
        expect(screen.getByText('Environmental Bioethics')).toBeInTheDocument();
        expect(
            screen.getByText('Creation of Coordination Units CNERSH')
        ).toBeInTheDocument();

        // Forms & Questionnaires section
        expect(screen.getByText('Forms & Questionnaires')).toBeInTheDocument();
        expect(screen.getByText('Protocol Content')).toBeInTheDocument();
        expect(screen.getByText('Evaluation Form')).toBeInTheDocument();
        expect(screen.getByText('Clearance Form')).toBeInTheDocument();
        expect(screen.getByText('Data Sharing Agreement')).toBeInTheDocument();
        expect(
            screen.getByText('Material Transfer Agreement')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Confidential Undertaking CNERSH')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Study Review and Follow-up Form')
        ).toBeInTheDocument();
    });

    it('closes when a link is clicked', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        fireEvent.click(screen.getByText('Evaluation Form'));
        expect(screen.queryByText('Evaluation Form')).not.toBeInTheDocument();
    });

    it('closes when clicking outside', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        expect(screen.getByText('Clearance Form')).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Clearance Form')).not.toBeInTheDocument();
    });

    it('points each link to the correct PDF', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );

        expect(screen.getByText('Evaluation Form').closest('a')).toHaveAttribute(
            'href',
            "/Fiche d'Evaluation CNERSH.pdf"
        );
        expect(screen.getByText('Clearance Form').closest('a')).toHaveAttribute(
            'href',
            '/Form for Ethical Clearance CNERSH (2025).pdf'
        );
        expect(
            screen.getByText('Data Sharing Agreement').closest('a')
        ).toHaveAttribute('href', '/DSA%20Model.pdf');
        expect(
            screen.getByText('Study Review and Follow-up Form').closest('a')
        ).toHaveAttribute('href', '/CNRESH Study Review & Follow up Form.pdf');
    });

    it('opens all links in a new tab with safe rel attributes', () => {
        render(<EthicalClearanceDesktopDropdown />);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        links.forEach((l) => {
            expect(l).toHaveAttribute('target', '_blank');
            expect(l).toHaveAttribute('rel', 'noopener noreferrer');
        });
    });

    it('toggles aria-expanded on the trigger button', () => {
        render(<EthicalClearanceDesktopDropdown />);
        const trigger = screen.getByRole('button', {
            name: ETHICAL_CLEARANCE_TRIGGER,
        });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
});

describe('EthicalClearanceMobileDropdown', () => {
    const renderMobile = (onNavigate = jest.fn()) => {
        render(<EthicalClearanceMobileDropdown onNavigate={onNavigate} />);
        return { onNavigate };
    };

    it('renders the trigger', () => {
        renderMobile();
        expect(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        ).toBeInTheDocument();
    });

    it('is closed by default', () => {
        renderMobile();
        expect(
            screen.queryByText('Documents & Calendar')
        ).not.toBeInTheDocument();
    });

    it('opens and shows top-level items + section toggles (but not nested links yet)', () => {
        renderMobile();
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );

        expect(screen.getByText('Documents & Calendar')).toBeInTheDocument();
        expect(screen.getByText('Application Guidelines')).toBeInTheDocument();
        expect(screen.getByText('Forms & Questionnaires')).toBeInTheDocument();

        // Nested links should NOT be visible yet
        expect(screen.queryByText('Dossier Composition')).not.toBeInTheDocument();
        expect(screen.queryByText('Protocol Content')).not.toBeInTheDocument();
        expect(screen.queryByText('Clearance Form')).not.toBeInTheDocument();
    });

    it('expands Application Guidelines to show its links', () => {
        renderMobile();
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        fireEvent.click(
            screen.getByRole('button', { name: GUIDELINES_SECTION })
        );

        expect(screen.getByText('Dossier Composition')).toBeInTheDocument();
        expect(screen.getByText('Environmental Bioethics')).toBeInTheDocument();
        expect(
            screen.getByText('Creation of Coordination Units CNERSH')
        ).toBeInTheDocument();
    });

    it('expands Forms & Questionnaires to show its links', () => {
        renderMobile();
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );

        // IMPORTANT: click the section AFTER the top-level menu is open
        fireEvent.click(screen.getByRole('button', { name: FORMS_SECTION }));

        // Now assert on each nested link inside Forms & Questionnaires
        expect(screen.getByText('Protocol Content')).toBeInTheDocument();
        expect(screen.getByText('Evaluation Form')).toBeInTheDocument();
        expect(screen.getByText('Clearance Form')).toBeInTheDocument();
        expect(screen.getByText('Data Sharing Agreement')).toBeInTheDocument();
        expect(
            screen.getByText('Material Transfer Agreement')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Confidential Undertaking CNERSH')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Study Review and Follow-up Form')
        ).toBeInTheDocument();
    });

    it('collapses Application Guidelines when clicked twice', () => {
        renderMobile();
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        const guidelinesTrigger = screen.getByRole('button', {
            name: GUIDELINES_SECTION,
        });
        fireEvent.click(guidelinesTrigger);
        expect(screen.getByText('Dossier Composition')).toBeInTheDocument();

        fireEvent.click(guidelinesTrigger);
        expect(
            screen.queryByText('Dossier Composition')
        ).not.toBeInTheDocument();
    });

    it('collapses Forms & Questionnaires when clicked twice', () => {
        renderMobile();
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        const formsTrigger = screen.getByRole('button', { name: FORMS_SECTION });

        fireEvent.click(formsTrigger);
        expect(screen.getByText('Clearance Form')).toBeInTheDocument();

        fireEvent.click(formsTrigger);
        expect(screen.queryByText('Clearance Form')).not.toBeInTheDocument();
    });

    it('calls onNavigate when a top-level link is clicked', () => {
        const onNavigate = jest.fn();
        renderMobile(onNavigate);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        fireEvent.click(screen.getByText('Documents & Calendar'));
        expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigate when a nested Application Guidelines link is clicked', () => {
        const onNavigate = jest.fn();
        renderMobile(onNavigate);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        fireEvent.click(
            screen.getByRole('button', { name: GUIDELINES_SECTION })
        );
        fireEvent.click(screen.getByText('Dossier Composition'));
        expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigate when a nested Forms & Questionnaires link is clicked', () => {
        const onNavigate = jest.fn();
        renderMobile(onNavigate);
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );
        fireEvent.click(screen.getByRole('button', { name: FORMS_SECTION }));
        fireEvent.click(screen.getByText('Clearance Form'));
        expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('closes the whole dropdown when the main trigger is clicked twice', () => {
        renderMobile();
        const trigger = screen.getByRole('button', {
            name: ETHICAL_CLEARANCE_TRIGGER,
        });
        fireEvent.click(trigger);
        expect(screen.getByText('Documents & Calendar')).toBeInTheDocument();

        fireEvent.click(trigger);
        expect(
            screen.queryByText('Documents & Calendar')
        ).not.toBeInTheDocument();
    });

    it('independently toggles the two sections', () => {
        renderMobile();
        fireEvent.click(
            screen.getByRole('button', { name: ETHICAL_CLEARANCE_TRIGGER })
        );

        fireEvent.click(
            screen.getByRole('button', { name: GUIDELINES_SECTION })
        );
        fireEvent.click(screen.getByRole('button', { name: FORMS_SECTION }));

        // Both sections open → both sets of links visible
        expect(screen.getByText('Dossier Composition')).toBeInTheDocument();
        expect(screen.getByText('Protocol Content')).toBeInTheDocument();
        expect(screen.getByText('Clearance Form')).toBeInTheDocument();
    });
});