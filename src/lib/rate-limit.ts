import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiting configuration for different endpoint types
 */
export interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests allowed in window
}

/**
 * Predefined rate limit tiers
 */
export const RATE_LIMITS = {
    // Authentication endpoints: 5 requests per 15 minutes
    auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
    },
    // API endpoints: 100 requests per 15 minutes per user
    api: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
    },
    // File uploads: 10 uploads per hour per user
    fileUpload: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
    },
    // Report submissions: 5 reports per hour per user
    reportSubmission: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
    },
    // Form submissions: 20 submissions per hour
    formSubmission: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
    },
} as const;

/**
 * In-memory rate limit store
 * For production, use Redis or similar distributed cache
 */
class RateLimitStore {
    private store: Map<string, { count: number; resetTime: number }> = new Map();

    /**
     * Check if request exceeds rate limit
     */
    check(key: string, config: RateLimitConfig): {
        allowed: boolean;
        remaining: number;
        resetTime: number;
    } {
        const now = Date.now();
        const record = this.store.get(key);

        // If no record or window expired, create new record
        if (!record || now > record.resetTime) {
            this.store.set(key, {
                count: 1,
                resetTime: now + config.windowMs,
            });

            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetTime: now + config.windowMs,
            };
        }

        // Increment count
        record.count++;

        // Check if limit exceeded
        if (record.count > config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: record.resetTime,
            };
        }

        return {
            allowed: true,
            remaining: config.maxRequests - record.count,
            resetTime: record.resetTime,
        };
    }

    /**
     * Clean up expired entries (call periodically)
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            if (now > record.resetTime) {
                this.store.delete(key);
            }
        }
    }
}

// Global store instance
const rateLimitStore = new RateLimitStore();

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
    setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);
}

/**
 * Get identifier for rate limiting
 * Uses IP address if available, otherwise uses a session identifier
 */
function getIdentifier(req: NextRequest, userId?: string): string {
    // If user is authenticated, use userId for more accurate tracking
    if (userId) {
        return `user:${userId}`;
    }

    // Otherwise use IP address
    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0] ||
        req.headers.get('x-real-ip') ||
        'unknown';

    return `ip:${ip}`;
}

/**
 * Rate limit middleware
 */
export function rateLimit(
    config: RateLimitConfig = RATE_LIMITS.api,
    options: {
        keyPrefix?: string;
        userId?: string;
    } = {}
) {
    return async (req: NextRequest): Promise<NextResponse | null> => {
        const identifier = getIdentifier(req, options.userId);
        const key = options.keyPrefix ? `${options.keyPrefix}:${identifier}` : identifier;

        const result = rateLimitStore.check(key, config);

        // Add rate limit headers
        const headers = new Headers();
        headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        headers.set('X-RateLimit-Remaining', result.remaining.toString());
        headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

        if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
            headers.set('Retry-After', retryAfter.toString());

            return NextResponse.json(
                {
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                },
                {
                    status: 429,
                    headers,
                }
            );
        }

        return null; // Allow request
    };
}

/**
 * Higher-order function to wrap API routes with rate limiting
 */
export function withRateLimit<T>(
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
    config: RateLimitConfig = RATE_LIMITS.api,
    options: {
        keyPrefix?: string;
        getUserId?: (req: NextRequest) => Promise<string | undefined>;
    } = {}
) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
        // Get user ID if function provided
        const userId = options.getUserId ? await options.getUserId(req) : undefined;

        // Check rate limit
        const rateLimitResponse = await rateLimit(config, {
            keyPrefix: options.keyPrefix,
            userId,
        })(req);

        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Proceed to actual handler
        return handler(req, context);
    };
}
