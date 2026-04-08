# Test Suite Documentation

## Overview

This document provides comprehensive information about the test suite for the CNERSH webapp, including how to run tests, understand coverage, and the test structure.

## Test Structure

The test suite includes:

1. **Reaction Icons Tests** (`src/components/__tests__/reaction-icons.test.tsx`)
   - Tests for all LinkedIn-style SVG reaction icons
   - Coverage of individual icons (Like, Celebrate, Love, Insightful, Funny, Support)
   - Tests for icon rendering, sizing, and styling
   - Accessibility tests

2. **Reaction Button Tests** (`src/components/__tests__/reaction-button.test.tsx`)
   - Tests for ReactionButton component
   - Tests for ReactionPicker component
   - Interaction tests (click handlers, animations)
   - Hover effect tests
   - Accessibility tests

3. **Post Card Tests** (`src/components/__tests__/post-card.test.tsx`)
   - Utility function tests (getInitials, formatRelativeDate, etc.)
   - Component tests (PostCard, PostHeader, PostTextContent, etc.)
   - Engagement summary tests
   - Comment reaction tests

4. **Feed Action Tests** (`src/app/actions/__tests__/feed.test.ts`)
   - Integration tests for toggleLike action
   - Integration tests for addComment action
   - Integration tests for toggleCommentLike action
   - Notification tests
   - Authentication tests

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- src/components/__tests__/reaction-icons.test.tsx
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="ReactionIcon"
```

## Test Coverage

The test suite provides comprehensive coverage with the following targets:

- **Branches:** >85%
- **Functions:** >85%
- **Lines:** >85%
- **Statements:** >85%

### View Coverage Report

After running `npm run test:coverage`, you can view the detailed coverage report:

```bash
# Open the HTML coverage report
open coverage/lcov-report/index.html
```

Or on Linux:
```bash
xdg-open coverage/lcov-report/index.html
```

## Test Categories

### Unit Tests
- Individual component rendering
- Utility function behavior
- Props validation
- State management

### Integration Tests
- Server actions with mocked database
- Authentication flows
- Notification system
- Email sending (mocked)

### Interaction Tests
- Click handlers
- Keyboard navigation
- Hover effects
- Animation triggers

### Accessibility Tests
- ARIA attributes
- Keyboard accessibility
- Screen reader support
- Focus management

## Key Test Features

### 1. LinkedIn-Style Reactions
Tests verify:
- SVG icons render correctly
- Gradients and shadows are applied
- Hover animations work (scale-up, shadow increase)
- Click animations trigger (pop/bounce effect)
- All 6 reaction types are supported

### 2. Post Components
Tests verify:
- User information displays correctly
- Timestamps format properly
- Media content renders
- Tags display
- Engagement counts are accurate

### 3. Feed Actions
Tests verify:
- Like toggling works correctly
- Different reactions can be selected
- Comments can be added
- Replies work properly
- Notifications are created
- Email notifications are sent

## Mocking Strategy

### Database Mocking
```typescript
jest.mock("@/lib/db", () => ({
    db: {
        like: { findUnique: jest.fn(), create: jest.fn(), ... },
        comment: { create: jest.fn(), ... },
        // ... other models
    },
}));
```

### Authentication Mocking
```typescript
jest.mock("@/lib/auth-utils", () => ({
    authSession: jest.fn(),
}));
```

### Email Mocking
```typescript
jest.mock("@/lib/send-notification-email", () => ({
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));
```

## Common Test Patterns

### Testing Component Rendering
```typescript
it("renders component with props", () => {
    render(<Component prop="value" />);
    expect(screen.getByText("value")).toBeInTheDocument();
});
```

### Testing User Interactions
```typescript
it("handles click event", async () => {
    const mockClick = jest.fn();
    render(<Button onClick={mockClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(mockClick).toHaveBeenCalled();
});
```

### Testing Async Actions
```typescript
it("creates notification", async () => {
    await toggleLike("post-1", "Like");
    expect(db.notification.create).toHaveBeenCalled();
});
```

## Troubleshooting

### Tests Failing Due to Missing Dependencies
```bash
npm install
```

### Jest Config Issues
If you encounter module resolution errors, check:
- `jest.config.ts` is properly configured
- `moduleNameMapper` includes all necessary aliases
- `transformIgnorePatterns` excludes problematic packages

### Coverage Not Generating
Ensure coverage thresholds are set in `jest.config.ts`:
```typescript
coverageThreshold: {
    global: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
    },
},
```

## Best Practices

1. **Write Descriptive Test Names**
   ```typescript
   it("creates notification when user likes another user's post", () => {
       // test implementation
   });
   ```

2. **Test User Behavior, Not Implementation**
   - Focus on what the user sees and does
   - Avoid testing internal state or implementation details

3. **Clean Up After Tests**
   ```typescript
   beforeEach(() => {
       jest.clearAllMocks();
   });
   ```

4. **Use Proper Assertions**
   ```typescript
   expect(element).toBeInTheDocument();
   expect(fn).toHaveBeenCalledWith(expectedArg);
   ```

5. **Test Edge Cases**
   - Empty states
   - Null/undefined values
   - Error conditions
   - Loading states

## Continuous Integration

### GitHub Actions
Tests automatically run on:
- Pull request creation
- Push to main branch
- Manual workflow dispatch

### Pre-commit Hooks
Consider adding pre-commit hooks to run tests:
```bash
npm test -- --bail --findRelatedTests
```

## Future Improvements

1. **E2E Tests**
   - Add Playwright or Cypress tests
   - Test complete user flows

2. **Visual Regression Tests**
   - Add screenshot comparisons
   - Test UI consistency

3. **Performance Tests**
   - Add lighthouse CI
   - Test bundle size

4. **Accessibility Tests**
   - Add automated a11y testing with jest-axe
   - Test with screen readers

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure >85% coverage for new code
3. Update this documentation
4. Run full test suite before committing

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** 2026-04-08
**Test Coverage:** >85%
**Total Tests:** 100+
