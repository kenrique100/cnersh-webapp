import {
    type CommitteeSessionRow,
    formatPlan,
    planDeduplication,
    planDuplicateGroup,
    selectKeeper,
} from "@/lib/committee-session-dedupe";

const BASE_DATE = new Date("2026-10-01T09:00:00.000Z");

function row(overrides: Partial<CommitteeSessionRow> & { id: string }): CommitteeSessionRow {
    return {
        sessionType: "ORDINARY",
        sessionDate: BASE_DATE,
        venue: null,
        agenda: [],
        status: "SCHEDULED",
        quorumMet: null,
        minutes: null,
        notes: null,
        createdBy: "admin-1",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-09-01T00:00:00.000Z"),
        ...overrides,
    };
}

describe("planDeduplication", () => {
    it("ignores rows that do not collide on sessionType and sessionDate", () => {
        const plan = planDeduplication([
            row({ id: "a" }),
            row({ id: "b", sessionDate: new Date("2026-10-02T09:00:00.000Z") }),
            row({ id: "c", sessionType: "EXTRAORDINARY" }),
        ]);

        expect(plan.totalRows).toBe(3);
        expect(plan.duplicateGroups).toBe(0);
        expect(plan.rowsRemoved).toBe(0);
    });

    it("treats identical empty duplicates as auto-resolvable", () => {
        const plan = planDeduplication([row({ id: "a" }), row({ id: "b" })]);

        expect(plan.duplicateGroups).toBe(1);
        expect(plan.autoResolvable).toHaveLength(1);
        expect(plan.needsReview).toHaveLength(0);
        expect(plan.rowsRemoved).toBe(1);
    });

    it("counts every removed row across multiple duplicate groups", () => {
        const plan = planDeduplication([
            row({ id: "a" }),
            row({ id: "b" }),
            row({ id: "c" }),
            row({ id: "d", sessionType: "EXTRAORDINARY" }),
            row({ id: "e", sessionType: "EXTRAORDINARY" }),
        ]);

        expect(plan.duplicateGroups).toBe(2);
        expect(plan.rowsRemoved).toBe(3);
    });

    it("separates conflicting groups from auto-resolvable ones", () => {
        const plan = planDeduplication([
            row({ id: "a", venue: "Room A" }),
            row({ id: "b" }),
            row({ id: "c", sessionType: "EXTRAORDINARY", minutes: "Approved" }),
            row({ id: "d", sessionType: "EXTRAORDINARY", minutes: "Rejected" }),
        ]);

        expect(plan.autoResolvable.map((group) => group.sessionType)).toEqual(["ORDINARY"]);
        expect(plan.needsReview.map((group) => group.sessionType)).toEqual(["EXTRAORDINARY"]);
        // Conflicting rows are never counted as removable.
        expect(plan.rowsRemoved).toBe(1);
    });
});

describe("planDuplicateGroup keeper selection", () => {
    it("keeps the row carrying the most committee data", () => {
        const plan = planDuplicateGroup([
            row({ id: "sparse" }),
            row({ id: "rich", venue: "Room A", minutes: "Signed", quorumMet: true }),
        ]);

        expect(plan.keepId).toBe("rich");
        expect(plan.deleteIds).toEqual(["sparse"]);
    });

    it("breaks ties on recency, then creation, then id", () => {
        const older = row({ id: "older", updatedAt: new Date("2026-09-02T00:00:00.000Z") });
        const newer = row({ id: "newer", updatedAt: new Date("2026-09-05T00:00:00.000Z") });
        expect(selectKeeper([older, newer]).id).toBe("newer");

        const early = row({ id: "early", createdAt: new Date("2026-08-01T00:00:00.000Z") });
        const late = row({ id: "late", createdAt: new Date("2026-08-09T00:00:00.000Z") });
        expect(selectKeeper([late, early]).id).toBe("early");

        expect(selectKeeper([row({ id: "b2" }), row({ id: "a1" })]).id).toBe("a1");
    });

    it("produces the same plan regardless of input order", () => {
        const rows = [
            row({ id: "a", venue: "Room A" }),
            row({ id: "b", agenda: ["p2"] }),
            row({ id: "c" }),
        ];

        const forward = planDuplicateGroup(rows);
        const reversed = planDuplicateGroup([...rows].reverse());

        expect(reversed.keepId).toBe(forward.keepId);
        expect(reversed.deleteIds).toEqual(forward.deleteIds);
        expect(reversed.merged.venue).toBe(forward.merged.venue);
    });

    it("rejects an empty group", () => {
        expect(() => planDuplicateGroup([])).toThrow("Cannot plan an empty duplicate group");
    });
});

describe("planDuplicateGroup merging", () => {
    it("unions agenda entries with the keeper first and no duplicates", () => {
        const plan = planDuplicateGroup([
            row({ id: "keeper", venue: "Room A", agenda: ["p1", "p2"] }),
            row({ id: "other", agenda: ["p2", "p3"] }),
        ]);

        expect(plan.keepId).toBe("keeper");
        expect(plan.merged.agenda).toEqual(["p1", "p2", "p3"]);
    });

    it("carries a value that exists on only one duplicate onto the keeper", () => {
        const plan = planDuplicateGroup([
            row({ id: "keeper", venue: "Room A", minutes: "Signed" }),
            row({ id: "other", notes: "Rescheduled from September", quorumMet: true }),
        ]);

        expect(plan.autoResolvable).toBe(true);
        expect(plan.merged).toMatchObject({
            venue: "Room A",
            minutes: "Signed",
            notes: "Rescheduled from September",
            quorumMet: true,
        });
    });

    it("does not treat blank strings as competing values", () => {
        const plan = planDuplicateGroup([
            row({ id: "keeper", venue: "Room A" }),
            row({ id: "other", venue: "   " }),
        ]);

        expect(plan.autoResolvable).toBe(true);
        expect(plan.merged.venue).toBe("Room A");
        expect(plan.conflicts).toHaveLength(0);
    });

    it("treats equal values on both rows as agreement", () => {
        const plan = planDuplicateGroup([
            row({ id: "a", venue: "Room A", status: "COMPLETED" }),
            row({ id: "b", venue: "Room A", status: "COMPLETED" }),
        ]);

        expect(plan.autoResolvable).toBe(true);
        expect(plan.merged.status).toBe("COMPLETED");
    });

    it("flags a conflict when duplicates disagree on status", () => {
        const plan = planDuplicateGroup([
            row({ id: "a", status: "COMPLETED" }),
            row({ id: "b", status: "CANCELLED" }),
        ]);

        expect(plan.autoResolvable).toBe(false);
        expect(plan.conflicts).toEqual([
            {
                field: "status",
                values: [
                    { id: "a", value: "COMPLETED" },
                    { id: "b", value: "CANCELLED" },
                ],
            },
        ]);
    });

    it("flags a conflict when duplicates disagree on quorum", () => {
        const plan = planDuplicateGroup([
            row({ id: "a", quorumMet: true }),
            row({ id: "b", quorumMet: false }),
        ]);

        expect(plan.autoResolvable).toBe(false);
        expect(plan.conflicts[0].field).toBe("quorumMet");
    });

    it("reports every conflicting field, not just the first", () => {
        const plan = planDuplicateGroup([
            row({ id: "a", venue: "Room A", minutes: "Signed", notes: "First" }),
            row({ id: "b", venue: "Room B", minutes: "Draft", notes: "Second" }),
        ]);

        expect(plan.conflicts.map((conflict) => conflict.field).sort()).toEqual([
            "minutes",
            "notes",
            "venue",
        ]);
    });

    it("orders conflicts consistently rather than by discovery", () => {
        const plan = planDuplicateGroup([
            row({ id: "a", status: "COMPLETED", venue: "Room A", quorumMet: true, notes: "First" }),
            row({ id: "b", status: "CANCELLED", venue: "Room B", quorumMet: false, notes: "Second" }),
        ]);

        expect(plan.conflicts.map((conflict) => conflict.field)).toEqual([
            "status",
            "venue",
            "notes",
            "quorumMet",
        ]);
    });
});

describe("formatPlan", () => {
    it("summarises auto-resolvable and reviewable groups", () => {
        const plan = planDeduplication([
            row({ id: "a", venue: "Room A" }),
            row({ id: "b" }),
            row({ id: "c", sessionType: "EXTRAORDINARY", minutes: "Approved" }),
            row({ id: "d", sessionType: "EXTRAORDINARY", minutes: "Rejected" }),
        ]);

        const output = formatPlan(plan);

        expect(output).toContain("Duplicate groups: 2");
        expect(output).toContain("Auto-resolvable groups: 1 (removes 1 rows)");
        expect(output).toContain("Groups needing manual review: 1");
        expect(output).toContain("conflict on minutes");
    });
});
