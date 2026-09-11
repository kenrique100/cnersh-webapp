/**
 * Shared bootstrap for the erasure scripts. Loads `.env` (like prisma.config.ts),
 * points the shared Prisma client at DIRECT_URL when configured, and exposes a
 * tidy shutdown helper.
 */
import "dotenv/config";

import { db } from "@/lib/db";
import { closeErasureStore } from "@/lib/erasure/store";

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Set ${name} before running this script`);
    return value;
}

export function connectionString(): string {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL before running this script");
    return url;
}

export function hasFlag(flag: string): boolean {
    return process.argv.includes(flag);
}

export function flagValue(flag: string): string | undefined {
    const index = process.argv.indexOf(flag);
    if (index === -1) return undefined;
    return process.argv[index + 1];
}

export async function shutdown(): Promise<void> {
    await Promise.allSettled([db.$disconnect(), closeErasureStore()]);
}

export function run(main: () => Promise<number | void>): void {
    main()
        .then(async (code) => {
            await shutdown();
            process.exit(code ?? 0);
        })
        .catch(async (error) => {
            console.error(error);
            await shutdown();
            process.exit(1);
        });
}
