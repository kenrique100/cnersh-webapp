import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CellActions } from "../cell-actions";
import {
    banUserById,
    removeManagedUser,
    unbanUserById,
} from "@/app/actions/admin";
import { useUsers } from "@/hooks/use-user";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/app/actions/admin", () => ({
    banUserById: jest.fn(),
    removeManagedUser: jest.fn(),
    unbanUserById: jest.fn(),
}));

jest.mock("@/hooks/use-user", () => ({
    useUsers: jest.fn(),
}));

jest.mock("@/components/ui/dialog", () => {
    const Dialog = ({
                        open,
                        children,
                    }: {
        open: boolean;
        children: React.ReactNode;
    }) => (open ? <div data-testid="dialog">{children}</div> : null);

    const DialogContent = ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    );
    const DialogHeader = ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    );
    const DialogTitle = ({ children }: { children: React.ReactNode }) => (
        <h2>{children}</h2>
    );
    const DialogDescription = ({ children }: { children: React.ReactNode }) => (
        <p>{children}</p>
    );

    return { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription };
});

jest.mock("@/components/ui/dropdown-menu", () => {
    const ReactActual = jest.requireActual<typeof import("react")>("react");

    type CtxType = { open: boolean; setOpen: (v: boolean) => void };

    const Ctx = ReactActual.createContext<CtxType>({
        open: false,
        setOpen: () => {},
    });

    const DropdownMenu = ({
                              open,
                              onOpenChange,
                              children,
                          }: {
        open: boolean;
        onOpenChange: (v: boolean) => void;
        children: React.ReactNode;
    }) => (
        <Ctx.Provider value={{ open, setOpen: onOpenChange }}>
            {children}
        </Ctx.Provider>
    );

    const DropdownMenuTrigger = ({
                                     children,
                                 }: {
        children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
    }) => {
        const { open, setOpen } = ReactActual.useContext(Ctx);
        return ReactActual.cloneElement(children, {
            onClick: (e: React.MouseEvent) => {
                // children.props is now typed, so this is safe
                children.props.onClick?.(e);
                setOpen(!open);
            },
        });
    };

    const DropdownMenuContent = ({
                                     children,
                                 }: {
        children: React.ReactNode;
    }) => {
        const { open } = ReactActual.useContext(Ctx);
        return open ? <div>{children}</div> : null;
    };

    const DropdownMenuItem = ({
                                  children,
                                  onClick,
                                  className,
                              }: {
        children: React.ReactNode;
        onClick?: () => void;
        className?: string;
    }) => (
        <div role="menuitem" className={className} onClick={onClick}>
            {children}
        </div>
    );

    return {
        DropdownMenu,
        DropdownMenuTrigger,
        DropdownMenuContent,
        DropdownMenuItem,
    };
});

/**
 * Matches only the *leaf* paragraph element that contains the target text,
 * rather than every ancestor whose textContent also contains it.
 * This prevents `findByText` from throwing "Found multiple elements".
 */
const exactParagraphMatcher =
    (text: string) =>
        (_: string, element: Element | null): boolean => {
            if (!element || element.tagName !== "P") return false;
            const normalised =
                element.textContent?.replace(/\s+/g, " ").trim() ?? "";
            return normalised.includes(text);
        };

const mockRouter = { refresh: jest.fn() };
const mockedUseRouter = jest.mocked(useRouter);
mockedUseRouter.mockReturnValue(
    mockRouter as unknown as ReturnType<typeof useRouter>
);

const mockSetIsOpen = jest.fn();
const mockSetUser = jest.fn();
const mockedUseUsers = jest.mocked(useUsers);

const defaultReturnValue = () => ({
    isOpen: false,
    setIsOpen: mockSetIsOpen,
    user: {
        id: "",
        name: "",
        role: "",
        email: "",
        emailVerified: false,
        hasDeletePermission: false,
    },
    setUser: mockSetUser,
});

mockedUseUsers.mockReturnValue(defaultReturnValue());

const defaultProps = {
    id: "user-1",
    name: "John Doe",
    role: "user",
    email: "john@example.com",
    emailVerified: true,
    hasDeletePermission: true,
    image: null,
    banned: false,
};

describe("CellActions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseRouter.mockReturnValue(
            mockRouter as unknown as ReturnType<typeof useRouter>
        );
        mockedUseUsers.mockReturnValue(defaultReturnValue());
    });

    const getMobileTrigger = () => {
        const mobileDiv = document.querySelector(".sm\\:hidden");
        if (!mobileDiv) throw new Error("Mobile div not found");
        const btn = mobileDiv.querySelector("button");
        if (!btn) throw new Error("Mobile trigger button not found");
        return btn;
    };

    it("renders desktop action buttons (Edit, Ban, Delete)", () => {
        render(<CellActions {...defaultProps} />);
        expect(screen.getByTitle("Edit")).toBeInTheDocument();
        expect(screen.getByTitle("Ban user")).toBeInTheDocument();
        expect(screen.getByTitle("Delete user")).toBeInTheDocument();
    });

    it("renders 'Unban user' button when user is banned", () => {
        render(<CellActions {...defaultProps} banned={true} />);
        expect(screen.getByTitle("Unban user")).toBeInTheDocument();
        expect(screen.queryByTitle("Ban user")).not.toBeInTheDocument();
    });

    it("does not render management actions without target permission", () => {
        const { container } = render(
            <CellActions {...defaultProps} hasDeletePermission={false} />,
        );
        expect(screen.queryByTitle("Delete user")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
        expect(container).toBeEmptyDOMElement();
    });

    it("opens edit dialog and sets user in store", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Edit"));
        expect(mockSetIsOpen).toHaveBeenCalledWith(true);
        expect(mockSetUser).toHaveBeenCalledWith({
            id: "user-1",
            name: "John Doe",
            role: "user",
            email: "john@example.com",
            emailVerified: true,
            hasDeletePermission: true,
            image: null,
            banned: false,
        });
    });

    it("opens ban modal when Ban button is clicked", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Ban user"));
        expect(
            screen.getByText(exactParagraphMatcher("Are you sure you want to ban John Doe"))
        ).toBeInTheDocument();
    });

    it("opens unban modal when Unban button is clicked", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} banned={true} />);
        await user.click(screen.getByTitle("Unban user"));
        expect(
            screen.getByText(exactParagraphMatcher("Are you sure you want to unban John Doe"))
        ).toBeInTheDocument();
    });

    it("opens delete modal when Delete button is clicked", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Delete user"));
        const dialogText = await screen.findByText(
            exactParagraphMatcher("Are you sure you want to delete John Doe")
        );
        expect(dialogText).toBeInTheDocument();
    });

    it("closes the delete modal on Cancel", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Delete user"));
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(
            screen.queryByText(
                exactParagraphMatcher("Are you sure you want to delete John Doe")
            )
        ).not.toBeInTheDocument();
    });

    it("calls removeManagedUser and shows success toast on delete confirm", async () => {
        (removeManagedUser as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Delete user"));
        await user.click(screen.getByRole("button", { name: "Delete User" }));
        await waitFor(() => {
            expect(removeManagedUser).toHaveBeenCalledWith("user-1");
            expect(toast.success).toHaveBeenCalledWith("User removed successfully");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("shows an error if removeManagedUser fails", async () => {
        (removeManagedUser as jest.Mock).mockRejectedValue(new Error("Forbidden"));
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Delete user"));
        await user.click(screen.getByRole("button", { name: "Delete User" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("shows generic error toast if removeUser throws", async () => {
        (removeManagedUser as jest.Mock).mockRejectedValue(
            new Error("network down")
        );
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Delete user"));
        await user.click(screen.getByRole("button", { name: "Delete User" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("calls banUserById and shows success toast on ban", async () => {
        (banUserById as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Ban user"));
        await user.click(screen.getByRole("button", { name: "Ban" }));
        await waitFor(() => {
            expect(banUserById).toHaveBeenCalledWith("user-1", "Banned by admin");
            expect(toast.success).toHaveBeenCalledWith("John Doe has been banned");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("calls unbanUserById and shows success toast on unban", async () => {
        (unbanUserById as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} banned={true} />);
        await user.click(screen.getByTitle("Unban user"));
        await user.click(screen.getByRole("button", { name: "Unban" }));
        await waitFor(() => {
            expect(unbanUserById).toHaveBeenCalledWith("user-1");
            expect(toast.success).toHaveBeenCalledWith("John Doe has been unbanned");
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("shows error if ban fails", async () => {
        (banUserById as jest.Mock).mockRejectedValue(new Error("Failed"));
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Ban user"));
        await user.click(screen.getByRole("button", { name: "Ban" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("shows error if unban fails", async () => {
        (unbanUserById as jest.Mock).mockRejectedValue(new Error("Failed"));
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} banned={true} />);
        await user.click(screen.getByTitle("Unban user"));
        await user.click(screen.getByRole("button", { name: "Unban" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("shows generic error toast if ban throws", async () => {
        (banUserById as jest.Mock).mockRejectedValue(new Error("boom"));
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(screen.getByTitle("Ban user"));
        await user.click(screen.getByRole("button", { name: "Ban" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("opens mobile dropdown and clicks Edit", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(getMobileTrigger());
        await user.click(screen.getByText("Edit"));
        expect(mockSetIsOpen).toHaveBeenCalledWith(true);
        expect(mockSetUser).toHaveBeenCalled();
    });

    it("opens mobile dropdown and clicks Ban", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(getMobileTrigger());
        await user.click(screen.getByText("Ban"));
        expect(
            screen.getByText(exactParagraphMatcher("Are you sure you want to ban John Doe"))
        ).toBeInTheDocument();
    });

    it("opens mobile dropdown and clicks Delete (if permission)", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(getMobileTrigger());
        await user.click(await screen.findByText("Delete"));
        const dialogText = await screen.findByText(
            exactParagraphMatcher("Are you sure you want to delete John Doe")
        );
        expect(dialogText).toBeInTheDocument();
    });

    it("does not show the mobile menu without target permission", () => {
        render(<CellActions {...defaultProps} hasDeletePermission={false} />);
        expect(document.querySelector(".sm\\:hidden")).not.toBeInTheDocument();
        expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });

    it("closes mobile menu after Edit action", async () => {
        const user = userEvent.setup();
        render(<CellActions {...defaultProps} />);
        await user.click(getMobileTrigger());
        await user.click(screen.getByText("Edit"));
        expect(mockSetIsOpen).toHaveBeenCalled();
        expect(screen.queryByText("Ban")).not.toBeInTheDocument();
    });
});
