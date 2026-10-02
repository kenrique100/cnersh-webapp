export const CACHE_TAGS = {
    PAGES: "pages",
    notificationCount: (userId: string) => `notifications:${userId}`,
} as const;