# Email Troubleshooting Guide for CNERSH

## Why Users Can't Receive Emails - Common Issues & Solutions

### 1. Missing or Invalid RESEND_API_KEY ⚠

**Problem:** The most common issue - Resend API key is not configured.

**Solution:**
1. Sign up for a Resend account at https://resend.com
2. Get your API key from the Resend dashboard
3. Add it to your `.env` file:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

**How to verify:**
```bash
# Check if the API key is set
echo $RESEND_API_KEY
```

### 2. Email Domain Not Verified in Resend 

**Problem:** Resend requires domain verification to send emails from your domain.

**Current domain:** `info@cameroon-national-ethics-com.net`

**Solution:**
1. Go to Resend Dashboard → Domains
2. Add your domain: `cameroon-national-ethics-com.net`
3. Add DNS records (provided by Resend) to your domain registrar:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
4. Wait for verification (can take up to 72 hours)

**Temporary workaround:**
Use Resend's test domain while verifying your custom domain:
```env
EMAIL_FROM="CNERSH <onboarding@resend.dev>"
```

### 3. Email Going to Spam Folder 

**Problem:** Emails are being sent but landing in spam.

**Solutions:**
-  Verify your domain with Resend (see above)
-  Add SPF, DKIM, and DMARC records
-  Use a verified "From" address
-  Avoid spam trigger words in subject lines
-  Maintain good sender reputation

**Check spam folder in:**
- Gmail: Check "Spam" and "Promotions" tabs
- Outlook: Check "Junk Email" folder

### 4. Rate Limiting Issues 

**Problem:** Sending too many emails too quickly.

**Resend Free Tier Limits:**
- 100 emails per day
- 3,000 emails per month

**Solution:**
- Upgrade Resend plan if needed
- Implement email queuing for bulk operations
- Monitor usage in Resend dashboard

### 5. Invalid Email Address Format ✉

**Problem:** Email address is malformed or invalid.

**Solution:**
- Email validation is now built-in to the sending functions
- Check console logs for validation errors
- Ensure user emails are properly formatted

### 6. Environment Variables Not Loaded 

**Problem:** Environment variables aren't being read by the application.

**Solutions:**

**For Development:**
```bash
# Restart your dev server after adding env vars
npm run dev
```

**For Production (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `RESEND_API_KEY`
3. Add `EMAIL_FROM` (optional)
4. Redeploy your application

**For Production (Hostinger):**
1. Access your hosting control panel
2. Navigate to Environment Variables or Config
3. Add the required variables
4. Restart your application

### 7. Network/Firewall Issues 

**Problem:** Firewall blocking outbound email requests.

**Solution:**
- Ensure your server can make HTTPS requests to api.resend.com
- Check firewall rules
- Verify no proxy blocking API calls

## Debugging Steps

### Step 1: Check Console Logs

Look for these log messages when emails are sent:

```
 Success: " Verification email sent successfully to user@example.com. Email ID: abc123"
 Error: " RESEND_API_KEY is not configured"
 Error: " Resend API error: [error details]"
```

### Step 2: Test Resend API Directly

Create a test file `test-email.js`:

```javascript
const { Resend } = require('resend');

const resend = new Resend('your_api_key_here');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<p>This is a test email</p>'
}).then(console.log).catch(console.error);
```

Run:
```bash
node test-email.js
```

### Step 3: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Check recent emails
3. Look for failed deliveries
4. Check bounce/complaint rates

### Step 4: Verify Environment Variables

```bash
# In your project root
cat .env | grep RESEND
```

Should output:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=CNERSH <info@cameroon-national-ethics-com.net>
```

## Required Environment Variables

Add these to your `.env` file:

```env
# Resend Email Service (REQUIRED)
RESEND_API_KEY=re_your_actual_api_key_here

# Email From Address (OPTIONAL - uses default if not set)
EMAIL_FROM=CNERSH <info@cameroon-national-ethics-com.net>

# Application URL (REQUIRED for email links)
NEXT_PUBLIC_APP_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com
```

## Email Features Now Available

### 1. Enhanced Error Logging 
- Detailed console logs for debugging
- Email validation before sending
- API response tracking

### 2. Email Verification on Signup 
- Automatic verification email sent
- Custom branded template
- Secure verification links

### 3. Password Reset 
- One-time reset links
- 1-hour expiration for security
- Clear instructions

### 4. Notification Emails 
- Project status updates
- System notifications
- Admin alerts

## Testing Email Delivery

### Development Mode

1. Use Resend's test email addresses:
```typescript
// In your test code
const testEmail = "delivered@resend.dev"; // Always delivers
const testEmail = "bounced@resend.dev";   // Simulates bounce
const testEmail = "complained@resend.dev"; // Simulates complaint
```

2. Check your actual inbox with a real email address

### Production Mode

1. Test with your own email first
2. Monitor Resend dashboard for delivery status
3. Check spam folders initially
4. Ask test users to whitelist your domain

## Common Error Messages & Solutions

### Error: "RESEND_API_KEY environment variable is not set"
**Solution:** Add your Resend API key to `.env` file

### Error: "Failed to send email: Domain not found"
**Solution:** Verify your domain in Resend dashboard or use `onboarding@resend.dev`

### Error: "Invalid email address"
**Solution:** Check email format, must contain '@' symbol

### Error: "Rate limit exceeded"
**Solution:** Upgrade Resend plan or wait for rate limit reset

### Error: "Email sent but not received"
**Solutions:**
1. Check spam folder
2. Verify domain is configured
3. Check Resend logs for delivery status
4. Verify recipient email is valid

## Best Practices

1. **Always verify your domain** - Better deliverability
2. **Monitor Resend dashboard** - Track delivery rates
3. **Check logs regularly** - Catch issues early
4. **Test with real emails** - Don't rely on test addresses only
5. **Keep API keys secure** - Never commit to git
6. **Set up SPF/DKIM/DMARC** - Improves email reputation
7. **Handle errors gracefully** - Show user-friendly messages
8. **Implement retry logic** - For transient failures

## Contact & Support

If emails still aren't working after following this guide:

1. **Check Resend Status**: https://status.resend.com
2. **Resend Support**: support@resend.com
3. **Check Application Logs**: `npm run dev` and look for email-related errors
4. **Verify Domain Setup**: Ensure all DNS records are correct

## Quick Checklist ✓

- [ ] Resend account created
- [ ] API key added to `.env` file
- [ ] Domain verified in Resend (or using test domain)
- [ ] SPF/DKIM records added to DNS
- [ ] Environment variables loaded in production
- [ ] Application restarted after env changes
- [ ] Test email sent successfully
- [ ] Checked spam folder
- [ ] Monitored Resend dashboard
- [ ] Logs showing successful email sends

---

**Last Updated:** 2026-04-07
**Version:** 1.0.0
