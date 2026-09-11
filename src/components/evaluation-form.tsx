"use client";

import React from "react";
import { CheckCircle2Icon, SaveIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveEvaluationDraft, submitEvaluationReport } from "@/app/actions/evaluation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type ScoreKey =
    | "socialValue"
    | "scientificValidity"
    | "riskBenefitAnalysis"
    | "participantSelection"
    | "informedConsentProcess"
    | "confidentialityDataProtection"
    | "collaborativePartnership";

type CommentKey =
    | "socialValueComment"
    | "scientificValidityComment"
    | "riskBenefitAnalysisComment"
    | "participantSelectionComment"
    | "informedConsentProcessComment"
    | "confidentialityDataProtectionComment"
    | "collaborativePartnershipComment";

type Recommendation = "FAVORABLE" | "FAVORABLE_WITH_CONDITIONS" | "UNFAVORABLE";

interface EvaluationFormState {
    socialValue: number | null;
    scientificValidity: number | null;
    riskBenefitAnalysis: number | null;
    participantSelection: number | null;
    informedConsentProcess: number | null;
    confidentialityDataProtection: number | null;
    collaborativePartnership: number | null;
    socialValueComment: string;
    scientificValidityComment: string;
    riskBenefitAnalysisComment: string;
    participantSelectionComment: string;
    informedConsentProcessComment: string;
    confidentialityDataProtectionComment: string;
    collaborativePartnershipComment: string;
    recommendation: Recommendation | "";
    generalComments: string;
    confirmed: boolean;
}

export interface EvaluationInitialReport {
    socialValue?: number | null;
    scientificValidity?: number | null;
    riskBenefitAnalysis?: number | null;
    participantSelection?: number | null;
    informedConsentProcess?: number | null;
    confidentialityDataProtection?: number | null;
    collaborativePartnership?: number | null;
    socialValueComment?: string | null;
    scientificValidityComment?: string | null;
    riskBenefitAnalysisComment?: string | null;
    participantSelectionComment?: string | null;
    informedConsentProcessComment?: string | null;
    confidentialityDataProtectionComment?: string | null;
    collaborativePartnershipComment?: string | null;
    recommendation?: Recommendation | null;
    generalComments?: string | null;
    status?: string;
}

interface EvaluationFormProps {
    assignmentId: string;
    protocolId: string;
    protocolTitle: string;
    dueDate?: string | Date | null;
    initialReport?: EvaluationInitialReport | null;
}

const criteria: Array<{
    scoreKey: ScoreKey;
    commentKey: CommentKey;
    title: string;
    description: string;
}> = [
    {
        scoreKey: "socialValue",
        commentKey: "socialValueComment",
        title: "Social value",
        description: "The study addresses a relevant health need and can produce useful knowledge.",
    },
    {
        scoreKey: "scientificValidity",
        commentKey: "scientificValidityComment",
        title: "Scientific validity",
        description: "The design, methods, sample, and analysis can answer the research question.",
    },
    {
        scoreKey: "riskBenefitAnalysis",
        commentKey: "riskBenefitAnalysisComment",
        title: "Risk-benefit analysis",
        description: "Risks are minimized and reasonable in relation to anticipated benefits.",
    },
    {
        scoreKey: "participantSelection",
        commentKey: "participantSelectionComment",
        title: "Participant selection",
        description: "Recruitment is fair, justified, and appropriately protects vulnerable groups.",
    },
    {
        scoreKey: "informedConsentProcess",
        commentKey: "informedConsentProcessComment",
        title: "Informed consent process",
        description: "Information and consent procedures support voluntary, informed participation.",
    },
    {
        scoreKey: "confidentialityDataProtection",
        commentKey: "confidentialityDataProtectionComment",
        title: "Confidentiality and data protection",
        description: "Collection, access, retention, sharing, and disposal safeguards are adequate.",
    },
    {
        scoreKey: "collaborativePartnership",
        commentKey: "collaborativePartnershipComment",
        title: "Collaborative partnership",
        description: "Local partners and communities are appropriately engaged and respected.",
    },
];

const initialState = (report?: EvaluationInitialReport | null): EvaluationFormState => ({
    socialValue: report?.socialValue ?? null,
    scientificValidity: report?.scientificValidity ?? null,
    riskBenefitAnalysis: report?.riskBenefitAnalysis ?? null,
    participantSelection: report?.participantSelection ?? null,
    informedConsentProcess: report?.informedConsentProcess ?? null,
    confidentialityDataProtection: report?.confidentialityDataProtection ?? null,
    collaborativePartnership: report?.collaborativePartnership ?? null,
    socialValueComment: report?.socialValueComment ?? "",
    scientificValidityComment: report?.scientificValidityComment ?? "",
    riskBenefitAnalysisComment: report?.riskBenefitAnalysisComment ?? "",
    participantSelectionComment: report?.participantSelectionComment ?? "",
    informedConsentProcessComment: report?.informedConsentProcessComment ?? "",
    confidentialityDataProtectionComment: report?.confidentialityDataProtectionComment ?? "",
    collaborativePartnershipComment: report?.collaborativePartnershipComment ?? "",
    recommendation: report?.recommendation ?? "",
    generalComments: report?.generalComments ?? "",
    confirmed: false,
});

export function validateEvaluation(form: EvaluationFormState): string[] {
    const errors: string[] = [];
    criteria.forEach(({ scoreKey, commentKey, title }) => {
        const score = form[scoreKey];
        if (score === null || !Number.isInteger(score) || score < 1 || score > 5) {
            errors.push(`${title}: select a score from 1 to 5.`);
        }
        if (form[commentKey].trim().length < 10) {
            errors.push(`${title}: enter a comment of at least 10 characters.`);
        }
    });
    if (!form.recommendation) errors.push("Select a recommendation.");
    if (form.generalComments.trim().length < 20) {
        errors.push("Enter general comments of at least 20 characters.");
    }
    if (!form.confirmed) errors.push("Confirm the evaluation before submitting.");
    return errors;
}

export default function EvaluationForm({
    assignmentId,
    protocolId,
    protocolTitle,
    dueDate,
    initialReport,
}: EvaluationFormProps) {
    const router = useRouter();
    const [form, setForm] = React.useState(() => initialState(initialReport));
    const [errors, setErrors] = React.useState<string[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [savedAt, setSavedAt] = React.useState<Date | null>(null);

    const setField = <K extends keyof EvaluationFormState>(key: K, value: EvaluationFormState[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors([]);
    };

    const scoredValues = criteria
        .map(({ scoreKey }) => form[scoreKey])
        .filter((value): value is number => value !== null);
    const overallScore =
        scoredValues.length === criteria.length
            ? Math.round((scoredValues.reduce((sum, value) => sum + value, 0) / criteria.length) * 10) / 10
            : null;

    const actionPayload = () => ({
        socialValue: form.socialValue ?? undefined,
        scientificValidity: form.scientificValidity ?? undefined,
        riskBenefitAnalysis: form.riskBenefitAnalysis ?? undefined,
        participantSelection: form.participantSelection ?? undefined,
        informedConsentProcess: form.informedConsentProcess ?? undefined,
        confidentialityDataProtection: form.confidentialityDataProtection ?? undefined,
        collaborativePartnership: form.collaborativePartnership ?? undefined,
        socialValueComment: form.socialValueComment.trim() || undefined,
        scientificValidityComment: form.scientificValidityComment.trim() || undefined,
        riskBenefitAnalysisComment: form.riskBenefitAnalysisComment.trim() || undefined,
        participantSelectionComment: form.participantSelectionComment.trim() || undefined,
        informedConsentProcessComment: form.informedConsentProcessComment.trim() || undefined,
        confidentialityDataProtectionComment: form.confidentialityDataProtectionComment.trim() || undefined,
        collaborativePartnershipComment: form.collaborativePartnershipComment.trim() || undefined,
        overallScore: overallScore ?? undefined,
        recommendation: form.recommendation || undefined,
        generalComments: form.generalComments.trim() || undefined,
    });

    const saveDraft = async () => {
        setIsSaving(true);
        try {
            await saveEvaluationDraft(assignmentId, actionPayload());
            setSavedAt(new Date());
            toast.success("Evaluation draft saved");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Evaluation draft could not be saved.");
        } finally {
            setIsSaving(false);
        }
    };

    const submit = async () => {
        const validationErrors = validateEvaluation(form);
        if (validationErrors.length) {
            setErrors(validationErrors);
            return;
        }
        setIsSubmitting(true);
        try {
            await submitEvaluationReport(assignmentId, actionPayload());
            toast.success("Evaluation report submitted");
            router.push(`/protocols/${protocolId}`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Evaluation report could not be submitted.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            className="space-y-6"
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
            noValidate
            data-testid="evaluation-form"
        >
            <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                    <CardTitle>
                        <h2 className="text-lg">Ethics evaluation rubric</h2>
                    </CardTitle>
                    <CardDescription>
                        Review assignment for <span className="font-medium text-gray-800 dark:text-gray-200">{protocolTitle}</span>
                        {dueDate ? ` · Due ${new Date(dueDate).toLocaleDateString()}` : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Scoring scale</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                1 is inadequate, 3 is acceptable with revisions, and 5 is excellent.
                            </p>
                        </div>
                        <div className="min-w-32 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-center dark:border-blue-900 dark:bg-blue-950/40">
                            <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                Average score
                            </p>
                            <p className="mt-1 text-xl font-bold text-blue-950 dark:text-blue-100" data-testid="overall-score">
                                {overallScore === null ? "Pending" : `${overallScore} / 5`}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {criteria.map(({ scoreKey, commentKey, title, description }, index) => (
                <Card key={scoreKey} className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <CardHeader>
                        <CardTitle>
                            <h2 className="text-base">{index + 1}. {title}</h2>
                        </CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 md:grid-cols-[12rem_1fr]">
                        <div className="space-y-2">
                            <label htmlFor={scoreKey} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Score <span className="text-red-700 dark:text-red-300">(Required)</span>
                            </label>
                            <select
                                id={scoreKey}
                                value={form[scoreKey] ?? ""}
                                onChange={(event) =>
                                    setField(scoreKey, event.target.value ? Number(event.target.value) : null)
                                }
                                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950"
                                required
                                data-testid={`select-${scoreKey}`}
                            >
                                <option value="">Select score</option>
                                {[1, 2, 3, 4, 5].map((score) => (
                                    <option key={score} value={score}>
                                        {score} {score === 1 ? "· Inadequate" : score === 3 ? "· Acceptable" : score === 5 ? "· Excellent" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor={commentKey} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Reviewer comment <span className="text-red-700 dark:text-red-300">(Required)</span>
                            </label>
                            <Textarea
                                id={commentKey}
                                value={form[commentKey]}
                                onChange={(event) => setField(commentKey, event.target.value)}
                                placeholder={`Explain your assessment of ${title.toLowerCase()}.`}
                                rows={4}
                                className="min-h-24 resize-y"
                                required
                                data-testid={`textarea-${commentKey}`}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <CardHeader>
                    <CardTitle>
                        <h2 className="text-base">Overall assessment</h2>
                    </CardTitle>
                    <CardDescription>Record your final recommendation and the reasons supporting it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <fieldset className="space-y-3">
                        <legend className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Recommendation <span className="text-red-700 dark:text-red-300">(Required)</span>
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                ["FAVORABLE", "Favorable"],
                                ["FAVORABLE_WITH_CONDITIONS", "Favorable with conditions"],
                                ["UNFAVORABLE", "Unfavorable"],
                            ].map(([value, label]) => (
                                <label
                                    key={value}
                                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${
                                        form.recommendation === value
                                            ? "border-blue-700 bg-blue-50 text-blue-950 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100"
                                            : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="recommendation"
                                        value={value}
                                        checked={form.recommendation === value}
                                        onChange={() => setField("recommendation", value as Recommendation)}
                                        className="h-4 w-4"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="space-y-2">
                        <label htmlFor="generalComments" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            General comments <span className="text-red-700 dark:text-red-300">(Required)</span>
                        </label>
                        <Textarea
                            id="generalComments"
                            value={form.generalComments}
                            onChange={(event) => setField("generalComments", event.target.value)}
                            placeholder="Summarize your decision, required revisions, and any conditions."
                            rows={7}
                            className="min-h-36 resize-y"
                            required
                        />
                    </div>
                    <label
                        htmlFor="evaluation-confirmed"
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-300 p-4 dark:border-gray-700"
                    >
                        <input
                            id="evaluation-confirmed"
                            type="checkbox"
                            checked={form.confirmed}
                            onChange={(event) => setField("confirmed", event.target.checked)}
                            className="mt-1 h-5 w-5"
                        />
                        <span className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                            I confirm that I completed this evaluation independently and that my recommendation reflects the protocol and supporting documents reviewed.
                        </span>
                    </label>
                </CardContent>
            </Card>

            {errors.length > 0 && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                    <p className="font-semibold text-red-900 dark:text-red-100">Complete the evaluation before submitting</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-200">
                        {errors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void saveDraft()}
                        disabled={isSaving || isSubmitting}
                        className="min-h-11"
                    >
                        {isSaving ? <Spinner className="size-4" /> : <SaveIcon className="h-4 w-4" aria-hidden="true" />}
                        {isSaving ? "Saving" : "Save draft"}
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
                        {savedAt ? `Saved at ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Drafts remain editable"}
                    </span>
                </div>
                <Button
                    type="submit"
                    disabled={isSaving || isSubmitting}
                    className="min-h-11 bg-green-700 px-6 text-white hover:bg-green-800"
                >
                    {isSubmitting ? (
                        <Spinner className="size-4" />
                    ) : form.confirmed ? (
                        <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <SendIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isSubmitting ? "Submitting" : "Submit evaluation"}
                </Button>
            </div>
        </form>
    );
}
