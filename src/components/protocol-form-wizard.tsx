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
import { TrashIcon, Loader2, UploadIcon, CheckCircleIcon, CopyIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, FileTextIcon, SaveIcon, AlertCircleIcon, EyeIcon } from "lucide-react";

const AUTOSAVE_KEY = "cnersh-protocol-draft";
const AUTOSAVE_INTERVAL = 30000;

function deleteBlobUrl(url: string) {
  void url;
}

const STUDY_TYPES = ["Clinical Trial", "Observational Study", "Survey", "Qualitative Research", "Mixed Methods", "Epidemiological Study", "Laboratory Research", "Other"];
const RESEARCH_FIELDS = ["Public Health", "Clinical Medicine", "Biomedical Sciences", "Nursing Sciences", "Pharmacology", "Epidemiology", "Social Sciences & Health", "Traditional Medicine", "Mental Health", "Environmental Health", "Reproductive Health", "Nutrition", "Other"];
const FUNDING_SOURCE_TYPES = ["Government", "Private", "International", "Self-Funded", "Mixed"];
const SAMPLING_METHODS = ["Simple Random Sampling", "Stratified Random Sampling", "Cluster Sampling", "Systematic Sampling", "Convenience Sampling", "Purposive Sampling", "Snowball Sampling", "Multi-stage Sampling", "Other"];
const STEP_LABELS = ["Protocol Info", "Principal Investigator", "Co-Investigators", "Sponsor / Funding", "Study Summary", "Background", "Research Question", "Objectives", "Literature Review", "Methodology", "Ethics", "Consent Documents", "Data Collection Tools", "Budget", "Authorization", "Additional Documents", "Payment Proof", "Review & Submit"];

interface CoInvestigator { name: string; institution: string; email: string; role: string; cvUrl: string | null; cvName: string | null; }
interface FileUpload { url: string | null; name: string | null; }
interface FormState {
  protocolTitle: string; studyType: string; researchField: string; projectDescription: string; piFullName: string; piInstitution: string; piAddress: string; piTelephone: string; piEmail: string; piQualification: string; piExperience: string; piCv: FileUpload; coInvestigators: CoInvestigator[]; sponsorName: string; sponsorAddress: string; sponsorCountry: string; fundingSourceType: string; fundingAmount: string; fundingDocument: FileUpload; studySummaryEnglish: string; studySummaryFrench: string; researchBackground: string; mainResearchQuestion: string; researchHypothesis: string; generalObjective: string; specificObjectives: string[]; literatureReview: string; methodStudyType: string; studyLocation: string; studyStartDate: string; studyEndDate: string; targetPopulation: string; sampleSize: string; samplingMethod: string; inclusionCriteria: string; exclusionCriteria: string; dataCollectionMethods: string; dataAnalysisPlan: string; participantProtection: string; confidentialityMeasures: string; potentialRisks: string; expectedBenefits: string; compensation: string; infoSheetFrench: FileUpload; infoSheetEnglish: FileUpload; consentFormFrench: FileUpload; consentFormEnglish: FileUpload; dataCollectionTools: FileUpload; budgetDocument: FileUpload; authorizationLetter: FileUpload; investigatorsBrochure: FileUpload; participantInsurance: FileUpload; protocolErrorInsurance: FileUpload; endOfTrialAgreement: FileUpload; foreignEthicsApproval: FileUpload; materialTransferAgreement: FileUpload; dataSharingAgreement: FileUpload; paymentReceipt: FileUpload; confirmed: boolean;
}
const emptyFileUpload: FileUpload = { url: null, name: null };
const initialFormState: FormState = { protocolTitle: "", studyType: "", researchField: "", projectDescription: "", piFullName: "", piInstitution: "", piAddress: "", piTelephone: "", piEmail: "", piQualification: "", piExperience: "", piCv: { ...emptyFileUpload }, coInvestigators: [], sponsorName: "", sponsorAddress: "", sponsorCountry: "", fundingSourceType: "", fundingAmount: "", fundingDocument: { ...emptyFileUpload }, studySummaryEnglish: "", studySummaryFrench: "", researchBackground: "", mainResearchQuestion: "", researchHypothesis: "", generalObjective: "", specificObjectives: [""], literatureReview: "", methodStudyType: "", studyLocation: "", studyStartDate: "", studyEndDate: "", targetPopulation: "", sampleSize: "", samplingMethod: "", inclusionCriteria: "", exclusionCriteria: "", dataCollectionMethods: "", dataAnalysisPlan: "", participantProtection: "", confidentialityMeasures: "", potentialRisks: "", expectedBenefits: "", compensation: "", infoSheetFrench: { ...emptyFileUpload }, infoSheetEnglish: { ...emptyFileUpload }, consentFormFrench: { ...emptyFileUpload }, consentFormEnglish: { ...emptyFileUpload }, dataCollectionTools: { ...emptyFileUpload }, budgetDocument: { ...emptyFileUpload }, authorizationLetter: { ...emptyFileUpload }, investigatorsBrochure: { ...emptyFileUpload }, participantInsurance: { ...emptyFileUpload }, protocolErrorInsurance: { ...emptyFileUpload }, endOfTrialAgreement: { ...emptyFileUpload }, foreignEthicsApproval: { ...emptyFileUpload }, materialTransferAgreement: { ...emptyFileUpload }, dataSharingAgreement: { ...emptyFileUpload }, paymentReceipt: { ...emptyFileUpload }, confirmed: false };

function FileUploadField({ label, required, file, accept, maxSizeMB = 8, fieldId, onUpload, onRemove }: { label: string; required?: boolean; file: FileUpload; accept?: string; maxSizeMB?: number; fieldId: string; onUpload: (url: string, name: string) => void; onRemove: () => void; }) {
  const [uploading, setUploading] = React.useState(false);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > maxSizeMB * 1024 * 1024) { toast.error(`File must be less than ${maxSizeMB}MB`); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const result = await res.json();
      onUpload(result.url, f.name);
      toast.success(`${label} uploaded successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to upload ${label.toLowerCase()}`);
    } finally {
      setUploading(false); e.target.value = "";
    }
  };
  if (file.url) return <div className="space-y-1.5"><label className="text-sm font-medium">{label} {required && <span className="text-red-500">*</span>}</label><div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3"><CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" /><span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{file.name || "File uploaded"}</span><a href={file.url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900"><EyeIcon className="h-4 w-4 text-green-600" /></a><button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500"><TrashIcon className="h-4 w-4" /></button></div></div>;
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label} {required && <span className="text-red-500">*</span>}</label><input type="file" accept={accept || ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"} className="hidden" id={fieldId} disabled={uploading} onChange={handleUpload} /><button type="button" onClick={() => document.getElementById(fieldId)?.click()} disabled={uploading} className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer p-4 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{uploading ? <><Loader2 className="h-5 w-5 text-blue-600 animate-spin" /><span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span></> : <><UploadIcon className="h-5 w-5 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-400">Click to upload (max {maxSizeMB}MB)</span></>}</button></div>;
}

export default function ProtocolFormWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedTrackingCode, setSubmittedTrackingCode] = React.useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = React.useState(false);
  const totalSteps = STEP_LABELS.length;
  React.useEffect(() => { try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const parsed = JSON.parse(saved); setForm((prev) => ({ ...prev, ...parsed })); setDraftLoaded(true); } } catch {} }, []);
  React.useEffect(() => { const timer = setInterval(() => { try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form)); } catch {} }, AUTOSAVE_INTERVAL); return () => clearInterval(timer); }, [form]);
  const saveDraft = () => { try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form)); toast.success("Draft saved successfully"); } catch { toast.error("Failed to save draft"); } };
  const clearDraft = () => { localStorage.removeItem(AUTOSAVE_KEY); setDraftLoaded(false); };
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateFileField = (key: keyof FormState, url: string, name: string) => setForm((prev) => ({ ...prev, [key]: { url, name } }));
  const removeFileField = (key: keyof FormState) => { const currentUrl = (form[key] as FileUpload | undefined)?.url; if (currentUrl) void deleteBlobUrl(currentUrl); setForm((prev) => ({ ...prev, [key]: { url: null, name: null } })); };
  const isClinicalTrial = form.studyType === "Clinical Trial";
  const isForeignSponsor = form.sponsorCountry.trim().length > 0 && form.sponsorCountry.trim().toLowerCase() !== "cameroon" && form.sponsorCountry.trim().toLowerCase() !== "cameroun";
  const stepValid = (s: number): boolean => { switch (s) { case 0: return form.protocolTitle.trim().length >= 5 && !!form.studyType && !!form.researchField && form.projectDescription.trim().length >= 20; case 1: return form.piFullName.trim().length >= 2 && form.piInstitution.trim().length >= 2 && form.piEmail.trim().length >= 5; case 2: return true; case 3: return true; case 4: return form.studySummaryEnglish.trim().length >= 20; case 5: return form.researchBackground.trim().length >= 20; case 6: return form.mainResearchQuestion.trim().length >= 10; case 7: return form.generalObjective.trim().length >= 10 && form.specificObjectives.some((o) => o.trim().length >= 5); case 8: return form.literatureReview.trim().length >= 50; case 9: return form.studyLocation.trim().length >= 2 && form.targetPopulation.trim().length >= 5 && form.sampleSize.trim().length >= 1; case 10: return form.participantProtection.trim().length >= 10; case 11: return true; case 12: return true; case 13: return true; case 14: return true; case 15: return true; case 16: return true; case 17: return form.confirmed; default: return true; } };
  const completedSteps = STEP_LABELS.map((_, i) => stepValid(i));
  const completedCount = completedSteps.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const canSubmit = completedSteps.every(Boolean);
  const goNext = () => { if (step < totalSteps - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };
  const handleSubmit = async () => { if (!canSubmit) { toast.error("Please complete all required fields before submitting"); return; } setIsSubmitting(true); try { const timeline = form.studyStartDate && form.studyEndDate ? `${form.studyStartDate} to ${form.studyEndDate}` : form.studyStartDate || form.studyEndDate || undefined; const project = await submitProject({ title: form.protocolTitle, description: form.projectDescription, objectives: form.generalObjective, category: form.studyType || "Other", location: form.studyLocation || undefined, timeline, budget: form.fundingAmount || undefined, document: form.piCv.url || undefined, formData: JSON.parse(JSON.stringify(form)) as Record<string, unknown> }); setSubmittedTrackingCode(project.trackingCode); clearDraft(); toast.success("Protocol submitted successfully!"); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to submit protocol. Please try again."); } finally { setIsSubmitting(false); } };
  const handleCopyCode = () => { if (submittedTrackingCode) { void navigator.clipboard.writeText(submittedTrackingCode); toast.success("Tracking code copied to clipboard!"); } };
  return <div className="space-y-6">{draftLoaded && step === 0 && <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between"><div className="flex items-center gap-2"><SaveIcon className="h-4 w-4 text-blue-600" /><span className="text-sm text-blue-800 dark:text-blue-200">A saved draft has been restored.</span></div><button onClick={() => { setForm(initialFormState); clearDraft(); setDraftLoaded(false); }} className="text-xs text-blue-600 hover:text-blue-800 underline">Start fresh</button></div>}
  <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"><CardContent className="py-4"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Step {step + 1} of {totalSteps}: <span className="font-semibold">{STEP_LABELS[step]}</span></span><span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressPercent}% complete</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-500 bg-blue-600" style={{ width: `${progressPercent}%` }} /></div><div className="flex gap-1 mt-3 flex-wrap">{STEP_LABELS.map((label, i) => <button key={i} type="button" onClick={() => setStep(i)} title={`${label}${completedSteps[i] ? " ✓" : ""}`} className={`h-2 flex-1 min-w-[12px] rounded-full transition-all ${i === step ? "bg-blue-600 ring-2 ring-blue-300 dark:ring-blue-700" : completedSteps[i] ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />)}</div></CardContent></Card>
  <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg"><CardHeader><CardTitle className="flex items-center gap-2"><span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold">{step + 1}</span>{STEP_LABELS[step]}</CardTitle><CardDescription>{step === 17 ? "Review all information and confirm before submitting" : "Complete the fields below and proceed to the next step"}</CardDescription></CardHeader><CardContent>{null}</CardContent></Card>
  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Button type="button" variant="outline" onClick={goPrev} disabled={step === 0}><ChevronLeftIcon className="h-4 w-4 mr-1" /> Previous</Button><Button type="button" variant="outline" onClick={saveDraft}><SaveIcon className="h-4 w-4 mr-1" /> Save Draft</Button></div><div className="flex items-center gap-2">{step < totalSteps - 1 ? <Button type="button" onClick={goNext} className="bg-blue-700 hover:bg-blue-800 text-white">Next <ChevronRightIcon className="h-4 w-4 ml-1" /></Button> : <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit} className="bg-green-700 hover:bg-green-800 text-white px-6">{isSubmitting ? <span className="flex items-center gap-2"><Spinner className="size-4" /> Submitting...</span> : "Submit Protocol"}</Button>}</div></div></div>;
}
