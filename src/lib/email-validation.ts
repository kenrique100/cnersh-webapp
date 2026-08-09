import { z } from "zod";
import disposableDomains from "disposable-email-domains";

const disposableDomainSet = new Set(
    (disposableDomains as string[]).map((domain) => domain.toLowerCase())
);

const FORBIDDEN_LOCAL_PART = /(^\.|\.\.|\.@|@\.)/;

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function isDisposableEmailDomain(domain: string): boolean {
    const normalizedDomain = domain.toLowerCase();
    if (disposableDomainSet.has(normalizedDomain)) return true;
    const domainParts = normalizedDomain.split(".");
    if (domainParts.length < 2) return false;
    const parentDomain = domainParts.slice(1).join(".");
    return disposableDomainSet.has(parentDomain);
}

export function validateEmailAddress(email: string): { valid: true; value: string } | { valid: false; message: string } {
    const normalized = normalizeEmail(email);
    if (!normalized) {
        return { valid: false, message: "Email address is required." };
    }
    if (normalized.length > 254) {
        return { valid: false, message: "Email address is too long." };
    }
    const basic = z.string().email().safeParse(normalized);
    if (!basic.success || FORBIDDEN_LOCAL_PART.test(normalized)) {
        return { valid: false, message: "Please enter a valid email address." };
    }
    const [, domain = ""] = normalized.split("@");
    if (!domain || domain.length > 253) {
        return { valid: false, message: "Please enter a valid email address." };
    }
    if (isDisposableEmailDomain(domain)) {
        return { valid: false, message: "Temporary or disposable email addresses are not allowed." };
    }
    return { valid: true, value: normalized };
}

export const authEmailSchema = z
    .string()
    .max(254, "Email address is too long")
    .transform((value) => normalizeEmail(value))
    .superRefine((value, ctx) => {
        const result = validateEmailAddress(value);
        if (!result.valid) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: result.message,
            });
        }
    });
