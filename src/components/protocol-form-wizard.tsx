"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { submitProject } from "@/app/actions/project";
import {
    TrashIcon, Loader2, UploadIcon, CheckCircleIcon, CopyIcon,
    ChevronLeftIcon, ChevronRightIcon, PlusIcon, FileTextIcon, SaveIcon,
    AlertCircleIcon, EyeIcon,
} from "lucide-react";
import { uploadSingleFileToUploadThing } from "@/lib/uploadthing-client";

// ─── Constants ──────────────────────────────────────────────────────────────

const VERCEL_BLOB_HOSTNAME = "public.blob.vercel-storage.com";

async function deleteBlobUrl(url: string) {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith(VERCEL_BLOB_HOSTNAME)) return;
        await fetch("/api/delete-blob", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
    } catch {
        // Best-effort deletion; do not surface errors to the user
    }
}

const STUDY_TYPES = [
    "Clinical Trial",
    "Observational Study",
    "Survey",
    "Qualitative Research",
    "Mixed Methods",
    "Epidemiological Study",
    "Laboratory Research",
    "Other",
];

const RESEARCH_FIELDS = [
    "Public Health",
    "Clinical Medicine",
    "Biomedical Sciences",
    "Nursing Sciences",
    "Pharmacology",
    "Epidemiology",
    "Social Sciences & Health",
    "Traditional Medicine",
    "Mental Health",
    "Environmental Health",
    "Reproductive Health",
    "Nutrition",
    "Other",
];

const FUNDING_SOURCE_TYPES = [
    "Government",
    "Private",
    "International",
    "Self-Funded",
    "Mixed",
];

const SAMPLING_METHODS = [
    "Simple Random Sampling",
    "Stratified Random Sampling",
    "Cluster Sampling",
    "Systematic Sampling",
    "Convenience Sampling",
    "Purposive Sampling",
    "Snowball Sampling",
    "Multi-stage Sampling",
    "Other",
];

const STEP_LABELS = [
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
];

const AUTOSAVE_KEY = "cnersh-protocol-draft";
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoInvestigator {
    name: string;
    institution: string;
    email: string;
    role: string;
    cvUrl: string | null;
    cvName: string | null;
}

interface FileUpload {
    url: string | null;
    name: string | null;
}

interface FormState {
    // Step 1: Protocol Info
    protocolTitle: string;
    studyType: string;
    researchField: string;
    projectDescription: string;

    // Step 2: Principal Investigator
    piFullName: string;
    piInstitution: string;
    piAddress: string;
    piTelephone: string;
    piEmail: string;
    piQualification: string;
    piExperience: string;
    piCv: FileUpload;

    // Step 3: Co-Investigators
    coInvestigators: CoInvestigator[];

    // Step 4: Sponsor/Funding
    sponsorName: string;
    sponsorAddress: string;
    sponsorCountry: string;
    fundingSourceType: string;
    fundingAmount: string;
    fundingDocument: FileUpload;

    // Step 5: Study Summary
    studySummaryEnglish: string;
    studySummaryFrench: string;

    // Step 6: Research Background
    researchBackground: string;

    // Step 7: Research Question
    mainResearchQuestion: string;
    researchHypothesis: string;

    // Step 8: Objectives
    generalObjective: string;
    specificObjectives: string[];

    // Step 9: Literature Review
    literatureReview: string;

    // Step 10: Methodology
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

    // Step 11: Ethics
    participantProtection: string;
    confidentialityMeasures: string;
    potentialRisks: string;
    expectedBenefits: string;
    compensation: string;

    // Step 12: Consent Documents
    infoSheetFrench: FileUpload;
    infoSheetEnglish: FileUpload;
    consentFormFrench: FileUpload;
    consentFormEnglish: FileUpload;

    // Step 13: Data Collection Tools
    dataCollectionTools: FileUpload;

    // Step 14: Budget
    budgetDocument: FileUpload;

    // Step 15: Institutional Authorization
    authorizationLetter: FileUpload;

    // Step 16: Additional Documents (Conditional)
    investigatorsBrochure: FileUpload;
    participantInsurance: FileUpload;
    protocolErrorInsurance: FileUpload;
    endOfTrialAgreement: FileUpload;
    foreignEthicsApproval: FileUpload;
    materialTransferAgreement: FileUpload;
    dataSharingAgreement: FileUpload;

    // Step 17: Payment
    paymentReceipt: FileUpload;

    // Step 18: confirmed
    confirmed: boolean;
}

const emptyFileUpload: FileUpload = { url: null, name: null };

const initialFormState: FormState = {
    protocolTitle: "",
    studyType: "",
    researchField: "",
    projectDescription: "",

    piFullName: "",
    piInstitution: "",
    piAddress: "",
    piTelephone: "",
    piEmail: "",
    piQualification: "",
    piExperience: "",
    piCv: { ...emptyFileUpload },

    coInvestigators: [],

    sponsorName: "",
    sponsorAddress: "",
    sponsorCountry: "",
    fundingSourceType: "",
    fundingAmount: "",
    fundingDocument: { ...emptyFileUpload },

    studySummaryEnglish: "",
    studySummaryFrench: "",

    researchBackground: "",

    mainResearchQuestion: "",
    researchHypothesis: "",

    generalObjective: "",
    specificObjectives: [""],

    literatureReview: "",

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
    compensation: "",

    infoSheetFrench: { ...emptyFileUpload },
    infoSheetEnglish: { ...emptyFileUpload },
    consentFormFrench: { ...emptyFileUpload },
    consentFormEnglish: { ...emptyFileUpload },

    dataCollectionTools: { ...emptyFileUpload },

    budgetDocument: { ...emptyFileUpload },

    authorizationLetter: { ...emptyFileUpload },

    investigatorsBrochure: { ...emptyFileUpload },
    participantInsurance: { ...emptyFileUpload },
    protocolErrorInsurance: { ...emptyFileUpload },
    endOfTrialAgreement: { ...emptyFileUpload },
    foreignEthicsApproval: { ...emptyFileUpload },
    materialTransferAgreement: { ...emptyFileUpload },
    dataSharingAgreement: { ...emptyFileUpload },

    paymentReceipt: { ...emptyFileUpload },

    confirmed: false,
};

// ─── File Upload Component ──────────────────────────────────────────────────

function FileUploadField({
    label,
    required,
    file,
    accept,
    maxSizeMB = 8,
    fieldId,
    onUpload,
    onRemove,
}: {
    label: string;
    required?: boolean;
    file: FileUpload;
    accept?: string;
    maxSizeMB?: number;
    fieldId: string;
    onUpload: (url: string, name: string) => void;
    onRemove: () => void;
}) {
    const [uploading, setUploading] = React.useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > maxSizeMB * 1024 * 1024) {
            toast.error(`File must be less than ${maxSizeMB}MB`);
            return;
        }
        setUploading(true);
        try {
            const url = await uploadSingleFileToUploadThing("protocolUploader", f);
            onUpload(url, f.name);
            toast.success(`${label} uploaded successfully`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to upload ${label.toLowerCase()}`);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    if (file.url) {
        return (
            <div className="space-y-1.5">
                <label className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{file.name || "File uploaded"}</span>
                    <a href={file.url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900">
                        <EyeIcon className="h-4 w-4 text-green-600" />
                    </a>
                    <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="file"
                accept={accept || ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
                className="hidden"
                id={fieldId}
                disabled={uploading}
                onChange={handleUpload}
            />
            <button
                type="button"
                onClick={() => document.getElementById(fieldId)?.click()}
                disabled={uploading}
                className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-4 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                    </>
                ) : (
                    <>
                        <UploadIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Click to upload (max {maxSizeMB}MB)</span>
                    </>
                )}
            </button>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProtocolFormWizard() {
    const router = useRouter();
    const [step, setStep] = React.useState(0);
    const [form, setForm] = React.useState<FormState>(initialFormState);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submittedTrackingCode, setSubmittedTrackingCode] = React.useState<string | null>(null);
    const [draftLoaded, setDraftLoaded] = React.useState(false);

    const totalSteps = STEP_LABELS.length;

    // ─── Autosave / Draft ───────────────────────────────────────────────
    // Load draft on mount
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem(AUTOSAVE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setForm((prev) => ({ ...prev, ...parsed }));
                setDraftLoaded(true);
            }
        } catch { /* ignore */ }
    }, []);

    // Autosave every 30s
    React.useEffect(() => {
        const timer = setInterval(() => {
            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
            } catch { /* ignore */ }
        }, AUTOSAVE_INTERVAL);
        return () => clearInterval(timer);
    }, [form]);

    const saveDraft = () => {
        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
            toast.success("Draft saved successfully");
        } catch {
            toast.error("Failed to save draft");
        }
    };

    const clearDraft = () => {
        localStorage.removeItem(AUTOSAVE_KEY);
        setDraftLoaded(false);
    };

    // ─── Helpers ────────────────────────────────────────────────────────
    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateFileField = (key: keyof FormState, url: string, name: string) => {
        setForm((prev) => ({ ...prev, [key]: { url, name } }));
    };

    const removeFileField = (key: keyof FormState) => {
        const currentUrl = (form[key] as FileUpload | undefined)?.url;
        if (currentUrl) deleteBlobUrl(currentUrl);
        setForm((prev) => ({ ...prev, [key]: { url: null, name: null } }));
    };

    // Conditional checks
    const isClinicalTrial = form.studyType === "Clinical Trial";
    const isForeignSponsor = form.sponsorCountry.trim().length > 0 &&
        form.sponsorCountry.trim().toLowerCase() !== "cameroon" &&
        form.sponsorCountry.trim().toLowerCase() !== "cameroun";

    // ─── Step Validation ────────────────────────────────────────────────
    const stepValid = (s: number): boolean => {
        switch (s) {
            case 0: return form.protocolTitle.trim().length >= 5 && !!form.studyType && !!form.researchField && form.projectDescription.trim().length >= 20;
            case 1: return form.piFullName.trim().length >= 2 && form.piInstitution.trim().length >= 2 && form.piEmail.trim().length >= 5;
            case 2: return true; // co-investigators are optional
            case 3: return true; // sponsor is optional
            case 4: return form.studySummaryEnglish.trim().length >= 20;
            case 5: return form.researchBackground.trim().length >= 20;
            case 6: return form.mainResearchQuestion.trim().length >= 10;
            case 7: return form.generalObjective.trim().length >= 10 && form.specificObjectives.some((o) => o.trim().length >= 5);
            case 8: return form.literatureReview.trim().length >= 50;
            case 9: return form.studyLocation.trim().length >= 2 && form.targetPopulation.trim().length >= 5 && form.sampleSize.trim().length >= 1;
            case 10: return form.participantProtection.trim().length >= 10;
            case 11: return true; // consent documents optional
            case 12: return true; // data collection tools optional
            case 13: return true; // budget optional
            case 14: return true; // auth letter optional
            case 15: return true; // additional docs conditional
            case 16: return true; // payment optional
            case 17: return form.confirmed;
            default: return true;
        }
    };

    const completedSteps = STEP_LABELS.map((_, i) => stepValid(i));
    const completedCount = completedSteps.filter(Boolean).length;
    const progressPercent = Math.round((completedCount / totalSteps) * 100);

    const canSubmit = completedSteps.every(Boolean);

    // ─── Navigation ─────────────────────────────────────────────────────
    const goNext = () => { if (step < totalSteps - 1) setStep(step + 1); };
    const goPrev = () => { if (step > 0) setStep(step - 1); };

    // ─── Submit ─────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!canSubmit) {
            toast.error("Please complete all required fields before submitting");
            return;
        }
        setIsSubmitting(true);
        try {
            const timeline = form.studyStartDate && form.studyEndDate
                ? `${form.studyStartDate} to ${form.studyEndDate}`
                : form.studyStartDate || form.studyEndDate || undefined;

            const project = await submitProject({
                title: form.protocolTitle,
                description: form.projectDescription,
                objectives: form.generalObjective,
                category: form.studyType || "Other",
                location: form.studyLocation || undefined,
                timeline,
                budget: form.fundingAmount || undefined,
                document: form.piCv.url || undefined,
                formData: JSON.parse(JSON.stringify(form)) as Record<string, unknown>,
            });
            setSubmittedTrackingCode(project.trackingCode);
            clearDraft();
            toast.success("Protocol submitted successfully!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to submit protocol. Please try again.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyCode = () => {
        if (submittedTrackingCode) {
            navigator.clipboard.writeText(submittedTrackingCode);
            toast.success("Tracking code copied to clipboard!");
        }
    };

    // ─── Success Screen ─────────────────────────────────────────────────
    if (submittedTrackingCode) {
        return (
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                <CardContent className="py-12 flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Protocol Submitted Successfully!
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your protocol has been submitted for ethical review by the National Ethics Committee for Human Health Research (CNERSH). Use the tracking code below to check your protocol status.
                        </p>
                    </div>
                    <div className="w-full max-w-sm p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 uppercase tracking-wide">
                            Your Protocol File Number
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="flex-1 text-xl font-bold font-mono text-blue-900 dark:text-blue-100 tracking-widest">
                                {submittedTrackingCode}
                            </span>
                            <button onClick={handleCopyCode} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" title="Copy tracking code">
                                <CopyIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                        Save this code. You can use it on the homepage to track your protocol status at any time — even without logging in.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => router.push("/protocols")}>View My Protocols</Button>
                        <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={() => router.push("/")}>Go to Homepage</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ─── Step Content ───────────────────────────────────────────────────
    const renderStep = () => {
        switch (step) {
            // ── Step 1: Research Protocol Information ──
            case 0:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Protocol Title <span className="text-red-500">*</span></label>
                            <Input value={form.protocolTitle} onChange={(e) => updateField("protocolTitle", e.target.value)} placeholder="Enter the full title of your research protocol" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Study Type <span className="text-red-500">*</span></label>
                                <Select value={form.studyType} onValueChange={(v) => updateField("studyType", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select study type" /></SelectTrigger>
                                    <SelectContent>{STUDY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Research Field <span className="text-red-500">*</span></label>
                                <Select value={form.researchField} onValueChange={(v) => updateField("researchField", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select research field" /></SelectTrigger>
                                    <SelectContent>{RESEARCH_FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Submission Date</label>
                            <Input value={new Date().toLocaleDateString("en-GB")} disabled className="bg-gray-100 dark:bg-gray-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Project Description <span className="text-red-500">*</span>
                                <span className="ml-1 text-xs text-gray-400">({form.projectDescription.trim().length}/20 min chars)</span>
                            </label>
                            <Textarea value={form.projectDescription} onChange={(e) => updateField("projectDescription", e.target.value)} placeholder="Provide a brief description of the research project" className="min-h-[120px]" />
                        </div>
                    </div>
                );

            // ── Step 2: Principal Investigator ──
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                                <Input value={form.piFullName} onChange={(e) => updateField("piFullName", e.target.value)} placeholder="Dr. Full Name" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Institution / Organization <span className="text-red-500">*</span></label>
                                <Input value={form.piInstitution} onChange={(e) => updateField("piInstitution", e.target.value)} placeholder="University / Hospital" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Address</label>
                            <Input value={form.piAddress} onChange={(e) => updateField("piAddress", e.target.value)} placeholder="Full postal address" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Telephone Number</label>
                                <Input value={form.piTelephone} onChange={(e) => updateField("piTelephone", e.target.value)} placeholder="+237 6XX XXX XXX" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address <span className="text-red-500">*</span></label>
                                <Input type="email" value={form.piEmail} onChange={(e) => updateField("piEmail", e.target.value)} placeholder="researcher@institution.cm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Academic Qualification</label>
                                <Input value={form.piQualification} onChange={(e) => updateField("piQualification", e.target.value)} placeholder="e.g., PhD, MD, MPH" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Years of Research Experience</label>
                                <Input value={form.piExperience} onChange={(e) => updateField("piExperience", e.target.value)} placeholder="e.g., 10" />
                            </div>
                        </div>
                        <FileUploadField
                            label="CV Upload"
                            fieldId="pi-cv-upload"
                            file={form.piCv}
                            onUpload={(url, name) => updateFileField("piCv", url, name)}
                            onRemove={() => removeFileField("piCv")}
                        />
                    </div>
                );

            // ── Step 3: Co-Investigators ──
            case 2:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Add co-investigators for this research project. This section is optional.</p>
                        {form.coInvestigators.map((ci, idx) => (
                            <div key={idx} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Co-Investigator {idx + 1}</span>
                                    <button type="button" onClick={() => {
                                        const updated = form.coInvestigators.filter((_, i) => i !== idx);
                                        updateField("coInvestigators", updated);
                                    }} className="text-red-500 hover:text-red-700">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input value={ci.name} onChange={(e) => {
                                        const updated = [...form.coInvestigators];
                                        updated[idx] = { ...updated[idx], name: e.target.value };
                                        updateField("coInvestigators", updated);
                                    }} placeholder="Full Name" />
                                    <Input value={ci.institution} onChange={(e) => {
                                        const updated = [...form.coInvestigators];
                                        updated[idx] = { ...updated[idx], institution: e.target.value };
                                        updateField("coInvestigators", updated);
                                    }} placeholder="Institution" />
                                    <Input type="email" value={ci.email} onChange={(e) => {
                                        const updated = [...form.coInvestigators];
                                        updated[idx] = { ...updated[idx], email: e.target.value };
                                        updateField("coInvestigators", updated);
                                    }} placeholder="Email" />
                                    <Input value={ci.role} onChange={(e) => {
                                        const updated = [...form.coInvestigators];
                                        updated[idx] = { ...updated[idx], role: e.target.value };
                                        updateField("coInvestigators", updated);
                                    }} placeholder="Role in Research" />
                                </div>
                                <FileUploadField
                                    label="CV"
                                    fieldId={`co-inv-cv-${idx}`}
                                    file={{ url: ci.cvUrl, name: ci.cvName }}
                                    onUpload={(url, name) => {
                                        const updated = [...form.coInvestigators];
                                        updated[idx] = { ...updated[idx], cvUrl: url, cvName: name };
                                        updateField("coInvestigators", updated);
                                    }}
                                    onRemove={() => {
                                        const updated = [...form.coInvestigators];
                                        updated[idx] = { ...updated[idx], cvUrl: null, cvName: null };
                                        updateField("coInvestigators", updated);
                                    }}
                                />
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => {
                            updateField("coInvestigators", [...form.coInvestigators, { name: "", institution: "", email: "", role: "", cvUrl: null, cvName: null }]);
                        }} className="w-full">
                            <PlusIcon className="h-4 w-4 mr-2" /> Add Co-Investigator
                        </Button>
                    </div>
                );

            // ── Step 4: Sponsor / Funding ──
            case 3:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sponsor Name</label>
                                <Input value={form.sponsorName} onChange={(e) => updateField("sponsorName", e.target.value)} placeholder="Sponsor or funding body name" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Country</label>
                                <Input value={form.sponsorCountry} onChange={(e) => updateField("sponsorCountry", e.target.value)} placeholder="e.g., Cameroon" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Organization Address</label>
                            <Input value={form.sponsorAddress} onChange={(e) => updateField("sponsorAddress", e.target.value)} placeholder="Full address of the sponsoring organization" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Funding Source Type</label>
                                <Select value={form.fundingSourceType} onValueChange={(v) => updateField("fundingSourceType", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select funding type" /></SelectTrigger>
                                    <SelectContent>{FUNDING_SOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Funding Amount <span className="text-gray-400 text-xs">(optional)</span></label>
                                <Input value={form.fundingAmount} onChange={(e) => updateField("fundingAmount", e.target.value)} placeholder="e.g., 5,000,000 XAF" />
                            </div>
                        </div>
                        <FileUploadField
                            label="Funding Document"
                            fieldId="funding-doc-upload"
                            file={form.fundingDocument}
                            onUpload={(url, name) => updateFileField("fundingDocument", url, name)}
                            onRemove={() => removeFileField("fundingDocument")}
                        />
                    </div>
                );

            // ── Step 5: Study Summary ──
            case 4:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Study Summary in English <span className="text-red-500">*</span>
                                <span className="ml-1 text-xs text-gray-400">({form.studySummaryEnglish.trim().length}/20 min chars)</span>
                            </label>
                            <Textarea value={form.studySummaryEnglish} onChange={(e) => updateField("studySummaryEnglish", e.target.value)} placeholder="Provide a concise summary of the study in English..." className="min-h-[150px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Study Summary in French <span className="text-gray-400 text-xs">(Résumé de l&#39;étude)</span></label>
                            <Textarea value={form.studySummaryFrench} onChange={(e) => updateField("studySummaryFrench", e.target.value)} placeholder="Fournissez un résumé concis de l'étude en français..." className="min-h-[150px]" />
                        </div>
                    </div>
                );

            // ── Step 6: Research Background ──
            case 5:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Explain the context and justification of the study. Include relevant background information that motivates this research.</p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Research Background and Introduction <span className="text-red-500">*</span>
                                <span className="ml-1 text-xs text-gray-400">({form.researchBackground.trim().length}/20 min chars)</span>
                            </label>
                            <Textarea value={form.researchBackground} onChange={(e) => updateField("researchBackground", e.target.value)} placeholder="Provide the research background, context, and justification for this study..." className="min-h-[250px]" />
                        </div>
                    </div>
                );

            // ── Step 7: Research Question and Hypothesis ──
            case 6:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Main Research Question <span className="text-red-500">*</span></label>
                            <Textarea value={form.mainResearchQuestion} onChange={(e) => updateField("mainResearchQuestion", e.target.value)} placeholder="What is the main research question this study aims to answer?" className="min-h-[100px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Research Hypothesis <span className="text-gray-400 text-xs">(optional)</span></label>
                            <Textarea value={form.researchHypothesis} onChange={(e) => updateField("researchHypothesis", e.target.value)} placeholder="State the research hypothesis, if applicable" className="min-h-[80px]" />
                        </div>
                    </div>
                );

            // ── Step 8: Research Objectives ──
            case 7:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">General Objective <span className="text-red-500">*</span></label>
                            <Textarea value={form.generalObjective} onChange={(e) => updateField("generalObjective", e.target.value)} placeholder="State the general objective of the research" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Specific Objectives <span className="text-red-500">*</span></label>
                            {form.specificObjectives.map((obj, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                                    <Input value={obj} onChange={(e) => {
                                        const updated = [...form.specificObjectives];
                                        updated[idx] = e.target.value;
                                        updateField("specificObjectives", updated);
                                    }} placeholder={`Specific objective ${idx + 1}`} />
                                    {form.specificObjectives.length > 1 && (
                                        <button type="button" onClick={() => {
                                            updateField("specificObjectives", form.specificObjectives.filter((_, i) => i !== idx));
                                        }} className="text-red-500 hover:text-red-700 shrink-0">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => updateField("specificObjectives", [...form.specificObjectives, ""])}>
                                <PlusIcon className="h-3 w-3 mr-1" /> Add Objective
                            </Button>
                        </div>
                    </div>
                );

            // ── Step 9: Literature Review ──
            case 8:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Provide a comprehensive literature review. Expected length: 10–15 pages of content.</p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Literature Review <span className="text-red-500">*</span>
                                <span className="ml-1 text-xs text-gray-400">({form.literatureReview.trim().length}/50 min chars)</span>
                            </label>
                            <Textarea value={form.literatureReview} onChange={(e) => updateField("literatureReview", e.target.value)} placeholder="Write or paste your comprehensive literature review here..." className="min-h-[400px]" />
                        </div>
                    </div>
                );

            // ── Step 10: Methodology ──
            case 9:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Study Type</label>
                                <Input value={form.methodStudyType} onChange={(e) => updateField("methodStudyType", e.target.value)} placeholder="e.g., Cross-sectional, Cohort, RCT" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Study Location / Health Facility <span className="text-red-500">*</span></label>
                                <Input value={form.studyLocation} onChange={(e) => updateField("studyLocation", e.target.value)} placeholder="Name and location of the study site" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Study Start Date</label>
                                <Input type="date" value={form.studyStartDate} onChange={(e) => updateField("studyStartDate", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Study End Date</label>
                                <Input type="date" value={form.studyEndDate} onChange={(e) => updateField("studyEndDate", e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Target Population <span className="text-red-500">*</span></label>
                                <Input value={form.targetPopulation} onChange={(e) => updateField("targetPopulation", e.target.value)} placeholder="Describe the target population" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sample Size <span className="text-red-500">*</span></label>
                                <Input value={form.sampleSize} onChange={(e) => updateField("sampleSize", e.target.value)} placeholder="e.g., 200 participants" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Sampling Method</label>
                            <Select value={form.samplingMethod} onValueChange={(v) => updateField("samplingMethod", v)}>
                                <SelectTrigger><SelectValue placeholder="Select sampling method" /></SelectTrigger>
                                <SelectContent>{SAMPLING_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Inclusion Criteria</label>
                            <Textarea value={form.inclusionCriteria} onChange={(e) => updateField("inclusionCriteria", e.target.value)} placeholder="List the criteria for including participants in the study" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Exclusion Criteria</label>
                            <Textarea value={form.exclusionCriteria} onChange={(e) => updateField("exclusionCriteria", e.target.value)} placeholder="List the criteria for excluding participants from the study" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data Collection Methods</label>
                            <Textarea value={form.dataCollectionMethods} onChange={(e) => updateField("dataCollectionMethods", e.target.value)} placeholder="Describe the methods used to collect data" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data Analysis Plan</label>
                            <Textarea value={form.dataAnalysisPlan} onChange={(e) => updateField("dataAnalysisPlan", e.target.value)} placeholder="Describe how the collected data will be analyzed" className="min-h-[80px]" />
                        </div>
                    </div>
                );

            // ── Step 11: Ethical Considerations ──
            case 10:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Participant Protection <span className="text-red-500">*</span></label>
                            <Textarea value={form.participantProtection} onChange={(e) => updateField("participantProtection", e.target.value)} placeholder="Describe measures to protect participants" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confidentiality Measures</label>
                            <Textarea value={form.confidentialityMeasures} onChange={(e) => updateField("confidentialityMeasures", e.target.value)} placeholder="Describe how participant data will be kept confidential" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Potential Risks</label>
                            <Textarea value={form.potentialRisks} onChange={(e) => updateField("potentialRisks", e.target.value)} placeholder="Identify potential risks to participants" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Expected Benefits</label>
                            <Textarea value={form.expectedBenefits} onChange={(e) => updateField("expectedBenefits", e.target.value)} placeholder="Describe the expected benefits of this research" className="min-h-[80px]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Compensation <span className="text-gray-400 text-xs">(if applicable)</span></label>
                            <Textarea value={form.compensation} onChange={(e) => updateField("compensation", e.target.value)} placeholder="Describe any compensation for participants" className="min-h-[60px]" />
                        </div>
                    </div>
                );

            // ── Step 12: Consent Documents ──
            case 11:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload consent documents in both French and English.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FileUploadField label="Participant Information Sheet (English)" fieldId="info-sheet-en" file={form.infoSheetEnglish}
                                onUpload={(url, name) => updateFileField("infoSheetEnglish", url, name)}
                                onRemove={() => removeFileField("infoSheetEnglish")} />
                            <FileUploadField label="Participant Information Sheet (French)" fieldId="info-sheet-fr" file={form.infoSheetFrench}
                                onUpload={(url, name) => updateFileField("infoSheetFrench", url, name)}
                                onRemove={() => removeFileField("infoSheetFrench")} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FileUploadField label="Informed Consent Form (English)" fieldId="consent-en" file={form.consentFormEnglish}
                                onUpload={(url, name) => updateFileField("consentFormEnglish", url, name)}
                                onRemove={() => removeFileField("consentFormEnglish")} />
                            <FileUploadField label="Informed Consent Form (French)" fieldId="consent-fr" file={form.consentFormFrench}
                                onUpload={(url, name) => updateFileField("consentFormFrench", url, name)}
                                onRemove={() => removeFileField("consentFormFrench")} />
                        </div>
                    </div>
                );

            // ── Step 13: Data Collection Tools ──
            case 12:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload questionnaires, interview guides, CRFs, or discussion guides used for data collection.</p>
                        <FileUploadField label="Data Collection Tools" fieldId="data-tools-upload" file={form.dataCollectionTools}
                            onUpload={(url, name) => updateFileField("dataCollectionTools", url, name)}
                            onRemove={() => removeFileField("dataCollectionTools")} />
                    </div>
                );

            // ── Step 14: Budget ──
            case 13:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload a detailed project budget document.</p>
                        <FileUploadField label="Budget Document" fieldId="budget-upload" file={form.budgetDocument}
                            onUpload={(url, name) => updateFileField("budgetDocument", url, name)}
                            onRemove={() => removeFileField("budgetDocument")} />
                    </div>
                );

            // ── Step 15: Institutional Authorization ──
            case 14:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload the approval letter from the healthcare facility where the study will be conducted.</p>
                        <FileUploadField label="Authorization Letter" fieldId="auth-letter-upload" file={form.authorizationLetter}
                            onUpload={(url, name) => updateFileField("authorizationLetter", url, name)}
                            onRemove={() => removeFileField("authorizationLetter")} />
                    </div>
                );

            // ── Step 16: Additional Documents (Conditional) ──
            case 15: {
                const showClinicalTrialDocs = isClinicalTrial;
                const showForeignDocs = isForeignSponsor;

                if (!showClinicalTrialDocs && !showForeignDocs) {
                    return (
                        <div className="space-y-4">
                            <div className="p-6 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <FileTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    No additional documents required for this submission type.
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Additional documents are required for Clinical Trials or when the sponsor is outside Cameroon.
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="space-y-6">
                        {showClinicalTrialDocs && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Clinical Trial Documents</h3>
                                <FileUploadField label="Investigator's Brochure" fieldId="inv-brochure" file={form.investigatorsBrochure}
                                    onUpload={(url, name) => updateFileField("investigatorsBrochure", url, name)}
                                    onRemove={() => removeFileField("investigatorsBrochure")} />
                                <FileUploadField label="Participant Insurance" fieldId="part-insurance" file={form.participantInsurance}
                                    onUpload={(url, name) => updateFileField("participantInsurance", url, name)}
                                    onRemove={() => removeFileField("participantInsurance")} />
                                <FileUploadField label="Protocol Error Insurance" fieldId="protocol-insurance" file={form.protocolErrorInsurance}
                                    onUpload={(url, name) => updateFileField("protocolErrorInsurance", url, name)}
                                    onRemove={() => removeFileField("protocolErrorInsurance")} />
                                <FileUploadField label="End-of-Trial Treatment Agreement" fieldId="end-trial" file={form.endOfTrialAgreement}
                                    onUpload={(url, name) => updateFileField("endOfTrialAgreement", url, name)}
                                    onRemove={() => removeFileField("endOfTrialAgreement")} />
                            </div>
                        )}
                        {showForeignDocs && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">Foreign Sponsor Documents</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Required because the sponsor country is outside Cameroon ({form.sponsorCountry}).</p>
                                <FileUploadField label="Foreign Ethics Approval" fieldId="foreign-ethics" file={form.foreignEthicsApproval}
                                    onUpload={(url, name) => updateFileField("foreignEthicsApproval", url, name)}
                                    onRemove={() => removeFileField("foreignEthicsApproval")} />
                                <FileUploadField label="Material Transfer Agreement (MTA)" fieldId="mta" file={form.materialTransferAgreement}
                                    onUpload={(url, name) => updateFileField("materialTransferAgreement", url, name)}
                                    onRemove={() => removeFileField("materialTransferAgreement")} />
                                <FileUploadField label="Data Sharing Agreement (DSA)" fieldId="dsa" file={form.dataSharingAgreement}
                                    onUpload={(url, name) => updateFileField("dataSharingAgreement", url, name)}
                                    onRemove={() => removeFileField("dataSharingAgreement")} />
                            </div>
                        )}
                    </div>
                );
            }

            // ── Step 17: Submission Fee Proof ──
            case 16:
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload proof of payment for the ethics committee submission fee.</p>
                        <FileUploadField label="Payment Receipt" fieldId="payment-receipt" file={form.paymentReceipt}
                            onUpload={(url, name) => updateFileField("paymentReceipt", url, name)}
                            onRemove={() => removeFileField("paymentReceipt")} />
                    </div>
                );

            // ── Step 18: Final Review & Submit ──
            case 17:
                return (
                    <div className="space-y-6">
                        <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Review Your Submission</h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Please verify all information below before submitting your protocol for ethical review.</p>
                        </div>

                        {/* Summary sections */}
                        <div className="space-y-4">
                            <SummarySection title="Protocol Information" items={[
                                { label: "Title", value: form.protocolTitle },
                                { label: "Study Type", value: form.studyType },
                                { label: "Research Field", value: form.researchField },
                                { label: "Description", value: form.projectDescription, truncate: true },
                            ]} />
                            <SummarySection title="Principal Investigator" items={[
                                { label: "Name", value: form.piFullName },
                                { label: "Institution", value: form.piInstitution },
                                { label: "Email", value: form.piEmail },
                                { label: "Qualification", value: form.piQualification },
                                { label: "CV", value: form.piCv.name || "" },
                            ]} />
                            {form.coInvestigators.length > 0 && (
                                <SummarySection title="Co-Investigators" items={form.coInvestigators.map((ci, i) => ({
                                    label: `Co-Investigator ${i + 1}`,
                                    value: `${ci.name} (${ci.institution}) - ${ci.role}`,
                                }))} />
                            )}
                            {form.sponsorName && (
                                <SummarySection title="Sponsor / Funding" items={[
                                    { label: "Sponsor", value: form.sponsorName },
                                    { label: "Country", value: form.sponsorCountry },
                                    { label: "Funding Type", value: form.fundingSourceType },
                                    { label: "Amount", value: form.fundingAmount },
                                ]} />
                            )}
                            <SummarySection title="Research Details" items={[
                                { label: "Research Question", value: form.mainResearchQuestion, truncate: true },
                                { label: "General Objective", value: form.generalObjective, truncate: true },
                                { label: "Study Location", value: form.studyLocation },
                                { label: "Sample Size", value: form.sampleSize },
                                { label: "Study Period", value: form.studyStartDate && form.studyEndDate ? `${form.studyStartDate} to ${form.studyEndDate}` : "" },
                            ]} />
                            <SummarySection title="Documents Uploaded" items={[
                                { label: "PI CV", value: form.piCv.name || "Not uploaded" },
                                { label: "Funding Document", value: form.fundingDocument.name || "Not uploaded" },
                                { label: "Info Sheet (EN)", value: form.infoSheetEnglish.name || "Not uploaded" },
                                { label: "Info Sheet (FR)", value: form.infoSheetFrench.name || "Not uploaded" },
                                { label: "Consent Form (EN)", value: form.consentFormEnglish.name || "Not uploaded" },
                                { label: "Consent Form (FR)", value: form.consentFormFrench.name || "Not uploaded" },
                                { label: "Data Collection Tools", value: form.dataCollectionTools.name || "Not uploaded" },
                                { label: "Budget Document", value: form.budgetDocument.name || "Not uploaded" },
                                { label: "Authorization Letter", value: form.authorizationLetter.name || "Not uploaded" },
                                { label: "Payment Receipt", value: form.paymentReceipt.name || "Not uploaded" },
                            ]} />
                        </div>

                        {/* Incomplete steps warning */}
                        {!canSubmit && (
                            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
                                <AlertCircleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Some required sections are incomplete</p>
                                    <ul className="mt-1 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                                        {STEP_LABELS.map((label, i) => !completedSteps[i] && i < totalSteps - 1 && (
                                            <li key={i}>
                                                <button type="button" onClick={() => setStep(i)} className="underline hover:text-amber-900 dark:hover:text-amber-100">
                                                    Step {i + 1}: {label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Confirmation checkbox */}
                        <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <input
                                type="checkbox"
                                checked={form.confirmed}
                                onChange={(e) => updateField("confirmed", e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                I confirm that all information provided is accurate and complete. I understand that this protocol will be reviewed by the National Ethics Committee for Human Health Research (CNERSH) in accordance with the guidelines of the Ministry of Public Health, Cameroon.
                            </span>
                        </label>
                    </div>
                );

            default:
                return null;
        }
    };

    // ─── Main Render ────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Draft notification */}
            {draftLoaded && step === 0 && (
                <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SaveIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800 dark:text-blue-200">A saved draft has been restored.</span>
                    </div>
                    <button onClick={() => { setForm(initialFormState); clearDraft(); setDraftLoaded(false); }} className="text-xs text-blue-600 hover:text-blue-800 underline">
                        Start fresh
                    </button>
                </div>
            )}

            {/* Progress Indicator */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Step {step + 1} of {totalSteps}: <span className="font-semibold">{STEP_LABELS[step]}</span>
                        </span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressPercent}% complete</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-2 rounded-full transition-all duration-500 bg-blue-600"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    {/* Step indicator dots */}
                    <div className="flex gap-1 mt-3 flex-wrap">
                        {STEP_LABELS.map((label, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setStep(i)}
                                title={`${label}${completedSteps[i] ? " ✓" : ""}`}
                                className={`h-2 flex-1 min-w-[12px] rounded-full transition-all ${
                                    i === step
                                        ? "bg-blue-600 ring-2 ring-blue-300 dark:ring-blue-700"
                                        : completedSteps[i]
                                        ? "bg-green-500"
                                        : "bg-gray-300 dark:bg-gray-600"
                                }`}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Step Content */}
            <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold">
                            {step + 1}
                        </span>
                        {STEP_LABELS[step]}
                    </CardTitle>
                    <CardDescription>
                        {step === 17 ? "Review all information and confirm before submitting" : "Complete the fields below and proceed to the next step"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderStep()}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={goPrev}
                        disabled={step === 0}
                    >
                        <ChevronLeftIcon className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button type="button" variant="outline" onClick={saveDraft}>
                        <SaveIcon className="h-4 w-4 mr-1" /> Save Draft
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {step < totalSteps - 1 ? (
                        <Button type="button" onClick={goNext} className="bg-blue-700 hover:bg-blue-800 text-white">
                            Next <ChevronRightIcon className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !canSubmit}
                            className="bg-green-700 hover:bg-green-800 text-white px-6"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Spinner className="size-4" /> Submitting...
                                </span>
                            ) : (
                                "Submit Protocol"
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Summary Section Helper ─────────────────────────────────────────────────

function SummarySection({ title, items }: { title: string; items: { label: string; value: string; truncate?: boolean }[] }) {
    const filteredItems = items.filter((item) => item.value);
    if (filteredItems.length === 0) return null;
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredItems.map((item, i) => (
                    <div key={i} className="px-4 py-2 flex flex-col sm:flex-row gap-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 sm:w-40 shrink-0">{item.label}</span>
                        <span className={`text-sm text-gray-800 dark:text-gray-200 ${item.truncate ? "line-clamp-2" : ""}`}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
