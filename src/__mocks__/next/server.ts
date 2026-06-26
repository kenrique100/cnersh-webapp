
// NextRequest mock – extend as needed
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

// NextResponse mock
export class NextResponse {
    headers: Headers;
    status: number;

    constructor(body?: unknown, init?: ResponseInit) {
        this.headers = new Headers(init?.headers as HeadersInit | undefined);
        this.status = init?.status ?? 200;
    }

    static json(body: unknown, init?: ResponseInit) {
        return new NextResponse(JSON.stringify(body), {
            ...init,
            headers: { 'content-type': 'application/json', ...(init?.headers as Record<string, string>) },
        });
    }

    static redirect(url: string, status = 307) {
        return new NextResponse(null, { status, headers: { Location: url } });
    }

    static next() {
        return new NextResponse(null, { status: 200 });
    }
}

// If you ever import these directly from next/server (rare, they usually come from next/headers)
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