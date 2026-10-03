import "dotenv/config";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

type SeedRole = "superadmin" | "admin";

async function upsertUser(
    prisma: PrismaClient,
    opts: {
        email: string;
        password: string;
        name: string;
        role: SeedRole;
    }
) {
    const normalizedEmail = opts.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });

    if (existing) {
        const updated = await prisma.user.update({
            where: {
                id: existing.id,
            },
            data: {
                name: opts.name,
                role: opts.role,

                // Seeded privileged accounts are already verified.
                emailVerified: true,
                cnershVerified: true,

                // Make sure a seeded administrative account is usable.
                banned: false,
                banReason: null,
                banExpires: null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
                cnershVerified: true,
                banned: true,
            },
        });

        console.log(
            `Updated ${updated.role} user: ${updated.email} ` +
            `(emailVerified=${updated.emailVerified}, ` +
            `cnershVerified=${updated.cnershVerified})`
        );

        return;
    }

    const userId = randomUUID();
    const accountId = randomUUID();

    const hashedPassword = await hashPassword(opts.password);

    const user = await prisma.user.create({
        data: {
            id: userId,
            email: normalizedEmail,
            name: opts.name,
            role: opts.role,

            // Administrative seed accounts are already verified.
            emailVerified: true,
            cnershVerified: true,

            // Administrative seed accounts are active.
            banned: false,
            banReason: null,
            banExpires: null,
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            cnershVerified: true,
            banned: true,
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

    console.log(
        `${user.role} created: ${user.email} ` +
        `(emailVerified=${user.emailVerified}, ` +
        `cnershVerified=${user.cnershVerified})`
    );
}

async function main() {
    const connectionString =
        process.env.DIRECT_URL ||
        process.env.DATABASE_URL;

    if (!connectionString) {
        console.error(
            "DATABASE_URL or DIRECT_URL must be set in .env"
        );
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
    });

    const adapter = new PrismaPg(pool);

    const prisma = new PrismaClient({
        adapter,
    });

    try {
        console.log("Seeding database...\n");

        const required = [
            "SUPER_ADMIN_EMAIL",
            "SUPER_ADMIN_PASSWORD",
            "ADMIN_EMAIL",
            "ADMIN_PASSWORD",
        ];

        for (const key of required) {
            if (!process.env[key]) {
                console.error(`Missing ${key} in .env`);
                process.exit(1);
            }
        }

        await upsertUser(prisma, {
            email: process.env.SUPER_ADMIN_EMAIL!,
            password: process.env.SUPER_ADMIN_PASSWORD!,
            name:
                process.env.SUPER_ADMIN_NAME ||
                "Super Admin",
            role: "superadmin",
        });

        await upsertUser(prisma, {
            email: process.env.ADMIN_EMAIL!,
            password: process.env.ADMIN_PASSWORD!,
            name:
                process.env.ADMIN_NAME ||
                "Admin User",
            role: "admin",
        });

        console.log("\nSeeding complete!");
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main().catch((error) => {
    console.error("Unhandled seed error:", error);
    process.exit(1);
});