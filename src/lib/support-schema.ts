import { z } from "zod";

export const SUPPORT_CATEGORIES = [
    "bug",
    "account",
    "protocol",
    "billing",
    "feature",
    "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const supportSchema = z.object({
    category: z.enum(SUPPORT_CATEGORIES),
    subject: z
        .string()
        .trim()
        .min(3, "Subject must be at least 3 characters")
        .max(200, "Subject must be at most 200 characters"),
    message: z
        .string()
        .trim()
        .min(10, "Message must be at least 10 characters")
        .max(5000, "Message must be at most 5000 characters"),
    pageUrl: z.string().url("Page URL must be a valid URL").optional(),
});

export type SupportInput = z.infer<typeof supportSchema>;