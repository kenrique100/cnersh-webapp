import { db } from '@/lib/db';

/**
 * Security event types for structured logging
 */
export enum SecurityEventType {
    // Authentication events
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',

    // Authorization events
    UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    ROLE_CHANGE = 'ROLE_CHANGE',

    // Session events
    SESSION_CREATED = 'SESSION_CREATED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
    CONCURRENT_SESSION_LIMIT = 'CONCURRENT_SESSION_LIMIT',

    // Data events
    SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
    DATA_EXPORT = 'DATA_EXPORT',
    DATA_DELETION = 'DATA_DELETION',
    GDPR_REQUEST = 'GDPR_REQUEST',

    // Security events
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    XSS_ATTEMPT = 'XSS_ATTEMPT',
    SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
    FILE_UPLOAD_BLOCKED = 'FILE_UPLOAD_BLOCKED',
    MALWARE_DETECTED = 'MALWARE_DETECTED',

    // Admin events
    ADMIN_ACTION = 'ADMIN_ACTION',
    USER_BANNED = 'USER_BANNED',
    USER_UNBANNED = 'USER_UNBANNED',
    CONTENT_MODERATED = 'CONTENT_MODERATED',
}

/**
 * Severity levels for security events
 */
export enum SecuritySeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL',
}

/**
 * Security event log entry
 */
export interface SecurityEvent {
    type: SecurityEventType;
    severity: SecuritySeverity;
    userId?: string;
    targetId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

/**
 * Log a security event to the database and console
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
    const timestamp = new Date().toISOString();

    // Structured console logging for development and monitoring
    const logEntry = {
        timestamp,
        type: 'SECURITY_EVENT',
        ...event,
    };

    // Log to console with appropriate level
    switch (event.severity) {
        case SecuritySeverity.CRITICAL:
        case SecuritySeverity.ERROR:
            console.error(JSON.stringify(logEntry));
            break;
        case SecuritySeverity.WARNING:
            console.warn(JSON.stringify(logEntry));
            break;
        default:
            console.info(JSON.stringify(logEntry));
    }

    // Log to database audit log
    try {
        if (event.userId) {
            await db.auditLog.create({
                data: {
                    action: event.type,
                    details: JSON.stringify({
                        severity: event.severity,
                        targetId: event.targetId,
                        details: event.details,
                        ipAddress: event.ipAddress,
                        userAgent: event.userAgent,
                        metadata: event.metadata,
                        timestamp,
                    }),
                    targetId: event.targetId,
                    userId: event.userId,
                },
            });
        }
    } catch (error) {
        // Don't fail the request if logging fails, but log the error
        console.error('Failed to write security event to database:', error);
    }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
    type: SecurityEventType,
    userId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await logSecurityEvent({
        type,
        severity:
            type === SecurityEventType.LOGIN_FAILURE ||
            type === SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT
                ? SecuritySeverity.WARNING
                : SecuritySeverity.INFO,
        userId,
        details,
        ipAddress,
        userAgent,
    });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
    type: SecurityEventType,
    userId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await logSecurityEvent({
        type,
        severity: SecuritySeverity.ERROR,
        userId,
        details,
        ipAddress,
        userAgent,
    });
}

/**
 * Log data access events
 */
export async function logDataAccess(
    userId: string,
    targetId: string,
    action: string,
    details?: Record<string, any>
): Promise<void> {
    await logSecurityEvent({
        type: SecurityEventType.SENSITIVE_DATA_ACCESS,
        severity: SecuritySeverity.INFO,
        userId,
        targetId,
        details: {
            action,
            ...details,
        },
    });
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Headers): string {
    return headers.get('user-agent') || 'unknown';
}
