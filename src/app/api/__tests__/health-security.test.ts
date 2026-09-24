/**
 * @jest-environment node
 *
 * Security and correctness tests for /api/health.
 *
 * The Jest configuration maps next/server to src/__mocks__/next/server.ts.
 * That mock must implement NextResponse.json(), text(), and json().
 */

import { GET as health } from "@/app/api/health/route";
import { db, uploadthingEnvSchema } from "@/lib/db";

jest.mock("@/lib/db", () => ({
    db: {
        $queryRaw: jest.fn(),
    },
    uploadthingEnvSchema: {
        safeParse: jest.fn(),
    },
}));

const mockedDb = db as unknown as {
    $queryRaw: jest.Mock;
};

const mockedSchema = uploadthingEnvSchema as unknown as {
    safeParse: jest.Mock;
};

type HealthBody = {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    checks: {
        database: "up" | "down";
        storage: "configured" | "misconfigured";
        responseTime: string;
    };
    uptime: number;
    version: string;
    errors?: Partial<Record<"database" | "storage", string>>;
};

async function getHealthBody(): Promise<{
    response: Awaited<ReturnType<typeof health>>;
    body: HealthBody;
}> {
    const response = await health();
    const body = (await response.json()) as HealthBody;

    return { response, body };
}

describe("GET /api/health", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        mockedDb.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
        mockedSchema.safeParse.mockReturnValue({
            success: true,
            data: {},
        });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("returns 200 and healthy when database and storage are available", async () => {
        const { response, body } = await getHealthBody();

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(response.headers.get("content-type")).toContain("application/json");

        expect(body.status).toBe("healthy");
        expect(body.checks.database).toBe("up");
        expect(body.checks.storage).toBe("configured");
        expect(body.errors).toBeUndefined();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("returns a valid timestamp, uptime, version, and response-time value", async () => {
        const { body } = await getHealthBody();

        expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
        expect(body.checks.responseTime).toMatch(/^\d+ms$/);
        expect(typeof body.uptime).toBe("number");
        expect(body.uptime).toBeGreaterThanOrEqual(0);
        expect(typeof body.version).toBe("string");
        expect(body.version.length).toBeGreaterThan(0);
    });

    it("runs SELECT 1 for the database health check", async () => {
        await health();

        expect(mockedDb.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns 503 and unhealthy when the database check fails", async () => {
        const databaseError = new Error("connection refused");
        mockedDb.$queryRaw.mockRejectedValueOnce(databaseError);

        const { response, body } = await getHealthBody();

        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(body.status).toBe("unhealthy");
        expect(body.checks.database).toBe("down");
        expect(body.checks.storage).toBe("configured");
        expect(body.errors).toEqual({
            database: "connection refused",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[health] database check failed:",
            databaseError
        );
    });

    it("uses Unknown error when the database rejects with a non-Error value", async () => {
        mockedDb.$queryRaw.mockRejectedValueOnce("string failure");

        const { response, body } = await getHealthBody();

        expect(response.status).toBe(503);
        expect(body.status).toBe("unhealthy");
        expect(body.errors).toEqual({
            database: "Unknown error",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[health] database check failed:",
            "string failure"
        );
    });

    it("returns 503 and degraded when only storage is misconfigured", async () => {
        mockedSchema.safeParse.mockReturnValueOnce({
            success: false,
            error: {
                issues: [
                    {
                        message:
                            "UPLOADTHING_TOKEN must be a JWT starting with eyJ",
                    },
                ],
            },
        });

        const { response, body } = await getHealthBody();

        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(body.status).toBe("degraded");
        expect(body.checks.database).toBe("up");
        expect(body.checks.storage).toBe("misconfigured");
        expect(body.errors).toEqual({
            storage: "UPLOADTHING_TOKEN must be a JWT starting with eyJ",
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[health] storage check failed:",
            "UPLOADTHING_TOKEN must be a JWT starting with eyJ"
        );
    });

    it("joins multiple storage schema issues into one message", async () => {
        mockedSchema.safeParse.mockReturnValueOnce({
            success: false,
            error: {
                issues: [
                    { message: "UPLOADTHING_TOKEN is required" },
                    { message: "UPLOADTHING_TOKEN must start with eyJ" },
                ],
            },
        });

        const { body } = await getHealthBody();

        expect(body.errors?.storage).toBe(
            "UPLOADTHING_TOKEN is required; UPLOADTHING_TOKEN must start with eyJ"
        );
    });

    it("runs the storage check even if the database check fails", async () => {
        const databaseError = new Error("db down");
        mockedDb.$queryRaw.mockRejectedValueOnce(databaseError);
        mockedSchema.safeParse.mockReturnValueOnce({
            success: false,
            error: {
                issues: [{ message: "missing token" }],
            },
        });

        const { response, body } = await getHealthBody();

        expect(response.status).toBe(503);
        expect(body.status).toBe("unhealthy");
        expect(body.checks.database).toBe("down");
        expect(body.checks.storage).toBe("misconfigured");
        expect(body.errors).toEqual({
            database: "db down",
        });
        expect(mockedSchema.safeParse).toHaveBeenCalledTimes(1);
    });

    it("passes the raw UPLOADTHING_TOKEN value to the storage schema", async () => {
        const previousToken = process.env.UPLOADTHING_TOKEN;
        process.env.UPLOADTHING_TOKEN = "eyJtest.payload.signature";

        try {
            await health();

            expect(mockedSchema.safeParse).toHaveBeenCalledWith({
                UPLOADTHING_TOKEN: "eyJtest.payload.signature",
            });
        } finally {
            if (previousToken === undefined) {
                delete process.env.UPLOADTHING_TOKEN;
            } else {
                process.env.UPLOADTHING_TOKEN = previousToken;
            }
        }
    });

    it("passes undefined when UPLOADTHING_TOKEN is absent", async () => {
        const previousToken = process.env.UPLOADTHING_TOKEN;
        delete process.env.UPLOADTHING_TOKEN;

        try {
            await health();

            expect(mockedSchema.safeParse).toHaveBeenCalledWith({
                UPLOADTHING_TOKEN: undefined,
            });
        } finally {
            if (previousToken !== undefined) {
                process.env.UPLOADTHING_TOKEN = previousToken;
            }
        }
    });
});