/**
 * @jest-environment jsdom
 */
import {
    LEGACY_GLOBAL_KEYS,
    PROTOCOL_DRAFT_PREFIX,
    clearAllUserStorage,
    clearOtherUsersStorage,
    clearUserStorage,
    getUserKey,
    readUserJson,
    writeUserJson,
} from "@/lib/browser-storage";

const PREFERENCES: Record<string, string> = {
    cnersh_lang: "fr",
    "cookie-consent-choice": "accepted",
    theme: "dark",
    "feed-unrelated-pref": "kept",
};

function seedPreferences() {
    for (const [key, value] of Object.entries(PREFERENCES)) {
        localStorage.setItem(key, value);
    }
}

function expectPreferencesIntact() {
    for (const [key, value] of Object.entries(PREFERENCES)) {
        expect(localStorage.getItem(key)).toBe(value);
    }
}

function seedUser(userId: string) {
    writeUserJson(userId, "feed:share-counts", { "post-1": 3 });
    writeUserJson(userId, "draft:note", { text: "x" });
    writeUserJson(userId, "user-data:profile", { a: 1 });
    localStorage.setItem(`${PROTOCOL_DRAFT_PREFIX}:${userId}`, "{\"title\":\"draft\"}");
}

function userKeys(userId: string): string[] {
    return Object.keys(localStorage).filter(
        (key) => key.includes(`:${userId}:`) || key === `${PROTOCOL_DRAFT_PREFIX}:${userId}`,
    );
}

describe("browser-storage", () => {
    beforeEach(() => localStorage.clear());

    describe("getUserKey", () => {
        it("namespaces the key and includes the user id", () => {
            expect(getUserKey("u1", "feed:share-counts")).toBe("cnersh:feed:u1:share-counts");
            expect(getUserKey("u1", "draft:note")).toBe("cnersh:draft:u1:note");
            expect(getUserKey("u1", "user-data:profile")).toBe("cnersh:user-data:u1:profile");
        });

        it("gives different users different keys", () => {
            expect(getUserKey("a", "feed:share-counts")).not.toBe(getUserKey("b", "feed:share-counts"));
        });

        it("rejects an empty user id or one containing ':'", () => {
            expect(() => getUserKey("", "feed:x")).toThrow();
            expect(() => getUserKey("a:b", "feed:x")).toThrow();
        });
    });

    describe("readUserJson / writeUserJson", () => {
        it("round-trips a value for a user", () => {
            writeUserJson("u1", "feed:share-counts", { "post-1": 2 });
            expect(readUserJson("u1", "feed:share-counts", {})).toEqual({ "post-1": 2 });
        });

        it("returns the fallback for a different user", () => {
            writeUserJson("u1", "feed:share-counts", { "post-1": 2 });
            expect(readUserJson("u2", "feed:share-counts", {})).toEqual({});
        });

        it("returns the fallback for corrupted JSON", () => {
            localStorage.setItem(getUserKey("u1", "feed:share-counts"), "not-json{{");
            expect(readUserJson("u1", "feed:share-counts", { ok: true })).toEqual({ ok: true });
        });

        it("does nothing for an invalid user id", () => {
            writeUserJson("", "feed:share-counts", { a: 1 });
            expect(localStorage.length).toBe(0);
            expect(readUserJson("", "feed:share-counts", "fallback")).toBe("fallback");
        });

        it("swallows storage failures", () => {
            const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
                throw new Error("QuotaExceededError");
            });
            expect(() => writeUserJson("u1", "feed:share-counts", {})).not.toThrow();
            spy.mockRestore();
        });
    });

    describe("clearUserStorage", () => {
        it("removes only that user's keys and keeps other users and preferences", () => {
            seedPreferences();
            seedUser("user-a");
            seedUser("user-b");

            clearUserStorage("user-a");

            expect(userKeys("user-a")).toEqual([]);
            expect(userKeys("user-b")).toHaveLength(4);
            expectPreferencesIntact();
        });

        it("removes the user's protocol draft", () => {
            seedUser("user-a");
            clearUserStorage("user-a");
            expect(localStorage.getItem(`${PROTOCOL_DRAFT_PREFIX}:user-a`)).toBeNull();
        });

        it("does not match a user id that merely starts with the same characters", () => {
            seedUser("user-1");
            seedUser("user-10");

            clearUserStorage("user-1");

            expect(userKeys("user-1")).toEqual([]);
            expect(userKeys("user-10")).toHaveLength(4);
        });

        it("is a no-op for an empty user id", () => {
            seedPreferences();
            seedUser("user-a");
            clearUserStorage("");
            expect(userKeys("user-a")).toHaveLength(4);
            expectPreferencesIntact();
        });
    });

    describe("clearAllUserStorage", () => {
        it("removes every user's keys and legacy global keys but not preferences", () => {
            seedPreferences();
            seedUser("user-a");
            seedUser("user-b");
            for (const key of LEGACY_GLOBAL_KEYS) localStorage.setItem(key, "{}");

            clearAllUserStorage();

            expect(userKeys("user-a")).toEqual([]);
            expect(userKeys("user-b")).toEqual([]);
            for (const key of LEGACY_GLOBAL_KEYS) expect(localStorage.getItem(key)).toBeNull();
            expectPreferencesIntact();
        });
    });

    describe("clearOtherUsersStorage", () => {
        it("keeps the signed-in user's data and removes everyone else's", () => {
            seedPreferences();
            seedUser("user-a");
            seedUser("user-b");

            clearOtherUsersStorage("user-b");

            expect(userKeys("user-a")).toEqual([]);
            expect(userKeys("user-b")).toHaveLength(4);
            expectPreferencesIntact();
        });

        it("removes the old global feed-share-counts key", () => {
            localStorage.setItem("feed-share-counts", JSON.stringify({ "post-1": 9 }));
            clearOtherUsersStorage("user-b");
            expect(localStorage.getItem("feed-share-counts")).toBeNull();
        });

        it("does not treat user-10's draft as user-1's when keeping user-1", () => {
            seedUser("user-1");
            seedUser("user-10");

            clearOtherUsersStorage("user-1");

            expect(userKeys("user-1")).toHaveLength(4);
            expect(userKeys("user-10")).toEqual([]);
        });

        it("is a no-op for an empty user id", () => {
            seedUser("user-a");
            clearOtherUsersStorage("");
            expect(userKeys("user-a")).toHaveLength(4);
        });
    });

    describe("user switch on one browser", () => {
        it("user B cannot read user A's share counts or draft after A signs out", () => {
            seedUser("user-a");
            clearUserStorage("user-a");

            expect(readUserJson("user-b", "feed:share-counts", {})).toEqual({});
            expect(localStorage.getItem(`${PROTOCOL_DRAFT_PREFIX}:user-b`)).toBeNull();
        });

        it("A's leftovers are purged when B signs in without A having signed out", () => {
            seedUser("user-a");
            clearOtherUsersStorage("user-b");
            expect(userKeys("user-a")).toEqual([]);
        });
    });
});