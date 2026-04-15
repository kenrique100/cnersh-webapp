export interface TopicUser {
    id: string;
    name: string | null;
    image: string | null;
    role?: string | null;
}

export interface CommunityUser {
    id: string;
    name: string | null;
    image: string | null;
    role: string | null;
}

export interface TopicData {
    id: string;
    title: string;
    content: string;
    category: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    documents?: string[];
    linkUrl?: string | null;
    chatEnabled?: boolean;
    createdAt: Date;
    userId?: string;
    user: TopicUser;
    _count: { replies: number; likes?: number };
    likes?: { userId: string; isDislike: boolean }[];
}

export interface ReplyData {
    id: string;
    content: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    audio?: string | null;
    audios?: string[];
    voiceNote?: string | null;
    document?: string | null;
    documents?: string[];
    linkUrl?: string | null;
    pollQuestion?: string | null;
    pollOptions?: string[];
    pollVotes?: Record<string, number> | null;
    eventTitle?: string | null;
    eventDate?: string | null;
    eventLocation?: string | null;
    createdAt: Date;
    user: TopicUser;
    parentId?: string | null;
    children?: ReplyData[];
}

export interface TopicDetail {
    id: string;
    title: string;
    content: string;
    category: string;
    image?: string | null;
    images?: string[];
    video?: string | null;
    videos?: string[];
    documents?: string[];
    linkUrl?: string | null;
    chatEnabled?: boolean;
    createdAt: Date;
    userId?: string;
    user: TopicUser;
    replies: ReplyData[];
    likes?: { userId: string; isDislike: boolean }[];
}

export type NewTopicState = {
    title: string;
    content: string;
    category: string;
    image: string;
    images: string[];
    video: string;
    videos: string[];
    documents: string[];
    linkUrl: string;
};
