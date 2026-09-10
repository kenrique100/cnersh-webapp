import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminPagesClient from "../pages-client";
import {
    createPage,
    deletePage,
    addPageItem,
    deletePageItem,
    updatePage,
    updatePageItem,
} from "@/app/actions/page-actions";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/app/actions/page-actions", () => ({
    createPage: jest.fn(),
    deletePage: jest.fn(),
    addPageItem: jest.fn(),
    deletePageItem: jest.fn(),
    updatePage: jest.fn(),
    updatePageItem: jest.fn(),
}));

global.fetch = jest.fn();

const mockRouter = { refresh: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

const mockPages = [
    {
        id: "page-1",
        name: "Resources",
        items: [
            { id: "item-1", name: "Policy PDF", url: null, fileUrl: "/policy.pdf", pageId: "page-1", createdAt: "" },
            { id: "item-2", name: "External Link", url: "https://example.com", fileUrl: null, pageId: "page-1", createdAt: "" },
        ],
        children: [
            {
                id: "page-2",
                name: "Sub-Resources",
                items: [],
                children: [],
                createdAt: "",
                updatedAt: "",
            },
        ],
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "page-3",
        name: "Ethical Clearance",
        items: [],
        children: [],
        createdAt: "",
        updatedAt: "",
    },
];

describe("AdminPagesClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (fetch as jest.Mock).mockReset();
        window.confirm = jest.fn().mockReturnValue(true);
    });

    it("renders the page heading and create form", () => {
        render(<AdminPagesClient pages={[]} />);
        expect(screen.getByText("Manage Pages")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("https://example.com")).toBeInTheDocument();
        expect(screen.getByText("Choose File")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Create Page/i })).toBeInTheDocument();
    });

    it("renders existing pages", () => {
        render(<AdminPagesClient pages={mockPages} />);
        // "Ethical Clearance" appears twice (page title + select option) – use getAllByText and take the first
        expect(screen.getAllByText("Resources")[0]).toBeInTheDocument();
        expect(screen.getByText("Sub-Resources")).toBeInTheDocument();
        expect(screen.getAllByText("Ethical Clearance")[0]).toBeInTheDocument();
        expect(screen.getByText("Policy PDF")).toBeInTheDocument();
        expect(screen.getByText("External Link")).toBeInTheDocument();
        expect(screen.getByText("[link]")).toBeInTheDocument();
        expect(screen.getByText("[file]")).toBeInTheDocument();
    });

    it("shows 'No pages created yet' when empty", () => {
        render(<AdminPagesClient pages={[]} />);
        expect(screen.getByText("No pages created yet.")).toBeInTheDocument();
    });

    it("creates a page with only name", async () => {
        (createPage as jest.Mock).mockResolvedValue({ id: "new-page" });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={[]} />);

        await user.type(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance"), "New Page");
        await user.click(screen.getByRole("button", { name: /Create Page/i }));

        await waitFor(() => {
            expect(createPage).toHaveBeenCalledWith({
                name: "New Page",
                parentId: undefined,
                items: [],
            });
            expect(toast.success).toHaveBeenCalledWith("Page created successfully");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("creates a page with URL and file", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://blob.vercel.store/file.pdf" }),
        });
        (createPage as jest.Mock).mockResolvedValue({ id: "new-page" });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={[]} />);

        await user.type(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance"), "Doc Page");
        await user.type(screen.getByPlaceholderText("https://example.com"), "https://example.com");
        const fileInput = screen.getByText("Choose File").closest("label")?.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
        fireEvent.change(fileInput, { target: { files: [file] } });
        await user.click(screen.getByRole("button", { name: /Create Page/i }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith("/api/upload", expect.any(Object));
            expect(createPage).toHaveBeenCalledWith({
                name: "Doc Page",
                parentId: undefined,
                items: [
                    {
                        name: "Doc Page",
                        url: "https://example.com",
                        fileUrl: "https://blob.vercel.store/file.pdf",
                    },
                ],
            });
        });
    });

    it("creates a page with parent", async () => {
        (createPage as jest.Mock).mockResolvedValue({ id: "new-page" });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);

        await user.type(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance"), "Child Page");
        const parentSelect = screen.getByRole("combobox");
        await user.selectOptions(parentSelect, "page-1");
        await user.click(screen.getByRole("button", { name: /Create Page/i }));

        await waitFor(() => {
            expect(createPage).toHaveBeenCalledWith({
                name: "Child Page",
                parentId: "page-1",
                items: [],
            });
        });
    });

    it("shows error if page name is empty", async () => {
        const user = userEvent.setup();
        render(<AdminPagesClient pages={[]} />);
        await user.click(screen.getByRole("button", { name: /Create Page/i }));
        expect(toast.error).toHaveBeenCalledWith("Page name is required");
    });

    it("edits a page name", async () => {
        (updatePage as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const editBtns = screen.getAllByRole("button", { name: /Edit/i });
        await user.click(editBtns[0]);
        const input = screen.getByDisplayValue("Resources");
        await user.clear(input);
        await user.type(input, "Updated Resources");
        // Find the check (✓) button inside the editing container
        const container = input.closest("div")?.parentElement;
        const checkBtn = container?.querySelector('button.text-green-600');
        expect(checkBtn).toBeInTheDocument();
        await user.click(checkBtn!);

        await waitFor(() => {
            expect(updatePage).toHaveBeenCalledWith("page-1", { name: "Updated Resources" });
            expect(toast.success).toHaveBeenCalledWith("Page updated");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("cancels editing a page", async () => {
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const editBtns = screen.getAllByRole("button", { name: /Edit/i });
        await user.click(editBtns[0]);
        const input = screen.getByDisplayValue("Resources");
        const container = input.closest("div")?.parentElement;
        const cancelBtn = container?.querySelector('button.text-gray-400');
        expect(cancelBtn).toBeInTheDocument();
        await user.click(cancelBtn!);
        expect(screen.queryByDisplayValue("Resources")).not.toBeInTheDocument();
    });

    it("deletes a page after confirmation", async () => {
        window.confirm = jest.fn().mockReturnValue(true);
        (deletePage as jest.Mock).mockResolvedValue({ success: true });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const deleteBtns = screen.getAllByRole("button", { name: /Delete/i });
        await user.click(deleteBtns[0]);
        await waitFor(() => {
            expect(deletePage).toHaveBeenCalledWith("page-1");
            expect(toast.success).toHaveBeenCalledWith("Page deleted");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("cancels deletion if confirm is false", async () => {
        window.confirm = jest.fn().mockReturnValue(false);
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const deleteBtns = screen.getAllByRole("button", { name: /Delete/i });
        await user.click(deleteBtns[0]);
        expect(deletePage).not.toHaveBeenCalled();
    });

    it("adds an item to a page", async () => {
        (addPageItem as jest.Mock).mockResolvedValue({ id: "new-item" });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const addItemBtns = screen.getAllByRole("button", { name: /Add Item/i });
        await user.click(addItemBtns[0]);
        await user.type(screen.getByPlaceholderText("Item name *"), "New Item");
        await user.type(screen.getByPlaceholderText("URL (optional)"), "https://item.com");
        // Use the specific "Add" button (not "Add Item")
        const addBtn = screen.getByRole("button", { name: "Add" });
        await user.click(addBtn);

        await waitFor(() => {
            expect(addPageItem).toHaveBeenCalledWith("page-1", {
                name: "New Item",
                url: "https://item.com",
                fileUrl: undefined,
            });
            expect(toast.success).toHaveBeenCalledWith("Item added");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("adds an item with file upload", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://blob.vercel.store/item.pdf" }),
        });
        (addPageItem as jest.Mock).mockResolvedValue({ id: "new-item" });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const addItemBtns = screen.getAllByRole("button", { name: /Add Item/i });
        await user.click(addItemBtns[0]);
        await user.type(screen.getByPlaceholderText("Item name *"), "File Item");
        const fileInput = screen.getByText("Upload").closest("label")?.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
        fireEvent.change(fileInput, { target: { files: [file] } });
        const addBtn = screen.getAllByRole("button", { name: /Add/i }).find(
            btn => btn.className.includes("bg-primary")
        ) || screen.getAllByRole("button", { name: /Add/i })[1];
        await user.click(addBtn);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalled();
            expect(addPageItem).toHaveBeenCalledWith("page-1", {
                name: "File Item",
                url: undefined,
                fileUrl: "https://blob.vercel.store/item.pdf",
            });
        });
    });

    it("validates file type when adding item", async () => {
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const addItemBtns = screen.getAllByRole("button", { name: /Add Item/i });
        await user.click(addItemBtns[0]);
        await user.type(screen.getByPlaceholderText("Item name *"), "Invalid File");
        const fileInput = screen.getByText("Upload").closest("label")?.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(["dummy"], "bad.exe", { type: "application/x-msdownload" });
        fireEvent.change(fileInput, { target: { files: [file] } });
        expect(toast.error).toHaveBeenCalledWith("Only PDF, DOC, and DOCX files are allowed");
    });

    it("edits an item", async () => {
        (updatePageItem as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const container = screen.getByText("Policy PDF").closest("li")!;
        const editItemBtn = container.querySelector('button.text-gray-400');
        expect(editItemBtn).toBeInTheDocument();
        await user.click(editItemBtn!);
        const nameInput = screen.getByDisplayValue("Policy PDF");
        await user.clear(nameInput);
        await user.type(nameInput, "Updated Policy");
        const checkBtn = container.querySelector('button.text-green-600');
        expect(checkBtn).toBeInTheDocument();
        await user.click(checkBtn!);

        await waitFor(() => {
            expect(updatePageItem).toHaveBeenCalledWith("item-1", {
                name: "Updated Policy",
                url: undefined, // changed from "" to undefined
                fileUrl: undefined,
            });
            expect(toast.success).toHaveBeenCalledWith("Item updated");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("deletes an item after confirmation", async () => {
        window.confirm = jest.fn().mockReturnValue(true);
        (deletePageItem as jest.Mock).mockResolvedValue({ success: true });
        const user = userEvent.setup();
        render(<AdminPagesClient pages={mockPages} />);
        const container = screen.getByText("Policy PDF").closest("li")!;
        const deleteItemBtn = container.querySelector('button.text-red-400');
        expect(deleteItemBtn).toBeInTheDocument();
        await user.click(deleteItemBtn!);
        await waitFor(() => {
            expect(deletePageItem).toHaveBeenCalledWith("item-1");
            expect(toast.success).toHaveBeenCalledWith("Item deleted");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("handles API error when creating page", async () => {
        (createPage as jest.Mock).mockRejectedValue(new Error("Server error"));
        const user = userEvent.setup();
        render(<AdminPagesClient pages={[]} />);
        await user.type(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance"), "Test");
        await user.click(screen.getByRole("button", { name: /Create Page/i }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Server error");
        });
    });

    it("handles non-Error error when creating page", async () => {
        (createPage as jest.Mock).mockRejectedValue("String error");
        const user = userEvent.setup();
        render(<AdminPagesClient pages={[]} />);
        await user.type(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance"), "Test");
        await user.click(screen.getByRole("button", { name: /Create Page/i }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to create page");
        });
    });

    it("disables submit button while creating", async () => {
        (createPage as jest.Mock).mockImplementation(() => new Promise(() => {}));
        const user = userEvent.setup();
        render(<AdminPagesClient pages={[]} />);
        await user.type(screen.getByPlaceholderText("e.g. Resources, Ethical Clearance"), "Test");
        const submitBtn = screen.getByRole("button", { name: /Create Page/i });
        await user.click(submitBtn);
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent("Creating...");
    });

    it("shows 'No items yet' when page has no items", () => {
        render(<AdminPagesClient pages={[{ id: "empty", name: "Empty", items: [], children: [], createdAt: "", updatedAt: "" }]} />);
        expect(screen.getByText("No items yet.")).toBeInTheDocument();
    });
});