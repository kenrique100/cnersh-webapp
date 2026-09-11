/**
 * One-time backfill: seal plaintext File.data and Project.formData rows under
 * their owner's per-user key so that existing accounts get the same erasure
 * guarantees as new ones.
 *
 *   npm run erasure:encrypt-existing            # report only
 *   npm run erasure:encrypt-existing -- --apply # seal rows in batches
 *
 * Idempotent: rows that are already sealed are skipped. Each row is updated
 * with an optimistic guard so a concurrent edit is never overwritten.
 */
// Load .env before anything imports the database client (import order matters).
import "dotenv/config";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { loadErasureConfig } from "@/lib/erasure/config";
import { isEncryptedValue } from "@/lib/erasure/crypto";
import { isErasedFormData, isSealedFormData, sealFileData, sealProjectFormData } from "@/lib/erasure/fields";

import { flagValue, hasFlag, run } from "./erasure-lib";

const BATCH = Number(flagValue("--batch") ?? 200);

run(async () => {
    loadErasureConfig();
    const apply = hasFlag("--apply");

    // Project.formData
    let formDataSealed = 0;
    let formDataPending = 0;
    let cursor: string | undefined;
    for (;;) {
        const projects = await db.project.findMany({
            where: { formData: { not: Prisma.DbNull }, user: { erasedAt: null } },
            select: { id: true, userId: true, formData: true, updatedAt: true },
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (projects.length === 0) break;
        cursor = projects[projects.length - 1].id;
        for (const project of projects) {
            if (
                project.formData === null ||
                typeof project.formData !== "object" ||
                isSealedFormData(project.formData) ||
                isErasedFormData(project.formData)
            )
                continue;
            formDataPending += 1;
            if (!apply) continue;
            const sealed = await sealProjectFormData(project.userId, project.formData as Record<string, unknown>);
            const result = await db.project.updateMany({
                where: { id: project.id, updatedAt: project.updatedAt },
                data: { formData: sealed as Prisma.InputJsonValue },
            });
            if (result.count === 1) formDataSealed += 1;
        }
    }

    // File.data (legacy inline content)
    let fileSealed = 0;
    let filePending = 0;
    cursor = undefined;
    for (;;) {
        const files: Array<{ id: string; userId: string; data: string | null }> = await db.file.findMany({
            where: { data: { not: null }, user: { erasedAt: null } },
            select: { id: true, userId: true, data: true },
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (files.length === 0) break;
        cursor = files[files.length - 1].id;
        for (const file of files) {
            if (!file.data || isEncryptedValue(file.data)) continue;
            filePending += 1;
            if (!apply) continue;
            const sealed = await sealFileData(file.userId, file.data);
            const result = await db.file.updateMany({ where: { id: file.id, data: file.data }, data: { data: sealed } });
            if (result.count === 1) fileSealed += 1;
        }
    }

    console.log(`Project.formData plaintext rows: ${formDataPending}${apply ? `, sealed now: ${formDataSealed}` : ""}`);
    console.log(`File.data plaintext rows: ${filePending}${apply ? `, sealed now: ${fileSealed}` : ""}`);
    if (!apply && formDataPending + filePending > 0) console.log("\nRun with --apply to seal these rows.");
    return 0;
});
