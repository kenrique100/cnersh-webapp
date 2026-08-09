import { z } from "zod";

const FORBIDDEN_LOCAL_PART = /(^\.|\.\.|\.@|@\.)/;

export const authEmailClientSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email address is required")
    .max(254, "Email address is too long")
    .email("Please enter a valid email address")
    .refine((email) => !FORBIDDEN_LOCAL_PART.test(email), "Please enter a valid email address");
