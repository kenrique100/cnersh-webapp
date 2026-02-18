import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

async function main() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL or DIRECT_URL must be set in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const adminEmail = process.env.ADMIN_EMAIL || "admin@cnec.cm";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@CNERSH2026";
    const adminName = process.env.ADMIN_NAME || "CNERSH Admin";

    console.log("🌱 Seeding database...\n");

    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingUser) {
        // Ensure the existing user has admin role
        if (existingUser.role !== "admin") {
            await prisma.user.update({
                where: { email: adminEmail },
                data: { role: "admin" },
            });
            console.log(`✅ Existing user ${adminEmail} promoted to admin role`);
        } else {
            console.log(`ℹ️  Admin user ${adminEmail} already exists`);
        }
    } else {
        // Create admin user + account with hashed password
        const userId = randomUUID();
        const accountId = randomUUID();
        const hashedPassword = await hashPassword(adminPassword);

        await prisma.user.create({
            data: {
                id: userId,
                email: adminEmail,
                name: adminName,
                role: "admin",
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

        console.log(`✅ Admin user created successfully!`);
        console.log(`   Email:    ${adminEmail}`);
        console.log(`   Role:     admin`);
    }

    console.log("\n🌱 Seeding complete!");

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
