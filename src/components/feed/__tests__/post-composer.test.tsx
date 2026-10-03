import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockCreatePost = jest.fn();
const mockSearchUsers = jest.fn();
const mockGetAllUsers = jest.fn();
jest.mock("@/app/actions/feed", () => ({
    createPost: (...a: unknown[]) => mockCreatePost(...a),
    searchUsers: (...a: unknown[]) => mockSearchUsers(...a),
    getAllUsers: (...a: unknown[]) => mockGetAllUsers(...a),
}));

const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: mockRouterRefresh, push: jest.fn() }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

/**
 * `VideoUploadInput` is dynamically imported. The mock's visible text is
 * intentionally different from the toolbar's "Video" label so that
 * `getByRole("button", { name: /video/i })` remains unambiguous.
 */
jest.mock("../video-upload-input", () => {
    function VideoUploadMock({ onUpload }: { onUpload: (url: string) => void }) {
        return (
            <button
                data-testid="video-upload"
                onClick={() => onUpload("https://cdn.test/v.mp4")}
            >
                Upload media
            </button>
        );
    }
    VideoUploadMock.displayName = "VideoUploadMock";
    return { __esModule: true, default: VideoUploadMock };
});

const mockImageUpload = jest.fn();
jest.mock("@/components/image-upload", () => {
    function ImageUploadMock({ onChange }: { onChange: (url: string) => void }) {
        return (
            <button
                onClick={() => {
                    mockImageUpload();
                    onChange("https://cdn.test/img.jpg");
                }}
            >
                Upload Image
            </button>
        );
    }
    ImageUploadMock.displayName = "ImageUploadMock";
    return { __esModule: true, default: ImageUploadMock };
});

jest.mock("@/components/cta-link-button", () => ({
    CTA_LINK_TYPES: [{ value: "learn_more", label: "Learn More" }],
    DEFAULT_LINK_TYPE: "learn_more",
}));

jest.mock("@/components/ui/card", () => ({
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
    Button: ({
                 children,
                 onClick,
                 disabled,
                 type,
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
        <button onClick={onClick} disabled={disabled} type={type}>
            {children}
        </button>
    ),
}));

jest.mock("@/components/ui/textarea", () => ({
    Textarea: ({
                   value,
                   onChange,
                   placeholder,
               }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
    ),
}));

jest.mock("@/components/ui/avatar", () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarImage: () => null,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
    ),
}));

jest.mock("next/image", () => {
    function NextImage({ src, alt }: { src: string; alt: string }) {
        return <img src={src} alt={alt} />;
    }
    NextImage.displayName = "NextImage";
    return { __esModule: true, default: NextImage };
});

jest.mock("lucide-react", () => {
    const icon = (name: string) => {
        function Icon({ className }: { className?: string }) {
            return <span data-testid={`icon-${name}`} className={className} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    const cache = new Map<string, ReturnType<typeof icon>>();
    return new Proxy({} as Record<string, ReturnType<typeof icon>>, {
        get(_target, prop: string) {
            if (prop === "__esModule") return true;
            if (typeof prop !== "string") return undefined;
            if (!cache.has(prop)) {
                const label = prop.endsWith("Icon") ? prop.slice(0, -4) : prop;
                cache.set(prop, icon(label));
            }
            return cache.get(prop);
        },
    });
});

jest.mock("@/components/post-card", () => ({
    getInitials: (name?: string | null) => (name ?? "U")[0].toUpperCase(),
}));

jest.mock("@/lib/utils", () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(" "),
}));

import PostComposer, { type CreatedPost } from "../post-composer";
const currentUser = {
    id: "user-1",
    name: "Alice",
    image: null as string | null,
    gender: null as string | null,
};

const onPostCreated = jest.fn();

const createdPostFixture: CreatedPost = {
    id: "new-post",
    content: "Hello",
    image: null,
    video: null,
    images: [],
    videos: [],
    tags: [],
    linkUrl: null,
    linkType: null,
    commentsEnabled: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    userId: "user-1",
    user: {
        id: "user-1",
        name: "Alice",
        image: null,
        profession: null,
        title: null,
    },
    _count: { comments: 0, likes: 0 },
};

function setup(overrides: Partial<{ currentUser: typeof currentUser }> = {}) {
    const user = userEvent.setup();
    const utils = render(
        <PostComposer
            currentUser={{ ...currentUser, ...overrides.currentUser }}
            onPostCreated={onPostCreated}
        />,
    );
    return { user, ...utils };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSearchUsers.mockResolvedValue([]);
    mockGetAllUsers.mockResolvedValue([]);
});

describe("PostComposer", () => {
    describe("rendering", () => {
        it("renders the textarea with its placeholder", () => {
            setup();
            expect(screen.getByPlaceholderText(/share an update/i)).toBeInTheDocument();
        });

        it("renders Photo, Video, Link and @All buttons", () => {
            setup();
            expect(screen.getByRole("button", { name: /photo/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /^video$/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /link/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /@all/i })).toBeInTheDocument();
        });

        it("disables the Post button when there is no content", () => {
            setup();
            expect(screen.getByRole("button", { name: /^post$/i })).toBeDisabled();
        });

        it("renders the current user's avatar fallback initial", () => {
            setup();
            // The AvatarFallback mock renders the initial as text content.
            expect(screen.getByText("A")).toBeInTheDocument();
        });
    });

    describe("submitting", () => {
        it("enables the Post button when text is typed", async () => {
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            expect(screen.getByRole("button", { name: /^post$/i })).not.toBeDisabled();
        });

        it("calls createPost with the trimmed content", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "  Hello  ");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockCreatePost).toHaveBeenCalledWith(
                    expect.objectContaining({ content: "  Hello  " }),
                );
            });
        });

        it("calls onPostCreated with the created post", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(onPostCreated).toHaveBeenCalledWith(createdPostFixture);
            });
        });

        it("shows a success toast after posting", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith(
                    "Post published successfully",
                );
            });
        });

        it("calls router.refresh after posting", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockRouterRefresh).toHaveBeenCalled();
            });
        });

        it("clears the textarea after a successful post", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/share an update/i)).toHaveValue("");
            });
        });

        it("shows an error toast when createPost throws", async () => {
            mockCreatePost.mockRejectedValueOnce(new Error("Network error"));
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith("Network error");
            });
        });

        it("shows the sign-in hint for Unauthorized errors", async () => {
            mockCreatePost.mockRejectedValueOnce(new Error("Unauthorized"));
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hello");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith(
                    "Please sign in to create a post",
                );
            });
        });

        it("submits with an image attached even when the text is empty", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByRole("button", { name: /upload image/i }));
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockCreatePost).toHaveBeenCalledWith(
                    expect.objectContaining({
                        images: ["https://cdn.test/img.jpg"],
                    }),
                );
            });
        });
    });

    describe("Photo toggle", () => {
        it("shows the image upload control when Photo is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /photo/i }));
            expect(
                screen.getByRole("button", { name: /upload image/i }),
            ).toBeInTheDocument();
        });

        it("hides the image upload control on a second Photo click", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByRole("button", { name: /photo/i }));
            expect(
                screen.queryByRole("button", { name: /upload image/i }),
            ).not.toBeInTheDocument();
        });

        it("hides the image upload control when Video is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByRole("button", { name: /^video$/i }));
            expect(
                screen.queryByRole("button", { name: /upload image/i }),
            ).not.toBeInTheDocument();
        });

        it("adds a preview when the image upload fires onChange", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByRole("button", { name: /upload image/i }));
            expect(mockImageUpload).toHaveBeenCalled();
            expect(screen.getByAltText(/upload preview/i)).toBeInTheDocument();
        });

        it("enables the Post button when an image is attached and there is no text", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByRole("button", { name: /upload image/i }));
            expect(screen.getByRole("button", { name: /^post$/i })).not.toBeDisabled();
        });
    });

    describe("Video toggle", () => {
        it("renders the VideoUploadInput placeholder when Video is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^video$/i }));
            expect(await screen.findByTestId("video-upload")).toBeInTheDocument();
        });

        it("hides the video upload control on a second Video click", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^video$/i }));
            await user.click(screen.getByRole("button", { name: /^video$/i }));
            await waitFor(() => {
                expect(
                    screen.queryByTestId("video-upload"),
                ).not.toBeInTheDocument();
            });
        });

        it("adds a preview when VideoUploadInput calls onUpload", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /^video$/i }));
            await user.click(await screen.findByTestId("video-upload"));
            // The mock calls onUpload, which adds the URL to `videos` and
            // replaces the upload control with a <video> preview.
            await waitFor(() => {
                expect(screen.getByTitle("Remove video")).toBeInTheDocument();
            });
        });
    });

    describe("Link toggle", () => {
        it("shows the link URL input when Link is clicked", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /link/i }));
            expect(screen.getByPlaceholderText(/paste a link url/i)).toBeInTheDocument();
        });

        it("hides the link URL input when Link is clicked again", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /link/i }));
            await user.click(screen.getByRole("button", { name: /link/i }));
            expect(
                screen.queryByPlaceholderText(/paste a link url/i),
            ).not.toBeInTheDocument();
        });

        it("includes the link URL in createPost when set", async () => {
            mockCreatePost.mockResolvedValueOnce(createdPostFixture);
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /link/i }));
            await user.type(
                screen.getByPlaceholderText(/paste a link url/i),
                "https://example.com",
            );
            await user.type(screen.getByPlaceholderText(/share an update/i), "Hi");
            await user.click(screen.getByRole("button", { name: /^post$/i }));
            await waitFor(() => {
                expect(mockCreatePost).toHaveBeenCalledWith(
                    expect.objectContaining({
                        linkUrl: "https://example.com",
                        linkType: "learn_more",
                    }),
                );
            });
        });
    });

    describe("@All mention", () => {
        it("fetches all users and inserts their names", async () => {
            mockGetAllUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice" },
                { id: "u2", name: "Bob" },
            ]);
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /@all/i }));
            await waitFor(() => {
                expect(mockGetAllUsers).toHaveBeenCalled();
                expect(mockToastSuccess).toHaveBeenCalledWith("Mentioned 2 users");
            });
        });

        it("appends mentions after existing content", async () => {
            mockGetAllUsers.mockResolvedValueOnce([{ id: "u1", name: "Alice" }]);
            const { user } = setup();
            const textarea = screen.getByPlaceholderText(
                /share an update/i,
            ) as HTMLTextAreaElement;
            await user.type(textarea, "Hello");
            await user.click(screen.getByRole("button", { name: /@all/i }));
            await waitFor(() => {
                expect(textarea.value).toContain("@Alice");
            });
        });

        it("shows an error toast when getAllUsers fails", async () => {
            mockGetAllUsers.mockRejectedValueOnce(new Error("fail"));
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /@all/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith("Failed to fetch users");
            });
        });
    });

    describe("mention search", () => {
        it("shows a dropdown after typing @", async () => {
            mockSearchUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice", image: null },
            ]);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "@Al");
            await waitFor(() => {
                expect(screen.getByText("Alice")).toBeInTheDocument();
            });
        });

        it("inserts the full mention when an option is clicked", async () => {
            mockSearchUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice", image: null },
            ]);
            const { user } = setup();
            const textarea = screen.getByPlaceholderText(
                /share an update/i,
            ) as HTMLTextAreaElement;
            await user.type(textarea, "@Al");
            const option = await screen.findByText("Alice");
            await user.click(option);
            await waitFor(() => {
                expect(textarea.value).toBe("@Alice ");
            });
        });

        it("closes the dropdown after a mention is inserted", async () => {
            mockSearchUsers.mockResolvedValueOnce([
                { id: "u1", name: "Alice", image: null },
            ]);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "@Al");
            const option = await screen.findByText("Alice");
            await user.click(option);
            await waitFor(() => {
                expect(screen.queryByText("Alice")).not.toBeInTheDocument();
            });
        });

        it("does not query searchUsers when there is no @", async () => {
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), "hello");
            expect(mockSearchUsers).not.toHaveBeenCalled();
        });
    });
});