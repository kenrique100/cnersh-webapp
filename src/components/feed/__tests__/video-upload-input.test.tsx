import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

jest.mock("lucide-react", () => ({
    Loader2: ({ className }: { className?: string }) => (
        <span data-testid="icon-Loader2" className={className} />
    ),
    VideoIcon: ({ className }: { className?: string }) => (
        <span data-testid="icon-Video" className={className} />
    ),
}));

import VideoUploadInput from "../video-upload-input";

const originalConsoleError = console.error;

/**
 * Returns `{ user, onUpload, ...rts }`.
 *
 * `user` used to be missing, which produced TS2339 on every destructuring
 * `const { user } = setup()`.
 */
function setup() {
    const user = userEvent.setup();
    const onUpload = jest.fn();
    const utils = render(<VideoUploadInput onUpload={onUpload} />);
    return { user, onUpload, ...utils };
}

function selectFile(input: HTMLInputElement, file: File) {
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation((...args) => {
        if (String(args[0]).includes("Video upload error:")) return;
        originalConsoleError(...args);
    });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("VideoUploadInput", () => {
    describe("idle state", () => {
        it("renders the upload prompt and size hint", () => {
            setup();
            expect(screen.getByText(/drop or click to upload a video/i)).toBeInTheDocument();
            expect(screen.getByText(/videos up to 64mb/i)).toBeInTheDocument();
        });

        it("renders a hidden file input with the video accept attribute", () => {
            setup();
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            expect(input).toBeInTheDocument();
            expect(input.className).toContain("hidden");
        });
    });

    describe("file validation", () => {
        it("rejects non-video files", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["x"], "test.txt", { type: "text/plain" }));
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith("Please select a video file");
            });
        });

        it("rejects videos larger than 64MB", async () => {
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            const big = new File([""], "big.mp4", { type: "video/mp4" });
            Object.defineProperty(big, "size", { value: 65 * 1024 * 1024 });
            selectFile(input, big);
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith("Video must be less than 65MB");
            });
        });

        it("accepts a video exactly at the 64MB boundary", async () => {
            const mockFetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/borderline.mp4" }),
            });
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            const file = new File(["v"], "borderline.mp4", { type: "video/mp4" });
            Object.defineProperty(file, "size", { value: 64 * 1024 * 1024 });
            selectFile(input, file);
            await waitFor(() => expect(mockFetch).toHaveBeenCalled());
            expect(mockToastError).not.toHaveBeenCalledWith("Video must be less than 65MB");
        });

        it("does nothing when no file is selected", async () => {
            const mockFetch = jest.fn();
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;
            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            fireEvent.change(input);
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe("upload", () => {
        it("sends a POST to /api/upload with the file and filename", async () => {
            const mockFetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/video.mp4" }),
            });
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["v".repeat(1024)], "video.mp4", { type: "video/mp4" }));

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining("/api/upload?filename=video.mp4"),
                    expect.objectContaining({ method: "POST" }),
                );
            });
        });

        it("calls onUpload with the returned URL on success", async () => {
            const mockFetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/video.mp4" }),
            });
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user, onUpload } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["v".repeat(1024)], "video.mp4", { type: "video/mp4" }));

            await waitFor(() => {
                expect(onUpload).toHaveBeenCalledWith("https://cdn.test/video.mp4");
            });
        });

        it("shows an error toast when the server responds with a failure", async () => {
            const mockFetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "Upload failed" }),
            });
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["v"], "video.mp4", { type: "video/mp4" }));

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith("Upload failed");
            });
        });

        it("shows an uploading spinner while the upload is in flight", async () => {
            let resolveFetch!: (v: unknown) => void;
            const pending = new Promise((r) => { resolveFetch = r; });
            const mockFetch = jest.fn().mockReturnValueOnce(pending);
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["v"], "video.mp4", { type: "video/mp4" }));

            await waitFor(() => {
                expect(screen.getByText(/uploading video/i)).toBeInTheDocument();
            });

            await act(async () => {
                resolveFetch({ ok: false, json: async () => ({ error: "fail" }) });
            });

            await waitFor(() => {
                expect(screen.queryByText(/uploading video/i)).not.toBeInTheDocument();
            });
        });

        it("disables the file input during the upload", async () => {
            let resolveFetch!: (v: unknown) => void;
            const pending = new Promise((r) => { resolveFetch = r; });
            const mockFetch = jest.fn().mockReturnValueOnce(pending);
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["v"], "video.mp4", { type: "video/mp4" }));

            await waitFor(() => expect(input.disabled).toBe(true));

            await act(async () => {
                resolveFetch({ ok: false, json: async () => ({ error: "fail" }) });
            });
        });

        it("resets the file input value after the upload completes", async () => {
            const mockFetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/video.mp4" }),
            });
            (global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

            const { user } = setup();
            await user.click(screen.getByRole("button", { name: /drop or click to upload a video/i }));
            const input = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
            selectFile(input, new File(["v"], "video.mp4", { type: "video/mp4" }));

            await waitFor(() => {
                expect(input.value).toBe("");
            });
        });
    });
});