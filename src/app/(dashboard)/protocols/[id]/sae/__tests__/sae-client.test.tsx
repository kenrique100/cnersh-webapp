import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SAEReportClient from "../sae-client";
import { reportSAE } from "@/app/actions/sae";


jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
    },
}));

jest.mock("@/app/actions/sae", () => ({
    reportSAE: jest.fn(),
}));

jest.mock("@/components/ui/select", () => {
    return {
        Select: ({
                     value,
                     onValueChange,
                     children,
                 }: {
            value: string;
            onValueChange: (value: string) => void;
            children: React.ReactNode;
        }) => (
            <select
                data-testid="event-type-select"
                aria-label="Event Type"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
            >
                <option value="" disabled hidden>
                    Select event type...
                </option>
                {children}
            </select>
        ),
        SelectTrigger: ({ children }: { children: React.ReactNode }) => (
            <>{children}</>
        ),
        SelectValue: () => null,
        SelectContent: ({ children }: { children: React.ReactNode }) => (
            <>{children}</>
        ),
        SelectItem: ({
                         value,
                         children,
                     }: {
            value: string;
            children: React.ReactNode;
        }) => <option value={value}>{children}</option>,
    };
});


const mockRouter = { push: jest.fn(), back: jest.fn() };

function textContentMatcher(pattern: RegExp, tagName?: string) {
    return (_: string, element: Element | null): boolean => {
        if (!element) return false;
        if (tagName && element.tagName !== tagName) return false;
        const normalised = (element.textContent ?? "").replace(/\s+/g, " ").trim();
        return pattern.test(normalised);
    };
}

function getEventTypeSelect(): HTMLSelectElement {
    return screen.getByTestId("event-type-select") as HTMLSelectElement;
}

function getEventDateInput(): HTMLInputElement {
    // The Input component renders a native <input type="datetime-local">
    const input = document.querySelector(
        'input[type="datetime-local"]'
    ) as HTMLInputElement | null;
    if (!input) throw new Error("datetime-local input not found");
    return input;
}

const defaultProps = {
    projectId: "proj-1",
    projectTitle: "Test Protocol",
};

/**
 * Fills out the form with valid data and returns the values used,
 * so individual tests can assert against them if needed.
 */
async function fillValidForm(
    user: ReturnType<typeof userEvent.setup>,
    overrides?: {
        eventType?: string;
        eventDate?: string;
        description?: string;
        immediateActions?: string;
    }
) {
    const eventType = overrides?.eventType ?? "ADVERSE_EVENT";
    const eventDate = overrides?.eventDate ?? "2024-01-01T10:00";
    const description =
        overrides?.description ?? "Patient experienced mild nausea after the procedure.";

    await user.selectOptions(getEventTypeSelect(), eventType);

    const dateInput = getEventDateInput();
    fireEvent.change(dateInput, { target: { value: eventDate } });

    const descriptionTextarea = screen.getByPlaceholderText(
        /Describe the adverse event in detail/
    );
    await user.type(descriptionTextarea, description);

    if (overrides?.immediateActions) {
        const immediateActionsTextarea = screen.getByPlaceholderText(
            /Describe any immediate actions taken/
        );
        await user.type(immediateActionsTextarea, overrides.immediateActions);
    }

    return { eventType, eventDate, description };
}

describe("SAEReportClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    describe("initial rendering", () => {
        it("renders the page heading and protocol title", () => {
            render(<SAEReportClient {...defaultProps} />);

            expect(
                screen.getByText("Report Serious Adverse Event")
            ).toBeInTheDocument();
            expect(screen.getByText("Test Protocol")).toBeInTheDocument();
        });

        it("renders the back link pointing to the correct protocol", () => {
            render(<SAEReportClient {...defaultProps} />);

            const link = screen.getByRole("link", {
                name: /Back to Protocol/i,
            });
            expect(link).toHaveAttribute("href", "/protocols/proj-1");
        });

        it("renders the reporting obligation notice", () => {
            render(<SAEReportClient {...defaultProps} />);
            expect(screen.getByText("Reporting Obligation")).toBeInTheDocument();
            expect(
                screen.getByText(
                    textContentMatcher(/SAEs must be reported within\s+24 hours\s+of the event/i, 'P')
                )
            ).toBeInTheDocument();
        });

        it("does NOT render the urgent notification banner by default", () => {
            render(<SAEReportClient {...defaultProps} />);

            expect(
                screen.queryByText(/triggers an emergency notification/i)
            ).not.toBeInTheDocument();
        });

        it("renders the Event Details card", () => {
            render(<SAEReportClient {...defaultProps} />);

            expect(screen.getByText("Event Details")).toBeInTheDocument();
            expect(
                screen.getByText(
                    /Provide accurate information about the adverse event/i
                )
            ).toBeInTheDocument();
        });

        it("renders all form fields", () => {
            render(<SAEReportClient {...defaultProps} />);

            expect(screen.getByTestId("event-type-select")).toBeInTheDocument();
            expect(
                document.querySelector('input[type="datetime-local"]')
            ).toBeInTheDocument();
            expect(
                screen.getByPlaceholderText(/Describe the adverse event in detail/)
            ).toBeInTheDocument();
            expect(
                screen.getByPlaceholderText(/Describe any immediate actions taken/)
            ).toBeInTheDocument();
        });

        it("renders all event type options", () => {
            render(<SAEReportClient {...defaultProps} />);

            const select = getEventTypeSelect();
            const optionLabels = Array.from(select.options).map((o) => o.text);

            expect(optionLabels).toEqual(
                expect.arrayContaining([
                    "Adverse Event",
                    "Serious Adverse Event (SAE)",
                    "Unexpected Adverse Event",
                    "Life-Threatening Event",
                    "Fatal Event",
                ])
            );
        });

        it("submit button is enabled by default (no field-length validation)", () => {
            render(<SAEReportClient {...defaultProps} />);

            const submitBtn = screen.getByRole("button", {
                name: /Submit SAE Report/i,
            });
            expect(submitBtn).toBeEnabled();
        });

        it("renders the Cancel button", () => {
            render(<SAEReportClient {...defaultProps} />);
            expect(
                screen.getByRole("button", { name: /Cancel/i })
            ).toBeInTheDocument();
        });
    });

    describe("urgent event type banner", () => {
        it("shows the urgent banner when LIFE_THREATENING is selected", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "LIFE_THREATENING");

            expect(
                screen.getByText(/triggers an emergency notification/i)
            ).toBeInTheDocument();
        });

        it("shows the urgent banner when FATAL is selected", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "FATAL");

            expect(
                screen.getByText(/triggers an emergency notification/i)
            ).toBeInTheDocument();
        });

        it("does NOT show the urgent banner for ADVERSE_EVENT", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "ADVERSE_EVENT");

            expect(
                screen.queryByText(/triggers an emergency notification/i)
            ).not.toBeInTheDocument();
        });

        it("does NOT show the urgent banner for SERIOUS_ADVERSE_EVENT", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "SERIOUS_ADVERSE_EVENT");

            expect(
                screen.queryByText(/triggers an emergency notification/i)
            ).not.toBeInTheDocument();
        });

        it("does NOT show the urgent banner for UNEXPECTED_ADVERSE_EVENT", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(
                getEventTypeSelect(),
                "UNEXPECTED_ADVERSE_EVENT"
            );

            expect(
                screen.queryByText(/triggers an emergency notification/i)
            ).not.toBeInTheDocument();
        });

        it("hides the urgent banner again after switching back to a non-urgent type", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "FATAL");
            expect(
                screen.getByText(/triggers an emergency notification/i)
            ).toBeInTheDocument();

            await user.selectOptions(getEventTypeSelect(), "ADVERSE_EVENT");
            expect(
                screen.queryByText(/triggers an emergency notification/i)
            ).not.toBeInTheDocument();
        });
    });


    describe("form validation", () => {
        it("shows error when event type is not selected", () => {
            render(<SAEReportClient {...defaultProps} />);

            const form = document.querySelector("form");
            fireEvent.submit(form!);

            expect(toast.error).toHaveBeenCalledWith(
                "Please select an event type"
            );
            expect(reportSAE).not.toHaveBeenCalled();
        });

        it("shows error when event date is missing", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "ADVERSE_EVENT");

            const form = document.querySelector("form");
            fireEvent.submit(form!);

            expect(toast.error).toHaveBeenCalledWith(
                "Please enter the event date"
            );
            expect(reportSAE).not.toHaveBeenCalled();
        });

        it("shows error when description is empty", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "ADVERSE_EVENT");
            fireEvent.change(getEventDateInput(), {
                target: { value: "2024-01-01T10:00" },
            });

            const form = document.querySelector("form");
            fireEvent.submit(form!);

            expect(toast.error).toHaveBeenCalledWith("Please describe the event");
            expect(reportSAE).not.toHaveBeenCalled();
        });

        it("shows error when description is only whitespace", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "ADVERSE_EVENT");
            fireEvent.change(getEventDateInput(), {
                target: { value: "2024-01-01T10:00" },
            });

            const descriptionTextarea = screen.getByPlaceholderText(
                /Describe the adverse event in detail/
            );
            await user.type(descriptionTextarea, "   ");

            const form = document.querySelector("form");
            fireEvent.submit(form!);

            expect(toast.error).toHaveBeenCalledWith("Please describe the event");
            expect(reportSAE).not.toHaveBeenCalled();
        });

        it("validates fields in order: eventType -> eventDate -> description", () => {
            render(<SAEReportClient {...defaultProps} />);

            const form = document.querySelector("form");

            // Nothing filled - first failing check should be eventType
            fireEvent.submit(form!);
            expect(toast.error).toHaveBeenLastCalledWith(
                "Please select an event type"
            );
        });
    });

    describe("successful submission", () => {
        it("submits with all fields filled (on-time report)", async () => {
            (reportSAE as jest.Mock).mockResolvedValue({
                id: "sae-1",
                isLate: false,
                reportedAt: new Date().toISOString(),
            });
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user, {
                eventType: "SERIOUS_ADVERSE_EVENT",
                eventDate: "2024-01-01T10:00",
                description: "Detailed description of the event.",
                immediateActions: "Administered first aid.",
            });

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(reportSAE).toHaveBeenCalledWith({
                    projectId: "proj-1",
                    eventType: "SERIOUS_ADVERSE_EVENT",
                    eventDate: "2024-01-01T10:00",
                    description: "Detailed description of the event.",
                    immediateActions: "Administered first aid.",
                });
            });

            expect(toast.success).toHaveBeenCalledWith(
                "SAE report submitted successfully. Relevant authorities have been notified."
            );
            expect(toast.warning).not.toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith("/protocols/proj-1");
        });

        it("submits without immediate actions (sends undefined)", async () => {
            (reportSAE as jest.Mock).mockResolvedValue({
                id: "sae-2",
                isLate: false,
                reportedAt: new Date().toISOString(),
            });
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(reportSAE).toHaveBeenCalledWith(
                    expect.objectContaining({ immediateActions: undefined })
                );
            });
        });

        it("trims whitespace from description and immediate actions", async () => {
            (reportSAE as jest.Mock).mockResolvedValue({
                id: "sae-3",
                isLate: false,
                reportedAt: new Date().toISOString(),
            });
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.selectOptions(getEventTypeSelect(), "ADVERSE_EVENT");
            fireEvent.change(getEventDateInput(), {
                target: { value: "2024-01-01T10:00" },
            });

            const descriptionTextarea = screen.getByPlaceholderText(
                /Describe the adverse event in detail/
            );
            await user.type(descriptionTextarea, "  padded description  ");

            const immediateActionsTextarea = screen.getByPlaceholderText(
                /Describe any immediate actions taken/
            );
            await user.type(immediateActionsTextarea, "  padded action  ");

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(reportSAE).toHaveBeenCalledWith(
                    expect.objectContaining({
                        description: "padded description",
                        immediateActions: "padded action",
                    })
                );
            });
        });

        it("shows a warning toast (not success) when the report is late", async () => {
            (reportSAE as jest.Mock).mockResolvedValue({
                id: "sae-4",
                isLate: true,
                reportedAt: new Date().toISOString(),
            });
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(toast.warning).toHaveBeenCalledWith(
                    "SAE report submitted, but this report is outside the 24-hour reporting window. This late submission has been logged as a compliance event.",
                    { duration: 6000 }
                );
            });

            expect(toast.success).not.toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith("/protocols/proj-1");
        });

        it("navigates to the protocol page after a successful submission", async () => {
            (reportSAE as jest.Mock).mockResolvedValue({
                id: "sae-5",
                isLate: false,
                reportedAt: new Date().toISOString(),
            });
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(mockRouter.push).toHaveBeenCalledWith("/protocols/proj-1");
            });
        });

        it("submits successfully for an urgent event type (LIFE_THREATENING)", async () => {
            (reportSAE as jest.Mock).mockResolvedValue({
                id: "sae-6",
                isLate: false,
                reportedAt: new Date().toISOString(),
            });
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user, { eventType: "LIFE_THREATENING" });

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(reportSAE).toHaveBeenCalledWith(
                    expect.objectContaining({ eventType: "LIFE_THREATENING" })
                );
                expect(toast.success).toHaveBeenCalled();
            });
        });
    });

    describe("submission error handling", () => {
        it("shows the error message when reportSAE rejects with an Error instance", async () => {
            (reportSAE as jest.Mock).mockRejectedValue(
                new Error("Protocol not found")
            );
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Protocol not found");
            });
        });

        it("shows a generic error message when reportSAE rejects with a non-Error value", async () => {
            (reportSAE as jest.Mock).mockRejectedValue("Unexpected failure");
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Failed to submit SAE report"
                );
            });
        });

        it("does not navigate when submission fails", async () => {
            (reportSAE as jest.Mock).mockRejectedValue(new Error("fail"));
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });

            expect(mockRouter.push).not.toHaveBeenCalled();
        });

        it("re-enables the submit button after a failed submission", async () => {
            (reportSAE as jest.Mock).mockRejectedValue(new Error("fail"));
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            const submitBtn = screen.getByRole("button", {
                name: /Submit SAE Report/i,
            });
            await user.click(submitBtn);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalled();
            });

            expect(submitBtn).toBeEnabled();
            expect(submitBtn).toHaveTextContent("Submit SAE Report");
        });
    });

    describe("submitting state", () => {
        it("disables the submit button and shows 'Submitting...' while in-flight", async () => {
            (reportSAE as jest.Mock).mockImplementation(
                () => new Promise(() => {})
            );
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            const submitBtn = screen.getByRole("button", {
                name: /Submit SAE Report/i,
            });
            await user.click(submitBtn);

            expect(submitBtn).toBeDisabled();
            expect(submitBtn).toHaveTextContent("Submitting...");
        });

        it("disables the Cancel button while submitting", async () => {
            (reportSAE as jest.Mock).mockImplementation(
                () => new Promise(() => {})
            );
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);

            await user.click(
                screen.getByRole("button", { name: /Submit SAE Report/i })
            );

            expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
        });
    });

    describe("navigation", () => {
        it("calls router.back() when Cancel is clicked", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /Cancel/i }));

            expect(mockRouter.back).toHaveBeenCalledTimes(1);
        });

        it("does not call reportSAE when Cancel is clicked", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            await fillValidForm(user);
            await user.click(screen.getByRole("button", { name: /Cancel/i }));

            expect(reportSAE).not.toHaveBeenCalled();
        });
    });

    describe("field interactions", () => {
        it("updates the description field as the user types", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            const textarea = screen.getByPlaceholderText(
                /Describe the adverse event in detail/
            ) as HTMLTextAreaElement;
            await user.type(textarea, "Some symptoms occurred.");

            expect(textarea.value).toBe("Some symptoms occurred.");
        });

        it("updates the immediate actions field as the user types", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            const textarea = screen.getByPlaceholderText(
                /Describe any immediate actions taken/
            ) as HTMLTextAreaElement;
            await user.type(textarea, "Called emergency services.");

            expect(textarea.value).toBe("Called emergency services.");
        });

        it("updates the event date field", () => {
            render(<SAEReportClient {...defaultProps} />);

            const dateInput = getEventDateInput();
            fireEvent.change(dateInput, {
                target: { value: "2024-05-15T08:30" },
            });

            expect(dateInput.value).toBe("2024-05-15T08:30");
        });

        it("sets the max attribute on the date input to prevent future dates", () => {
            render(<SAEReportClient {...defaultProps} />);

            const dateInput = getEventDateInput();
            expect(dateInput).toHaveAttribute("max");

            // The max attribute is a "YYYY-MM-DDTHH:mm" LOCAL wall-clock string
            // (datetime-local has no timezone concept). Interpreting it via
            // `new Date(maxValue)` parses it as local time, which should land
            // at-or-before the actual current moment. A small tolerance guards
            // against sub-second timing between render() and this assertion,
            // and against minute-level truncation in the max value itself.
            const maxValue = dateInput.getAttribute("max")!;
            const toleranceMs = 5000;
            expect(new Date(maxValue).getTime()).toBeLessThanOrEqual(
                Date.now() + toleranceMs
            );
        });

        it("updates the selected event type", async () => {
            const user = userEvent.setup();
            render(<SAEReportClient {...defaultProps} />);

            const select = getEventTypeSelect();
            await user.selectOptions(select, "FATAL");

            expect(select.value).toBe("FATAL");
        });
    });
});