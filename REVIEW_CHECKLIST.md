# Pull Request Review Checklist

## Security

- [ ] Protected actions authenticate at the server boundary.
- [ ] Object-level authorization covers ownership, assignment, and role hierarchy.
- [ ] User input is strictly validated and bounded.
- [ ] Protected files use private, non-cacheable responses.
- [ ] Outbound URLs use the DNS-pinned safe fetcher.
- [ ] Resource-intensive operations use shared Redis rate limits.
- [ ] Secrets and participant data are absent from code, fixtures, and logs.

## Workflow integrity

- [ ] The current source state is checked inside the write.
- [ ] Multi-record changes use a transaction.
- [ ] Retry behavior is idempotent or safely rejected.
- [ ] Audit, notification, and status-history writes remain consistent.
- [ ] Concurrency-sensitive writes use atomic operations or serializable transactions.

## Interface

- [ ] Labels and actions are specific to research ethics workflows.
- [ ] Forms are keyboard accessible and expose validation clearly.
- [ ] Desktop and mobile layouts were checked.
- [ ] Reduced motion and dark mode remain usable.
- [ ] No fake content, decorative AI imagery, gradients, or emoji interface icons were added.

## Quality gate

- [ ] `npm test -- --runInBand`
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npx prisma validate`
- [ ] `npm audit`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] A migration and rollback plan exists for schema changes.
