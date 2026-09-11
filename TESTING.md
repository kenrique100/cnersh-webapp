# Testing Guide

## Test layers

- **Domain actions:** Authorization, validation, state transitions, transactions, concurrency, notifications, and audit history.
- **API routes:** File authorization, health-response sanitization, uploads, idempotency, rate limiting, and SSRF defense.
- **Components:** Protocol wizard, reviewer evaluation, community, feed, navigation, forms, and responsive behavior.
- **Email:** Verification, password reset, welcome, and notification templates.
- **Production validation:** TypeScript, Prisma schema validation, dependency audit, Next.js build, and Playwright screenshots.

## Commands

```bash
npm test -- --runInBand
npm run test:coverage
npm run lint
npx tsc --noEmit
npx prisma validate
npm audit
npm run build
```

The Jest configuration enforces 50 percent global branch, function, line, and statement coverage. The current remediation baseline is 105 passing suites and 1,686 passing tests.

## Test conventions

- Mock authentication explicitly for anonymous, user, administrator, and superadministrator cases.
- Test server actions directly; page redirects do not prove authorization.
- Mock Prisma transactions by executing callbacks against a transaction-shaped test client.
- Test both success and rejected source-state transitions.
- Assert that failed transactions do not leave partial notifications, audit records, or status history.
- Include concurrent or retry behavior for idempotency, assignment, voting, and scheduling.
- Use synthetic data only.

## Visual QA

For user-facing changes:

1. Build the application under Node.js 22.22.2 or newer.
2. Check desktop and 375-pixel mobile layouts.
3. Verify keyboard focus, labels, validation, loading, empty, and error states.
4. Verify reduced-motion behavior and dark mode.
5. Confirm there is no horizontal overflow.
