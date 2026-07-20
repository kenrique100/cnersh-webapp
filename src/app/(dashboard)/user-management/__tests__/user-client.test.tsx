import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import UserManagementClient from "../user-client";
import { useUsers } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import { applyRoleChange } from "@/app/actions/admin";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/use-user", () => ({
    useUsers: jest.fn(),
}));

jest.mock("@/lib/auth-client", () => ({
    authClient: {
        admin: {
            createUser: jest.fn(),
            updateUser: jest.fn(),
        },
    },
}));

jest.mock("@/app/actions/admin", () => ({
    applyRoleChange: jest.fn(),
}));

jest.mock("@/components/data-table", () => ({
    DataTable: ({ data }: { data: { id: string; name: string }[] }) => (
        <div data-testid="data-table">
            {data.map((user) => (
                <div key={user.id} data-testid={`user-${user.id}`}>
                    {user.name}
                </div>
            ))}
        </div>
    ),
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

    return { Dialog, DialogContent, DialogHeader, DialogTitle };
});

jest.mock("@/components/ui/field", () => {
    const ReactActual =
        jest.requireActual<typeof import("react")>("react");

    let counter = 0;

    const FieldGroup = ({
                            children,
                            ...rest
                        }: {
        children: React.ReactNode;
        [key: string]: unknown;
    }) => <div {...rest}>{children}</div>;

    const Field = ({
                       children,
                       ...rest
                   }: {
        children: React.ReactNode;
        [key: string]: unknown;
    }) => {
        const id = ReactActual.useMemo(() => `field-${counter++}`, []);

        const mapped = ReactActual.Children.map(
            children,
            (child: React.ReactNode) => {
                if (!ReactActual.isValidElement(child)) return child;

                const el = child as React.ReactElement<{
                    displayName?: string;
                    htmlFor?: string;
                    id?: string;
                    [key: string]: unknown;
                }>;

                const displayName = (
                    el.type as { displayName?: string }
                )?.displayName;

                if (displayName === "FieldLabel") {
                    return ReactActual.cloneElement(el, { htmlFor: id });
                }
                if (displayName === "FieldError") {
                    return el;
                }
                return ReactActual.cloneElement(el, { id });
            },
        );

        return <div {...rest}>{mapped}</div>;
    };

    const FieldLabel = ({
                            children,
                            htmlFor,
                        }: {
        children: React.ReactNode;
        htmlFor?: string;
    }) => <label htmlFor={htmlFor}>{children}</label>;
    FieldLabel.displayName = "FieldLabel";

    const FieldError = ({
                            errors,
                        }: {
        errors?: Array<{ message?: string } | undefined>;
    }) => (
        <div role="alert">
            {errors
                ?.map((e) => e?.message)
                .filter(Boolean)
                .join(", ")}
        </div>
    );
    FieldError.displayName = "FieldError";

    return { Field, FieldGroup, FieldLabel, FieldError };
});

jest.mock("@/components/ui/select", () => {
    const ReactActual =
        jest.requireActual<typeof import("react")>("react");

    interface SelectItemProps {
        value: string;
        children: React.ReactNode;
        [key: string]: unknown;
    }

    interface ContainerProps {
        children?: React.ReactNode;
        [key: string]: unknown;
    }

    interface OptionShape {
        value: string;
        label: React.ReactNode;
    }

    const collectOptions = (children: React.ReactNode): OptionShape[] => {
        const options: OptionShape[] = [];
        ReactActual.Children.forEach(children, (child: React.ReactNode) => {
            if (!ReactActual.isValidElement(child)) return;
            const displayName = (child.type as { displayName?: string })
                ?.displayName;
            if (displayName === "SelectItem") {
                const el = child as React.ReactElement<SelectItemProps>;
                options.push({ value: el.props.value, label: el.props.children });
            } else {
                const el = child as React.ReactElement<ContainerProps>;
                if (el.props?.children) {
                    options.push(...collectOptions(el.props.children));
                }
            }
        });
        return options;
    };

    interface SelectProps {
        children: React.ReactNode;
        onValueChange?: (v: string) => void;
        defaultValue?: string;
        value?: string;
        id?: string;
        name?: string;
        onBlur?: React.FocusEventHandler<HTMLSelectElement>;
        [key: string]: unknown;
    }

    const Select = ({
                        children,
                        onValueChange,
                        defaultValue = "",
                        value: controlledValue,
                        id,
                        name,
                        onBlur,
                        ...rest
                    }: SelectProps) => {
        const options = collectOptions(children);

        const [internalValue, setInternalValue] = ReactActual.useState<string>(
            controlledValue ?? defaultValue,
        );

        ReactActual.useEffect(() => {
            if (controlledValue !== undefined) {
                setInternalValue(controlledValue);
            }
        }, [controlledValue]);

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const next = e.target.value;
            setInternalValue(next);
            onValueChange?.(next);
        };

        return (
            <select
                id={id}
                name={name}
                value={internalValue}
                onChange={handleChange}
                onBlur={onBlur}
                {...rest}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    };

    const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    );
    const SelectValue = () => null;
    const SelectContent = ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    );
    const SelectItem = ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    );
    SelectItem.displayName = "SelectItem";

    return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

const mockRouter = { refresh: jest.fn() };
const mockedUseRouter = jest.mocked(useRouter);

const mockSetIsOpen = jest.fn();
const mockSetUser = jest.fn();
const mockedUseUsers = jest.mocked(useUsers);

const baseUserStore = {
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
};

const defaultProps = {
    users: [
        {
            id: "1",
            name: "Alice",
            role: "user",
            email: "alice@example.com",
            emailVerified: true,
            hasDeletePermission: false,
            image: null,
            banned: false,
        },
        {
            id: "2",
            name: "Bob",
            role: "admin",
            email: "bob@example.com",
            emailVerified: true,
            hasDeletePermission: true,
            image: null,
            banned: false,
        },
    ],
    currentRole: "admin",
    managementData: {
        stats: {
            totalUsers: 10,
            activeUsers: 8,
            bannedUsers: 2,
            newRegistrations: 5,
            weeklyNewUsers: 3,
        },
        recentActivity: [
            {
                id: "log1",
                action: "USER_CREATED",
                details: "Created user john@example.com",
                targetId: "user-3",
                adminName: "Admin",
                createdAt: new Date().toISOString(),
            },
        ],
    },
};

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
    consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation((message?: unknown, ...args: unknown[]) => {
            const text =
                typeof message === "string" ? message : String(message);
            const isControlledInputWarning =
                text.includes(
                    "A component is changing an uncontrolled input to be controlled",
                ) ||
                text.includes(
                    "A component is changing a controlled input to be uncontrolled",
                );

            if (isControlledInputWarning) {
                return;
            }

            console.warn(message, ...args);
        });
});

afterAll(() => {
    consoleErrorSpy.mockRestore();
});

describe("UserManagementClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseRouter.mockReturnValue(
            mockRouter as unknown as ReturnType<typeof useRouter>,
        );
        mockedUseUsers.mockReturnValue(baseUserStore);
    });

    it("renders page header and create user button", () => {
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.getByText("User Management")).toBeInTheDocument();
        expect(screen.getByText("Create New User")).toBeInTheDocument();
    });

    it("renders stat cards", () => {
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.getByText("New Registrations")).toBeInTheDocument();
        expect(screen.getByText("3 this week")).toBeInTheDocument();
        expect(screen.getAllByText("5")).toHaveLength(2);

        expect(screen.getByText("Flagged / Suspended")).toBeInTheDocument();
        expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
        expect(screen.getByText("0")).toBeInTheDocument();

        expect(screen.getByText("Total Active Users")).toBeInTheDocument();
        expect(screen.getAllByText("8").length).toBeGreaterThanOrEqual(1);
    });

    it("renders recent activity", () => {
        render(<UserManagementClient {...defaultProps} />);
        expect(
            screen.getByText("Recent Administrative Activity"),
        ).toBeInTheDocument();
        expect(screen.getByText("User Created")).toBeInTheDocument();
        expect(
            screen.getByText("Created user john@example.com"),
        ).toBeInTheDocument();
    });

    it("shows empty state when there is no recent activity", () => {
        render(
            <UserManagementClient
                {...defaultProps}
                managementData={{
                    ...defaultProps.managementData,
                    recentActivity: [],
                }}
            />,
        );
        expect(
            screen.getByText("No recent administrative activity"),
        ).toBeInTheDocument();
    });

    it("renders system health indicators", () => {
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.getByText("System / User Health")).toBeInTheDocument();
        expect(screen.getByText("Authentication Service")).toBeInTheDocument();
        expect(screen.getByText("Database Connection")).toBeInTheDocument();
        expect(screen.getByText("API Status")).toBeInTheDocument();
        expect(
            screen.getByText("User Activity Monitoring"),
        ).toBeInTheDocument();
    });

    it("renders the user table (mocked DataTable)", () => {
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.getByTestId("data-table")).toBeInTheDocument();
        expect(screen.getByTestId("user-1")).toHaveTextContent("Alice");
        expect(screen.getByTestId("user-2")).toHaveTextContent("Bob");
    });

    it("shows 'No users found' when users array is empty", () => {
        render(<UserManagementClient {...defaultProps} users={[]} />);
        expect(screen.getByText("No users found.")).toBeInTheDocument();
    });

    it("opens create user dialog when 'Create New User' is clicked", async () => {
        const user = userEvent.setup();
        render(<UserManagementClient {...defaultProps} />);
        await user.click(screen.getByText("Create New User"));
        expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });

    it("renders the dialog with form when isOpen is true", () => {
        mockedUseUsers.mockReturnValue({ ...baseUserStore, isOpen: true });
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.getByText("Create user")).toBeInTheDocument();
        expect(screen.getByLabelText("Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
        expect(screen.getByLabelText("Role")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Save changes" }),
        ).toBeInTheDocument();
    });

    it("renders edit dialog with user data when editing", () => {
        mockedUseUsers.mockReturnValue({
            ...baseUserStore,
            isOpen: true,
            user: {
                id: "1",
                name: "Alice",
                role: "user",
                email: "alice@example.com",
                emailVerified: true,
                hasDeletePermission: false,
            },
        });
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.getByText("Edit user")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
        expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
        expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });

    it("calls authClient.admin.createUser on submit for new user", async () => {
        (authClient.admin.createUser as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        mockedUseUsers.mockReturnValue({ ...baseUserStore, isOpen: true });
        render(<UserManagementClient {...defaultProps} />);
        await user.type(screen.getByLabelText("Name"), "Charlie");
        await user.type(screen.getByLabelText("Email"), "charlie@example.com");
        await user.type(screen.getByLabelText("Password"), "password123456");
        await user.selectOptions(screen.getByLabelText("Role"), "admin");
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        await waitFor(() => {
            expect(authClient.admin.createUser).toHaveBeenCalledWith({
                name: "Charlie",
                email: "charlie@example.com",
                password: "password123456",
                role: "admin",
            });
            expect(toast.success).toHaveBeenCalledWith(
                "New user created successfully",
            );
            expect(mockSetIsOpen).toHaveBeenCalledWith(false);
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("calls authClient.admin.updateUser and applyRoleChange on edit with role change", async () => {
        (authClient.admin.updateUser as jest.Mock).mockResolvedValue({});
        (applyRoleChange as jest.Mock).mockResolvedValue({});
        const user = userEvent.setup();
        mockedUseUsers.mockReturnValue({
            ...baseUserStore,
            isOpen: true,
            user: {
                id: "1",
                name: "Alice",
                role: "user",
                email: "alice@example.com",
                emailVerified: true,
                hasDeletePermission: false,
            },
        });
        render(<UserManagementClient {...defaultProps} />);
        await user.clear(screen.getByDisplayValue("Alice"));
        await user.type(screen.getByLabelText("Name"), "Alice Updated");
        await user.selectOptions(screen.getByLabelText("Role"), "admin");
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        await waitFor(() => {
            expect(authClient.admin.updateUser).toHaveBeenCalledWith({
                userId: "1",
                data: {
                    name: "Alice Updated",
                    email: "alice@example.com",
                    role: "admin",
                },
            });
            expect(applyRoleChange).toHaveBeenCalledWith("1", "user", "admin");
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining('Role changed to "admin"'),
            );
            expect(mockSetIsOpen).toHaveBeenCalledWith(false);
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("calls authClient.admin.updateUser without role change if role same", async () => {
        (authClient.admin.updateUser as jest.Mock).mockResolvedValue({});
        (applyRoleChange as jest.Mock).mockReset();
        const user = userEvent.setup();
        mockedUseUsers.mockReturnValue({
            ...baseUserStore,
            isOpen: true,
            user: {
                id: "1",
                name: "Alice",
                role: "user",
                email: "alice@example.com",
                emailVerified: true,
                hasDeletePermission: false,
            },
        });
        render(<UserManagementClient {...defaultProps} />);
        await user.clear(screen.getByDisplayValue("Alice"));
        await user.type(screen.getByLabelText("Name"), "Alice Updated");
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        await waitFor(() => {
            expect(authClient.admin.updateUser).toHaveBeenCalled();
            expect(applyRoleChange).not.toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("User updated successfully");
        });
    });

    it("shows error if password missing for new user", async () => {
        const user = userEvent.setup();
        mockedUseUsers.mockReturnValue({ ...baseUserStore, isOpen: true });
        render(<UserManagementClient {...defaultProps} />);
        await user.type(screen.getByLabelText("Name"), "Charlie");
        await user.type(screen.getByLabelText("Email"), "charlie@example.com");
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Password is required for new user",
            );
        });
    });

    it("handles API error during create user", async () => {
        (authClient.admin.createUser as jest.Mock).mockRejectedValue(
            new Error("Network error"),
        );
        const user = userEvent.setup();
        mockedUseUsers.mockReturnValue({ ...baseUserStore, isOpen: true });
        render(<UserManagementClient {...defaultProps} />);
        await user.type(screen.getByLabelText("Name"), "Charlie");
        await user.type(screen.getByLabelText("Email"), "charlie@example.com");
        await user.type(screen.getByLabelText("Password"), "password123456");
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("does not show password field when editing existing user", () => {
        mockedUseUsers.mockReturnValue({
            ...baseUserStore,
            isOpen: true,
            user: {
                id: "1",
                name: "Alice",
                role: "user",
                email: "alice@example.com",
                emailVerified: true,
                hasDeletePermission: false,
            },
        });
        render(<UserManagementClient {...defaultProps} />);
        expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    });

    it("allows any role based on currentRole (admin can assign any role)", () => {
        mockedUseUsers.mockReturnValue({ ...baseUserStore, isOpen: true });
        render(<UserManagementClient {...defaultProps} currentRole="admin" />);
        const roleSelect = screen.getByLabelText("Role");
        expect(roleSelect).toBeInTheDocument();
        const options = screen.getAllByRole("option");
        expect(options.map((o) => o.textContent)).toEqual([
            "user",
            "admin",
            "superadmin",
        ]);
    });

    it("allows only 'user' role if currentRole is something else (fallback)", () => {
        mockedUseUsers.mockReturnValue({ ...baseUserStore, isOpen: true });
        render(
            <UserManagementClient {...defaultProps} currentRole="viewer" />,
        );
        const roleSelect = screen.getByLabelText("Role");
        const options = screen.getAllByRole("option");
        expect(options.map((o) => o.textContent)).toEqual(["user"]);
        expect(roleSelect).toBeInTheDocument();
    });
});