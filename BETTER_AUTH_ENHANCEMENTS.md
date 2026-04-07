# Better Auth Enhanced Features

## New Features Added

### 1. Enhanced Email Debugging ✅

**What was added:**
- Comprehensive error logging for all email functions
- Email validation before sending
- Detailed console output for debugging
- API response tracking with email IDs

**Files modified:**
- `src/lib/send-verification-email.tsx`
- `src/lib/send-reset-password-email.tsx`

**How to debug:**
```bash
# Start dev server and watch console
npm run dev

# Look for these log messages:
# ✅ Success indicators
# ❌ Error indicators with details
```

### 2. OTP (One-Time Password) Authentication 🔐

**What was added:**
- Email-based OTP sign-in support
- Secure OTP generation using crypto
- OTP verification with attempt limiting
- Beautiful branded OTP email template
- Automatic OTP expiration (default: 10 minutes)

**Files created:**
- `src/emails/otp-email.tsx` - Professional OTP email template
- `src/lib/send-otp-email.ts` - OTP generation, sending, and verification

**Features:**
- ✅ 6-digit secure OTP codes
- ✅ 10-minute expiration (configurable)
- ✅ Maximum 5 verification attempts
- ✅ Automatic cleanup of expired OTPs
- ✅ Professional email template

### 3. Email Troubleshooting Guide 📚

**What was added:**
- Complete troubleshooting guide: `EMAIL_TROUBLESHOOTING.md`
- Common issues and solutions
- Step-by-step debugging instructions
- Resend configuration guide
- Environment variable checklist

## How to Use OTP Authentication

### Step 1: Install Dependencies (Already Done)
Your app already has all required dependencies:
- `resend` for email sending
- `@react-email/components` for email templates

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Resend Email Service (REQUIRED)
RESEND_API_KEY=re_your_actual_api_key_here

# Email From Address (OPTIONAL)
EMAIL_FROM=CNERSH <info@cameroon-national-ethics-com.net>

# Application URL (REQUIRED)
NEXT_PUBLIC_APP_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com
```

### Step 3: Get Resend API Key

1. Sign up at https://resend.com
2. Verify your email
3. Go to API Keys section
4. Create a new API key
5. Copy and add to `.env` file

### Step 4: Verify Domain (Important for Production)

**Option A: Use Resend Test Domain (Quick Start)**
```env
EMAIL_FROM=CNERSH <onboarding@resend.dev>
```

**Option B: Use Your Custom Domain (Production)**
1. Go to Resend Dashboard → Domains
2. Add: `cameroon-national-ethics-com.net`
3. Add DNS records provided by Resend:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: (unique key provided by Resend)
   - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com`
4. Wait for verification (up to 72 hours)

### Step 5: Implement OTP Sign-In

#### Backend API Route

Create `src/app/api/auth/otp/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendOTPEmail, storeOTP } from '@/lib/send-otp-email';
import { db } from '@/lib/db';
import { RATE_LIMITS, withRateLimit } from '@/lib/rate-limit';

async function handler(req: NextRequest) {
    try {
        const { email } = await req.json();

        // Validate email
        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Valid email address is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'No account found with this email' },
                { status: 404 }
            );
        }

        // Generate OTP
        const otpCode = generateOTP(6);

        // Store OTP (expires in 10 minutes)
        storeOTP(email, otpCode, 10);

        // Send OTP email
        await sendOTPEmail({
            to: email,
            otpCode,
            userName: user.name || undefined,
            expiresInMinutes: 10
        });

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email'
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        return NextResponse.json(
            { error: 'Failed to send verification code' },
            { status: 500 }
        );
    }
}

// Export with rate limiting (5 requests per 15 minutes)
export const POST = withRateLimit(handler, RATE_LIMITS.auth, {
    keyPrefix: 'otp-send'
});
```

Create `src/app/api/auth/otp/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/send-otp-email';
import { db } from '@/lib/db';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

async function handler(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        // Validate inputs
        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email and code are required' },
                { status: 400 }
            );
        }

        // Verify OTP
        const verification = verifyOTP(email, code);

        if (!verification.valid) {
            return NextResponse.json(
                { error: verification.message },
                { status: 400 }
            );
        }

        // OTP is valid - create session using Better Auth
        // You'll need to integrate this with your Better Auth session creation
        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Return success - client should handle session creation
        return NextResponse.json({
            success: true,
            message: 'Verification successful',
            userId: user.id
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return NextResponse.json(
            { error: 'Failed to verify code' },
            { status: 500 }
        );
    }
}

// Export with rate limiting
export const POST = withRateLimit(handler, RATE_LIMITS.auth, {
    keyPrefix: 'otp-verify'
});
```

#### Frontend Component

Create `src/components/otp-signin-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function OTPSignInForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [step, setStep] = useState<"email" | "code">("email");
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send code');
            }

            toast.success('Verification code sent to your email');
            setStep('code');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otpCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid code');
            }

            toast.success('Signed in successfully');
            router.push('/dashboard');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    if (step === "email") {
        return (
            <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Email Address
                    </label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                    />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Sending...' : 'Send Verification Code'}
                </Button>
            </form>
        );
    }

    return (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">
                    Enter Verification Code
                </label>
                <p className="text-sm text-gray-600 mb-2">
                    Check your email ({email}) for the 6-digit code
                </p>
                <Input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    required
                />
            </div>
            <Button type="submit" disabled={loading || otpCode.length !== 6} className="w-full">
                {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
            <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('email')}
                className="w-full"
            >
                Use different email
            </Button>
        </form>
    );
}
```

## Email Debugging

### Check if emails are being sent:

```bash
# Start your dev server
npm run dev

# Try to sign up or request password reset
# Check console for:
📧 Sending verification email to: user@example.com
✅ Verification email sent successfully to user@example.com. Email ID: abc123

# Or errors:
❌ RESEND_API_KEY is not configured
❌ Resend API error: Domain not found
```

### Common Issues:

1. **No email received** → Check `EMAIL_TROUBLESHOOTING.md`
2. **API key error** → Add `RESEND_API_KEY` to `.env`
3. **Domain not verified** → Use `onboarding@resend.dev` for testing
4. **Emails in spam** → Verify your domain in Resend

## Production Checklist

Before deploying to production:

- [ ] Resend API key added to environment variables
- [ ] Domain verified in Resend dashboard
- [ ] SPF, DKIM, DMARC records added to DNS
- [ ] Test email delivery with real addresses
- [ ] OTP rate limiting configured
- [ ] Email templates tested and reviewed
- [ ] Error logging monitored
- [ ] Spam folder checked
- [ ] For OTP: Consider using Redis instead of in-memory storage

## Security Notes

### OTP Security Features:
- ✅ 6-digit codes (1 million combinations)
- ✅ 10-minute expiration
- ✅ Maximum 5 attempts before invalidation
- ✅ Secure random generation using crypto
- ✅ Rate limiting on OTP requests (5 per 15 minutes)
- ✅ Automatic cleanup of expired OTPs

### Production Recommendations:
1. Use Redis or database for OTP storage (not in-memory)
2. Implement CAPTCHA for OTP requests
3. Log all OTP attempts for audit trail
4. Monitor for brute force attempts
5. Consider implementing account lockout after multiple failures

## Next Steps

1. **Test Email Delivery**
   - Sign up with a test account
   - Check email arrives
   - Verify formatting looks good
   - Test password reset flow

2. **Implement OTP Sign-In** (Optional)
   - Create API routes as shown above
   - Add OTP form component
   - Test OTP flow end-to-end
   - Monitor for issues

3. **Monitor in Production**
   - Check Resend dashboard regularly
   - Monitor email delivery rates
   - Watch for bounce/spam rates
   - Review error logs

## Support

For issues with:
- **Email delivery** → Read `EMAIL_TROUBLESHOOTING.md`
- **Resend setup** → Visit https://resend.com/docs
- **Better Auth** → Visit https://www.better-auth.com/docs

---

**Version:** 1.0.0
**Last Updated:** 2026-04-07
