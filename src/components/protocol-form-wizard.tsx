"use client";

import React from "react";
import {
    AlertCircleIcon,
    CheckCircle2Icon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    SaveIcon,
    Trash2Icon,
} from "lucide-react";
import { submitProject } from "@/app/actions/project";
import {
    ProtocolDocumentField,
    ProtocolSelectField,
    ProtocolTextArea,
    ProtocolTextField,
    type ProtocolDocument,
} from "@/components/protocol-form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export const AUTOSAVE_KEY = "cnersh-protocol-draft";
const AUTOSAVE_INTERVAL = 30_000;

export const STEP_LABELS = [
    "Protocol Info",
    "Principal Investigator",
    "Co-Investigators",
    "Sponsor / Funding",
    "Study Summary",
    "Background",
    "Research Question",
    "Objectives",
    "Literature Review",
    "Methodology",
    "Ethics",
    "Consent Documents",
    "Data Collection Tools",
    "Budget",
    "Authorization",
    "Additional Documents",
    "Payment Proof",
    "Review & Submit",
] as const;

interface CoInvestigator {
    name: string;
    institution: string;
    email: string;
    role: string;
    cvUrl: string;
    cvName: string;
}

interface FormState {
    protocolTitle: string;
    studyType: string;
    researchField: string;
    projectDescription: string;
    protocolDocument: ProtocolDocument;
    piFullName: string;
    piInstitution: string;
    piDepartment: string;
    piEmail: string;
    piTelephone: string;
    piQualification: string;
    piExperience: string;
    piCv: ProtocolDocument;
    coInvestigators: CoInvestigator[];
    sponsorName: string;
    sponsorCountry: string;
    fundingSourceType: string;
    fundingAmount: string;
    fundingCurrency: string;
    fundingDocument: ProtocolDocument;
    studySummaryEnglish: string;
    studySummaryFrench: string;
    keywords: string;
    researchBackground: string;
    studyRationale: string;
    mainResearchQuestion: string;
    researchHypothesis: string;
    generalObjective: string;
    specificObjectives: string[];
    literatureReview: string;
    literatureReferences: string;
    methodStudyType: string;
    studyLocation: string;
    studyStartDate: string;
    studyEndDate: string;
    targetPopulation: string;
    sampleSize: string;
    samplingMethod: string;
    inclusionCriteria: string;
    exclusionCriteria: string;
    dataCollectionMethods: string;
    dataAnalysisPlan: string;
    participantProtection: string;
    confidentialityMeasures: string;
    potentialRisks: string;
    expectedBenefits: string;
    vulnerablePopulations: string;
    compensation: string;
    infoSheetEnglish: ProtocolDocument;
    infoSheetFrench: ProtocolDocument;
    consentFormEnglish: ProtocolDocument;
    consentFormFrench: ProtocolDocument;
    dataCollectionTools: ProtocolDocument;
    dataCollectionToolsDescription: string;
    totalBudget: string;
    budgetCurrency: string;
    budgetDocument: ProtocolDocument;
    authorizationInstitution: string;
    authorizationApprover: string;
    authorizationLetter: ProtocolDocument;
    investigatorsBrochure: ProtocolDocument;
    participantInsurance: ProtocolDocument;
    protocolErrorInsurance: ProtocolDocument;
    endOfTrialAgreement: ProtocolDocument;
    foreignEthicsApproval: ProtocolDocument;
    materialTransferAgreement: ProtocolDocument;
    dataSharingAgreement: ProtocolDocument;
    paymentReceipt: ProtocolDocument;
    paymentReference: string;
    paymentDate: string;
    confirmed: boolean;
}

const emptyDocument = (): ProtocolDocument => ({ url: "", name: "" });
const emptyInvestigator = (): CoInvestigator => ({
    name: "",
    institution: "",
    email: "",
    role: "",
    cvUrl: "",
    cvName: "",
});

export const initialProtocolFormState: FormState = {
    protocolTitle: "",
    studyType: "",
    researchField: "",
    projectDescription: "",
    protocolDocument: emptyDocument(),
    piFullName: "",
    piInstitution: "",
    piDepartment: "",
    piEmail: "",
    piTelephone: "",
    piQualification: "",
    piExperience: "",
    piCv: emptyDocument(),
    coInvestigators: [],
    sponsorName: "",
    sponsorCountry: "",
    fundingSourceType: "",
    fundingAmount: "",
    fundingCurrency: "XAF",
    fundingDocument: emptyDocument(),
    studySummaryEnglish: "",
    studySummaryFrench: "",
    keywords: "",
    researchBackground: "",
    studyRationale: "",
    mainResearchQuestion: "",
    researchHypothesis: "",
    generalObjective: "",
    specificObjectives: [""],
    literatureReview: "",
    literatureReferences: "",
    methodStudyType: "",
    studyLocation: "",
    studyStartDate: "",
    studyEndDate: "",
    targetPopulation: "",
    sampleSize: "",
    samplingMethod: "",
    inclusionCriteria: "",
    exclusionCriteria: "",
    dataCollectionMethods: "",
    dataAnalysisPlan: "",
    participantProtection: "",
    confidentialityMeasures: "",
    potentialRisks: "",
    expectedBenefits: "",
    vulnerablePopulations: "",
    compensation: "",
    infoSheetEnglish: emptyDocument(),
    infoSheetFrench: emptyDocument(),
    consentFormEnglish: emptyDocument(),
    consentFormFrench: emptyDocument(),
    dataCollectionTools: emptyDocument(),
    dataCollectionToolsDescription: "",
    totalBudget: "",
    budgetCurrency: "XAF",
    budgetDocument: emptyDocument(),
    authorizationInstitution: "",
    authorizationApprover: "",
    authorizationLetter: emptyDocument(),
    investigatorsBrochure: emptyDocument(),
    participantInsurance: emptyDocument(),
    protocolErrorInsurance: emptyDocument(),
    endOfTrialAgreement: emptyDocument(),
    foreignEthicsApproval: emptyDocument(),
    materialTransferAgreement: emptyDocument(),
    dataSharingAgreement: emptyDocument(),
    paymentReceipt: emptyDocument(),
    paymentReference: "",
    paymentDate: "",
    confirmed: false,
};

const descriptions = [
    "Identify the protocol and attach the complete study document.",
    "Provide the lead investigator's professional and contact information.",
    "Add every investigator who will share responsibility for the study.",
    "Describe the sponsor and source of financial support, if any.",
    "Summarize the study in clear, non-technical language.",
    "Explain the problem, context, and justification for the study.",
    "State the question the research is designed to answer.",
    "Define one general objective and measurable specific objectives.",
    "Summarize relevant evidence and list the principal references.",
    "Describe the design, participants, procedures, and analysis.",
    "Explain how participants, privacy, and welfare will be protected.",
    "Attach participant information and consent materials.",
    "Attach the instruments used to collect research data.",
    "Provide the total budget and a detailed budget document.",
    "Provide institutional authorization for the study.",
    "Attach supporting documents relevant to this protocol.",
    "Provide evidence of payment and its transaction reference.",
    "Check every section and certify the submission.",
] as const;

const studyTypes = [
    "Clinical Trial",
    "Observational Study",
    "Epidemiological Study",
    "Qualitative Study",
    "Laboratory Research",
    "Public Health Research",
    "Secondary Data Analysis",
    "Other",
].map((value) => ({ value, label: value }));

const researchFields = [
    "Clinical Medicine",
    "Public Health",
    "Epidemiology",
    "Biomedical Sciences",
    "Nursing and Midwifery",
    "Mental Health",
    "Social and Behavioral Sciences",
    "Other",
].map((value) => ({ value, label: value }));

const currencies = ["XAF", "USD", "EUR", "GBP"].map((value) => ({ value, label: value }));

function hasText(value: string, length = 1) {
    return value.trim().length >= length;
}

function validEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validUrl(value: string) {
    if (!value.trim()) return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function validateStep(form: FormState, step: number): string[] {
    const errors: string[] = [];
    switch (step) {
        case 0:
            if (!hasText(form.protocolTitle, 5)) errors.push("Enter a protocol title of at least 5 characters.");
            if (!form.studyType) errors.push("Select a study type.");
            if (!form.researchField) errors.push("Select a research field.");
            if (!hasText(form.projectDescription, 20)) errors.push("Enter a description of at least 20 characters.");
            if (!validUrl(form.protocolDocument.url)) errors.push("Enter a valid protocol document URL.");
            break;
        case 1:
            if (!hasText(form.piFullName, 2)) errors.push("Enter the principal investigator's name.");
            if (!hasText(form.piInstitution, 2)) errors.push("Enter the principal investigator's institution.");
            if (!validEmail(form.piEmail)) errors.push("Enter a valid principal investigator email address.");
            if (!hasText(form.piQualification, 2)) errors.push("Enter the principal investigator's qualification.");
            if (form.piExperience && Number(form.piExperience) < 0) errors.push("Experience cannot be negative.");
            if (!validUrl(form.piCv.url)) errors.push("Enter a valid CV URL.");
            break;
        case 2:
            form.coInvestigators.forEach((investigator, index) => {
                if (!hasText(investigator.name, 2)) errors.push(`Enter a name for co-investigator ${index + 1}.`);
                if (!hasText(investigator.institution, 2)) errors.push(`Enter an institution for co-investigator ${index + 1}.`);
                if (!validEmail(investigator.email)) errors.push(`Enter a valid email for co-investigator ${index + 1}.`);
            });
            break;
        case 3:
            if (form.fundingAmount && Number(form.fundingAmount) < 0) errors.push("Funding amount cannot be negative.");
            if (!validUrl(form.fundingDocument.url)) errors.push("Enter a valid funding document URL.");
            break;
        case 4:
            if (!hasText(form.studySummaryEnglish, 20)) errors.push("Enter an English study summary of at least 20 characters.");
            break;
        case 5:
            if (!hasText(form.researchBackground, 20)) errors.push("Enter a research background of at least 20 characters.");
            if (!hasText(form.studyRationale, 10)) errors.push("Explain the rationale for the study.");
            break;
        case 6:
            if (!hasText(form.mainResearchQuestion, 10)) errors.push("Enter the main research question.");
            break;
        case 7:
            if (!hasText(form.generalObjective, 10)) errors.push("Enter the general objective.");
            if (!form.specificObjectives.some((objective) => hasText(objective, 5))) {
                errors.push("Enter at least one specific objective.");
            }
            break;
        case 8:
            if (!hasText(form.literatureReview, 50)) errors.push("Enter a literature review of at least 50 characters.");
            break;
        case 9:
            if (!form.methodStudyType) errors.push("Select a methodology study design.");
            if (!hasText(form.studyLocation, 2)) errors.push("Enter the study location.");
            if (!hasText(form.targetPopulation, 5)) errors.push("Describe the target population.");
            if (!form.sampleSize || Number(form.sampleSize) < 1) errors.push("Enter a sample size of at least 1.");
            if (form.studyStartDate && form.studyEndDate && form.studyEndDate < form.studyStartDate) {
                errors.push("The study end date must be after the start date.");
            }
            if (!hasText(form.dataCollectionMethods, 10)) errors.push("Describe the data collection methods.");
            if (!hasText(form.dataAnalysisPlan, 10)) errors.push("Describe the data analysis plan.");
            break;
        case 10:
            if (!hasText(form.participantProtection, 10)) errors.push("Describe participant protection measures.");
            if (!hasText(form.confidentialityMeasures, 10)) errors.push("Describe confidentiality and data protection measures.");
            if (!hasText(form.potentialRisks, 5)) errors.push("Describe potential risks, including when risks are minimal.");
            if (!hasText(form.expectedBenefits, 5)) errors.push("Describe expected benefits, including when there are no direct benefits.");
            break;
        case 11:
            [
                form.infoSheetEnglish,
                form.infoSheetFrench,
                form.consentFormEnglish,
                form.consentFormFrench,
            ].forEach((document) => {
                if (!validUrl(document.url)) errors.push("Enter valid consent document URLs.");
            });
            break;
        case 12:
            if (!hasText(form.dataCollectionToolsDescription, 10)) errors.push("Describe the data collection tools.");
            if (!validUrl(form.dataCollectionTools.url)) errors.push("Enter a valid data collection tools URL.");
            break;
        case 13:
            if (!form.totalBudget || Number(form.totalBudget) < 0) errors.push("Enter a valid total budget.");
            if (!validUrl(form.budgetDocument.url)) errors.push("Enter a valid budget document URL.");
            break;
        case 14:
            if (!hasText(form.authorizationInstitution, 2)) errors.push("Enter the authorizing institution.");
            if (!validUrl(form.authorizationLetter.url)) errors.push("Enter a valid authorization letter URL.");
            break;
        case 15:
            [
                form.investigatorsBrochure,
                form.participantInsurance,
                form.protocolErrorInsurance,
                form.endOfTrialAgreement,
                form.foreignEthicsApproval,
                form.materialTransferAgreement,
                form.dataSharingAgreement,
            ].forEach((document) => {
                if (!validUrl(document.url)) errors.push("Enter valid supporting document URLs.");
            });
            break;
        case 16:
            if (form.paymentReceipt.url && !validUrl(form.paymentReceipt.url)) {
                errors.push("Enter a valid payment receipt URL.");
            }
            break;
        case 17:
            if (!form.confirmed) errors.push("Confirm that the submission is complete and accurate.");
            break;
    }
    return [...new Set(errors)];
}

export default function ProtocolFormWizard() {
    const [step, setStep] = React.useState(0);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [stepErrors, setStepErrors] = React.useState<string[]>([]);
    const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
    const [form, setForm] = React.useState<FormState>(() => {
        if (typeof window === "undefined") return initialProtocolFormState;
        try {
            const saved = window.localStorage.getItem(AUTOSAVE_KEY);
            if (!saved) return initialProtocolFormState;
            const parsed = JSON.parse(saved) as Partial<FormState>;
            return {
                ...initialProtocolFormState,
                ...parsed,
                protocolDocument: { ...emptyDocument(), ...parsed.protocolDocument },
                piCv: { ...emptyDocument(), ...parsed.piCv },
                specificObjectives: parsed.specificObjectives?.length ? parsed.specificObjectives : [""],
                coInvestigators: parsed.coInvestigators || [],
            };
        } catch {
            return initialProtocolFormState;
        }
    });
    const [draftLoaded, setDraftLoaded] = React.useState(() => {
        if (typeof window === "undefined") return false;
        try {
            return Boolean(window.localStorage.getItem(AUTOSAVE_KEY));
        } catch {
            return false;
        }
    });

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setStepErrors([]);
    };

    const persistDraft = React.useCallback(
        (announce = false) => {
            try {
                window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
                setLastSavedAt(new Date());
                if (announce) toast.success("Draft saved successfully");
            } catch {
                if (announce) toast.error("Failed to save draft");
            }
        },
        [form]
    );

    React.useEffect(() => {
        const timer = window.setInterval(() => persistDraft(false), AUTOSAVE_INTERVAL);
        return () => window.clearInterval(timer);
    }, [persistDraft]);

    const clearDraft = () => {
        try {
            window.localStorage.removeItem(AUTOSAVE_KEY);
        } catch {
            // The submitted protocol is already stored by the server.
        }
        setDraftLoaded(false);
    };

    const completedSteps = STEP_LABELS.map((_, index) => validateStep(form, index).length === 0);
    const substantiveSteps = completedSteps.slice(0, -1);
    const completedCount = substantiveSteps.filter(Boolean).length;
    const progressPercent = Math.round((completedCount / substantiveSteps.length) * 100);
    const canSubmit = completedSteps.every(Boolean);

    const navigateTo = (target: number) => {
        setStep(Math.min(Math.max(target, 0), STEP_LABELS.length - 1));
        setStepErrors([]);
        window.scrollTo?.({ top: 0, behavior: "smooth" });
    };

    const goNext = () => {
        const errors = validateStep(form, step);
        if (errors.length) {
            setStepErrors(errors);
            return;
        }
        persistDraft(false);
        navigateTo(step + 1);
    };

    const handleSubmit = async () => {
        const incompleteStep = completedSteps.findIndex((complete) => !complete);
        if (incompleteStep !== -1) {
            navigateTo(incompleteStep);
            setStepErrors(validateStep(form, incompleteStep));
            toast.error("Please complete all required fields before submitting");
            return;
        }

        setIsSubmitting(true);
        try {
            const specificObjectives = form.specificObjectives.filter((objective) => objective.trim());
            const timeline =
                form.studyStartDate && form.studyEndDate
                    ? `${form.studyStartDate} to ${form.studyEndDate}`
                    : undefined;
            await submitProject({
                title: form.protocolTitle,
                description: form.projectDescription,
                objectives: [form.generalObjective, ...specificObjectives].filter(Boolean).join("\n"),
                category: form.studyType,
                location: form.studyLocation || undefined,
                timeline,
                budget: form.totalBudget
                    ? `${form.totalBudget} ${form.budgetCurrency}`
                    : undefined,
                document: form.protocolDocument.url || undefined,
                formData: JSON.parse(JSON.stringify(form)) as Record<string, unknown>,
            });
            clearDraft();
            toast.success("Protocol submitted successfully");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit protocol. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const text = (
        key: keyof FormState,
        label: string,
        options: Partial<React.ComponentProps<typeof ProtocolTextField>> = {}
    ) => (
        <ProtocolTextField
            id={String(key)}
            label={label}
            value={String(form[key] ?? "")}
            onChange={(value) => setField(key, value as FormState[typeof key])}
            {...options}
        />
    );

    const area = (
        key: keyof FormState,
        label: string,
        options: Partial<React.ComponentProps<typeof ProtocolTextArea>> = {}
    ) => (
        <ProtocolTextArea
            id={String(key)}
            label={label}
            value={String(form[key] ?? "")}
            onChange={(value) => setField(key, value as FormState[typeof key])}
            {...options}
        />
    );

    const documentField = (key: keyof FormState, label: string, hint?: string) => (
        <ProtocolDocumentField
            id={String(key)}
            label={label}
            value={form[key] as ProtocolDocument}
            onChange={(value) => setField(key, value as FormState[typeof key])}
            hint={hint}
        />
    );

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <div className="space-y-5">
                        {text("protocolTitle", "Protocol title", {
                            required: true,
                            placeholder: "Full title of the research protocol",
                        })}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <ProtocolSelectField
                                id="studyType"
                                label="Study type"
                                value={form.studyType}
                                onChange={(value) => setField("studyType", value)}
                                options={studyTypes}
                                required
                            />
                            <ProtocolSelectField
                                id="researchField"
                                label="Research field"
                                value={form.researchField}
                                onChange={(value) => setField("researchField", value)}
                                options={researchFields}
                                required
                            />
                        </div>
                        {area("projectDescription", "Protocol description", {
                            required: true,
                            hint: "Give reviewers a concise overview of the purpose and scope.",
                            placeholder: "Describe the study in at least 20 characters.",
                        })}
                        {documentField(
                            "protocolDocument",
                            "Complete protocol document",
                            "Optional at this stage. Upload a file or paste a secure public URL."
                        )}
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            {text("piFullName", "Full name", { required: true })}
                            {text("piInstitution", "Institution", { required: true })}
                            {text("piDepartment", "Department")}
                            {text("piEmail", "Email address", { type: "email", required: true })}
                            {text("piTelephone", "Telephone", { type: "tel" })}
                            {text("piQualification", "Highest qualification", { required: true })}
                            {text("piExperience", "Research experience (years)", {
                                type: "number",
                                min: 0,
                            })}
                        </div>
                        {documentField("piCv", "Curriculum vitae")}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-5">
                        {form.coInvestigators.length === 0 ? (
                            <div className="rounded-md border border-dashed border-gray-300 px-5 py-8 text-center dark:border-gray-700">
                                <p className="font-medium text-gray-900 dark:text-gray-100">No co-investigators added</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Skip this step for a single-investigator study.
                                </p>
                            </div>
                        ) : (
                            form.coInvestigators.map((investigator, index) => (
                                <fieldset
                                    key={index}
                                    className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-800"
                                >
                                    <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Co-investigator {index + 1}
                                    </legend>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {(["name", "institution", "email", "role"] as const).map((field) => (
                                            <ProtocolTextField
                                                key={field}
                                                id={`coInvestigator-${index}-${field}`}
                                                label={{
                                                    name: "Full name",
                                                    institution: "Institution",
                                                    email: "Email address",
                                                    role: "Study role",
                                                }[field]}
                                                type={field === "email" ? "email" : "text"}
                                                value={investigator[field]}
                                                onChange={(value) =>
                                                    setField(
                                                        "coInvestigators",
                                                        form.coInvestigators.map((item, itemIndex) =>
                                                            itemIndex === index ? { ...item, [field]: value } : item
                                                        )
                                                    )
                                                }
                                                required={field !== "role"}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setField(
                                                    "coInvestigators",
                                                    form.coInvestigators.filter((_, itemIndex) => itemIndex !== index)
                                                )
                                            }
                                            aria-label={`Remove co-investigator ${index + 1}`}
                                        >
                                            <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                                            Remove
                                        </Button>
                                    </div>
                                </fieldset>
                            ))
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setField("coInvestigators", [...form.coInvestigators, emptyInvestigator()])}
                        >
                            <PlusIcon className="h-4 w-4" aria-hidden="true" />
                            Add co-investigator
                        </Button>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            {text("sponsorName", "Sponsor or funder name")}
                            {text("sponsorCountry", "Sponsor country")}
                            <ProtocolSelectField
                                id="fundingSourceType"
                                label="Funding source type"
                                value={form.fundingSourceType}
                                onChange={(value) => setField("fundingSourceType", value)}
                                options={["Public", "Private", "Academic", "Non-profit", "Self-funded", "Other"].map(
                                    (value) => ({ value, label: value })
                                )}
                            />
                            <div className="grid grid-cols-[1fr_7rem] gap-3">
                                {text("fundingAmount", "Funding amount", { type: "number", min: 0 })}
                                <ProtocolSelectField
                                    id="fundingCurrency"
                                    label="Currency"
                                    value={form.fundingCurrency}
                                    onChange={(value) => setField("fundingCurrency", value)}
                                    options={currencies}
                                />
                            </div>
                        </div>
                        {documentField("fundingDocument", "Funding award or declaration")}
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-5">
                        {area("studySummaryEnglish", "Study summary in English", {
                            required: true,
                            hint: "Use language that can be understood by a non-specialist.",
                        })}
                        {area("studySummaryFrench", "Résumé de l'étude en français")}
                        {text("keywords", "Keywords", {
                            hint: "Separate keywords with commas.",
                            placeholder: "malaria, vaccine, paediatrics",
                        })}
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-5">
                        {area("researchBackground", "Research background and introduction", { required: true, rows: 7 })}
                        {area("studyRationale", "Study rationale", {
                            required: true,
                            hint: "Explain why the study is needed in the proposed setting.",
                        })}
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-5">
                        {area("mainResearchQuestion", "Main research question", { required: true })}
                        {area("researchHypothesis", "Research hypothesis", {
                            hint: "Optional for exploratory or qualitative studies.",
                        })}
                    </div>
                );
            case 7:
                return (
                    <div className="space-y-5">
                        {area("generalObjective", "General objective", { required: true })}
                        <fieldset className="space-y-3">
                            <legend className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Specific objectives <span className="text-red-700 dark:text-red-300">(Required)</span>
                            </legend>
                            {form.specificObjectives.map((objective, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <label htmlFor={`specific-objective-${index}`} className="sr-only">
                                            Specific objective {index + 1}
                                        </label>
                                        <Input
                                            id={`specific-objective-${index}`}
                                            value={objective}
                                            onChange={(event) =>
                                                setField(
                                                    "specificObjectives",
                                                    form.specificObjectives.map((item, itemIndex) =>
                                                        itemIndex === index ? event.target.value : item
                                                    )
                                                )
                                            }
                                            placeholder={`Specific objective ${index + 1}`}
                                            className="min-h-11"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        disabled={form.specificObjectives.length === 1}
                                        onClick={() =>
                                            setField(
                                                "specificObjectives",
                                                form.specificObjectives.filter((_, itemIndex) => itemIndex !== index)
                                            )
                                        }
                                        aria-label={`Remove specific objective ${index + 1}`}
                                        className="h-11 w-11"
                                    >
                                        <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setField("specificObjectives", [...form.specificObjectives, ""])}
                            >
                                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                                Add objective
                            </Button>
                        </fieldset>
                    </div>
                );
            case 8:
                return (
                    <div className="space-y-5">
                        {area("literatureReview", "Literature review", { required: true, rows: 9 })}
                        {area("literatureReferences", "Key references", {
                            rows: 6,
                            hint: "List one citation per line using a consistent citation style.",
                        })}
                    </div>
                );
            case 9:
                return (
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <ProtocolSelectField
                                id="methodStudyType"
                                label="Study design"
                                value={form.methodStudyType}
                                onChange={(value) => setField("methodStudyType", value)}
                                options={[
                                    "Randomized controlled trial",
                                    "Cohort",
                                    "Case-control",
                                    "Cross-sectional",
                                    "Qualitative",
                                    "Mixed methods",
                                    "Laboratory",
                                    "Other",
                                ].map((value) => ({ value, label: value }))}
                                required
                            />
                            {text("studyLocation", "Study location", { required: true })}
                            {text("studyStartDate", "Planned start date", { type: "date" })}
                            {text("studyEndDate", "Planned end date", { type: "date" })}
                            {text("targetPopulation", "Target population", { required: true })}
                            {text("sampleSize", "Sample size", { type: "number", min: 1, required: true })}
                            {text("samplingMethod", "Sampling method")}
                        </div>
                        {area("inclusionCriteria", "Inclusion criteria")}
                        {area("exclusionCriteria", "Exclusion criteria")}
                        {area("dataCollectionMethods", "Data collection methods", { required: true })}
                        {area("dataAnalysisPlan", "Data analysis plan", { required: true })}
                    </div>
                );
            case 10:
                return (
                    <div className="space-y-5">
                        {area("participantProtection", "Participant protection", { required: true })}
                        {area("confidentialityMeasures", "Confidentiality and data protection", { required: true })}
                        {area("potentialRisks", "Potential risks and mitigation", { required: true })}
                        {area("expectedBenefits", "Expected benefits", { required: true })}
                        {area("vulnerablePopulations", "Vulnerable populations", {
                            hint: "Identify additional safeguards or state that no vulnerable population will be enrolled.",
                        })}
                        {area("compensation", "Compensation and reimbursements")}
                    </div>
                );
            case 11:
                return (
                    <div className="space-y-5">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Upload the language versions applicable to your participants. If consent is waived, explain the waiver in the ethics section.
                        </p>
                        {documentField("infoSheetEnglish", "Participant information sheet (English)")}
                        {documentField("infoSheetFrench", "Participant information sheet (French)")}
                        {documentField("consentFormEnglish", "Informed consent form (English)")}
                        {documentField("consentFormFrench", "Informed consent form (French)")}
                    </div>
                );
            case 12:
                return (
                    <div className="space-y-5">
                        {area("dataCollectionToolsDescription", "Description of data collection tools", { required: true })}
                        {documentField("dataCollectionTools", "Questionnaires, interview guides, or case report forms")}
                    </div>
                );
            case 13:
                return (
                    <div className="space-y-5">
                        <div className="grid grid-cols-[1fr_8rem] gap-4">
                            {text("totalBudget", "Total study budget", { type: "number", min: 0, required: true })}
                            <ProtocolSelectField
                                id="budgetCurrency"
                                label="Currency"
                                value={form.budgetCurrency}
                                onChange={(value) => setField("budgetCurrency", value)}
                                options={currencies}
                                required
                            />
                        </div>
                        {documentField("budgetDocument", "Detailed budget")}
                    </div>
                );
            case 14:
                return (
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            {text("authorizationInstitution", "Authorizing institution", { required: true })}
                            {text("authorizationApprover", "Authorizing official")}
                        </div>
                        {documentField("authorizationLetter", "Institutional authorization letter")}
                    </div>
                );
            case 15:
                return (
                    <div className="space-y-5">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Add only the documents that apply to your study.
                        </p>
                        {documentField("investigatorsBrochure", "Investigator's brochure")}
                        {documentField("participantInsurance", "Participant insurance certificate")}
                        {documentField("protocolErrorInsurance", "Protocol error insurance")}
                        {documentField("endOfTrialAgreement", "End-of-trial agreement")}
                        {documentField("foreignEthicsApproval", "Foreign ethics approval")}
                        {documentField("materialTransferAgreement", "Material transfer agreement")}
                        {documentField("dataSharingAgreement", "Data sharing agreement")}
                    </div>
                );
            case 16:
                return (
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            {text("paymentReference", "Payment reference")}
                            {text("paymentDate", "Payment date", { type: "date" })}
                        </div>
                        {documentField(
                            "paymentReceipt",
                            "Payment receipt",
                            "If payment is not yet required, leave this field blank."
                        )}
                    </div>
                );
            case 17:
                return (
                    <div className="space-y-6">
                        <div className="rounded-md border border-gray-200 dark:border-gray-800">
                            <dl className="divide-y divide-gray-200 text-sm dark:divide-gray-800">
                                {[
                                    ["Protocol", form.protocolTitle],
                                    ["Study type", form.studyType],
                                    ["Principal investigator", form.piFullName],
                                    ["Institution", form.piInstitution],
                                    ["Location", form.studyLocation],
                                    ["Sample size", form.sampleSize],
                                    ["General objective", form.generalObjective],
                                    ["Specific objectives", String(form.specificObjectives.filter(Boolean).length)],
                                    ["Complete protocol document", form.protocolDocument.url ? "Attached" : "Not attached"],
                                    ["Payment receipt", form.paymentReceipt.url ? "Attached" : "Not attached"],
                                ].map(([label, value]) => (
                                    <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr]">
                                        <dt className="font-medium text-gray-600 dark:text-gray-400">{label}</dt>
                                        <dd className="break-words text-gray-900 dark:text-gray-100">{value || "Not provided"}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                        {!substantiveSteps.every(Boolean) && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                                <h3 className="font-semibold text-amber-900 dark:text-amber-100">Sections requiring attention</h3>
                                <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                                    {substantiveSteps.map((complete, index) =>
                                        complete ? null : (
                                            <li key={STEP_LABELS[index]}>
                                                <button
                                                    type="button"
                                                    onClick={() => navigateTo(index)}
                                                    className="min-h-11 text-left underline underline-offset-2"
                                                >
                                                    {index + 1}. {STEP_LABELS[index]}
                                                </button>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}
                        <label
                            htmlFor="confirmed"
                            className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-300 p-4 dark:border-gray-700"
                        >
                            <input
                                id="confirmed"
                                type="checkbox"
                                checked={form.confirmed}
                                onChange={(event) => setField("confirmed", event.target.checked)}
                                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
                            />
                            <span className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                                I confirm that the information in this submission is complete and accurate, that all required institutional permissions have been obtained, and that the study will not begin before ethics clearance.
                            </span>
                        </label>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6" data-testid="protocol-form-wizard">
            {draftLoaded && step === 0 && (
                <div
                    role="status"
                    className="flex flex-col gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900 dark:bg-blue-950/40"
                >
                    <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                        <SaveIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        A saved draft has been restored.
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setForm(initialProtocolFormState);
                            clearDraft();
                        }}
                    >
                        Start fresh
                    </Button>
                </div>
            )}

            <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <CardContent className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Step {step + 1} of {STEP_LABELS.length}:{" "}
                            <span className="font-semibold text-gray-950 dark:text-white">{STEP_LABELS[step]}</span>
                        </p>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            {progressPercent}% complete
                        </p>
                    </div>
                    <div
                        className="mt-3 h-2 overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-800"
                        role="progressbar"
                        aria-label="Protocol completion"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent}
                    >
                        <div className="h-full bg-blue-700 transition-[width] dark:bg-blue-400" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <nav aria-label="Protocol form steps" className="mt-4 overflow-x-auto pb-1">
                        <ol className="flex min-w-max gap-1">
                            {STEP_LABELS.map((label, index) => (
                                <li key={label}>
                                    <button
                                        type="button"
                                        onClick={() => navigateTo(index)}
                                        aria-current={index === step ? "step" : undefined}
                                        aria-label={`Step ${index + 1}: ${label}${completedSteps[index] ? ", complete" : ""}`}
                                        title={label}
                                        className={`flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-xs font-semibold ${
                                            index === step
                                                ? "border-blue-700 bg-blue-700 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-gray-950"
                                                : completedSteps[index]
                                                  ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
                                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
                                        }`}
                                    >
                                        {completedSteps[index] && index !== step ? (
                                            <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            index + 1
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </nav>
                </CardContent>
            </Card>

            <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                    <CardTitle>
                        <h2 className="text-xl text-gray-950 dark:text-white">{STEP_LABELS[step]}</h2>
                    </CardTitle>
                    <CardDescription>{descriptions[step]}</CardDescription>
                </CardHeader>
                <CardContent>
                    {stepErrors.length > 0 && (
                        <div
                            role="alert"
                            tabIndex={-1}
                            className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                        >
                            <div className="flex items-start gap-2">
                                <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">Complete this section before continuing</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                                        {stepErrors.map((error) => <li key={error}>{error}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                    {renderStep()}
                </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigateTo(step - 1)}
                        disabled={step === 0}
                        className="min-h-11"
                    >
                        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                        Previous
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => persistDraft(true)}
                        className="min-h-11"
                    >
                        <SaveIcon className="h-4 w-4" aria-hidden="true" />
                        Save draft
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
                        {lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Autosaves every 30 seconds"}
                    </span>
                </div>
                {step < STEP_LABELS.length - 1 ? (
                    <Button type="button" onClick={goNext} className="min-h-11 bg-blue-700 text-white hover:bg-blue-800">
                        Continue
                        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={isSubmitting || !canSubmit}
                        className="min-h-11 bg-green-700 px-6 text-white hover:bg-green-800"
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner className="size-4" />
                                Submitting
                            </>
                        ) : (
                            "Submit protocol"
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
