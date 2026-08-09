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
    SelectTrigger: () => null,
    SelectValue: ({ placeholder }: SelectValueProps) => <>{placeholder}</>,
    SelectContent: ({ children }: SelectContentProps) => <>{children}</>,
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

    it("hides Announcements category for non-admin users", () => {
        render(<CommunityCreatePost {...defaultProps} />);
        const combobox = screen.getByRole("combobox");
        expect(combobox).toBeInTheDocument();
        expect(screen.queryByText("Announcements")).toBeNull();
    });

    it("shows Announcements category for admin users", () => {
        render(<CommunityCreatePost {...defaultProps} isAdmin={true} />);
        expect(screen.getByText("Announcements")).toBeInTheDocument();
    });

    // FIX L106: Replace 'any[]' with proper type
    it("updates state and calls setNewTopic updater when user types (userEvent.type + wrapper)", async () => {
        type TopicState = typeof defaultProps.newTopic;
        const setCalls: (TopicState | ((prev: TopicState) => TopicState))[] = [];

        const Wrapper: React.FC = () => {
            const [topic, setTopic] = React.useState(defaultProps.newTopic);

            const wrappedSetTopic: React.Dispatch<React.SetStateAction<TopicState>> = (updater) => {
                setCalls.push(updater);
                if (typeof updater === "function") {
                    setTopic((prev) => (updater as (prev: TopicState) => TopicState)(prev));
                } else {
                    setTopic(updater);
                }
            };

            return <CommunityCreatePost {...defaultProps} newTopic={topic} setNewTopic={wrappedSetTopic} />;
        };

        render(<Wrapper />);

        const input = screen.getByPlaceholderText("new-channel");
        const user = userEvent.setup();

        await user.clear(input);
        await user.type(input, "My New Channel");

        expect((input as HTMLInputElement).value).toBe("My New Channel");

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