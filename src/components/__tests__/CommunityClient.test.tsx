import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import CommunityClient from "../community-client";
import * as communityActions from "@/app/actions/community";
import * as adminActions from "@/app/actions/admin";
import { toast } from "sonner";

type CommunityClientProps = React.ComponentProps<typeof CommunityClient>;

// ─── Mocks ──────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/app/actions/community", () => ({
    createTopic: jest.fn(),
    addReply: jest.fn(),
    getTopicWithReplies: jest.fn(),
    deleteTopic: jest.fn(),
    deleteReply: jest.fn(),
    editReply: jest.fn(),
    editTopic: jest.fn(),
    toggleTopicLike: jest.fn(),
    toggleTopicChat: jest.fn(),
    voteOnPoll: jest.fn(),
}));
jest.mock("@/app/actions/admin", () => ({
    createReport: jest.fn(),
    sendWarning: jest.fn(),
    banUserById: jest.fn(),
}));
jest.mock("@/lib/client-image-upload", () => ({
    prepareImageForUpload: jest.fn((file: File) => Promise.resolve(file)),
}));

// ─── Prop Types for Mocked Components ────────────────────────────────

interface MembersListProps {
    topics: CommunityClientProps["initialTopics"];
    onSelectTopic: (id: string) => void;
    onDeleteTopic: (id: string) => void;
    onShowCreate: () => void;
}

interface ReplyData {
    id: string;
    user: { id: string; name: string };
    content: string;
}

interface CommentSectionProps {
    selectedTopic: { id: string; title: string };
    onSendMessage: () => void;
    onDeleteReply: (id: string) => void;
    onToggleChat: (id: string) => void;
    onToggleTopicLike: (id: string, isDislike: boolean) => void;
    onEditTopic: (id: string, data: { title?: string; content?: string }) => void;
    onVotePoll: (id: string, index: number) => void;
    onReplyTo: (reply: ReplyData) => void;
    onStartEditReply: (id: string, content: string) => void;
    onEditReply: (id: string) => void;
    onReportChat: (id: string) => void;
    onShowMobileChannels: () => void;
    onMentionAll: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onFileUpload: (file: File, type: string) => void;
    onUserClick: (id: string) => void;
    setShowPollCreator: (fn: (prev: boolean) => boolean) => void;
    setShowEventCreator: (fn: (prev: boolean) => boolean) => void;
    setShowLinkInput: (fn: (prev: boolean) => boolean) => void;
    setShowAttachmentPanel: (fn: (prev: boolean) => boolean) => void;
    setShowEmojiPicker: (fn: (prev: boolean) => boolean) => void;
    setShowMentions: (fn: (prev: boolean) => boolean) => void;
    messageText: string;
    setMessageText: (val: string) => void;
    replyingTo: ReplyData | null;
    pendingImages: string[];
    pendingVideos: string[];
    pendingAudios: string[];
    pendingDocuments: string[];
    pendingVoiceNote: string | null;
    setPendingVoiceNote: (val: string) => void;
    pendingLinkUrl: string;
    setPendingLinkUrl: (val: string) => void;
    pendingPollQuestion: string;
    setPendingPollQuestion: (val: string) => void;
    pendingPollOptions: string[];
    setPendingPollOptions: (val: string[]) => void;
    pendingEventTitle: string;
    setPendingEventTitle: (val: string) => void;
    pendingEventDate: string;
    setPendingEventDate: (val: string) => void;
    pendingEventLocation: string;
    setPendingEventLocation: (val: string) => void;
    showPollCreator: boolean;
    showEventCreator: boolean;
    showLinkInput: boolean;
    showAttachmentPanel: boolean;
    isRecording: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

interface PostModalProps {
    onSubmitReport: () => void;
    onCloseReport: () => void;
    reportingReplyId: string | null;
    setReportCategory: (val: string) => void;
    userProfileId: string | null;
    showBanDialog: boolean;
    setShowBanDialog: (val: boolean) => void;
    showWarningDialog: boolean;
    setShowWarningDialog: (val: boolean) => void;
    warningMessage: string;
    setWarningMessage: (val: string) => void;
    banReason: string;
    setBanReason: (val: string) => void;
    onSendWarning: () => void;
    onBanUser: () => void;
    onCloseUserProfile: () => void;
}

interface CreatePostProps {
    open: boolean;
    onOpenChange: (val: boolean) => void;
    onCreateTopic: () => void;
    setNewTopic: (val: {
        title: string;
        content: string;
        category: string;
        image: string;
        images: string[];
        video: string;
        videos: string[];
        documents: string[];
        linkUrl: string;
    }) => void;
    onFileUpload: (file: File, type: string) => void;
}

// ─── Component Mocks ─────────────────────────────────────────────────

jest.mock("../community/CommunityMembersList", () => ({
    CommunityMembersList: ({
                               topics,
                               onSelectTopic,
                               onDeleteTopic,
                               onShowCreate,
                           }: MembersListProps) => (
        <div data-testid="members-list">
            {topics.map((t) => (
                <button
                    key={t.id}
                    data-testid={`topic-${t.id}`}
                    onClick={() => onSelectTopic(t.id)}
                >
                    {t.title}
                </button>
            ))}
            <button
                data-testid="delete-topic-btn"
                onClick={() => onDeleteTopic(topics[0]?.id)}
            />
            <button data-testid="show-create-btn" onClick={onShowCreate}>
                New Channel
            </button>
        </div>
    ),
}));

jest.mock("../community/CommunityCommentSection", () => ({
    CommunityCommentSection: ({
                                  selectedTopic,
                                  onSendMessage,
                                  onDeleteReply,
                                  onToggleChat,
                                  onToggleTopicLike,
                                  onEditTopic,
                                  onVotePoll,
                                  onReplyTo,
                                  onStartEditReply,
                                  onEditReply,
                                  onReportChat,
                                  onShowMobileChannels,
                                  onMentionAll,
                                  onStartRecording,
                                  onStopRecording,
                                  onFileUpload,
                                  setShowPollCreator,
                                  setShowEventCreator,
                                  setShowLinkInput,
                                  setShowAttachmentPanel,
                                  setShowEmojiPicker,
                                  setShowMentions,
                                  messageText,
                                  setMessageText,
                                  replyingTo,
                                  pendingImages,
                                  pendingVideos,
                                  pendingAudios,
                                  pendingDocuments,
                                  pendingVoiceNote,
                                  setPendingVoiceNote,
                                  pendingLinkUrl,
                                  setPendingLinkUrl,
                                  pendingPollQuestion,
                                  setPendingPollQuestion,
                                  pendingPollOptions,
                                  setPendingPollOptions,
                                  pendingEventTitle,
                                  setPendingEventTitle,
                                  pendingEventDate,
                                  setPendingEventDate,
                                  pendingEventLocation,
                                  setPendingEventLocation,
                                  showPollCreator,
                                  showEventCreator,
                                  showLinkInput,
                                  showAttachmentPanel,
                                  isRecording,
                                  messagesEndRef,
                                  onUserClick,
                              }: CommentSectionProps) => (
        <div data-testid="comment-section">
            <span data-testid="topic-title">{selectedTopic.title}</span>
            <button data-testid="send-message-btn" onClick={onSendMessage}>Send</button>
            <button data-testid="delete-reply-btn" onClick={() => onDeleteReply("reply-1")}>Delete Reply</button>
            <button data-testid="toggle-chat-btn" onClick={() => onToggleChat(selectedTopic.id)}>Toggle Chat</button>
            <button data-testid="like-btn" onClick={() => onToggleTopicLike(selectedTopic.id, false)}>Like</button>
            <button data-testid="dislike-btn" onClick={() => onToggleTopicLike(selectedTopic.id, true)}>Dislike</button>
            <button data-testid="edit-topic-btn" onClick={() => onEditTopic(selectedTopic.id, { title: "Updated" })}>Edit Topic</button>
            <button data-testid="vote-poll-btn" onClick={() => onVotePoll("reply-1", 0)}>Vote</button>
            <button
                data-testid="reply-to-btn"
                onClick={() => onReplyTo({ id: "reply-1", user: { id: "u1", name: "Test" }, content: "hi" })}
            >Reply To</button>
            <button data-testid="start-edit-reply-btn" onClick={() => onStartEditReply("reply-1", "old content")}>Start Edit</button>
            <button data-testid="edit-reply-btn" onClick={() => onEditReply("reply-1")}>Edit Reply</button>
            <button data-testid="report-chat-btn" onClick={() => onReportChat("reply-1")}>Report</button>
            <button data-testid="mobile-channels-btn" onClick={onShowMobileChannels}>Channels</button>
            <button data-testid="mention-all-btn" onClick={onMentionAll}>Mention All</button>
            <button data-testid="start-record-btn" onClick={onStartRecording}>Record</button>
            <button data-testid="stop-record-btn" onClick={onStopRecording}>Stop</button>
            <button data-testid="upload-image-btn" onClick={() => onFileUpload(new File([], "test.jpg"), "image")}>Upload Image</button>
            <button data-testid="upload-video-btn" onClick={() => onFileUpload(new File([], "test.mp4"), "video")}>Upload Video</button>
            <button data-testid="upload-audio-btn" onClick={() => onFileUpload(new File([], "test.mp3"), "audio")}>Upload Audio</button>
            <button data-testid="upload-doc-btn" onClick={() => onFileUpload(new File([], "test.pdf"), "document")}>Upload Doc</button>
            <button data-testid="toggle-poll-creator" onClick={() => setShowPollCreator((p) => !p)}>Poll</button>
            <button data-testid="toggle-event-creator" onClick={() => setShowEventCreator((p) => !p)}>Event</button>
            <button data-testid="toggle-link-input" onClick={() => setShowLinkInput((p) => !p)}>Link</button>
            <button data-testid="toggle-attachment-panel" onClick={() => setShowAttachmentPanel((p) => !p)}>Attach</button>
            <button data-testid="toggle-emoji-picker" onClick={() => setShowEmojiPicker((p) => !p)}>Emoji</button>
            <button data-testid="toggle-mentions" onClick={() => setShowMentions((p) => !p)}>Mentions</button>
            <input
                data-testid="message-input"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
            />
            <div data-testid="replying-to">{replyingTo?.id}</div>
            <div data-testid="pending-images">{pendingImages.length}</div>
            <div data-testid="pending-videos">{pendingVideos.length}</div>
            <div data-testid="pending-audios">{pendingAudios.length}</div>
            <div data-testid="pending-documents">{pendingDocuments.length}</div>
            <div data-testid="pending-voice-note">{pendingVoiceNote ?? "none"}</div>
            <input
                data-testid="pending-link-url"
                value={pendingLinkUrl}
                onChange={(e) => setPendingLinkUrl(e.target.value)}
            />
            <div data-testid="poll-question">{pendingPollQuestion}</div>
            <div data-testid="poll-options">{pendingPollOptions.join(",")}</div>
            <div data-testid="event-title">{pendingEventTitle}</div>
            <div data-testid="event-date">{pendingEventDate}</div>
            <div data-testid="event-location">{pendingEventLocation}</div>
            <div data-testid="show-poll">{String(showPollCreator)}</div>
            <div data-testid="show-event">{String(showEventCreator)}</div>
            <div data-testid="show-link">{String(showLinkInput)}</div>
            <div data-testid="show-attachment">{String(showAttachmentPanel)}</div>
            <div data-testid="is-recording">{String(isRecording)}</div>
            <div ref={messagesEndRef} data-testid="messages-end" />
            <button
                data-testid="set-poll-data"
                onClick={() => {
                    setPendingPollQuestion("Favorite color?");
                    setPendingPollOptions(["Red", "Blue", "Green"]);
                }}
            >Set Poll Data</button>
            <button
                data-testid="set-event-data"
                onClick={() => {
                    setPendingEventTitle("Meeting");
                    setPendingEventDate("2025-01-01");
                    setPendingEventLocation("Room 1");
                }}
            >Set Event Data</button>
            <button
                data-testid="set-voice-note"
                onClick={() => setPendingVoiceNote("https://cdn.test/voice.webm")}
            >Set Voice Note</button>
            <button
                data-testid="click-user"
                onClick={() => onUserClick("user-2")}
            >Click User</button>
        </div>
    ),
}));

jest.mock("../community/CommunityPostModal", () => ({
    CommunityPostModal: ({
                             onSubmitReport,
                             onCloseReport,
                             reportingReplyId,
                             setReportCategory,
                             userProfileId,
                             showBanDialog,
                             setShowBanDialog,
                             showWarningDialog,
                             setShowWarningDialog,
                             warningMessage,
                             setWarningMessage,
                             banReason,
                             setBanReason,
                             onSendWarning,
                             onBanUser,
                             onCloseUserProfile,
                         }: PostModalProps) => {
        if (!reportingReplyId && !userProfileId) return null;
        return (
            <div data-testid="post-modal">
                {reportingReplyId && (
                    <>
                        <button
                            data-testid="set-category-btn"
                            onClick={() => setReportCategory("Spam")}
                        >Set Category</button>
                        <button data-testid="submit-report-btn" onClick={onSubmitReport}>Submit Report</button>
                        <button data-testid="close-report-btn" onClick={onCloseReport}>Close Report</button>
                    </>
                )}
                {userProfileId && (
                    <>
                        <button
                            data-testid="show-warning-dialog"
                            onClick={() => setShowWarningDialog(true)}
                        >Show Warning</button>
                        <button
                            data-testid="show-ban-dialog"
                            onClick={() => setShowBanDialog(true)}
                        >Show Ban</button>
                        {showWarningDialog && (
                            <>
                                <input
                                    data-testid="warning-input"
                                    value={warningMessage}
                                    onChange={(e) => setWarningMessage(e.target.value)}
                                />
                                <button data-testid="send-warning-btn" onClick={onSendWarning}>
                                    Send Warning
                                </button>
                            </>
                        )}
                        {showBanDialog && (
                            <>
                                <input
                                    data-testid="ban-input"
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                />
                                <button data-testid="ban-user-btn" onClick={onBanUser}>Ban User</button>
                            </>
                        )}
                        <button data-testid="close-user-profile" onClick={onCloseUserProfile}>Close</button>
                    </>
                )}
            </div>
        );
    },
}));

jest.mock("../community/CommunityCreatePost", () => ({
    CommunityCreatePost: ({
                              open,
                              onOpenChange,
                              onCreateTopic,
                              setNewTopic,
                              onFileUpload,
                          }: CreatePostProps) =>
        open ? (
            <div data-testid="create-post-modal">
                <button
                    data-testid="fill-topic-btn"
                    onClick={() =>
                        setNewTopic({
                            title: "New channel",
                            content: "Some text",
                            category: "General",
                            image: "",
                            images: [],
                            video: "",
                            videos: [],
                            documents: [],
                            linkUrl: "",
                        })
                    }
                >Fill</button>
                <button
                    data-testid="fill-announcement-btn"
                    onClick={() =>
                        setNewTopic({
                            title: "Announcement",
                            content: "Important",
                            category: "Announcements",
                            image: "",
                            images: [],
                            video: "",
                            videos: [],
                            documents: [],
                            linkUrl: "",
                        })
                    }
                >Fill Announcement</button>
                <button data-testid="create-topic-btn" onClick={onCreateTopic}>Create</button>
                <button data-testid="close-create-btn" onClick={() => onOpenChange(false)}>Close</button>
                <button
                    data-testid="upload-topic-image"
                    onClick={() => onFileUpload(new File([], "img.jpg"), "image")}
                >Upload Image</button>
                <button
                    data-testid="upload-topic-video"
                    onClick={() => onFileUpload(new File([], "vid.mp4"), "video")}
                >Upload Video</button>
                <button
                    data-testid="upload-topic-doc"
                    onClick={() => onFileUpload(new File([], "doc.pdf"), "document")}
                >Upload Doc</button>
            </div>
        ) : null,
}));

jest.mock("../community/utils", () => ({
    getDisplayName: (user: { name?: string | null }) => user?.name ?? "Anonymous",
}));

// ─── mediaDevices Helper ──────────────────────────────────────────────

function mockMediaDevices(getUserMedia: jest.Mock): void {
    Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        // writable must NOT be set when using get/set
        get() {
            return { getUserMedia };
        },
    });
}

// ─── Test Data ──────────────────────────────────────────────────────

const mockUsers: CommunityClientProps["users"] = [
    { id: "user-1", name: "Test User", image: null, role: "member" },
    { id: "user-2", name: "Other User", image: null, role: "member" },
];

const mockTopics: CommunityClientProps["initialTopics"] = [
    {
        id: "topic-1",
        title: "General",
        content: "General discussion",
        category: "General",
        createdAt: new Date("2024-01-01"),
        userId: "user-1",
        image: null,
        images: [],
        video: null,
        videos: [],
        documents: [],
        linkUrl: null,
        chatEnabled: true,
        likes: [],
        _count: { replies: 0 },
        user: { id: "user-1", name: "Test User", image: null, role: "member" },
    },
];

const mockTopicDetail = {
    id: "topic-1",
    title: "General",
    content: "General discussion",
    category: "General",
    createdAt: new Date("2024-01-01"),
    userId: "user-1",
    image: null,
    images: [] as string[],
    video: null,
    videos: [] as string[],
    documents: [] as string[],
    linkUrl: null as string | null,
    chatEnabled: true,
    likes: [] as Array<{ userId: string; isDislike: boolean }>,
    replies: [
        {
            id: "reply-1",
            content: "Hello world",
            topicId: "topic-1",
            userId: "user-2",
            parentId: null as string | null,
            createdAt: new Date("2024-01-02"),
            image: null as string | null,
            images: [] as string[],
            video: null as string | null,
            videos: [] as string[],
            audio: null as string | null,
            audios: [] as string[],
            voiceNote: null as string | null,
            document: null as string | null,
            documents: [] as string[],
            linkUrl: null as string | null,
            pollQuestion: null as string | null,
            pollOptions: null as string[] | null,
            pollVotes: null as Record<string, number> | null,
            eventTitle: null as string | null,
            eventDate: null as string | null,
            eventLocation: null as string | null,
            children: [],
            user: { id: "user-2", name: "Other User", image: null, role: "member" },
            likes: [],
        },
    ],
    user: { id: "user-1", name: "Test User", image: null, role: "member" },
};

const defaultProps: CommunityClientProps = {
    initialTopics: mockTopics,
    users: mockUsers,
    isAdmin: false,
    currentUserId: "user-1",
    currentUserRole: "member",
};

// ─── Tests ──────────────────────────────────────────────────────────

describe("CommunityClient Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // scrollIntoView is not implemented in jsdom
        window.HTMLElement.prototype.scrollIntoView = jest.fn();

        (communityActions.getTopicWithReplies as jest.Mock).mockResolvedValue(mockTopicDetail);
        (communityActions.createTopic as jest.Mock).mockResolvedValue({});
        (communityActions.addReply as jest.Mock).mockResolvedValue({
            id: "new-reply",
            content: "New reply",
            children: [],
            pollVotes: null,
            user: mockUsers[0],
        });
        (communityActions.deleteReply as jest.Mock).mockResolvedValue({});
        (communityActions.toggleTopicChat as jest.Mock).mockResolvedValue({ chatEnabled: false });
        (communityActions.toggleTopicLike as jest.Mock).mockResolvedValue({});
        (communityActions.editTopic as jest.Mock).mockResolvedValue({});
        (communityActions.editReply as jest.Mock).mockResolvedValue({});
        (communityActions.voteOnPoll as jest.Mock).mockResolvedValue({ votes: { "0": 1 } });
        (communityActions.deleteTopic as jest.Mock).mockResolvedValue({});
        (adminActions.createReport as jest.Mock).mockResolvedValue({});
        (adminActions.sendWarning as jest.Mock).mockResolvedValue({});
        (adminActions.banUserById as jest.Mock).mockResolvedValue({});

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.test/file.mp4" }),
        });
    });

    const renderComponent = (props: Partial<CommunityClientProps> = {}) =>
        render(<CommunityClient {...defaultProps} {...props} />);

    const selectTopic = async () => {
        (communityActions.getTopicWithReplies as jest.Mock).mockResolvedValueOnce(mockTopicDetail);
        fireEvent.click(screen.getByTestId("topic-topic-1"));
        await waitFor(() =>
            expect(screen.getByTestId("comment-section")).toBeInTheDocument()
        );
    };

    // ── Basic rendering ───────────────────────────────────────────────

    it("renders initial state with welcome screen and topic list", () => {
        renderComponent();
        expect(screen.getByTestId("members-list")).toBeInTheDocument();
        expect(screen.getByText("Welcome to CNERSH Community")).toBeInTheDocument();
        expect(screen.queryByTestId("comment-section")).toBeNull();
    });

    it("loads a topic and shows comment section", async () => {
        renderComponent();
        await selectTopic();
        expect(screen.getByTestId("topic-title")).toHaveTextContent("General");
    });

    it("handles load topic error", async () => {
        (communityActions.getTopicWithReplies as jest.Mock).mockRejectedValueOnce(
            new Error("x")
        );
        renderComponent();
        fireEvent.click(screen.getByTestId("topic-topic-1"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to load channel")
        );
    });

    it("handles null topic from getTopicWithReplies", async () => {
        (communityActions.getTopicWithReplies as jest.Mock).mockResolvedValueOnce(null);
        renderComponent();
        fireEvent.click(screen.getByTestId("topic-topic-1"));
        await waitFor(() =>
            expect(screen.queryByTestId("comment-section")).toBeNull()
        );
    });

    it("renders in admin mode", () => {
        renderComponent({ isAdmin: true, currentUserRole: "admin" });
        expect(screen.getByTestId("members-list")).toBeInTheDocument();
    });

    // ── Create topic ──────────────────────────────────────────────────

    it("opens create modal, fills fields and submits", async () => {
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("fill-topic-btn"));
        fireEvent.click(screen.getByTestId("create-topic-btn"));
        await waitFor(() =>
            expect(communityActions.createTopic).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "New channel",
                    content: "Some text",
                    category: "General",
                })
            )
        );
        expect(toast.success).toHaveBeenCalledWith("Channel created!");
    });

    it("shows error when creating topic with missing fields", async () => {
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("create-topic-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Please fill in all fields")
        );
        expect(communityActions.createTopic).not.toHaveBeenCalled();
    });

    it("prevents non-admin from creating announcement", async () => {
        renderComponent({ isAdmin: false });
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("fill-announcement-btn"));
        fireEvent.click(screen.getByTestId("create-topic-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith(
                "Only admins can create announcements"
            )
        );
        expect(communityActions.createTopic).not.toHaveBeenCalled();
    });

    it("admin can create announcement", async () => {
        renderComponent({ isAdmin: true });
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("fill-announcement-btn"));
        fireEvent.click(screen.getByTestId("create-topic-btn"));
        await waitFor(() =>
            expect(communityActions.createTopic).toHaveBeenCalledWith(
                expect.objectContaining({ category: "Announcements" })
            )
        );
        expect(toast.success).toHaveBeenCalledWith(
            "Announcement published! All users have been notified."
        );
    });

    it("shows error when createTopic fails", async () => {
        (communityActions.createTopic as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("fill-topic-btn"));
        fireEvent.click(screen.getByTestId("create-topic-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to create channel")
        );
    });

    it("closes create modal", async () => {
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("close-create-btn"));
        expect(screen.queryByTestId("create-post-modal")).toBeNull();
    });

    // ── Topic file uploads ────────────────────────────────────────────

    it("uploads topic image and updates state", async () => {
        const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.test/img.jpg" }),
        });
        global.fetch = mockFetch;
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("upload-topic-image"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("shows error on topic file upload failure", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("upload fail"));
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("upload-topic-image"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("upload fail")
        );
    });

    it("uploads topic video and doc", async () => {
        const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.test/vid.mp4" }),
        });
        global.fetch = mockFetch;
        renderComponent();
        fireEvent.click(screen.getByTestId("show-create-btn"));
        fireEvent.click(screen.getByTestId("upload-topic-video"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
        fireEvent.click(screen.getByTestId("upload-topic-doc"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });

    // ── Messaging ─────────────────────────────────────────────────────

    it("does not send when message empty and no attachments", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("send-message-btn"));
        expect(communityActions.addReply).not.toHaveBeenCalled();
    });

    it("sends a message without replying", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.change(screen.getByTestId("message-input"), {
            target: { value: "Hello" },
        });
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(communityActions.addReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    topicId: "topic-1",
                    content: "Hello",
                    parentId: undefined,
                })
            )
        );
    });

    it("sends a message after reply-to", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("reply-to-btn"));
        await act(async () => {});
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() => expect(communityActions.addReply).toHaveBeenCalled());
    });

    it("shows error when addReply fails", async () => {
        (communityActions.addReply as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.change(screen.getByTestId("message-input"), {
            target: { value: "Hello" },
        });
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to send message")
        );
    });

    it("shows error toast when send fails (reply-to path)", async () => {
        (communityActions.addReply as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("reply-to-btn"));
        await act(async () => {});
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to send message")
        );
    });

    it("sends message with image attachment", async () => {
        const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.test/img.jpg" }),
        });
        global.fetch = mockFetch;
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("upload-image-btn"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(communityActions.addReply).toHaveBeenCalledWith(
                expect.objectContaining({ images: ["https://cdn.test/img.jpg"] })
            )
        );
    });

    // ── 1 file each → singular fields (component logic) ──────────────
    it("sends message with video, audio, document, voice note, link", async () => {
        const mockFetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.test/file.mp4" }),
        });
        global.fetch = mockFetch;
        renderComponent();
        await selectTopic();

        fireEvent.click(screen.getByTestId("upload-video-btn"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
        fireEvent.click(screen.getByTestId("upload-audio-btn"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
        fireEvent.click(screen.getByTestId("upload-doc-btn"));
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

        fireEvent.click(screen.getByTestId("set-voice-note"));
        fireEvent.click(screen.getByTestId("toggle-link-input"));
        fireEvent.change(screen.getByTestId("pending-link-url"), {
            target: { value: "https://example.com" },
        });

        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(communityActions.addReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    video:     "https://cdn.test/file.mp4",
                    videos:    undefined,
                    audio:     "https://cdn.test/file.mp4",
                    audios:    undefined,
                    document:  "https://cdn.test/file.mp4",
                    documents: undefined,
                    voiceNote: "https://cdn.test/voice.webm",
                    linkUrl:   "https://example.com",
                })
            )
        );
    });

    it("sends message with poll", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("toggle-poll-creator"));
        fireEvent.click(screen.getByTestId("set-poll-data"));
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(communityActions.addReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    pollQuestion: "Favorite color?",
                    pollOptions:  ["Red", "Blue", "Green"],
                })
            )
        );
    });

    it("sends message with event", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("toggle-event-creator"));
        fireEvent.click(screen.getByTestId("set-event-data"));
        fireEvent.click(screen.getByTestId("send-message-btn"));
        await waitFor(() =>
            expect(communityActions.addReply).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventTitle:    "Meeting",
                    eventDate:     "2025-01-01",
                    eventLocation: "Room 1",
                })
            )
        );
    });

    it("shows error on file upload failure", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("upload fail"));
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("upload-image-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("upload fail")
        );
    });

    // ── Reply / edit / delete ─────────────────────────────────────────

    it("deletes a reply and shows success toast", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("delete-reply-btn"));
        await waitFor(() =>
            expect(communityActions.deleteReply).toHaveBeenCalledWith("reply-1")
        );
        expect(toast.success).toHaveBeenCalledWith("Message deleted");
    });

    it("shows error when deleteReply fails", async () => {
        (communityActions.deleteReply as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("delete-reply-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to delete message")
        );
    });

    it("edits a reply and shows success toast", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("start-edit-reply-btn"));
        fireEvent.click(screen.getByTestId("edit-reply-btn"));
        await waitFor(() =>
            expect(communityActions.editReply).toHaveBeenCalledWith(
                "reply-1",
                "old content"
            )
        );
        expect(toast.success).toHaveBeenCalledWith("Message updated");
    });

    it("shows error when editReply fails", async () => {
        (communityActions.editReply as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("start-edit-reply-btn"));
        fireEvent.click(screen.getByTestId("edit-reply-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to edit message")
        );
    });

    // ── Topic actions ─────────────────────────────────────────────────

    it("toggles chat", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("toggle-chat-btn"));
        await waitFor(() =>
            expect(communityActions.toggleTopicChat).toHaveBeenCalledWith("topic-1")
        );
    });

    it("shows error when toggleTopicChat fails", async () => {
        (communityActions.toggleTopicChat as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("toggle-chat-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to toggle chat")
        );
    });

    it("likes a topic", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("like-btn"));
        await waitFor(() =>
            expect(communityActions.toggleTopicLike).toHaveBeenCalledWith(
                "topic-1",
                false
            )
        );
    });

    it("dislikes a topic", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("dislike-btn"));
        await waitFor(() =>
            expect(communityActions.toggleTopicLike).toHaveBeenCalledWith(
                "topic-1",
                true
            )
        );
    });

    it("shows error when toggleTopicLike fails", async () => {
        (communityActions.toggleTopicLike as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("like-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to react")
        );
    });

    it("edits a topic and shows success toast", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("edit-topic-btn"));
        await waitFor(() =>
            expect(communityActions.editTopic).toHaveBeenCalledWith("topic-1", {
                title: "Updated",
            })
        );
        expect(toast.success).toHaveBeenCalledWith("Updated successfully");
    });

    it("shows error when editTopic fails", async () => {
        (communityActions.editTopic as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("edit-topic-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to update")
        );
    });

    it("deletes a topic", async () => {
        renderComponent();
        fireEvent.click(screen.getByTestId("delete-topic-btn"));
        await waitFor(() =>
            expect(communityActions.deleteTopic).toHaveBeenCalledWith("topic-1")
        );
    });

    it("shows error when deleteTopic fails", async () => {
        (communityActions.deleteTopic as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        fireEvent.click(screen.getByTestId("delete-topic-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to delete channel")
        );
    });

    it("votes on a poll", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("vote-poll-btn"));
        await waitFor(() =>
            expect(communityActions.voteOnPoll).toHaveBeenCalledWith("reply-1", 0)
        );
    });

    it("shows error when voteOnPoll fails", async () => {
        (communityActions.voteOnPoll as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("vote-poll-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to vote")
        );
    });

    it("mentions all users and shows toast", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("mention-all-btn"));
        expect(
            (screen.getByTestId("message-input") as HTMLInputElement).value
        ).toContain("@Other User");
        expect(toast.success).toHaveBeenCalledWith("Mentioned 1 users");
    });

    // ── Report ────────────────────────────────────────────────────────

    it("reports a chat after setting category", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("report-chat-btn"));
        await waitFor(() =>
            expect(screen.getByTestId("set-category-btn")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("set-category-btn"));
        fireEvent.click(screen.getByTestId("submit-report-btn"));
        await waitFor(() =>
            expect(adminActions.createReport).toHaveBeenCalled()
        );
    });

    it("does not submit report without category", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("report-chat-btn"));
        await waitFor(() =>
            expect(screen.getByTestId("submit-report-btn")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("submit-report-btn"));
        expect(adminActions.createReport).not.toHaveBeenCalled();
    });

    it("shows error when createReport fails", async () => {
        (adminActions.createReport as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("report-chat-btn"));
        await waitFor(() =>
            expect(screen.getByTestId("set-category-btn")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("set-category-btn"));
        fireEvent.click(screen.getByTestId("submit-report-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to report chat")
        );
    });

    it("closes report modal", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("report-chat-btn"));
        await waitFor(() =>
            expect(screen.getByTestId("close-report-btn")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("close-report-btn"));
        await waitFor(() =>
            expect(screen.queryByTestId("post-modal")).toBeNull()
        );
    });

    // ── Admin – warning ───────────────────────────────────────────────

    it("does not send empty warning", async () => {
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("show-warning-dialog"));
        fireEvent.click(screen.getByTestId("send-warning-btn"));
        expect(adminActions.sendWarning).not.toHaveBeenCalled();
    });

    it("admin can send warning", async () => {
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("show-warning-dialog"));
        fireEvent.change(screen.getByTestId("warning-input"), {
            target: { value: "Warning message" },
        });
        fireEvent.click(screen.getByTestId("send-warning-btn"));
        await waitFor(() =>
            expect(adminActions.sendWarning).toHaveBeenCalledWith(
                "user-2",
                "Warning message"
            )
        );
        expect(toast.success).toHaveBeenCalledWith("Warning sent successfully");
    });

    it("shows error when sendWarning fails", async () => {
        (adminActions.sendWarning as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("show-warning-dialog"));
        fireEvent.change(screen.getByTestId("warning-input"), {
            target: { value: "Warning" },
        });
        fireEvent.click(screen.getByTestId("send-warning-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to send warning")
        );
    });

    // ── Admin – ban ──────────────────────────────────────────────────
    it("admin can ban user", async () => {
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("show-ban-dialog"));
        await waitFor(() =>
            expect(screen.getByTestId("ban-input")).toBeInTheDocument()
        );
        fireEvent.change(screen.getByTestId("ban-input"), {
            target: { value: "Ban reason" },
        });
        fireEvent.click(screen.getByTestId("ban-user-btn"));
        await waitFor(() =>
            expect(adminActions.banUserById).toHaveBeenCalledWith(
                "user-2",
                "Ban reason"
            )
        );
        expect(toast.success).toHaveBeenCalledWith("User banned successfully");
    });

    it("does not ban without reason", async () => {
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("show-ban-dialog"));
        await waitFor(() =>
            expect(screen.getByTestId("ban-user-btn")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("ban-user-btn"));
        expect(adminActions.banUserById).not.toHaveBeenCalled();
    });

    it("shows error when banUserById fails", async () => {
        (adminActions.banUserById as jest.Mock).mockRejectedValueOnce(
            new Error("fail")
        );
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("show-ban-dialog"));
        await waitFor(() =>
            expect(screen.getByTestId("ban-input")).toBeInTheDocument()
        );
        fireEvent.change(screen.getByTestId("ban-input"), {
            target: { value: "Reason" },
        });
        fireEvent.click(screen.getByTestId("ban-user-btn"));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Failed to ban user")
        );
    });

    it("closes user profile modal", async () => {
        renderComponent({ isAdmin: true });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        await waitFor(() =>
            expect(screen.getByTestId("post-modal")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId("close-user-profile"));
        await waitFor(() =>
            expect(screen.queryByTestId("post-modal")).toBeNull()
        );
    });

    it("non-admin does not open user profile", async () => {
        renderComponent({ isAdmin: false });
        await selectTopic();
        fireEvent.click(screen.getByTestId("click-user"));
        expect(screen.queryByTestId("post-modal")).toBeNull();
    });

    // ── Recording ─────────────────────────────────────────────────────

    it("starts and stops recording", async () => {
        const mockStop = jest.fn();
        let savedOnStop: (() => void) | undefined;

        const mockMediaRecorder = {
            start: jest.fn(),
            stop: jest.fn(() => {
                savedOnStop?.();
            }),
            ondataavailable: undefined as
                | ((e: { data: Blob }) => void)
                | undefined,
            set onstop(fn: () => void) {
                savedOnStop = fn;
            },
            get onstop(): (() => void) | undefined {
                return savedOnStop;
            },
        };

        global.MediaRecorder = jest
            .fn()
            .mockImplementation(() => mockMediaRecorder) as unknown as typeof MediaRecorder;

        mockMediaDevices(
            jest.fn().mockResolvedValue({
                getTracks: () => [{ stop: mockStop }],
            })
        );

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.test/voice.webm" }),
        });

        renderComponent();
        await selectTopic();

        await act(async () => {
            fireEvent.click(screen.getByTestId("start-record-btn"));
        });
        await waitFor(() =>
            expect(screen.getByTestId("is-recording")).toHaveTextContent("true")
        );

        await act(async () => {
            fireEvent.click(screen.getByTestId("stop-record-btn"));
        });
        await waitFor(() =>
            expect(screen.getByTestId("is-recording")).toHaveTextContent("false")
        );
    });

    it("handles recording error (getUserMedia denied)", async () => {
        mockMediaDevices(jest.fn().mockRejectedValue(new Error("denied")));

        renderComponent();
        await selectTopic();

        await act(async () => {
            fireEvent.click(screen.getByTestId("start-record-btn"));
        });
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Microphone access denied")
        );
    });

    it("shows mobile channels overlay button", async () => {
        renderComponent();
        await selectTopic();
        fireEvent.click(screen.getByTestId("mobile-channels-btn"));
        expect(screen.getByTestId("mobile-channels-btn")).toBeInTheDocument();
    });
});