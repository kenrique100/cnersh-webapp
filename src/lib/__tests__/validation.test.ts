import {
    emailSchema,
    passwordSchema,
    nameSchema,
    urlSchema,
    textContentSchema,
    shortTextSchema,
    validateInput,
} from '../validation';

describe('emailSchema', () => {
    it('should validate correct email addresses', () => {
        const result = emailSchema.safeParse('test@example.com');
        expect(result.success).toBe(true);
    });

    it('should reject invalid email addresses', () => {
        const result = emailSchema.safeParse('invalid-email');
        expect(result.success).toBe(false);
    });

    it('should trim and lowercase emails', () => {
        const result = emailSchema.safeParse('  Test@EXAMPLE.COM  ');
        if (result.success) {
            expect(result.data).toBe('test@example.com');
        }
    });

    it('should reject emails that are too long', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const result = emailSchema.safeParse(longEmail);
        expect(result.success).toBe(false);
    });
});

describe('passwordSchema', () => {
    it('should accept strong passwords', () => {
        const result = passwordSchema.safeParse('StrongP@ssw0rd123');
        expect(result.success).toBe(true);
    });

    it('should reject passwords without uppercase letters', () => {
        const result = passwordSchema.safeParse('weakp@ssw0rd');
        expect(result.success).toBe(false);
    });

    it('should reject passwords without lowercase letters', () => {
        const result = passwordSchema.safeParse('WEAKP@SSW0RD');
        expect(result.success).toBe(false);
    });

    it('should reject passwords without numbers', () => {
        const result = passwordSchema.safeParse('WeakP@ssword');
        expect(result.success).toBe(false);
    });

    it('should reject passwords without special characters', () => {
        const result = passwordSchema.safeParse('WeakPassword123');
        expect(result.success).toBe(false);
    });

    it('should reject passwords that are too short', () => {
        const result = passwordSchema.safeParse('Short1!');
        expect(result.success).toBe(false);
    });
});

describe('nameSchema', () => {
    it('should accept valid names', () => {
        const result = nameSchema.safeParse('John Doe');
        expect(result.success).toBe(true);
    });

    it('should accept names with hyphens and apostrophes', () => {
        const result = nameSchema.safeParse("Mary-Jane O'Brien");
        expect(result.success).toBe(true);
    });

    it('should reject names with numbers', () => {
        const result = nameSchema.safeParse('John123');
        expect(result.success).toBe(false);
    });

    it('should reject names with special characters', () => {
        const result = nameSchema.safeParse('John@Doe');
        expect(result.success).toBe(false);
    });

    it('should trim whitespace', () => {
        const result = nameSchema.safeParse('  John Doe  ');
        if (result.success) {
            expect(result.data).toBe('John Doe');
        }
    });
});

describe('urlSchema', () => {
    it('should accept valid HTTP URLs', () => {
        const result = urlSchema.safeParse('https://example.com');
        expect(result.success).toBe(true);
    });

    it('should reject javascript: URLs', () => {
        const result = urlSchema.safeParse('javascript:alert(1)');
        expect(result.success).toBe(false);
    });

    it('should reject data: URLs', () => {
        const result = urlSchema.safeParse('data:text/html,<script>');
        expect(result.success).toBe(false);
    });

    it('should reject URLs that are too long', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(2050);
        const result = urlSchema.safeParse(longUrl);
        expect(result.success).toBe(false);
    });
});

describe('textContentSchema', () => {
    it('should accept valid text', () => {
        const result = textContentSchema.safeParse('This is valid text content.');
        expect(result.success).toBe(true);
    });

    it('should reject empty strings', () => {
        const result = textContentSchema.safeParse('');
        expect(result.success).toBe(false);
    });

    it('should reject content that is too long', () => {
        const longText = 'a'.repeat(10001);
        const result = textContentSchema.safeParse(longText);
        expect(result.success).toBe(false);
    });

    it('should trim whitespace', () => {
        const result = textContentSchema.safeParse('  Valid content  ');
        if (result.success) {
            expect(result.data).toBe('Valid content');
        }
    });
});

describe('validateInput', () => {
    it('should return success for valid input', () => {
        const result = validateInput(emailSchema, 'test@example.com');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('test@example.com');
        }
    });

    it('should return errors for invalid input', () => {
        const result = validateInput(emailSchema, 'invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors.length).toBeGreaterThan(0);
        }
    });
});
