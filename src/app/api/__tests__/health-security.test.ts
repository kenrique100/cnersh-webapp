/**
 * @jest-environment node
 */

import { db } from "@/lib/db";
import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";
import { GET as cronHealth } from "@/app/api/cron/health-check/route";

jest.mock("@/lib/db", () => ({
    db: {
        $queryRaw: jest.fn(),
        session: {
            deleteMany: jest.fn(),
        },
    },
}));

jest.mock("@sentry/nextjs", () => ({
    withMonitor: jest.fn(async (_slug: string, callback: () => unknown) => callback()),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    logger: { info: jest.fn() },
}));

const mockedDb = db as jest.Mocked<typeof db>;

describe("health endpoint failure behavior", () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = originalCronSecret;
    });

    it("fails closed when the cron secret is not configured", async () => {
        delete process.env.CRON_SECRET;
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

        const response = await cronHealth(new Request("https://app.example/api/cron/health-check"));

        expect(response.status).toBe(503);
        expect(mockedDb.$queryRaw).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it("rejects an invalid cron bearer token", async () => {
        process.env.CRON_SECRET = "expected-secret";

        const response = await cronHealth(new Request(
            "https://app.example/api/cron/health-check",
            { headers: { Authorization: "Bearer wrong-secret" } },
        ));

        expect(response.status).toBe(401);
        expect(mockedDb.$queryRaw).not.toHaveBeenCalled();
    });

    it("reports database health failures with a no-store response", async () => {
        (mockedDb.$queryRaw as jest.Mock).mockRejectedValueOnce(
            new Error("postgresql://user:secret@db/internal"),
        );
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

        const response = await health();

        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        consoleError.mockRestore();
    });

    it("reports readiness failures with a no-store response", async () => {
        (mockedDb.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error("database down"));

        const response = await ready();

        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });
});
