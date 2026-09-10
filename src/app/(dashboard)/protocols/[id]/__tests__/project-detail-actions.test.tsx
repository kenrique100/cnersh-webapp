import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProjectDetailActions from "../project-detail-actions";
import {
    updateProjectStatus,
    deleteProject,
    updateProject,
    forwardProjectToFeed,
} from "@/app/actions/project";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/app/actions/project", () => ({
    updateProjectStatus: jest.fn(),
    deleteProject: jest.fn(),
    updateProject: jest.fn(),
    forwardProjectToFeed: jest.fn(),
}));

jest.mock("next/image", () => {
    function MockImage({
                           src,
                           alt,
                           ...rest
                       }: {
        src: string;
        alt: string;
        [key: string]: unknown;
    }) {
        const { unoptimized, ...htmlAttrs } = rest;
        void unoptimized;
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={alt} {...htmlAttrs} />;
    }
    MockImage.displayName = "MockImage";
    return MockImage;
});

jest.mock("@/components/image-upload", () => {
    function MockImageUpload({
                                 onChange,
                             }: {
        variant?: string;
        onChange?: (url: string | null) => void;
    }) {
        return (
            <button
                type="button"
                data-testid="mock-image-upload"
                onClick={() => onChange?.("https://cdn.example.com/photo.png")}
            >
                Simulate Image Select
            </button>
        );
    }
    MockImageUpload.displayName = "MockImageUpload";
    return MockImageUpload;
});

const mockRouter = { refresh: jest.fn(), push: jest.fn() };
const mockedUseRouter = jest.mocked(useRouter);
const mockedUpdateProjectStatus = jest.mocked(updateProjectStatus);
const mockedDeleteProject = jest.mocked(deleteProject);
const mockedUpdateProject = jest.mocked(updateProject);
const mockedForwardProjectToFeed = jest.mocked(forwardProjectToFeed);

const defaultProps = {
    projectId: "project-1",
    currentStatus: "SUBMITTED",
    isOwner: true,
    isAdmin: false,
    projectTitle: "Malaria Vaccine Trial",
    projectObjectives: "Reduce malaria incidence by 40%.",
    projectDescription: "A study into malaria vaccine efficacy in children.",
};

function makeFile(name: string, type: string, sizeBytes: number): File {
    const file = new File(["x"], name, { type });
    Object.defineProperty(file, "size", { value: sizeBytes });
    return file;
}

describe("ProjectDetailActions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseRouter.mockReturnValue(
            mockRouter as unknown as ReturnType<typeof useRouter>,
        );
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ url: "https://cdn.example.com/upload.bin" }),
        }) as jest.Mock;
        window.confirm = jest.fn();
    });

    it("renders nothing when the viewer is neither the owner nor an admin", () => {
        render(<ProjectDetailActions {...defaultProps} isOwner={false} isAdmin={false} />);
        expect(screen.queryByText("Project Actions")).not.toBeInTheDocument();
        expect(screen.queryByText("Review Actions")).not.toBeInTheDocument();
    });

    it("renders only Project Actions for a plain owner", () => {
        render(<ProjectDetailActions {...defaultProps} isOwner={true} isAdmin={false} />);
        expect(screen.getByText("Project Actions")).toBeInTheDocument();
        expect(screen.queryByText("Review Actions")).not.toBeInTheDocument();
    });

    it("renders only Review Actions for an admin who is not the owner", () => {
        render(<ProjectDetailActions {...defaultProps} isOwner={false} isAdmin={true} />);
        expect(screen.getByText("Review Actions")).toBeInTheDocument();
        expect(screen.queryByText("Project Actions")).not.toBeInTheDocument();
        expect(
            screen.getByText(
                (_content, element) =>
                    element?.tagName.toLowerCase() === "p" &&
                    element.textContent === "Current status: SUBMITTED",
            ),
        ).toBeInTheDocument();
    });

    it("renders only Project Actions when the viewer is both owner and admin", () => {
        render(<ProjectDetailActions {...defaultProps} isOwner={true} isAdmin={true} />);
        expect(screen.getByText("Project Actions")).toBeInTheDocument();
        expect(screen.queryByText("Review Actions")).not.toBeInTheDocument();
    });

    describe("owner: edit flow", () => {
        it("opens the edit form pre-filled with title and description", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /edit/i }));
            expect(screen.getByDisplayValue("Malaria Vaccine Trial")).toBeInTheDocument();
            expect(
                screen.getByDisplayValue("A study into malaria vaccine efficacy in children."),
            ).toBeInTheDocument();
        });

        it("saves edits and refreshes the router on success", async () => {
            mockedUpdateProject.mockResolvedValue({} as never);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /edit/i }));
            const titleInput = screen.getByDisplayValue("Malaria Vaccine Trial");
            await user.clear(titleInput);
            await user.type(titleInput, "Updated Title");
            await user.click(screen.getByRole("button", { name: "Save Changes" }));
            await waitFor(() => {
                expect(mockedUpdateProject).toHaveBeenCalledWith("project-1", {
                    title: "Updated Title",
                    description: "A study into malaria vaccine efficacy in children.",
                });
                expect(toast.success).toHaveBeenCalledWith("Protocol updated");
                expect(mockRouter.refresh).toHaveBeenCalled();
            });
            expect(screen.queryByDisplayValue("Updated Title")).not.toBeInTheDocument();
        });

        it("shows an error toast when saving edits fails", async () => {
            mockedUpdateProject.mockRejectedValue(new Error("network error"));
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /edit/i }));
            await user.click(screen.getByRole("button", { name: "Save Changes" }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to update protocol");
            });
        });

        it("cancels the edit form without saving", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /edit/i }));
            await user.click(screen.getByRole("button", { name: "Cancel" }));
            expect(mockedUpdateProject).not.toHaveBeenCalled();
            expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
        });
    });

    describe("owner: delete flow", () => {
        it("deletes the protocol and redirects when confirmed", async () => {
            (window.confirm as jest.Mock).mockReturnValue(true);
            mockedDeleteProject.mockResolvedValue({ success: true } as never);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /delete/i }));
            await waitFor(() => {
                expect(mockedDeleteProject).toHaveBeenCalledWith("project-1");
                expect(toast.success).toHaveBeenCalledWith("Protocol deleted");
                expect(mockRouter.push).toHaveBeenCalledWith("/protocols");
            });
        });

        it("does not delete when the confirmation dialog is dismissed", async () => {
            (window.confirm as jest.Mock).mockReturnValue(false);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /delete/i }));
            expect(mockedDeleteProject).not.toHaveBeenCalled();
        });

        it("shows an error toast when deletion fails", async () => {
            (window.confirm as jest.Mock).mockReturnValue(true);
            mockedDeleteProject.mockRejectedValue(new Error("failed"));
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /delete/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to delete protocol");
            });
        });
    });

    describe("owner: forward to feed flow", () => {
        it("opens the forward form pre-filled with the project objectives", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            expect(
                screen.getByDisplayValue("Reduce malaria incidence by 40%."),
            ).toBeInTheDocument();
        });

        it("falls back to the description when there are no objectives", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} projectObjectives={null} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            expect(
                screen.getByDisplayValue("A study into malaria vaccine efficacy in children."),
            ).toBeInTheDocument();
        });

        it("shows a validation error when submitting empty content", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            const textarea = screen.getByDisplayValue("Reduce malaria incidence by 40%.");
            await user.clear(textarea);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Please add some content for the feed post",
                );
            });
            expect(mockedForwardProjectToFeed).not.toHaveBeenCalled();
        });

        it("posts to the feed and redirects on success", async () => {
            mockedForwardProjectToFeed.mockResolvedValue({} as never);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await waitFor(() => {
                expect(mockedForwardProjectToFeed).toHaveBeenCalledWith("project-1", {
                    content: "Reduce malaria incidence by 40%.",
                    images: undefined,
                    videos: undefined,
                    tags: undefined,
                });
                expect(toast.success).toHaveBeenCalledWith("Protocol posted to feeds!");
                expect(mockRouter.push).toHaveBeenCalledWith("/feeds");
            });
        });

        it("shows an error toast when posting to the feed fails", async () => {
            mockedForwardProjectToFeed.mockRejectedValue(new Error("failed"));
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to post to feeds");
            });
        });

        it("cancels the forward form and returns to the default actions", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: "Cancel" }));
            expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
        });

        it("adds and removes a tag from the forward form", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            const tagInput = screen.getByPlaceholderText("Add tag...");
            await user.type(tagInput, "malaria{enter}");
            const chip = screen.getByText("#malaria", { selector: "span" });
            expect(chip).toBeInTheDocument();

            const removeButton = chip.querySelector("button") as HTMLElement;
            await user.click(removeButton);
            expect(
                screen.queryByText("#malaria", { selector: "span" }),
            ).not.toBeInTheDocument();
        });

        it("adds an image via the image upload widget and includes it on submit", async () => {
            mockedForwardProjectToFeed.mockResolvedValue({} as never);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByTestId("mock-image-upload"));
            expect(
                screen.getByAltText(/preview 1/i),
            ).toBeInTheDocument();

            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await waitFor(() => {
                expect(mockedForwardProjectToFeed).toHaveBeenCalledWith(
                    "project-1",
                    expect.objectContaining({
                        images: ["https://cdn.example.com/photo.png"],
                    }),
                );
            });
        });

        it("removes an added image preview", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /photo/i }));
            await user.click(screen.getByTestId("mock-image-upload"));
            expect(screen.getByAltText(/preview 1/i)).toBeInTheDocument();

            const preview = screen.getByAltText(/preview 1/i).closest("div") as HTMLElement;
            const removeButton = preview.querySelector("button") as HTMLElement;
            await user.click(removeButton);

            expect(screen.queryByAltText(/preview 1/i)).not.toBeInTheDocument();
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/delete-blob",
                expect.objectContaining({ method: "DELETE" }),
            );
        });

        it("rejects a non-video file for the video uploader", async () => {
            const user = userEvent.setup();
            const { container } = render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /video/i }));
            const fileInput = container.querySelector(
                'input[type="file"][accept="video/*"]',
            ) as HTMLInputElement;
            const badFile = makeFile("notes.txt", "text/plain", 1000);
            fireEvent.change(fileInput, { target: { files: [badFile] } });
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Please select a video file");
            });
        });

        it("rejects an oversized video file", async () => {
            const user = userEvent.setup();
            const { container } = render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /video/i }));
            const fileInput = container.querySelector(
                'input[type="file"][accept="video/*"]',
            ) as HTMLInputElement;
            const bigFile = makeFile("clip.mp4", "video/mp4", 6 * 1024 * 1024);
            fireEvent.change(fileInput, { target: { files: [bigFile] } });
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Video must be less than 5MB");
            });
        });

        it("uploads a valid video file and renders a preview", async () => {
            const user = userEvent.setup();
            const { container } = render(<ProjectDetailActions {...defaultProps} />);
            await user.click(screen.getByRole("button", { name: /post to feed/i }));
            await user.click(screen.getByRole("button", { name: /video/i }));
            const fileInput = container.querySelector(
                'input[type="file"][accept="video/*"]',
            ) as HTMLInputElement;
            const goodFile = makeFile("clip.mp4", "video/mp4", 1024 * 1024);
            fireEvent.change(fileInput, { target: { files: [goodFile] } });
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/upload",
                    expect.objectContaining({ method: "POST" }),
                );
            });
            await waitFor(() => {
                expect(container.querySelector("video")).toBeInTheDocument();
            });
        });
    });

    describe("admin: review actions", () => {
        it("requires feedback before rejecting", async () => {
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} isOwner={false} isAdmin={true} />);
            await user.click(screen.getByRole("button", { name: /reject/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Please provide a rejection reason before rejecting",
                );
            });
            expect(mockedUpdateProjectStatus).not.toHaveBeenCalled();
        });

        it("requires feedback before returning as incomplete", async () => {
            const user = userEvent.setup();
            render(
                <ProjectDetailActions
                    {...defaultProps}
                    isOwner={false}
                    isAdmin={true}
                    currentStatus="SUBMITTED"
                />,
            );
            await user.click(screen.getByRole("button", { name: /return - incomplete/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Please specify what is missing or incomplete before returning",
                );
            });
            expect(mockedUpdateProjectStatus).not.toHaveBeenCalled();
        });

        it("requires feedback before approving with conditions", async () => {
            const user = userEvent.setup();
            render(
                <ProjectDetailActions
                    {...defaultProps}
                    isOwner={false}
                    isAdmin={true}
                    currentStatus="REVIEW_COMPLETE"
                />,
            );
            await user.click(screen.getByRole("button", { name: /approve with conditions/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Please specify the conditions for approval",
                );
            });
            expect(mockedUpdateProjectStatus).not.toHaveBeenCalled();
        });

        it("approves a protocol without requiring feedback", async () => {
            mockedUpdateProjectStatus.mockResolvedValue({} as never);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} isOwner={false} isAdmin={true} />);
            await user.click(screen.getByRole("button", { name: /^approve$/i }));
            await waitFor(() => {
                expect(mockedUpdateProjectStatus).toHaveBeenCalledWith(
                    "project-1",
                    "APPROVED",
                    undefined,
                );
                expect(toast.success).toHaveBeenCalledWith("Protocol approved");
                expect(mockRouter.refresh).toHaveBeenCalled();
            });
        });

        it("submits a rejection with feedback", async () => {
            mockedUpdateProjectStatus.mockResolvedValue({} as never);
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} isOwner={false} isAdmin={true} />);
            await user.type(
                screen.getByPlaceholderText(/required for rejection/i),
                "Missing informed consent form",
            );
            await user.click(screen.getByRole("button", { name: /reject/i }));
            await waitFor(() => {
                expect(mockedUpdateProjectStatus).toHaveBeenCalledWith(
                    "project-1",
                    "RESUBMIT",
                    "Missing informed consent form",
                );
            });
        });

        it("shows an error toast when the status update fails", async () => {
            mockedUpdateProjectStatus.mockRejectedValue(new Error("failed"));
            const user = userEvent.setup();
            render(<ProjectDetailActions {...defaultProps} isOwner={false} isAdmin={true} />);
            await user.click(screen.getByRole("button", { name: /^approve$/i }));
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to update protocol status");
            });
        });

        it("shows status-appropriate action buttons for SUBMITTED", () => {
            render(
                <ProjectDetailActions
                    {...defaultProps}
                    isOwner={false}
                    isAdmin={true}
                    currentStatus="SUBMITTED"
                />,
            );
            expect(screen.getByRole("button", { name: /return - incomplete/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /mark pending review/i })).toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: /schedule session/i }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: /approve with conditions/i }),
            ).not.toBeInTheDocument();
        });

        it("shows status-appropriate action buttons for REVIEW_COMPLETE", () => {
            render(
                <ProjectDetailActions
                    {...defaultProps}
                    isOwner={false}
                    isAdmin={true}
                    currentStatus="REVIEW_COMPLETE"
                />,
            );
            expect(screen.getByRole("button", { name: /schedule session/i })).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /approve with conditions/i }),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: /return - incomplete/i }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: /mark pending review/i }),
            ).not.toBeInTheDocument();
        });

        it("always renders Approve and Reject regardless of status", () => {
            render(
                <ProjectDetailActions
                    {...defaultProps}
                    isOwner={false}
                    isAdmin={true}
                    currentStatus="UNDER_REVIEW"
                />,
            );
            expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
        });
    });
});