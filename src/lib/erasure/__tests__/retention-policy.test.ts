import {
    isRetainedProjectStatus,
    isTombstoneEmail,
    RETENTION_POLICY,
    TOMBSTONE_BAN_REASON,
    TOMBSTONE_NAME,
    tombstoneEmail,
    tombstoneUserFields,
} from "@/lib/erasure/retention-policy";

describe("retention policy", () => {
    it("retains every submitted protocol status and deletes only drafts", () => {
        expect(isRetainedProjectStatus("DRAFT")).toBe(false);
        for (const status of ["SUBMITTED", "RETURNED_INCOMPLETE", "PENDING_REVIEW", "UNDER_REVIEW", "REVIEW_COMPLETE", "APPROVED", "APPROVED_WITH_CONDITIONS", "RESUBMIT", "UNDER_APPEAL", "APPEAL_RESOLVED"] as const) {
            expect(isRetainedProjectStatus(status)).toBe(true);
        }
    });

    it("documents a rule for every personal-data surface", () => {
        const records = RETENTION_POLICY.map((rule) => rule.record);
        for (const expected of ["User row", "Session", "Files", "Posts", "Protocols in DRAFT", "Protocols after submission", "Audit log"]) {
            expect(records.some((r) => r.startsWith(expected))).toBe(true);
        }
        for (const rule of RETENTION_POLICY) {
            expect(rule.rationale.length).toBeGreaterThan(10);
            expect(["DELETE", "SCRUB", "RETAIN_PSEUDONYMISED", "RETAIN_REKEYED"]).toContain(rule.action);
        }
    });

    it("produces a tombstone that carries no personal data and blocks sign-in", () => {
        const erasedAt = new Date("2026-09-11T00:00:00Z");
        const fields = tombstoneUserFields("user-1", erasedAt);
        expect(fields.name).toBe(TOMBSTONE_NAME);
        expect(fields.email).toBe(tombstoneEmail("user-1"));
        expect(isTombstoneEmail(fields.email)).toBe(true);
        expect(isTombstoneEmail("someone@example.org")).toBe(false);
        expect(fields.image).toBeNull();
        expect(fields.bio).toBeNull();
        expect(fields.banned).toBe(true);
        expect(fields.banReason).toBe(TOMBSTONE_BAN_REASON);
        expect(fields.erasedAt).toBe(erasedAt);
    });
});
