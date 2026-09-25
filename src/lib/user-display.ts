export const PROFESSIONS = [
    "Researcher",
    "Medical Doctor",
    "Nurse",
    "Pharmacist",
    "Dentist",
    "Professor / Lecturer",
    "Student",
    "Laboratory Scientist",
    "Public Health Specialist",
    "Biostatistician",
    "Epidemiologist",
    "Ethicist",
    "Lawyer / Legal Professional",
    "Social Scientist",
    "Community Health Worker",
    "Clinical Research Coordinator",
    "Regulatory Affairs Specialist",
    "Data Manager",
    "Bioinformatician",
    "Administrator",
    "Other",
] as const;

export type Profession = (typeof PROFESSIONS)[number];

export interface ProfessionFields {
    profession?: string | null;
    professionOther?: string | null;
}

/**
 * Resolve the profession label to show in the UI.
 *
 * - If the user picked a canonical option (e.g. "Researcher"), return it as-is.
 * - If the user picked "Other", prefer their free-text `professionOther`.
 *   Falls back to the literal string "Other" if the free-text is empty.
 * - If no profession is set at all, return null so callers can apply their
 *   own fallback (e.g. "Community Member").
 */
export function displayProfession(user: ProfessionFields): string | null {
    if (!user.profession) return null;
    if (user.profession === "Other") {
        const other = user.professionOther?.trim();
        return other ? other : "Other";
    }
    return user.profession;
}