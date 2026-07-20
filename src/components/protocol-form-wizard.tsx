"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { submitProject } from "@/app/actions/project";
import { ChevronLeftIcon, ChevronRightIcon, SaveIcon } from "lucide-react";

const AUTOSAVE_KEY = "cnersh-protocol-draft";
const AUTOSAVE_INTERVAL = 30000;

const STEP_LABELS = [
  "Protocol Info", "Principal Investigator", "Co-Investigators",
  "Sponsor / Funding", "Study Summary", "Background",
  "Research Question", "Objectives", "Literature Review",
  "Methodology", "Ethics", "Consent Documents",
  "Data Collection Tools", "Budget", "Authorization",
  "Additional Documents", "Payment Proof", "Review & Submit",
];

interface FormState {
  protocolTitle: string;
  studyType: string;
  researchField: string;
  projectDescription: string;
  piFullName: string;
  piInstitution: string;
  piEmail: string;
  studySummaryEnglish: string;
  researchBackground: string;
  mainResearchQuestion: string;
  generalObjective: string;
  specificObjectives: string[];
  literatureReview: string;
  studyLocation: string;
  targetPopulation: string;
  sampleSize: string;
  participantProtection: string;
  confirmed: boolean;
}

const initialFormState: FormState = {
  protocolTitle: "",
  studyType: "",
  researchField: "",
  projectDescription: "",
  piFullName: "",
  piInstitution: "",
  piEmail: "",
  studySummaryEnglish: "",
  researchBackground: "",
  mainResearchQuestion: "",
  generalObjective: "",
  specificObjectives: [""],
  literatureReview: "",
  studyLocation: "",
  targetPopulation: "",
  sampleSize: "",
  participantProtection: "",
  confirmed: false,
};

export default function ProtocolFormWizard() {
  const router = useRouter();

  const [step, setStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedTrackingCode, setSubmittedTrackingCode] = React.useState<string | null>(null);

  // Load saved draft synchronously – no effect, no any index signature
  const [form, setForm] = React.useState<FormState>(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormState>;
        return { ...initialFormState, ...parsed };
      }
    } catch {}
    return initialFormState;
  });

  const [draftLoaded, setDraftLoaded] = React.useState(() => {
    try {
      return !!localStorage.getItem(AUTOSAVE_KEY);
    } catch {
      return false;
    }
  });

  const totalSteps = STEP_LABELS.length;

  // Autosave every 30 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
      } catch {}
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

  // Validation – all fields empty, so steps never pass
  const stepValid = (s: number): boolean => {
    switch (s) {
      case 0: return form.protocolTitle.trim().length >= 5 && !!form.studyType && !!form.researchField && form.projectDescription.trim().length >= 20;
      case 1: return form.piFullName.trim().length >= 2 && form.piInstitution.trim().length >= 2 && form.piEmail.trim().length >= 5;
      case 2: return true;
      case 3: return true;
      case 4: return form.studySummaryEnglish.trim().length >= 20;
      case 5: return form.researchBackground.trim().length >= 20;
      case 6: return form.mainResearchQuestion.trim().length >= 10;
      case 7: return form.generalObjective.trim().length >= 10 && form.specificObjectives.some((o) => o.trim().length >= 5);
      case 8: return form.literatureReview.trim().length >= 50;
      case 9: return form.studyLocation.trim().length >= 2 && form.targetPopulation.trim().length >= 5 && form.sampleSize.trim().length >= 1;
      case 10: return form.participantProtection.trim().length >= 10;
      case 11: return true;
      case 12: return true;
      case 13: return true;
      case 14: return true;
      case 15: return true;
      case 16: return true;
      case 17: return form.confirmed;
      default: return true;
    }
  };

  const completedSteps = STEP_LABELS.map((_, i) => stepValid(i));
  const completedCount = completedSteps.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const canSubmit = completedSteps.every(Boolean);

  const goNext = () => { if (step < totalSteps - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please complete all required fields before submitting");
      return;
    }
    setIsSubmitting(true);
    try {
      const project = await submitProject({
        title: form.protocolTitle,
        description: form.projectDescription,
        objectives: form.generalObjective,
        category: form.studyType || "Other",
        location: form.studyLocation || undefined,
        timeline: undefined,
        budget: undefined,
        document: undefined,
        formData: JSON.parse(JSON.stringify(form)) as Record<string, unknown>,
      });
      setSubmittedTrackingCode(project.trackingCode);
      clearDraft();
      toast.success("Protocol submitted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit protocol. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="space-y-6">
        {/* Restored draft banner */}
        {draftLoaded && step === 0 && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SaveIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
              A saved draft has been restored.
            </span>
              </div>
              <button
                  onClick={() => {
                    setForm(initialFormState);
                    clearDraft();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Start fresh
              </button>
            </div>
        )}

        {/* Progress card */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {step + 1} of {totalSteps}:{" "}
              <span className="font-semibold">{STEP_LABELS[step]}</span>
            </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {progressPercent}% complete
            </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                  className="h-2 rounded-full transition-all duration-500 bg-blue-600"
                  style={{ width: `${progressPercent}%` }}
              />
            </div>
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

        {/* Step content – still empty */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold">
              {step + 1}
            </span>
              {STEP_LABELS[step]}
            </CardTitle>
            <CardDescription>
              {step === 17
                  ? "Review all information and confirm before submitting"
                  : "Complete the fields below and proceed to the next step"}
            </CardDescription>
          </CardHeader>
          <CardContent>{null}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={goPrev} disabled={step === 0}>
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