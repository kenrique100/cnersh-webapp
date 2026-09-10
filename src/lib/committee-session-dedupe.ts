/**
 * Deterministic merge planning for duplicate committee sessions.
 *
 * Migration `20260909223000_unique_committee_session_schedule` adds a unique
 * index on ("sessionType", "sessionDate"). Databases written before that
 * migration may contain duplicate rows created by retried or racing calls to
 * `createCommitteeSession`, and the index cannot be created until they are
 * resolved.
 *
 * `CommitteeSession` has no dependent relations, so collapsing a duplicate
 * group cannot orphan child records. The planning below is intentionally
 * conservative: it merges only when the duplicates do not disagree, and it
 * reports a conflict for human resolution when they do. It performs no I/O so
 * it can be unit tested exhaustively.
 */

export type CommitteeSessionStatus =
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "POSTPONED";

export interface CommitteeSessionRow {
    id: string;
    sessionType: string;
    sessionDate: Date;
    venue: string | null;
    agenda: string[];
    status: CommitteeSessionStatus;
    quorumMet: boolean | null;
    minutes: string | null;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/** Fields that carry committee decisions and must never be merged blindly. */
const SUBSTANTIVE_FIELDS = ["status", "venue", "minutes", "notes", "quorumMet"] as const;

export type SubstantiveField = (typeof SUBSTANTIVE_FIELDS)[number];

export interface FieldConflict {
    field: SubstantiveField;
    values: Array<{ id: string; value: string | boolean }>;
}

export interface MergedValues {
    agenda: string[];
    venue: string | null;
    minutes: string | null;
    notes: string | null;
    quorumMet: boolean | null;
    status: CommitteeSessionStatus;
}

export interface DuplicateGroupPlan {
    /** Stable identifier for the duplicate group, e.g. `ORDINARY@2026-10-01T09:00:00.000Z`. */
    key: string;
    sessionType: string;
    sessionDate: Date;
    /** Row that will survive the merge. */
    keepId: string;
    /** Rows that will be deleted once their data is merged into the keeper. */
    deleteIds: string[];
    /** Values to write onto the keeper. */
    merged: MergedValues;
    /** Non-null disagreements between duplicates. Non-empty means manual review. */
    conflicts: FieldConflict[];
    /** True when the group can be merged automatically with no data loss. */
    autoResolvable: boolean;
}

export interface DedupePlan {
    totalRows: number;
    duplicateGroups: number;
    autoResolvable: DuplicateGroupPlan[];
    needsReview: DuplicateGroupPlan[];
    /** Rows deleted if the auto-resolvable groups are applied. */
    rowsRemoved: number;
}

function groupKey(row: Pick<CommitteeSessionRow, "sessionType" | "sessionDate">): string {
    return `${row.sessionType}@${row.sessionDate.toISOString()}`;
}

function isBlank(value: string | null | undefined): boolean {
    return value === null || value === undefined || value.trim() === "";
}

/**
 * Counts the committee data a row carries. Used only to choose which physical
 * row survives; no field value is ever discarded because of this score.
 */
function substanceScore(row: CommitteeSessionRow): number {
    let score = 0;
    if (!isBlank(row.venue)) score += 1;
    if (!isBlank(row.minutes)) score += 1;
    if (!isBlank(row.notes)) score += 1;
    if (row.quorumMet !== null) score += 1;
    if (row.agenda.length > 0) score += 1;
    return score;
}

/**
 * Deterministic keeper selection: richest row, then most recently updated,
 * then earliest created, then lowest id. Ordering never depends on the input
 * order, so a report and a later apply always agree.
 */
export function selectKeeper(rows: CommitteeSessionRow[]): CommitteeSessionRow {
    return [...rows].sort((a, b) => {
        const score = substanceScore(b) - substanceScore(a);
        if (score !== 0) return score;

        const updated = b.updatedAt.getTime() - a.updatedAt.getTime();
        if (updated !== 0) return updated;

        const created = a.createdAt.getTime() - b.createdAt.getTime();
        if (created !== 0) return created;

        return a.id.localeCompare(b.id);
    })[0];
}

/** Union of agenda entries, keeper order first, duplicates removed. */
function mergeAgenda(keeper: CommitteeSessionRow, rows: CommitteeSessionRow[]): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const row of [keeper, ...rows.filter((candidate) => candidate.id !== keeper.id)]) {
        for (const entry of row.agenda) {
            if (!seen.has(entry)) {
                seen.add(entry);
                merged.push(entry);
            }
        }
    }
    return merged;
}

function collectDistinct(
    rows: CommitteeSessionRow[],
    field: SubstantiveField,
): Array<{ id: string; value: string | boolean }> {
    const distinct: Array<{ id: string; value: string | boolean }> = [];
    const seen = new Set<string>();

    for (const row of rows) {
        const raw = row[field];
        if (raw === null || raw === undefined) continue;
        if (typeof raw === "string" && raw.trim() === "") continue;

        const value = typeof raw === "string" ? raw.trim() : raw;
        const fingerprint = String(value);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        distinct.push({ id: row.id, value });
    }

    return distinct;
}

/**
 * Plans one duplicate group. A field present on exactly one distinct value is
 * carried onto the keeper; a field with two different non-null values is a
 * conflict and the group is withheld from automatic resolution.
 */
export function planDuplicateGroup(rows: CommitteeSessionRow[]): DuplicateGroupPlan {
    if (rows.length === 0) {
        throw new Error("Cannot plan an empty duplicate group");
    }

    const keeper = selectKeeper(rows);
    const conflicts: FieldConflict[] = [];

    const resolveField = <T extends string | boolean>(field: SubstantiveField, fallback: T | null): T | null => {
        const distinct = collectDistinct(rows, field);
        if (distinct.length === 0) return fallback;
        if (distinct.length > 1) {
            conflicts.push({ field, values: distinct });
            const keeperValue = keeper[field];
            return (keeperValue === null || keeperValue === undefined ? distinct[0].value : keeperValue) as T;
        }
        return distinct[0].value as T;
    };

    const status = resolveField<CommitteeSessionStatus>("status", keeper.status) ?? keeper.status;
    const venue = resolveField<string>("venue", null);
    const minutes = resolveField<string>("minutes", null);
    const notes = resolveField<string>("notes", null);
    const quorumMet = resolveField<boolean>("quorumMet", null);

    return {
        key: groupKey(keeper),
        sessionType: keeper.sessionType,
        sessionDate: keeper.sessionDate,
        keepId: keeper.id,
        deleteIds: rows
            .filter((row) => row.id !== keeper.id)
            .map((row) => row.id)
            .sort(),
        merged: {
            agenda: mergeAgenda(keeper, rows),
            venue,
            minutes,
            notes,
            quorumMet,
            status,
        },
        // Ordered by declaration so report output is stable across runs.
        conflicts: [...conflicts].sort(
            (a, b) => SUBSTANTIVE_FIELDS.indexOf(a.field) - SUBSTANTIVE_FIELDS.indexOf(b.field),
        ),
        autoResolvable: conflicts.length === 0,
    };
}

/**
 * Builds the full resolution plan for a table snapshot. Groups with a single
 * row are ignored because they do not block the unique index.
 */
export function planDeduplication(rows: CommitteeSessionRow[]): DedupePlan {
    const groups = new Map<string, CommitteeSessionRow[]>();
    for (const row of rows) {
        const key = groupKey(row);
        const bucket = groups.get(key);
        if (bucket) bucket.push(row);
        else groups.set(key, [row]);
    }

    const autoResolvable: DuplicateGroupPlan[] = [];
    const needsReview: DuplicateGroupPlan[] = [];

    for (const bucket of groups.values()) {
        if (bucket.length < 2) continue;
        const plan = planDuplicateGroup(bucket);
        if (plan.autoResolvable) autoResolvable.push(plan);
        else needsReview.push(plan);
    }

    const byKey = (a: DuplicateGroupPlan, b: DuplicateGroupPlan) => a.key.localeCompare(b.key);
    autoResolvable.sort(byKey);
    needsReview.sort(byKey);

    return {
        totalRows: rows.length,
        duplicateGroups: autoResolvable.length + needsReview.length,
        autoResolvable,
        needsReview,
        rowsRemoved: autoResolvable.reduce((sum, plan) => sum + plan.deleteIds.length, 0),
    };
}

/** Human-readable summary for the report and for apply-mode output. */
export function formatPlan(plan: DedupePlan): string {
    const lines: string[] = [];
    lines.push(`Committee sessions inspected: ${plan.totalRows}`);
    lines.push(`Duplicate groups: ${plan.duplicateGroups}`);
    lines.push(`Auto-resolvable groups: ${plan.autoResolvable.length} (removes ${plan.rowsRemoved} rows)`);
    lines.push(`Groups needing manual review: ${plan.needsReview.length}`);

    for (const group of plan.autoResolvable) {
        lines.push("");
        lines.push(`[auto] ${group.key}`);
        lines.push(`  keep   ${group.keepId}`);
        lines.push(`  delete ${group.deleteIds.join(", ")}`);
        lines.push(`  agenda entries after merge: ${group.merged.agenda.length}`);
    }

    for (const group of plan.needsReview) {
        lines.push("");
        lines.push(`[review] ${group.key}`);
        lines.push(`  candidate keeper ${group.keepId}`);
        lines.push(`  duplicates ${group.deleteIds.join(", ")}`);
        for (const conflict of group.conflicts) {
            const rendered = conflict.values.map((entry) => `${entry.id}=${String(entry.value)}`).join(" | ");
            lines.push(`  conflict on ${conflict.field}: ${rendered}`);
        }
    }

    return lines.join("\n");
}
