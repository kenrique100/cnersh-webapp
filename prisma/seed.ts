import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

async function upsertUser(
    prisma: PrismaClient,
    opts: {
        email: string;
        password: string;
        name: string;
        role: "superadmin" | "admin";
    }
) {
    const existing = await prisma.user.findUnique({ where: { email: opts.email } });

    if (existing) {
        if (existing.role !== opts.role) {
            await prisma.user.update({
                where: { email: opts.email },
                data: { role: opts.role },
            });
            console.log(`✅ Existing user ${opts.email} updated to role: ${opts.role}`);
        } else {
            console.log(`ℹ️  User ${opts.email} already exists with role: ${opts.role}`);
        }
        return;
    }

    const userId = randomUUID();
    const accountId = randomUUID();
    const hashedPassword = await hashPassword(opts.password);

    await prisma.user.create({
        data: {
            id: userId,
            email: opts.email,
            name: opts.name,
            role: opts.role,
            emailVerified: true,
        },
    });

    await prisma.account.create({
        data: {
            id: accountId,
            accountId: userId,
            providerId: "credential",
            userId: userId,
            password: hashedPassword,
        },
    });

    console.log(`✅ ${opts.role} created successfully!`);
    console.log(`   Email:    ${opts.email}`);
    console.log(`   Role:     ${opts.role}`);
}

async function main() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL or DIRECT_URL must be set in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log("🌱 Seeding database...\n");

    // ── Super Admin ───────────────────────────────────────────────────────────
    await upsertUser(prisma, {
        email: process.env.SUPER_ADMIN_EMAIL || "superadmin@cnersh.cm",
        password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@cnersh2026!",
        name: process.env.SUPER_ADMIN_NAME || "CNERSH Super Admin",
        role: "superadmin",
    });

    // ── Admin ─────────────────────────────────────────────────────────────────
    await upsertUser(prisma, {
        email: process.env.ADMIN_EMAIL || "admin@cnersh.cm",
        password: process.env.ADMIN_PASSWORD || "Admin@cnersh2026!",
        name: process.env.ADMIN_NAME || "CNERSH Admin",
        role: "admin",
    });

    console.log("\n🌱 Seeding complete!");

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
