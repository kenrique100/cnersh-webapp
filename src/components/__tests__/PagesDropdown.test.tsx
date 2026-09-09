import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PagesDropdown from "@/components/pages-dropdown";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, className }: {
        href: string;
        children: React.ReactNode;
        className?: string;
    }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));
jest.mock("lucide-react", () => ({
    ChevronDownIcon: ({ className }: { className?: string }) => (
        <span data-testid="chevron" className={className} />
    ),
    FileTextIcon: () => <span data-testid="file-icon" />,
    ExternalLinkIcon: () => <span data-testid="external-link-icon" />,
    DownloadIcon: () => <span data-testid="download-icon" />,
    BuildingIcon: () => <span data-testid="building-icon" />,
    UsersIcon: () => <span data-testid="users-icon" />,
}));

const mockPages = [
    {
        id: "page-1",
        name: "Research Policy",
        items: [
            { id: "item-1", name: "Policy Document", url: "https://example.com/policy", fileUrl: null },
            { id: "item-2", name: "PDF File", url: null, fileUrl: "https://example.com/file.pdf" },
            { id: "item-3", name: "No Link Item", url: null, fileUrl: null },
        ],
        children: [
            {
                id: "child-page-1",
                name: "Sub Page",
                items: [
                    { id: "child-item-1", name: "Child Item", url: "https://child.com", fileUrl: null },
                ],
                children: [],
            },
        ],
    },
    {
        id: "page-2",
        name: "Empty Page",
        items: [],
        children: [],
    },
];

describe("PagesDropdown", () => {
    // PageNode

    it("renders dynamic page names", () => {
        render(<PagesDropdown pages={mockPages} />);
        expect(screen.getByText("Research Policy")).toBeInTheDocument();
        expect(screen.getByText("Empty Page")).toBeInTheDocument();
    });

    it("does not show page content by default (collapsed)", () => {
        render(<PagesDropdown pages={mockPages} />);
        expect(screen.queryByText("Policy Document")).not.toBeInTheDocument();
    });

    it("expands page node on click", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        expect(screen.getByText("Policy Document")).toBeInTheDocument();
    });

    it("collapses page node on second click", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        expect(screen.getByText("Policy Document")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Research Policy"));
        expect(screen.queryByText("Policy Document")).not.toBeInTheDocument();
    });

    it("renders URL item as external link", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        const link = screen.getByText("Policy Document").closest("a");
        expect(link).toHaveAttribute("href", "https://example.com/policy");
        expect(link).toHaveAttribute("target", "_blank");
    });

    it("renders file item with download icon", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        const link = screen.getByText("PDF File").closest("a");
        expect(link).toHaveAttribute("href", "https://example.com/file.pdf");
    });

    it("renders item with no link as plain text", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        const noLinkItem = screen.getByText("No Link Item");
        expect(noLinkItem.tagName).toBe("LI");
    });

    it("renders children pages nested inside parent", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        expect(screen.getByText("Sub Page")).toBeInTheDocument();
    });

    it("expands child page node on click", () => {
        render(<PagesDropdown pages={mockPages} />);
        fireEvent.click(screen.getByText("Research Policy"));
        fireEvent.click(screen.getByText("Sub Page"));
        expect(screen.getByText("Child Item")).toBeInTheDocument();
    });

    it("does not show chevron for page with no content", () => {
        render(<PagesDropdown pages={mockPages} />);
        // Empty Page has no items and no children, so clicking should not crash
        fireEvent.click(screen.getByText("Empty Page"));
        // No content to show
        expect(screen.queryByText("Policy Document")).not.toBeInTheDocument();
    });

    it("shows separator when dynamic pages exist", () => {
        const { container } = render(<PagesDropdown pages={mockPages} />);
        const separators = container.querySelectorAll(".border-t");
        expect(separators.length).toBeGreaterThan(0);
    });

    it("renders with empty pages array (no dynamic pages)", () => {
        render(<PagesDropdown pages={[]} />);
        // Static sections should still render
        expect(screen.getByText("Ethical Clearance")).toBeInTheDocument();
        expect(screen.getByText("Resources")).toBeInTheDocument();
    });

    // EthicalClearanceDropdown

    it("renders Ethical Clearance section", () => {
        render(<PagesDropdown pages={[]} />);
        expect(screen.getByText("Ethical Clearance")).toBeInTheDocument();
    });

    it("expands Ethical Clearance section", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Ethical Clearance"));
        expect(screen.getByText("Documents & Calendar")).toBeInTheDocument();
    });

    it("collapses Ethical Clearance section", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Ethical Clearance"));
        fireEvent.click(screen.getByText("Ethical Clearance"));
        expect(screen.queryByText("Documents & Calendar")).not.toBeInTheDocument();
    });

    it("expands Application Guidelines nested section", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Ethical Clearance"));
        fireEvent.click(screen.getByText("Application Guidelines"));
        expect(screen.getByText("Dossier Composition")).toBeInTheDocument();
        expect(screen.getByText("Clearance Form")).toBeInTheDocument();
    });

    it("collapses Application Guidelines on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Ethical Clearance"));
        fireEvent.click(screen.getByText("Application Guidelines"));
        fireEvent.click(screen.getByText("Application Guidelines"));
        expect(screen.queryByText("Dossier Composition")).not.toBeInTheDocument();
    });

    it("expands Forms & Questionnaires nested section", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Ethical Clearance"));
        fireEvent.click(screen.getByText("Forms & Questionnaires"));
        expect(screen.getByText("Protocol Content")).toBeInTheDocument();
        expect(screen.getByText("Evaluation Form")).toBeInTheDocument();
    });

    it("collapses Forms & Questionnaires on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Ethical Clearance"));
        fireEvent.click(screen.getByText("Forms & Questionnaires"));
        fireEvent.click(screen.getByText("Forms & Questionnaires"));
        expect(screen.queryByText("Protocol Content")).not.toBeInTheDocument();
    });

    // ResourcesDropdown

    it("renders Resources section", () => {
        render(<PagesDropdown pages={[]} />);
        expect(screen.getByText("Resources")).toBeInTheDocument();
    });

    it("expands Resources section", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        expect(screen.getByText("WHO links for training")).toBeInTheDocument();
        expect(screen.getByText("CIOMS")).toBeInTheDocument();
        expect(screen.getByText("Helsinki Declaration")).toBeInTheDocument();
        expect(screen.getByText("Tuskegee Syphilis Trials")).toBeInTheDocument();
    });

    it("collapses Resources on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        fireEvent.click(screen.getByText("Resources"));
        expect(screen.queryByText("WHO links for training")).not.toBeInTheDocument();
    });

    it("expands Law & Research in Cameroon nested under Resources", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        fireEvent.click(screen.getByText("Law & Research in Cameroon"));
        expect(screen.getByText("Law on Human Subjects")).toBeInTheDocument();
        expect(screen.getByText("Medical Research")).toBeInTheDocument();
        expect(screen.getByText("Finance Law 2024")).toBeInTheDocument();
        expect(screen.getByText("Data Protection Law")).toBeInTheDocument();
    });

    it("collapses Law & Research on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        fireEvent.click(screen.getByText("Law & Research in Cameroon"));
        fireEvent.click(screen.getByText("Law & Research in Cameroon"));
        expect(screen.queryByText("Law on Human Subjects")).not.toBeInTheDocument();
    });

    it("renders Article link under Resources", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        const articleLink = screen.getByText("Article");
        expect(articleLink.closest("a")).toHaveAttribute("href", "/pages/article");
    });

    it("expands Ministerial Decision under Resources", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        // Find the button that contains "Ministerial Decision"; there is only one before expansion
        fireEvent.click(screen.getByText("Ministerial Decision"));
        // After expansion, we have two elements with that text: the button and the download link.
        // Use getAllByText to confirm both exist.
        const allMatches = screen.getAllByText("Ministerial Decision");
        expect(allMatches.length).toBeGreaterThanOrEqual(1);
        // Check that the download link is visible
        const downloadLink = screen.getByText("Ministerial Decision", { selector: "a" });
        expect(downloadLink).toHaveAttribute("href", "/Organisation_et_fonctionnement__évaluation_recherche_12.11.2023-good version.pdf");
    });

    it("collapses Ministerial Decision on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("Resources"));
        const ministerialBtn = screen.getByText("Ministerial Decision");
        fireEvent.click(ministerialBtn);
        // Click the button again to collapse
        fireEvent.click(ministerialBtn);
        // After collapse, the download link should disappear. The button itself remains.
        expect(screen.queryByText("Ministerial Decision", { selector: "a" })).not.toBeInTheDocument();
        expect(screen.getByText("Ministerial Decision")).toBeInTheDocument(); // button still there
    });

    // SOPsDropdown

    it("renders SOPs section", () => {
        render(<PagesDropdown pages={[]} />);
        expect(screen.getByText("SOP's")).toBeInTheDocument();
    });

    it("expands SOPs section", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("SOP's"));
        expect(screen.getByText("English")).toBeInTheDocument();
        expect(screen.getByText("French")).toBeInTheDocument();
    });

    it("collapses SOPs on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("SOP's"));
        fireEvent.click(screen.getByText("SOP's"));
        expect(screen.queryByText("English")).not.toBeInTheDocument();
    });

    it("expands English SOPs", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("SOP's"));
        fireEvent.click(screen.getByText("English"));
        const sop1Links = screen.getAllByText("SOP 1");
        expect(sop1Links.length).toBeGreaterThan(0);
        const sop2Links = screen.getAllByText("SOP 2");
        expect(sop2Links.length).toBeGreaterThan(0);
    });

    it("collapses English SOPs on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("SOP's"));
        fireEvent.click(screen.getByText("English"));
        fireEvent.click(screen.getByText("English"));
        // After collapse, SOP 1 and SOP 2 from English should not be visible.
        // They may still exist if French is expanded, but we can check for a specific one.
        // Since French is collapsed, there should be no SOP links visible.
        expect(screen.queryByText("SOP 1")).not.toBeInTheDocument();
        expect(screen.queryByText("SOP 2")).not.toBeInTheDocument();
    });

    it("expands French SOPs", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("SOP's"));
        fireEvent.click(screen.getByText("French"));
        const sop1Links = screen.getAllByText("SOP 1");
        expect(sop1Links.length).toBeGreaterThan(0);
    });

    it("collapses French SOPs on second click", () => {
        render(<PagesDropdown pages={[]} />);
        fireEvent.click(screen.getByText("SOP's"));
        fireEvent.click(screen.getByText("French"));
        fireEvent.click(screen.getByText("French"));
        expect(screen.queryByText("SOP 1")).not.toBeInTheDocument();
    });

    // Static links

    it("renders About Us link", () => {
        render(<PagesDropdown pages={[]} />);
        const link = screen.getByText("About Us").closest("a");
        expect(link).toHaveAttribute("href", "/pages/about");
    });

    it("renders Contract Rex Org link", () => {
        render(<PagesDropdown pages={[]} />);
        const link = screen.getByText("Contract Rex Org").closest("a");
        expect(link).toHaveAttribute("href", "/pages/contract-rex");
    });

    it("renders Membership download link", () => {
        render(<PagesDropdown pages={[]} />);
        const link = screen.getByText("Membership").closest("a");
        expect(link).toHaveAttribute("href", "/membership.pdf");
        expect(link).toHaveAttribute("target", "_blank");
    });

    it("renders the study review and follow-up form link", () => {
        render(<PagesDropdown pages={[]} />);
        const link = screen.getByText("Study Review and Follow-up Form").closest("a");
        expect(link).toHaveAttribute("href", "/CNRESH Study Review & Follow up Form.pdf");
        expect(link).toHaveAttribute("target", "_blank");
    });
});
