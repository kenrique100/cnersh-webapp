"use client";

import React from "react";

import { clearOtherUsersStorage } from "@/lib/browser-storage";

/**
 * Renders nothing. While a user is signed in, removes user-scoped browser data
 * left behind by anyone else (or by an older release's global keys). Covers
 * the cases a sign-out handler cannot: an expired session, a closed browser,
 * or a Google sign-in redirect.
 */
export default function UserStorageGuard({ userId }: { userId: string }) {
    React.useEffect(() => {
        clearOtherUsersStorage(userId);
    }, [userId]);

    return null;
}