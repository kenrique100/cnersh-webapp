// src/__mocks__/next/server.ts

export class NextRequest {
    url: string;
    headers: Headers;
    cookies: Map<string, string>;

    constructor(url: string, init?: RequestInit) {
        this.url = url;
        this.headers = new Headers(init?.headers);
        this.cookies = new Map();
    }
}

export class NextResponse {
    readonly headers: Headers;
    readonly status: number;
    readonly body: BodyInit | null;

    constructor(body: BodyInit | null = null, init: ResponseInit = {}) {
        this.body = body;
        this.status = init.status ?? 200;
        this.headers = new Headers(init.headers);
    }

    static json(body: unknown, init: ResponseInit = {}): NextResponse {
        const headers = new Headers(init.headers);

        if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
        }

        return new NextResponse(JSON.stringify(body), {
            ...init,
            headers,
        });
    }

    static redirect(url: string | URL, init: number | ResponseInit = 307): NextResponse {
        const responseInit: ResponseInit =
            typeof init === "number" ? { status: init } : init;
        const headers = new Headers(responseInit.headers);

        headers.set("location", String(url));

        return new NextResponse(null, {
            ...responseInit,
            status: responseInit.status ?? 307,
            headers,
        });
    }

    static next(): NextResponse {
        return new NextResponse(null, { status: 200 });
    }

    async text(): Promise<string> {
        if (this.body === null) {
            return "";
        }

        if (typeof this.body === "string") {
            return this.body;
        }

        if (this.body instanceof Uint8Array) {
            return new TextDecoder().decode(this.body);
        }

        if (typeof Blob !== "undefined" && this.body instanceof Blob) {
            return this.body.text();
        }

        return String(this.body);
    }

    async json(): Promise<unknown> {
        return JSON.parse(await this.text()) as unknown;
    }
}

export function cookies() {
    return {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        getAll: jest.fn(() => []),
        has: jest.fn(),
    };
}

export function headers() {
    return {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        forEach: jest.fn(),
    };
}