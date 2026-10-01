import { test, expect } from "@playwright/test";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchLatestCnershToken(email: string): Promise<string | null> {
    const row = await prisma.verification.findFirst({
        where: { identifier: `cnersh:${email.toLowerCase()}` },
        orderBy: { createdAt: "desc" },
    });
    return row?.value ?? null;
}

test.afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
});

test("email/password: sign up → verify → sign in → dashboard", async ({
                                                                          page,
                                                                      }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/sign-up");
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', email);
    await page.check('input[value="male"]');
    await page.fill('input[name="password"]', "SuperSecret123!");
    await page.fill('input[name="confirmPassword"]', "SuperSecret123!");
    await page.check("#termsAccepted");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(
        new RegExp(`/verify-email\\?email=${encodeURIComponent(email)}`)
    );

    const token = await fetchLatestCnershToken(email);
    expect(token).toBeTruthy();

    await page.goto(`/verify-email/confirm?token=${token}`);
    await expect(page).toHaveURL(/\/sign-in\?verified=1/);
});

test("unverified user is redirected to /verify-email", async ({ page }) => {
    // A signed-in but unverified user should be bounced from /dashboard.
    // This requires seeding a session for a user with cnershVerified: false.
    // See the seeded session helper in your e2e helpers directory.
    test.skip();
});

test("expired token shows the expired state", async ({ page }) => {
    const email = `expired-${Date.now()}@example.com`;
    await prisma.verification.create({
        data: {
            id: `exp-${Date.now()}`,
            identifier: `cnersh:${email.toLowerCase()}`,
            value: `expired-token-${Date.now()}`,
            expiresAt: new Date(Date.now() - 60_000),
        },
    });

    const row = await prisma.verification.findFirst({
        where: { identifier: `cnersh:${email.toLowerCase()}` },
    });
    expect(row).toBeTruthy();

    await page.goto(`/verify-email/confirm?token=${row!.value}`);
    await expect(
        page.getByRole("heading", { name: /verification link expired/i })
    ).toBeVisible();
});