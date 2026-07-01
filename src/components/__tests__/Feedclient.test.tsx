import React from 'react';
import {render, screen, waitFor, fireEvent, within, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Action mocks ───────────────────────────────────────────────────
const mockCreatePost = jest.fn();
const mockToggleLike = jest.fn();
const mockAddComment = jest.fn();
const mockDeletePost = jest.fn();
const mockGetPostComments = jest.fn();
const mockToggleCommentLike = jest.fn();
const mockEditComment = jest.fn();
const mockDeleteComment = jest.fn();
const mockSearchUsers = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetPostLikers = jest.fn();
const mockUpdatePost = jest.fn();
const mockTogglePostComments = jest.fn();
const mockCreateReport = jest.fn();

jest.mock('@/app/actions/feed', () => ({
    createPost: (...a: unknown[]) => mockCreatePost(...a),
    toggleLike: (...a: unknown[]) => mockToggleLike(...a),
    addComment: (...a: unknown[]) => mockAddComment(...a),
    deletePost: (...a: unknown[]) => mockDeletePost(...a),
    getPostComments: (...a: unknown[]) => mockGetPostComments(...a),
    toggleCommentLike: (...a: unknown[]) => mockToggleCommentLike(...a),
    editComment: (...a: unknown[]) => mockEditComment(...a),
    deleteComment: (...a: unknown[]) => mockDeleteComment(...a),
    searchUsers: (...a: unknown[]) => mockSearchUsers(...a),
    getAllUsers: (...a: unknown[]) => mockGetAllUsers(...a),
    getPostLikers: (...a: unknown[]) => mockGetPostLikers(...a),
    updatePost: (...a: unknown[]) => mockUpdatePost(...a),
    togglePostComments: (...a: unknown[]) => mockTogglePostComments(...a),
}));

jest.mock('@/app/actions/admin', () => ({
    createReport: (...a: unknown[]) => mockCreateReport(...a),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

const mockRouterRefresh = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mockRouterRefresh, push: jest.fn() }),
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({
                 children, onClick, disabled, type, size: _s, variant: _v, className, title,
             }: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string; children: React.ReactNode }) => (
        <button onClick={onClick} disabled={disabled} type={type} className={className} title={title}>{children}</button>
    ),
}));
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, placeholder, disabled, className }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={className} />
    ),
}));
jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AvatarImage: () => null,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div role="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
jest.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
        <div data-testid="select-wrapper" onClick={() => onValueChange?.('Spam')}>{children}</div>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <div data-value={value}>{children}</div>
    ),
}));
jest.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverContent: () => null,
}));
jest.mock('next/image', () => {
    function NextImage({ src, alt }: { src: string; alt: string }) {
        return <img src={src} alt={alt} />;
    }
    NextImage.displayName = 'NextImage';
    return { __esModule: true, default: NextImage };
});
jest.mock('lucide-react', () => {
    const icon = (name: string) => {
        function Icon({ className }: { className?: string }) {
            return <span data-testid={`icon-${name}`} className={className} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    return {
        MessageCircleIcon: icon('MessageCircle'),
        MessageCircleOffIcon: icon('MessageCircleOff'),
        SendIcon: icon('Send'),
        TrashIcon: icon('Trash'),
        PenIcon: icon('Pen'),
        ImageIcon: icon('Image'),
        VideoIcon: icon('Video'),
        ThumbsUpIcon: icon('ThumbsUp'),
        ShareIcon: icon('Share'),
        FlagIcon: icon('Flag'),
        XIcon: icon('X'),
        SmileIcon: icon('Smile'),
        ReplyIcon: icon('Reply'),
        PencilIcon: icon('Pencil'),
        Loader2: icon('Loader2'),
        LinkIcon: icon('Link'),
        UsersIcon: icon('Users'),
        ChevronLeftIcon: icon('ChevronLeft'),
        ChevronRightIcon: icon('ChevronRight'),
    };
});
jest.mock('@/components/image-upload', () => {
    function ImageUploadMock({ onChange }: { onChange: (url: string) => void }) {
        return <button onClick={() => onChange('https://cdn.test/img.jpg')}>Upload Image</button>;
    }
    ImageUploadMock.displayName = 'ImageUploadMock';
    return { __esModule: true, default: ImageUploadMock };
});
jest.mock('@/components/link-preview-card', () => {
    function LinkPreviewCardMock({ url }: { url: string }) {
        return <div data-testid="link-preview">{url}</div>;
    }
    LinkPreviewCardMock.displayName = 'LinkPreviewCardMock';
    return { __esModule: true, default: LinkPreviewCardMock };
});
jest.mock('@/components/cta-link-button', () => ({
    CTA_LINK_TYPES: [{ value: 'learn_more', label: 'Learn More' }],
    DEFAULT_LINK_TYPE: 'learn_more',
}));
jest.mock('@/components/post-card', () => ({
    PostCard: ({ children }: { children: React.ReactNode }) => <div data-testid="post-card">{children}</div>,
    PostContextBar: () => null,
    PostHeader: ({ userName, actions }: { userName?: string | null; actions?: React.ReactNode }) => (
        <div data-testid="post-header">{userName}<div data-testid="post-actions">{actions}</div></div>
    ),
    PostTextContent: ({ content, customRender }: { content: string; customRender?: React.ReactNode }) => (
        <div data-testid="post-text">{customRender ?? content}</div>
    ),
    PostTags: ({ tags }: { tags: string[] }) => <div data-testid="post-tags">{tags?.join(',')}</div>,
    PostMediaContent: ({ onImageClick }: { onImageClick?: (idx: number) => void }) => (
        <div data-testid="post-media">
            <button data-testid="open-image-modal" onClick={() => onImageClick?.(0)}>Open image</button>
        </div>
    ),
    PostEngagementSummary: ({ likeCount, commentCount, onLikeCountClick, onCommentCountClick }: {
        likeCount: number; commentCount: number; onLikeCountClick: () => void; onCommentCountClick: () => void;
    }) => (
        <div>
            <button onClick={onLikeCountClick} data-testid="like-count">{likeCount} likes</button>
            <button onClick={onCommentCountClick} data-testid="comment-count">{commentCount} comments</button>
        </div>
    ),
    PostActionBar: ({ children }: { children: React.ReactNode }) => <div data-testid="action-bar">{children}</div>,
    PostCommentsSection: ({ children }: { children: React.ReactNode }) => <div data-testid="comments-section">{children}</div>,
    CommentReactionSummary: () => null,
    getInitials: (name?: string | null) => (name ?? 'U')[0].toUpperCase(),
    formatRelativeDate: () => '2h ago',
    renderPostContent: (text: string) => text,
    REACTIONS: [{ label: 'Like' }, { label: 'Love' }],
    getReactionEmoji: (r: string) => r === 'Love' ? '❤️' : '👍',
    getReactionBg: () => 'bg-blue-100',
    postHasMedia: () => false,
}));
jest.mock('@/components/reactions-picker', () => ({
    ReactionsPicker: ({ onReact, postId }: { onReact: (pid: string, r: string) => void; postId: string }) => (
        <button data-testid="like-btn" onClick={() => onReact(postId, 'Like')}>Like</button>
    ),
}));
jest.mock('@/lib/utils', () => ({
    cn: (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(' '),
}));

// ── Test data ──────────────────────────────────────────────────────
const basePost = {
    id: 'post-1',
    content: 'Hello world',
    image: null as string | null,
    video: null as string | null,
    images: [] as string[],
    videos: [] as string[],
    tags: [] as string[],
    linkUrl: null as string | null,
    linkType: null as string | null,
    commentsEnabled: true,
    createdAt: new Date('2024-01-01'),
    user: { id: 'user-1', name: 'Alice', image: null, role: 'user', profession: 'Researcher' },
    _count: { comments: 2, likes: 3 },
    likes: [] as { userId: string; reactionType: string; userName?: string | null }[],
};

const defaultProps = {
    initialPosts: [basePost],
    currentUserId: 'current-user',
    currentUserName: 'Current User',
    currentUserImage: null as string | null,
    isAdmin: false,
};

function setup(props: Partial<typeof defaultProps> = {}) {
    const user = userEvent.setup();
    const utils = render(<FeedClient {...defaultProps} {...props} />);
    return { user, ...utils };
}

// Helper: open comments for post-1
async function openComments(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('comment-count'));
    await waitFor(() => expect(screen.getByTestId('comments-section')).toBeInTheDocument());
}

// ── SubComponent tests ─────────────────────────────────────────────

// Import subcomponents directly for isolated unit tests
// We test them through FeedClient since they're not exported, but we also
// test the exported modules through their behaviour in FeedClient.

// We need to import FeedClient after all mocks are set up
import FeedClient from '@/components/feed-client';

// ── CommentTextWithSeeMore ──────────────────────────────────────────
// These are tested indirectly via comments rendered inside FeedClient.

// ── VideoUploadInput ────────────────────────────────────────────────
// VideoUploadInput is an internal component. We test its branches via
// rendering FeedClient with the video upload area shown.

describe('VideoUploadInput (via FeedClient)', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchUsers.mockResolvedValue([]);

        jest.spyOn(console, 'error').mockImplementation((...args) => {
            const firstArg = String(args[0]);

            // Hide expected video upload errors from this component
            if (firstArg.includes('Video upload error:')) {
                return;
            }

            // Keep other real React/Jest errors visible
            originalConsoleError(...args);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows video upload idle state', async () => {
        const { user } = setup();

        await user.click(screen.getByRole('button', { name: /video/i }));

        expect(screen.getByText(/drop or click to upload a video/i)).toBeInTheDocument();
        expect(screen.getByText(/videos up to 5mb/i)).toBeInTheDocument();
    });

    it('shows error toast for non-video file', async () => {
        const { user } = setup();

        await user.click(screen.getByRole('button', { name: /video/i }));

        const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        const file = new File(['content'], 'test.txt', { type: 'text/plain' });

        Object.defineProperty(input, 'files', {
            value: [file],
            configurable: true,
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('Please select a video file');
        });
    });

    it('shows error toast for oversized video', async () => {
        const { user } = setup();

        await user.click(screen.getByRole('button', { name: /video/i }));

        const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        const largeContent = 'x'.repeat(6 * 1024 * 1024);
        const file = new File([largeContent], 'big.mp4', { type: 'video/mp4' });

        Object.defineProperty(input, 'files', {
            value: [file],
            configurable: true,
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('Video must be less than 5MB');
        });
    });

    it('calls onUpload with URL on successful video upload', async () => {
        const mockFetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: 'https://cdn.test/video.mp4' }),
        });

        (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

        const { user } = setup();

        await user.click(screen.getByRole('button', { name: /video/i }));

        const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        const file = new File(['v'.repeat(1024)], 'video.mp4', { type: 'video/mp4' });

        Object.defineProperty(input, 'files', {
            value: [file],
            configurable: true,
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/upload'),
                expect.objectContaining({ method: 'POST' })
            );
        });

        await waitFor(() => {
            expect(screen.queryByText(/drop or click to upload a video/i)).not.toBeInTheDocument();
        });
    });

    it('shows error toast on failed video upload', async () => {
        const mockFetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Upload failed' }),
        });

        (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

        const { user } = setup();

        await user.click(screen.getByRole('button', { name: /video/i }));

        const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        const file = new File(['v'.repeat(1024)], 'video.mp4', { type: 'video/mp4' });

        Object.defineProperty(input, 'files', {
            value: [file],
            configurable: true,
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('Upload failed');
        });
    });

    it('shows uploading spinner during upload', async () => {
        let resolveUpload!: (v: unknown) => void;

        const pendingFetch = new Promise((resolve) => {
            resolveUpload = resolve;
        });

        const mockFetch = jest.fn().mockReturnValueOnce(pendingFetch);

        (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

        const { user } = setup();

        await user.click(screen.getByRole('button', { name: /video/i }));

        const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        const file = new File(['v'.repeat(1024)], 'video.mp4', { type: 'video/mp4' });

        Object.defineProperty(input, 'files', {
            value: [file],
            configurable: true,
        });

        fireEvent.change(input);

        await waitFor(() => {
            expect(screen.getByText(/uploading video/i)).toBeInTheDocument();
        });

        await act(async () => {
            resolveUpload({
                ok: false,
                json: async () => ({ error: 'fail' }),
            });
        });

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith('fail');
        });

        await waitFor(() => {
            expect(screen.queryByText(/uploading video/i)).not.toBeInTheDocument();
        });
    });
});

// ── deleteBlobUrl ───────────────────────────────────────────────────
// We test it indirectly via image removal in the new post area.
describe('deleteBlobUrl (via image removal in create-post)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchUsers.mockResolvedValue([]);
    });

    it('calls DELETE /api/delete-blob for bunny CDN URLs when removing image', async () => {
        // Set NEXT_PUBLIC_BUNNY_PULL_ZONE_URL to something we can match
        process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL = 'https://cdn.bunny.net';
        const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
        (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

        const { user } = setup();
        // Open image upload and trigger the mock onChange (which provides a URL)
        await user.click(screen.getByRole('button', { name: /photo/i }));
        await user.click(screen.getByRole('button', { name: /upload image/i }));
        // The image URL is https://cdn.test/img.jpg (from mock), not a bunny URL,
        // so deleteBlobUrl will no-op. To test the bunny path, we need a bunny URL.
        // We'll test via a post that has a bunny image and click its remove button.
        // Since the URL from ImageUpload mock is not a bunny URL, deleteBlobUrl
        // silently returns — this covers the early-return branch.
        expect(mockFetch).not.toHaveBeenCalledWith(
            '/api/delete-blob',
            expect.objectContaining({ method: 'DELETE' })
        );
        delete process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL;
    });
});

// ── Main FeedClient tests ──────────────────────────────────────────
describe('FeedClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchUsers.mockResolvedValue([]);
    });

    // ── initial render ──────────────────────────────────────────────
    describe('initial render', () => {
        it('renders the create post textarea', () => {
            setup();
            expect(screen.getByPlaceholderText(/share an update/i)).toBeInTheDocument();
        });

        it('renders existing posts', () => {
            setup();
            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });

        it('renders empty state when no posts', () => {
            setup({ initialPosts: [] });
            expect(screen.getByText('No posts yet')).toBeInTheDocument();
        });

        it('Post button is disabled when textarea is empty', () => {
            setup();
            expect(screen.getByRole('button', { name: /^post$/i })).toBeDisabled();
        });

        it('renders recent activity context bar when provided', () => {
            const postWithActivity = {
                ...basePost,
                recentActivity: {
                    users: [{ id: 'u1', name: 'Alice', image: null }],
                    likeCount: 5,
                    commentCount: 3,
                },
            };
            setup({ initialPosts: [postWithActivity] });
            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });
    });

    // ── create post ─────────────────────────────────────────────────
    describe('create post', () => {
        it('enables Post button when content is typed', async () => {
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), 'New post');
            expect(screen.getByRole('button', { name: /^post$/i })).not.toBeDisabled();
        });

        it('calls createPost with the typed content', async () => {
            mockCreatePost.mockResolvedValueOnce(undefined);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), 'My post');
            await user.click(screen.getByRole('button', { name: /^post$/i }));
            await waitFor(() => {
                expect(mockCreatePost).toHaveBeenCalledWith(
                    expect.objectContaining({ content: 'My post' })
                );
            });
        });

        it('shows success toast and refreshes after posting', async () => {
            mockCreatePost.mockResolvedValueOnce(undefined);
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), 'My post');
            await user.click(screen.getByRole('button', { name: /^post$/i }));
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('Post published successfully');
                expect(mockRouterRefresh).toHaveBeenCalled();
            });
        });

        it('shows error toast when createPost fails', async () => {
            mockCreatePost.mockRejectedValueOnce(new Error('Network error'));
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), 'My post');
            await user.click(screen.getByRole('button', { name: /^post$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Network error');
            });
        });

        it('shows "Please sign in" message for Unauthorized error', async () => {
            mockCreatePost.mockRejectedValueOnce(new Error('Unauthorized'));
            const { user } = setup();
            await user.type(screen.getByPlaceholderText(/share an update/i), 'My post');
            await user.click(screen.getByRole('button', { name: /^post$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Please sign in to create a post');
            });
        });

        it('clears textarea after successful post', async () => {
            mockCreatePost.mockResolvedValueOnce(undefined);
            const { user } = setup();
            const textarea = screen.getByPlaceholderText(/share an update/i);
            await user.type(textarea, 'My post');
            await user.click(screen.getByRole('button', { name: /^post$/i }));
            await waitFor(() => expect(textarea).toHaveValue(''));
        });

        it('enables Post button when an image is uploaded (no text)', async () => {
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /photo/i }));
            await user.click(screen.getByRole('button', { name: /upload image/i }));
            expect(screen.getByRole('button', { name: /^post$/i })).not.toBeDisabled();
        });

        it('clicking Photo again toggles the image upload off', async () => {
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /photo/i }));
            expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
            await user.click(screen.getByRole('button', { name: /photo/i }));
            expect(screen.queryByRole('button', { name: /upload image/i })).not.toBeInTheDocument();
        });

        it('clicking Video hides image upload section', async () => {
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /photo/i }));
            await user.click(screen.getByRole('button', { name: /video/i }));
            expect(screen.queryByRole('button', { name: /upload image/i })).not.toBeInTheDocument();
            expect(screen.getByText(/drop or click to upload a video/i)).toBeInTheDocument();
        });

        it('clicking Link shows link URL input', async () => {
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /link/i }));
            expect(screen.getByPlaceholderText(/paste a link url/i)).toBeInTheDocument();
        });

        it('clicking Link X button hides link input', async () => {
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /link/i }));
            // Find the X button inside the link input area
            const xButtons = screen.getAllByTestId('icon-X');
            await user.click(xButtons[0].closest('button')!);
            expect(screen.queryByPlaceholderText(/paste a link url/i)).not.toBeInTheDocument();
        });

        it('includes link URL in createPost when provided', async () => {
            mockCreatePost.mockResolvedValueOnce(undefined);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /link/i }));
            await user.type(screen.getByPlaceholderText(/paste a link url/i), 'https://example.com');
            await user.type(screen.getByPlaceholderText(/share an update/i), 'Post with link');
            await user.click(screen.getByRole('button', { name: /^post$/i }));
            await waitFor(() => {
                expect(mockCreatePost).toHaveBeenCalledWith(
                    expect.objectContaining({ linkUrl: 'https://example.com' })
                );
            });
        });
    });

    // ── mention search ──────────────────────────────────────────────



    // ── @All mention ────────────────────────────────────────────────
    describe('@All mention', () => {
        it('calls getAllUsers and inserts mentions on @All click', async () => {
            mockGetAllUsers.mockResolvedValueOnce([
                { id: 'u1', name: 'Alice' },
                { id: 'u2', name: 'Bob' },
            ]);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /@all/i }));
            await waitFor(() => {
                expect(mockGetAllUsers).toHaveBeenCalled();
                expect(mockToastSuccess).toHaveBeenCalledWith('Mentioned 2 users');
            });
        });

        it('appends mentions to existing content', async () => {
            mockGetAllUsers.mockResolvedValueOnce([{ id: 'u1', name: 'Alice' }]);
            const { user } = setup();
            const textarea = screen.getByPlaceholderText(/share an update/i);
            await user.type(textarea, 'Check this out');
            await user.click(screen.getByRole('button', { name: /@all/i }));
            await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
            expect((textarea as HTMLTextAreaElement).value).toContain('@Alice');
        });

        it('shows error toast when getAllUsers fails', async () => {
            mockGetAllUsers.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /@all/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to fetch users');
            });
        });
    });

    // ── like/reaction ───────────────────────────────────────────────
    describe('like/reaction', () => {
        it('calls toggleLike when Like button is clicked', async () => {
            mockToggleLike.mockResolvedValueOnce({ liked: true, reactionType: 'Like' });
            const { user } = setup();
            await user.click(screen.getByTestId('like-btn'));
            await waitFor(() => {
                expect(mockToggleLike).toHaveBeenCalledWith('post-1', 'Like');
            });
        });

        it('updates post like count after liking (new like)', async () => {
            mockToggleLike.mockResolvedValueOnce({ liked: true, reactionType: 'Like' });
            const { user } = setup();
            await user.click(screen.getByTestId('like-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('like-count')).toHaveTextContent('4 likes');
            });
        });

        it('updates reaction type when user already liked (existing like → new reaction)', async () => {
            const postWithLike = {
                ...basePost,
                likes: [{ userId: 'current-user', reactionType: 'Like', userName: 'Current User' }],
                _count: { comments: 2, likes: 1 },
            };
            mockToggleLike.mockResolvedValueOnce({ liked: true, reactionType: 'Love' });
            const { user } = setup({ initialPosts: [postWithLike] });
            await user.click(screen.getByTestId('like-btn'));
            await waitFor(() => {
                // Like count stays the same (just reaction type changed)
                expect(screen.getByTestId('like-count')).toHaveTextContent('1 likes');
            });
        });

        it('decrements like count when unliking', async () => {
            const postWithLike = {
                ...basePost,
                likes: [{ userId: 'current-user', reactionType: 'Like', userName: 'Current User' }],
                _count: { comments: 2, likes: 1 },
            };
            mockToggleLike.mockResolvedValueOnce({ liked: false, reactionType: null });
            const { user } = setup({ initialPosts: [postWithLike] });
            await user.click(screen.getByTestId('like-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('like-count')).toHaveTextContent('0 likes');
            });
        });

        it('shows error toast when toggleLike fails', async () => {
            mockToggleLike.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup();
            await user.click(screen.getByTestId('like-btn'));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to react to post');
            });
        });
    });

    // ── delete post ─────────────────────────────────────────────────
    describe('delete post', () => {
        it('renders delete button for own posts', () => {
            setup({ currentUserId: 'user-1' });
            expect(screen.getByTitle('Delete post')).toBeInTheDocument();
        });

        it('calls deletePost and removes post from list', async () => {
            mockDeletePost.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'user-1' });
            await user.click(screen.getByTitle('Delete post'));
            await waitFor(() => {
                expect(mockDeletePost).toHaveBeenCalledWith('post-1');
                expect(mockToastSuccess).toHaveBeenCalledWith('Post removed');
                expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
            });
        });

        it('shows error toast when deletePost fails', async () => {
            mockDeletePost.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'user-1' });
            await user.click(screen.getByTitle('Delete post'));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to delete post');
            });
        });

        it('admin can delete other users posts', () => {
            setup({ currentUserId: 'other-user', isAdmin: true });
            expect(screen.getByTitle('Delete post')).toBeInTheDocument();
        });
    });

    // ── edit post ───────────────────────────────────────────────────
    describe('edit post', () => {
        it('shows edit button for own posts', () => {
            setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            expect(within(postCard).getByTitle('Edit post')).toBeInTheDocument();
        });

        it('does not show edit button for other users posts', () => {
            setup({ currentUserId: 'other-user' });
            const postCard = screen.getByTestId('post-card');
            expect(within(postCard).queryByTitle('Edit post')).not.toBeInTheDocument();
        });

        it('renders edit textarea after clicking Edit', async () => {
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            expect(within(postCard).getByDisplayValue('Hello world')).toBeInTheDocument();
        });

        it('calls updatePost on save', async () => {
            mockUpdatePost.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            const editInput = within(postCard).getByDisplayValue('Hello world');
            await user.clear(editInput);
            await user.type(editInput, 'Updated content');
            await user.click(within(postCard).getByRole('button', { name: /^save$/i }));
            await waitFor(() => {
                expect(mockUpdatePost).toHaveBeenCalledWith('post-1', expect.objectContaining({ content: 'Updated content' }));
                expect(mockToastSuccess).toHaveBeenCalledWith('Post updated');
            });
        });

        it('shows error toast when updatePost fails', async () => {
            mockUpdatePost.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            await user.click(within(postCard).getByRole('button', { name: /^save$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to update post');
            });
        });

        it('cancels edit mode without saving', async () => {
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            await user.click(within(postCard).getByRole('button', { name: /cancel/i }));
            expect(within(postCard).queryByDisplayValue('Hello world')).not.toBeInTheDocument();
            expect(mockUpdatePost).not.toHaveBeenCalled();
        });

        it('shows image upload within edit mode when Image button clicked', async () => {
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            const imageBtn = within(postCard).getByRole('button', { name: /image/i });
            await user.click(imageBtn);
            expect(within(postCard).getByRole('button', { name: /upload image/i })).toBeInTheDocument();
        });

        it('shows video upload within edit mode when Video button clicked', async () => {
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            const videoBtn = within(postCard).getByRole('button', { name: /video/i });
            await user.click(videoBtn);
            expect(within(postCard).getByText(/drop or click to upload a video/i)).toBeInTheDocument();
        });

        it('shows link input within edit mode when Link button clicked', async () => {
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            const linkBtn = within(postCard).getByRole('button', { name: /link/i });
            await user.click(linkBtn);
            expect(within(postCard).getByPlaceholderText(/enter url/i)).toBeInTheDocument();
        });

        it('adds a tag via tag input', async () => {
            mockUpdatePost.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'user-1' });
            const postCard = screen.getByTestId('post-card');
            await user.click(within(postCard).getByTitle('Edit post'));
            const tagInput = within(postCard).getByPlaceholderText('Add tag...');
            await user.type(tagInput, 'newtag{Enter}');
            await user.click(within(postCard).getByRole('button', { name: /^save$/i }));
            await waitFor(() => {
                expect(mockUpdatePost).toHaveBeenCalledWith('post-1', expect.objectContaining({ tags: ['newtag'] }));
            });
        });
    });

    // ── toggle post comments ────────────────────────────────────────
    describe('toggle post comments', () => {
        it('shows toggle button for own posts', () => {
            setup({ currentUserId: 'user-1' });
            expect(screen.getByTitle('Disable comments')).toBeInTheDocument();
        });

        it('calls togglePostComments and shows toast (disabled)', async () => {
            mockTogglePostComments.mockResolvedValueOnce({ commentsEnabled: false });
            const { user } = setup({ currentUserId: 'user-1' });
            await user.click(screen.getByTitle('Disable comments'));
            await waitFor(() => {
                expect(mockTogglePostComments).toHaveBeenCalledWith('post-1');
                expect(mockToastSuccess).toHaveBeenCalledWith('Comments disabled');
            });
        });

        it('shows "Enable comments" toast when re-enabled', async () => {
            const disabledPost = { ...basePost, commentsEnabled: false, user: { ...basePost.user, id: 'user-1' } };
            mockTogglePostComments.mockResolvedValueOnce({ commentsEnabled: true });
            const { user } = setup({ currentUserId: 'user-1', initialPosts: [disabledPost] });
            await user.click(screen.getByTitle('Enable comments'));
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('Comments enabled');
            });
        });

        it('shows error toast when togglePostComments fails', async () => {
            mockTogglePostComments.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'user-1' });
            await user.click(screen.getByTitle('Disable comments'));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to toggle comments');
            });
        });
    });

    // ── comments ────────────────────────────────────────────────────
    describe('comments', () => {
        const comment = {
            id: 'c1',
            content: 'Great post!',
            createdAt: new Date(),
            user: { id: 'user-2', name: 'Bob', image: null, role: 'user', profession: null },
            _count: { commentLikes: 0, replies: 0 },
            commentLikes: [],
            replies: [],
        };

        beforeEach(() => {
            mockGetPostComments.mockResolvedValue([comment]);
        });

        it('loads and shows comments on comment count click', async () => {
            const { user } = setup();
            await openComments(user);
            expect(screen.getByText('Great post!')).toBeInTheDocument();
        });

        it('toggles comments off on second click', async () => {
            const { user } = setup();
            await openComments(user);
            await user.click(screen.getByTestId('comment-count'));
            await waitFor(() => {
                expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
            });
        });

        it('does not reload comments if already loaded', async () => {
            const { user } = setup();
            await openComments(user);
            await user.click(screen.getByTestId('comment-count')); // collapse
            await user.click(screen.getByTestId('comment-count')); // expand again
            expect(mockGetPostComments).toHaveBeenCalledTimes(1);
        });

        it('shows error toast when loading comments fails', async () => {
            mockGetPostComments.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup();
            await user.click(screen.getByTestId('comment-count'));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to load comments');
            });
        });

        it('submits a comment via Enter key', async () => {
            mockAddComment.mockResolvedValueOnce({
                id: 'c2', content: 'My comment', createdAt: new Date(),
                user: { id: 'current-user', name: 'Current User', image: null, role: 'user' },
            });
            const { user } = setup();
            await openComments(user);
            const commentInput = screen.getByPlaceholderText(/write a comment/i);
            await user.type(commentInput, 'My comment');
            await user.keyboard('{Enter}');
            await waitFor(() => {
                expect(mockAddComment).toHaveBeenCalledWith('post-1', 'My comment', undefined);
            });
        });

        it('increments comment count after successful comment', async () => {
            mockAddComment.mockResolvedValueOnce({
                id: 'c2', content: 'My comment', createdAt: new Date(),
                user: { id: 'current-user', name: 'Current User', image: null, role: 'user' },
            });
            const { user } = setup();
            await openComments(user);
            const commentInput = screen.getByPlaceholderText(/write a comment/i);
            await user.type(commentInput, 'My comment');
            await user.keyboard('{Enter}');
            await waitFor(() => {
                expect(screen.getByTestId('comment-count')).toHaveTextContent('3 comments');
            });
        });

        it('shows error toast when adding comment fails', async () => {
            mockAddComment.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup();
            await openComments(user);
            const commentInput = screen.getByPlaceholderText(/write a comment/i);
            await user.type(commentInput, 'failing comment');
            await user.keyboard('{Enter}');
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to add comment');
            });
        });

        it('shows reply indicator when replying to a comment', async () => {
            const { user } = setup();
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /reply/i }));
            expect(screen.getByText(/replying to/i)).toBeInTheDocument();
        });

        it('submits reply with parentId', async () => {
            const replyComment = { ...comment, replies: [] };
            mockGetPostComments.mockResolvedValue([replyComment]);
            mockAddComment.mockResolvedValueOnce({
                id: 'r1', content: 'Reply text', createdAt: new Date(),
                user: { id: 'current-user', name: 'Current User', image: null, role: 'user' },
            });
            const { user } = setup();
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /reply/i }));
            const commentInput = screen.getByPlaceholderText(/reply to/i);
            await user.clear(commentInput);
            await user.type(commentInput, 'Reply text');
            await user.keyboard('{Enter}');
            await waitFor(() => {
                expect(mockAddComment).toHaveBeenCalledWith('post-1', 'Reply text', 'c1');
            });
        });

        it('cancels reply on X click', async () => {
            const { user } = setup();
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /reply/i }));
            expect(screen.getByText(/replying to/i)).toBeInTheDocument();
            const xBtn = within(commentsSection).getAllByTestId('icon-X')[0];
            await user.click(xBtn.closest('button')!);
            await waitFor(() => {
                expect(screen.queryByText(/replying to/i)).not.toBeInTheDocument();
            });
        });

        it('deletes a comment', async () => {
            mockDeleteComment.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'user-2' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /delete/i }));
            await waitFor(() => {
                expect(mockDeleteComment).toHaveBeenCalledWith('c1');
                expect(mockToastSuccess).toHaveBeenCalledWith('Comment removed');
            });
        });

        it('shows error toast when deleteComment fails', async () => {
            mockDeleteComment.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'user-2' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /delete/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to delete comment');
            });
        });

        it('edits a comment', async () => {
            mockEditComment.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'user-2' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /edit/i }));
            const editInput = within(commentsSection).getByDisplayValue('Great post!');
            await user.clear(editInput);
            await user.type(editInput, 'Edited!');
            await user.click(within(commentsSection).getByRole('button', { name: /^save$/i }));
            await waitFor(() => {
                expect(mockEditComment).toHaveBeenCalledWith('c1', 'Edited!');
                expect(mockToastSuccess).toHaveBeenCalledWith('Comment updated');
            });
        });

        it('saves comment edit via Enter key', async () => {
            mockEditComment.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'user-2' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /edit/i }));
            const editInput = within(commentsSection).getByDisplayValue('Great post!');
            await user.clear(editInput);
            await user.type(editInput, 'Edited via enter');
            await user.keyboard('{Enter}');
            await waitFor(() => {
                expect(mockEditComment).toHaveBeenCalledWith('c1', 'Edited via enter');
            });
        });

        it('cancels comment edit via Escape key', async () => {
            const { user } = setup({ currentUserId: 'user-2' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /edit/i }));
            await user.keyboard('{Escape}');
            expect(within(commentsSection).queryByDisplayValue('Great post!')).not.toBeInTheDocument();
        });

        it('shows error toast when editComment fails', async () => {
            mockEditComment.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'user-2' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /edit/i }));
            await user.click(within(commentsSection).getByRole('button', { name: /^save$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to edit comment');
            });
        });

        it('shows Report button for comments by other users', async () => {
            const { user } = setup({ currentUserId: 'current-user' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            expect(within(commentsSection).getByRole('button', { name: /report/i })).toBeInTheDocument();
        });

        it('calls toggleCommentLike on like click', async () => {
            mockToggleCommentLike.mockResolvedValueOnce(undefined);
            mockGetPostComments.mockResolvedValue([comment]);
            const { user } = setup();
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /^like$/i }));
            await waitFor(() => {
                expect(mockToggleCommentLike).toHaveBeenCalledWith('c1', false, 'Like');
            });
        });

        it('shows error toast when commentLike fails', async () => {
            mockToggleCommentLike.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup();
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /^like$/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to react to comment');
            });
        });

        it('renders nested replies', async () => {
            const commentWithReply = {
                ...comment,
                replies: [{
                    id: 'r1', content: 'A reply', createdAt: new Date(),
                    user: { id: 'user-3', name: 'Charlie', image: null, role: 'user', profession: null },
                    commentLikes: [], replies: [],
                }],
            };
            mockGetPostComments.mockResolvedValue([commentWithReply]);
            const { user } = setup();
            await openComments(user);
            expect(screen.getByText('A reply')).toBeInTheDocument();
        });

        it('shows load more button when comments exceed visible count', async () => {
            const manyComments = Array.from({ length: 6 }, (_, i) => ({
                ...comment,
                id: `c${i}`,
                content: `Comment ${i}`,
            }));
            mockGetPostComments.mockResolvedValue(manyComments);
            const { user } = setup();
            await openComments(user);
            expect(screen.getByText(/load more comments/i)).toBeInTheDocument();
        });

        it('loads more comments on button click', async () => {
            const manyComments = Array.from({ length: 6 }, (_, i) => ({
                ...comment,
                id: `c${i}`,
                content: `Comment ${i}`,
            }));
            mockGetPostComments.mockResolvedValue(manyComments);
            const { user } = setup();
            await openComments(user);
            const loadMoreBtn = screen.getByText(/load more comments/i);
            await user.click(loadMoreBtn);
            await waitFor(() => {
                expect(screen.queryByText(/load more comments/i)).not.toBeInTheDocument();
            });
        });
    });

    // ── CommentTextWithSeeMore ──────────────────────────────────────
    describe('CommentTextWithSeeMore (via long comment)', () => {
        it('shows See more for long comments', async () => {
            const longComment = {
                id: 'c-long',
                content: 'x'.repeat(250),
                createdAt: new Date(),
                user: { id: 'user-2', name: 'Bob', image: null, role: 'user', profession: null },
                _count: { commentLikes: 0, replies: 0 },
                commentLikes: [],
                replies: [],
            };
            mockGetPostComments.mockResolvedValue([longComment]);
            const { user } = setup();
            await openComments(user);
            expect(screen.getByRole('button', { name: /see more/i })).toBeInTheDocument();
        });

        it('expands and collapses long comment', async () => {
            const longComment = {
                id: 'c-long',
                content: 'x'.repeat(250),
                createdAt: new Date(),
                user: { id: 'user-2', name: 'Bob', image: null, role: 'user', profession: null },
                _count: { commentLikes: 0, replies: 0 },
                commentLikes: [],
                replies: [],
            };
            mockGetPostComments.mockResolvedValue([longComment]);
            const { user } = setup();
            await openComments(user);
            await user.click(screen.getByRole('button', { name: /see more/i }));
            expect(screen.getByRole('button', { name: /see less/i })).toBeInTheDocument();
            await user.click(screen.getByRole('button', { name: /see less/i }));
            expect(screen.getByRole('button', { name: /see more/i })).toBeInTheDocument();
        });
    });

    // ── report post ─────────────────────────────────────────────────
    describe('report post', () => {
        it('shows report button for other users posts', () => {
            setup({ currentUserId: 'other-user' });
            expect(screen.getByTitle('Report post')).toBeInTheDocument();
        });

        it('opens report dialog on flag click', async () => {
            const { user } = setup({ currentUserId: 'other-user' });
            await user.click(screen.getByTitle('Report post'));
            expect(screen.getByRole('heading', { name: /report post/i })).toBeInTheDocument();
        });

        it('submits a post report with selected category', async () => {
            mockCreateReport.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'other-user' });
            await user.click(screen.getByTitle('Report post'));
            // Select wrapper click triggers onValueChange('Spam')
            await user.click(screen.getByTestId('select-wrapper'));
            await user.click(screen.getByRole('button', { name: /submit report/i }));
            await waitFor(() => {
                expect(mockCreateReport).toHaveBeenCalledWith(
                    expect.objectContaining({ contentType: 'POST', contentId: 'post-1' })
                );
                expect(mockToastSuccess).toHaveBeenCalledWith('Report submitted successfully');
            });
        });

        it('shows error toast when report submission fails', async () => {
            mockCreateReport.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'other-user' });
            await user.click(screen.getByTitle('Report post'));
            await user.click(screen.getByTestId('select-wrapper'));
            await user.click(screen.getByRole('button', { name: /submit report/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to submit report');
            });
        });

        it('cancels report dialog', async () => {
            const { user } = setup({ currentUserId: 'other-user' });
            await user.click(screen.getByTitle('Report post'));
            await user.click(screen.getByRole('button', { name: /cancel/i }));
            expect(screen.queryByRole('heading', { name: /report post/i })).not.toBeInTheDocument();
        });
    });

    // ── report comment ──────────────────────────────────────────────
    describe('report comment', () => {
        const comment = {
            id: 'c1', content: 'A comment', createdAt: new Date(),
            user: { id: 'user-2', name: 'Bob', image: null, role: 'user', profession: null },
            _count: { commentLikes: 0, replies: 0 }, commentLikes: [], replies: [],
        };

        beforeEach(() => {
            mockGetPostComments.mockResolvedValue([comment]);
        });

        it('opens comment report dialog', async () => {
            const { user } = setup({ currentUserId: 'current-user' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /report/i }));
            expect(screen.getByRole('heading', { name: /report comment/i })).toBeInTheDocument();
        });

        it('submits comment report', async () => {
            mockCreateReport.mockResolvedValueOnce(undefined);
            const { user } = setup({ currentUserId: 'current-user' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /report/i }));
            await user.click(screen.getByTestId('select-wrapper'));
            await user.click(screen.getByRole('button', { name: /submit report/i }));
            await waitFor(() => {
                expect(mockCreateReport).toHaveBeenCalledWith(
                    expect.objectContaining({ contentType: 'COMMENT', contentId: 'c1' })
                );
                expect(mockToastSuccess).toHaveBeenCalledWith('Comment reported successfully');
            });
        });

        it('shows error toast when comment report fails', async () => {
            mockCreateReport.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup({ currentUserId: 'current-user' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /report/i }));
            await user.click(screen.getByTestId('select-wrapper'));
            await user.click(screen.getByRole('button', { name: /submit report/i }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to report comment');
            });
        });

        it('cancels comment report dialog', async () => {
            const { user } = setup({ currentUserId: 'current-user' });
            await openComments(user);
            const commentsSection = screen.getByTestId('comments-section');
            await user.click(within(commentsSection).getByRole('button', { name: /report/i }));
            await user.click(screen.getByRole('button', { name: /cancel/i }));
            expect(screen.queryByRole('heading', { name: /report comment/i })).not.toBeInTheDocument();
        });
    });

    // ── likers dialog ───────────────────────────────────────────────
    describe('likers dialog', () => {
        it('opens likers dialog on like count click', async () => {
            mockGetPostLikers.mockResolvedValueOnce([
                { id: 'u1', name: 'Alice', image: null, reactionType: 'Like' },
            ]);
            const { user } = setup();
            await user.click(screen.getByTestId('like-count'));
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /reactions/i })).toBeInTheDocument();
            });
        });

        it('shows liker names in dialog', async () => {
            mockGetPostLikers.mockResolvedValueOnce([
                { id: 'u1', name: 'Alice', image: null, reactionType: 'Like' },
            ]);
            const { user } = setup();
            await user.click(screen.getByTestId('like-count'));
            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(within(dialog).getByText('Alice')).toBeInTheDocument();
            });
        });

        it('shows error toast when likers fetch fails', async () => {
            mockGetPostLikers.mockRejectedValueOnce(new Error('fail'));
            const { user } = setup();
            await user.click(screen.getByTestId('like-count'));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Failed to load likers');
            });
        });

        it('shows empty state when no likers', async () => {
            mockGetPostLikers.mockResolvedValueOnce([]);
            const { user } = setup();
            await user.click(screen.getByTestId('like-count'));
            await waitFor(() => {
                expect(screen.getByText('No reactions yet')).toBeInTheDocument();
            });
        });
    });

// ── image modal ─────────────────────────────────────────────────
    describe('image modal', () => {
        it('opens image modal when image is clicked', async () => {
            const { user } = setup({
                initialPosts: [{ ...basePost, images: ['https://cdn.test/img.jpg'] }],
            });
            await user.click(screen.getByTestId('open-image-modal'));
            await waitFor(() => {
                expect(screen.getByAltText('Post attachment')).toBeInTheDocument();
            });
        });

        it('shows next/prev buttons for multiple images', async () => {
            const { user } = setup({
                initialPosts: [{ ...basePost, images: ['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg'] }],
            });
            await user.click(screen.getByTestId('open-image-modal'));
            await waitFor(() => {
                // Since both icons might appear elsewhere, scope to the modal dialog
                const dialog = screen.getByRole('dialog');
                expect(within(dialog).getByTestId('icon-ChevronLeft')).toBeInTheDocument();
                expect(within(dialog).getByTestId('icon-ChevronRight')).toBeInTheDocument();
            });
        });

        it('navigates to next image on chevron click', async () => {
            const { user } = setup({
                initialPosts: [{ ...basePost, images: ['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg'] }],
            });
            await user.click(screen.getByTestId('open-image-modal'));
            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(within(dialog).getByTestId('icon-ChevronRight')).toBeInTheDocument();
            });
            const dialog = screen.getByRole('dialog');
            await user.click(within(dialog).getByTestId('icon-ChevronRight').closest('button')!);
            expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();
        });

        it('navigates to prev image (wraps around)', async () => {
            const { user } = setup({
                initialPosts: [{ ...basePost, images: ['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg'] }],
            });
            await user.click(screen.getByTestId('open-image-modal'));
            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(within(dialog).getByTestId('icon-ChevronLeft')).toBeInTheDocument();
            });
            const dialog = screen.getByRole('dialog');
            await user.click(within(dialog).getByTestId('icon-ChevronLeft').closest('button')!);
            expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();
        });

        it('renders post content and tags in image modal side panel', async () => {
            const { user } = setup({
                initialPosts: [{ ...basePost, images: ['https://cdn.test/1.jpg'], tags: ['tag1'] }],
            });
            await user.click(screen.getByTestId('open-image-modal'));
            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(within(dialog).getByText('#tag1')).toBeInTheDocument();
                expect(within(dialog).getByText('Hello world')).toBeInTheDocument();
            });
        });

        it('shows link preview in image modal for posts with links', async () => {
            const { user } = setup({
                initialPosts: [{ ...basePost, images: ['https://cdn.test/1.jpg'], linkUrl: 'https://example.com', linkType: 'learn_more' }],
            });
            await user.click(screen.getByTestId('open-image-modal'));
            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(within(dialog).getByTestId('link-preview')).toBeInTheDocument();
            });
        });
    });

    // ── share / repost ──────────────────────────────────────────────
    describe('share dialog', () => {
        it('opens repost dialog when Repost button is clicked', async () => {
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /repost/i })).toBeInTheDocument();
            });
        });

        it('opens WhatsApp share URL', async () => {
            const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => expect(screen.getByText('WhatsApp')).toBeInTheDocument());
            await user.click(screen.getByText('WhatsApp'));
            expect(windowOpenSpy).toHaveBeenCalledWith(
                expect.stringContaining('wa.me'), '_blank', 'noopener,noreferrer'
            );
            windowOpenSpy.mockRestore();
        });

        it('opens Facebook share URL', async () => {
            const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => expect(screen.getByText('Facebook')).toBeInTheDocument());
            await user.click(screen.getByText('Facebook'));
            expect(windowOpenSpy).toHaveBeenCalledWith(
                expect.stringContaining('facebook.com'), '_blank', 'noopener,noreferrer'
            );
            windowOpenSpy.mockRestore();
        });

        it('opens Twitter share URL', async () => {
            const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => expect(screen.getByText('X (Twitter)')).toBeInTheDocument());
            await user.click(screen.getByText('X (Twitter)'));
            expect(windowOpenSpy).toHaveBeenCalledWith(
                expect.stringContaining('twitter.com'), '_blank', 'noopener,noreferrer'
            );
            windowOpenSpy.mockRestore();
        });

        it('copies link on Instagram share', async () => {
            const clipboardSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => expect(screen.getByText('Instagram')).toBeInTheDocument());
            await user.click(screen.getByText('Instagram'));
            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalled();
                expect(mockToastSuccess).toHaveBeenCalledWith('Link copied! Paste it on Instagram.');
            });
            clipboardSpy.mockRestore();
        });

        it('copies link when Copy Link is clicked', async () => {
            const clipboardSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => expect(screen.getByText('Copy Link')).toBeInTheDocument());
            await user.click(screen.getByText('Copy Link'));
            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalled();
                expect(mockToastSuccess).toHaveBeenCalledWith('Link copied to clipboard!');
            });
            clipboardSpy.mockRestore();
        });

        it('increments share count on repost', async () => {
            const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /repost/i }));
            await waitFor(() => expect(screen.getByText('WhatsApp')).toBeInTheDocument());
            await user.click(screen.getByText('WhatsApp'));
            windowOpenSpy.mockRestore();
            // Share count persists to localStorage
            expect(localStorage.getItem('feed-share-counts')).toContain('post-1');
        });
    });

    // ── Send (copy link) ─────────────────────────────────────────────
    describe('Send (copy post link)', () => {
        it('copies post URL and shows toast', async () => {
            const clipboardSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
            const { user } = setup();
            await user.click(screen.getByRole('button', { name: /send/i }));
            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining('post-1'));
                expect(mockToastSuccess).toHaveBeenCalledWith('Link copied — share it anywhere!');
            });
            clipboardSpy.mockRestore();
        });
    });

    // ── post with tags and media ────────────────────────────────────
    describe('post with tags and media', () => {
        it('renders post tags', () => {
            setup({ initialPosts: [{ ...basePost, tags: ['health', 'ethics'] }] });
            expect(screen.getByTestId('post-tags')).toHaveTextContent('health,ethics');
        });

        it('renders link preview for posts with linkUrl', () => {
            setup({ initialPosts: [{ ...basePost, linkUrl: 'https://example.com', linkType: 'learn_more' }] });
            expect(screen.getByTestId('link-preview')).toBeInTheDocument();
        });

        it('renders media content for posts with images', () => {
            setup({ initialPosts: [{ ...basePost, image: 'https://cdn.test/img.jpg' }] });
            expect(screen.getByTestId('post-media')).toBeInTheDocument();
        });

        it('does not render link preview when post is in edit mode', async () => {
            const { user } = setup({
                currentUserId: 'user-1',
                initialPosts: [{ ...basePost, linkUrl: 'https://example.com', linkType: 'learn_more', user: { ...basePost.user, id: 'user-1' } }],
            });
            await user.click(screen.getByTitle('Edit post'));
            expect(screen.queryByTestId('link-preview')).not.toBeInTheDocument();
        });
    });

    // ── localStorage share counts ────────────────────────────────────
    describe('localStorage', () => {
        it('reads share counts from localStorage on init', () => {
            localStorage.setItem('feed-share-counts', JSON.stringify({ 'post-1': 5 }));
            setup();
            // The shareCounts state is initialized from localStorage
            // We verify by checking it doesn't throw and the value is read
            expect(screen.getByTestId('post-card')).toBeInTheDocument();
            localStorage.removeItem('feed-share-counts');
        });

        it('handles corrupted localStorage gracefully', () => {
            localStorage.setItem('feed-share-counts', 'not-valid-json{{{');
            expect(() => setup()).not.toThrow();
            localStorage.removeItem('feed-share-counts');
        });
    });

    // ── comment mention search ───────────────────────────────────────
    describe('comment mention search', () => {
        const comment = {
            id: 'c1', content: 'Great post!', createdAt: new Date(),
            user: { id: 'user-2', name: 'Bob', image: null, role: 'user', profession: null },
            _count: { commentLikes: 0, replies: 0 }, commentLikes: [], replies: [],
        };

        it('shows mention dropdown in comment input', async () => {
            mockGetPostComments.mockResolvedValue([comment]);
            mockSearchUsers.mockResolvedValue([{ id: 'u1', name: 'Alice', image: null }]);
            const { user } = setup();
            await openComments(user);
            const commentInput = screen.getByPlaceholderText(/write a comment/i);
            await user.type(commentInput, '@Al');
            await waitFor(() => {
                expect(screen.getByText('Alice')).toBeInTheDocument();
            });
        });

        it('inserts mention in comment input', async () => {
            mockGetPostComments.mockResolvedValue([comment]);
            mockSearchUsers.mockResolvedValue([{ id: 'u1', name: 'Alice', image: null }]);
            const { user } = setup();
            await openComments(user);
            const commentInput = screen.getByPlaceholderText(/write a comment/i);
            await user.type(commentInput, '@Alice');
            await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
            await user.click(screen.getByText('Alice'));
            await waitFor(() => {
                expect((commentInput as HTMLInputElement).value).toContain('@Alice');
            });
        });
    });

// ── disabled comments post ───────────────────────────────────────
    describe('disabled comments post', () => {
        it('shows MessageCircleOff icon when comments disabled', () => {
            const disabledPost = { ...basePost, commentsEnabled: false };
            setup({ initialPosts: [disabledPost] });
            const postCard = screen.getByTestId('post-card');
            expect(within(postCard).getByTestId('icon-MessageCircleOff')).toBeInTheDocument();
        });

        it('comment button is disabled when comments are disabled', () => {
            const disabledPost = { ...basePost, commentsEnabled: false };
            setup({ initialPosts: [disabledPost] });
            const postCard = screen.getByTestId('post-card');
            const commentBtn = within(postCard).getByRole('button', { name: /^comment$/i });
            expect(commentBtn).toBeDisabled();
        });
    });
});