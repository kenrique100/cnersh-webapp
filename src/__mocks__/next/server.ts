// Jest mock for next/server — avoids loading the actual implementation
// which requires the `Request` global not available in all Jest environments.

export class NextRequest {
    url: string;
    headers: Headers;
    constructor(url: string, _init?: RequestInit) {
        this.url = url;
        this.headers = new Headers();
    }
}

export class NextResponse {
    headers: Headers;
    status: number;
    constructor(_body?: unknown, init?: ResponseInit) {
        this.headers = new Headers(init?.headers as HeadersInit | undefined);
        this.status = init?.status ?? 200;
    }
    static json(body: unknown, init?: ResponseInit) {
        return new NextResponse(body, init);
    }
}
