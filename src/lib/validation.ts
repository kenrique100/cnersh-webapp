import { z } from "zod";

export const emailSchema = z.string().email().min(3).max(255).toLowerCase().trim();
export const passwordSchema = z.string().min(10).max(128)
    .refine(v => /[A-Z]/.test(v), "Need uppercase")
    .refine(v => /[a-z]/.test(v), "Need lowercase")
    .refine(v => /[0-9]/.test(v), "Need number")
    .refine(v => /[^A-Za-z0-9]/.test(v), "Need special char");
export const nameSchema = z.string().min(2).max(100).regex(/^[a-zA-Z\s'-]+$/).trim();
export const urlSchema = z.string().url().max(2048).refine(u => /^https?:\/\//.test(u), "HTTP/HTTPS only");
export const textContentSchema = z.string().min(1).max(10000).trim();
export const shortTextSchema = z.string().min(1).max(255).trim();

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
    const res = schema.safeParse(data);
    return res.success ? { success: true, data: res.data } : { success: false, errors: res.error.issues.map(e => e.message) };
}