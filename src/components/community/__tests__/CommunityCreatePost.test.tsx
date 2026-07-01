import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityCreatePost } from "../CommunityCreatePost";

/* ---------- Typed mocks for UI components ---------- */
interface SelectProps {
    children?: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
}

interface SelectTriggerProps {
    children?: React.ReactNode;
    className?: string;
}

interface SelectValueProps {
    placeholder?: string;
}

interface SelectContentProps {
    children?: React.ReactNode;
}

interface SelectItemProps {
    value: string;
    children?: React.ReactNode;
}

jest.mock("@/components/ui/input", () => ({
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

// ---------- Option B: Select mock using real <select> (options must be text-only) ----------
jest.mock("@/components/ui/select", () => ({
    Select: ({ children, value, onValueChange }: SelectProps) => (
        <select
            role="combobox"
            value={value}
            onChange={(e) => onValueChange?.(e.target.value)}
        >
            {children}
        </select>
    ),
    // Don't render a div inside the <select>; return null for the trigger
    SelectTrigger: () => null,
    SelectValue: ({ placeholder }: SelectValueProps) => <>{placeholder}</>,
    SelectContent: ({ children }: SelectContentProps) => <>{children}</>,
    // Render options as text-only to avoid invalid nested tags inside <select>
    SelectItem: ({ value }: SelectItemProps) => <option value={value}>{value}</option>,
}));

/* ---------- Helpers ---------- */
const createMockInputRef = (): React.RefObject<HTMLInputElement> =>
    ({ current: document.createElement("input") } as React.RefObject<HTMLInputElement>);

const mockOnFileUpload = jest.fn().mockResolvedValue(undefined);

const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    newTopic: {
        title: "",
        content: "",
        category: "",
        image: "",
        images: [] as string[],
        video: "",
        videos: [] as string[],
        documents: [] as string[],
        linkUrl: "",
    },
    setNewTopic: jest.fn(),
    isAdmin: false,
    topicUploading: false,
    onCreateTopic: jest.fn(),
    onFileUpload: mockOnFileUpload,
    topicImageRef: createMockInputRef(),
    topicVideoRef: createMockInputRef(),
    topicDocRef: createMockInputRef(),
};

describe("CommunityCreatePost (stateful wrapper + userEvent)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("hides Announcements category for non‑admin users", () => {
        render(<CommunityCreatePost {...defaultProps} />);
        const combobox = screen.getByRole("combobox");
        expect(combobox).toBeInTheDocument();
        expect(screen.queryByText("Announcements")).toBeNull();
    });

    it("shows Announcements category for admin users", () => {
        render(<CommunityCreatePost {...defaultProps} isAdmin={true} />);
        expect(screen.getByText("Announcements")).toBeInTheDocument();
    });

    it("updates state and calls setNewTopic updater when user types (userEvent.type + wrapper)", async () => {
        const setCalls: any[] = [];

        const Wrapper: React.FC = () => {
            const [topic, setTopic] = React.useState(defaultProps.newTopic);

            // Wrap setTopic so we can record the updater/value while still applying it to state
            const wrappedSetTopic: React.Dispatch<React.SetStateAction<typeof topic>> = (updater) => {
                setCalls.push(updater);
                if (typeof updater === "function") {
                    setTopic((prev) => (updater as (prev: typeof topic) => typeof topic)(prev));
                } else {
                    setTopic(updater as typeof topic);
                }
            };

            return <CommunityCreatePost {...defaultProps} newTopic={topic} setNewTopic={wrappedSetTopic} />;
        };

        render(<Wrapper />);

        const input = screen.getByPlaceholderText("new-channel");
        const user = userEvent.setup();

        // Simulate real typing
        await user.clear(input);
        await user.type(input, "My New Channel");

        // Input value should reflect what's typed (controlled through wrapper state)
        expect((input as HTMLInputElement).value).toBe("My New Channel");

        // The last recorded updater should, when applied to a previous state, produce the expected title
        expect(setCalls.length).toBeGreaterThan(0);
        const lastUpdater = setCalls[setCalls.length - 1];
        const previousState = { ...defaultProps.newTopic, title: "old" };
        const newState = typeof lastUpdater === "function" ? lastUpdater(previousState) : lastUpdater;
        expect(newState.title).toBe("My New Channel");
    });

    it("calls onCreateTopic when the main button is clicked", () => {
        const onCreateTopic = jest.fn();
        const props = {
            ...defaultProps,
            newTopic: { ...defaultProps.newTopic, title: "T", content: "C", category: "General" },
            onCreateTopic,
        };
        render(<CommunityCreatePost {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Create Channel" }));
        expect(onCreateTopic).toHaveBeenCalled();
    });

    it("shows 'Publish Announcement' when category is Announcements", () => {
        const props = {
            ...defaultProps,
            newTopic: { ...defaultProps.newTopic, category: "Announcements" },
        };
        render(<CommunityCreatePost {...props} />);
        expect(screen.getByRole("button", { name: /publish announcement/i })).toBeInTheDocument();
    });

    it("calls onFileUpload when an image is selected (Announcements)", async () => {
        const onFileUpload = jest.fn().mockResolvedValue(undefined);
        const imageRef = createMockInputRef();
        const props = {
            ...defaultProps,
            isAdmin: true,
            newTopic: { ...defaultProps.newTopic, category: "Announcements" },
            onFileUpload,
            topicImageRef: imageRef,
        };
        render(<CommunityCreatePost {...props} />);

        const uploadButton = screen.getByRole("button", { name: /upload images/i });
        expect(uploadButton).toBeInTheDocument();

        const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

        const user = userEvent.setup();
        await user.upload(imageRef.current!, file);

        expect(onFileUpload).toHaveBeenCalledWith(file, "image");
    });
});