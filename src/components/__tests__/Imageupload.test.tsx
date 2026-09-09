import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageUpload from "@/components/image-upload";

const mockFetch = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
    },
}));

jest.mock("@/lib/client-image-upload", () => ({
    ACCEPTED_IMAGE_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
    prepareImageForUpload: jest.fn(async (file: File) => file),
    createPreviewBlobUrl: jest.fn(() => "blob:mock-preview-url"),
    revokePreviewBlobUrl: jest.fn(),
}));

jest.mock("next/image", () => {
    const NextImage = ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />;
    NextImage.displayName = "NextImage";
    return { __esModule: true, default: NextImage };
});

jest.mock("react-image-crop", () => {
    function ReactCropMock({ children }: { children: React.ReactNode }) {
        return <div data-testid="react-crop">{children}</div>;
    }
    ReactCropMock.displayName = "ReactCropMock";
    return {
        __esModule: true,
        default: ReactCropMock,
        centerCrop: (c: unknown) => c,
        makeAspectCrop: () => ({ unit: "%", width: 80, x: 0, y: 0, height: 80 }),
    };
});
jest.mock("react-image-crop/dist/ReactCrop.css", () => ({}));

jest.mock("lucide-react", () => {
    const icon = (name: string) => {
        function Icon({ className }: { className?: string }) {
            return <span data-testid={`icon-${name}`} className={className} />;
        }
        Icon.displayName = name;
        return Icon;
    };
    return {
        Trash: icon("Trash"),
        ImageIcon: icon("Image"),
        Loader2: icon("Loader2"),
        CropIcon: icon("Crop"),
        CheckIcon: icon("Check"),
        UploadCloud: icon("UploadCloud"),
        AlertCircle: icon("AlertCircle"),
    };
});

function makeFile(name = "test.jpg", type = "image/jpeg", size = 1024) {
    const blob = new Blob(["x".repeat(size)], { type });
    return new File([blob], name, { type });
}

async function selectFile(file: File) {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await act(async () => {
        fireEvent.change(input);
    });
}

describe("ImageUpload", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("idle / empty state", () => {
        it("renders upload dropzone by default", () => {
            render(<ImageUpload />);
            expect(screen.getByTestId("icon-Image")).toBeInTheDocument();
        });

        it('shows "Upload profile picture" label for profile variant', () => {
            render(<ImageUpload variant="profile" />);
            expect(screen.getByText("Upload profile picture")).toBeInTheDocument();
        });

        it('shows "Drop or click to upload an image" label for feed variant', () => {
            render(<ImageUpload variant="feed" />);
            expect(screen.getByText("Drop or click to upload an image")).toBeInTheDocument();
        });

        it("renders hidden file input", () => {
            render(<ImageUpload />);
            const input = document.querySelector('input[type="file"]');
            expect(input).toBeInTheDocument();
            expect(input).toHaveClass("sr-only");
        });

        it("renders with defaultUrl showing the image", () => {
            render(<ImageUpload defaultUrl="https://example.com/photo.jpg" />);
            expect(screen.getByAltText("Uploaded image preview")).toBeInTheDocument();
        });

        it("renders remove button when defaultUrl is set", () => {
            render(<ImageUpload defaultUrl="https://example.com/photo.jpg" />);
            expect(screen.getByLabelText("Remove uploaded image")).toBeInTheDocument();
        });
    });

    describe("feed variant - file upload flow", () => {
        it("calls fetch /api/upload on file select", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/img.jpg" }),
            });
            render(<ImageUpload variant="feed" onChange={jest.fn()} />);
            await selectFile(makeFile());
            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith("/api/upload", expect.objectContaining({ method: "POST" }));
            });
        });

        it("calls onChange with the returned URL on success", async () => {
            const onChange = jest.fn();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/img.jpg" }),
            });
            render(<ImageUpload variant="feed" onChange={onChange} />);
            await selectFile(makeFile());
            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith("https://cdn.test/img.jpg");
            });
        });

        it("shows success toast on upload success", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://cdn.test/img.jpg" }),
            });
            render(<ImageUpload variant="feed" />);
            await selectFile(makeFile());
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith("Image uploaded successfully");
            });
        });

        it("shows error state when upload fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "Upload failed" }),
            });
            render(<ImageUpload variant="feed" />);
            await selectFile(makeFile());
            await waitFor(() => {
                expect(screen.getByText("Upload failed")).toBeInTheDocument();
                expect(screen.getByTestId("icon-AlertCircle")).toBeInTheDocument();
            });
        });

        it("shows uploading spinner while uploading", async () => {
            let resolveFetch!: (v: unknown) => void;
            mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));
            render(<ImageUpload variant="feed" />);
            await selectFile(makeFile());
            await waitFor(() => {
                expect(screen.getByText("Uploading…")).toBeInTheDocument();
            });
            await act(async () => {
                resolveFetch({ ok: false, json: async () => ({ error: "fail" }) });
            });
        });

        it("shows a Retry button after failure", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: "fail" }),
            });
            render(<ImageUpload variant="feed" />);
            await selectFile(makeFile());
            await waitFor(() => {
                expect(screen.getByText("Retry")).toBeInTheDocument();
            });
        });
    });

    describe("image already set - remove", () => {
        it("shows image preview and remove button", () => {
            render(<ImageUpload defaultUrl="https://cdn.test/photo.jpg" />);
            expect(screen.getByAltText("Uploaded image preview")).toBeInTheDocument();
            expect(screen.getByLabelText("Remove uploaded image")).toBeInTheDocument();
        });

        it("calls onChange(null) after removing", async () => {
            const onChange = jest.fn();
            mockFetch.mockResolvedValue({ ok: false });
            render(<ImageUpload defaultUrl="https://cdn.test/photo.jpg" onChange={onChange} />);
            await userEvent.setup().click(screen.getByLabelText("Remove uploaded image"));
            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(null);
            });
        });

        it("hides image and shows dropzone after removing", async () => {
            mockFetch.mockResolvedValue({ ok: false });
            render(<ImageUpload defaultUrl="https://cdn.test/photo.jpg" />);
            await userEvent.setup().click(screen.getByLabelText("Remove uploaded image"));
            await waitFor(() => {
                expect(screen.queryByAltText("Uploaded image preview")).not.toBeInTheDocument();
                expect(screen.getByTestId("icon-Image")).toBeInTheDocument();
            });
        });
    });

    describe("profile variant - crop flow", () => {
        function mockFileReader(result = "data:image/jpeg;base64,fake") {
            const originalFileReader = global.FileReader;
            class MockFileReader {
                onload: ((e: { target: { result: string } }) => void) | null = null;
                result = result;
                readAsDataURL() {
                    setTimeout(() => this.onload?.({ target: { result: this.result } }), 0);
                }
            }
            (global as unknown as { FileReader: typeof FileReader }).FileReader = MockFileReader as unknown as typeof FileReader;
            return () => {
                (global as unknown as { FileReader: typeof FileReader }).FileReader = originalFileReader;
            };
        }

        it("shows crop UI when a file is selected", async () => {
            const restore = mockFileReader();
            render(<ImageUpload variant="profile" />);
            await selectFile(makeFile("avatar.jpg", "image/jpeg"));
            await waitFor(() => {
                expect(screen.getByText("Crop your profile picture")).toBeInTheDocument();
                expect(screen.getByTestId("react-crop")).toBeInTheDocument();
            });
            restore();
        });

        it("shows Apply & Upload and Cancel buttons in crop mode", async () => {
            const restore = mockFileReader();
            render(<ImageUpload variant="profile" />);
            await selectFile(makeFile("avatar.jpg", "image/jpeg"));
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /apply & upload/i })).toBeInTheDocument();
                expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
            });
            restore();
        });

        it("returns to dropzone when cancel is clicked in crop mode", async () => {
            const restore = mockFileReader();
            render(<ImageUpload variant="profile" />);
            await selectFile(makeFile("avatar.jpg", "image/jpeg"));
            await waitFor(() => screen.getByRole("button", { name: /cancel/i }));
            await userEvent.setup().click(screen.getByRole("button", { name: /cancel/i }));
            expect(screen.queryByText("Crop your profile picture")).not.toBeInTheDocument();
            expect(screen.getByTestId("icon-Image")).toBeInTheDocument();
            restore();
        });
    });

    describe("drag and drop", () => {
        it("shows drag active state when dragging over", async () => {
            render(<ImageUpload variant="feed" />);
            const dropZone = screen.getByTestId("image-dropzone") as HTMLElement;
            fireEvent.dragOver(dropZone, { preventDefault: jest.fn() });
            await waitFor(() => {
                expect(screen.getByTestId("icon-UploadCloud")).toBeInTheDocument();
                expect(screen.getByText("Drop image here")).toBeInTheDocument();
            });
        });

        it("restores idle state on drag leave", async () => {
            render(<ImageUpload variant="feed" />);
            const dropZone = screen.getByTestId("image-dropzone") as HTMLElement;
            fireEvent.dragOver(dropZone, { preventDefault: jest.fn() });
            fireEvent.dragLeave(dropZone);
            await waitFor(() => {
                expect(screen.queryByText("Drop image here")).not.toBeInTheDocument();
            });
        });
    });
});