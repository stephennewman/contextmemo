# Testing Documentation

This directory contains comprehensive tests for the ContextMemo application.

## Test Structure

```
test/
├── setup.ts                          # Test environment setup
├── unit/                             # Unit tests for individual functions
│   ├── domain-verification.test.ts  # Domain utility tests
│   └── sanitizeInput.test.ts        # Input sanitization tests
├── integration/                      # Integration tests
│   └── brand-creation.test.tsx      # Brand creation flow tests
└── e2e/                             # End-to-end tests
    └── brand-creation.spec.ts       # Browser-based E2E tests
```

## Running Tests

### Install Dependencies

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

For E2E tests:
```bash
npm install -D @playwright/test
npx playwright install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests with UI

```bash
npm test -- --ui
```

### Run E2E Tests

```bash
npx playwright test
```

### Run E2E Tests with UI

```bash
npx playwright test --ui
```

## Test Categories

### Unit Tests

Unit tests focus on individual functions and utilities in isolation. They test:

- **Domain Verification** (`domain-verification.test.ts`)
  - Root domain extraction
  - Email domain extraction
  - Domain ownership verification
  - Subdomain generation
  - Subdomain validation

- **Input Sanitization** (`sanitizeInput.test.ts`)
  - XSS prevention
  - Input trimming
  - Character length limits
  - Special character removal

### Integration Tests

Integration tests verify that multiple components work together correctly. They test:

- **Brand Creation Flow** (`brand-creation.test.tsx`)
  - Form validation logic
  - Error handling patterns
  - Data sanitization workflows
  - Logging mechanisms
  - Debouncing behavior

### End-to-End Tests

E2E tests simulate real user interactions in a browser environment. They test:

- **Complete User Flows** (`brand-creation.spec.ts`)
  - Full brand creation process
  - Form field validation
  - Navigation between steps
  - Error message display
  - Loading states
  - Security (XSS prevention)

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/utils/my-function'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should perform action', async ({ page }) => {
  await page.goto('/path')
  await page.click('button')
  await expect(page.locator('text=Success')).toBeVisible()
})
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test user-facing behavior

2. **Keep Tests Independent**
   - Each test should be able to run in isolation
   - Use `beforeEach` for common setup

3. **Use Descriptive Test Names**
   - Test names should clearly describe what is being tested
   - Use "should" statements

4. **Mock External Dependencies**
   - Mock API calls, database queries, etc.
   - Keep tests fast and reliable

5. **Test Edge Cases**
   - Test with empty strings, null values, extreme lengths
   - Test error conditions

6. **Maintain Test Coverage**
   - Aim for >80% code coverage
   - Focus on critical paths first

## Continuous Integration

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Troubleshooting

### Tests Failing After Changes

1. Check if mocks need updating
2. Verify test data matches new requirements
3. Update snapshots if needed: `npm test -- -u`

### Slow Tests

1. Check for unnecessary async operations
2. Reduce timeout values where appropriate
3. Consider mocking heavy operations

### Flaky E2E Tests

1. Add explicit waits for async operations
2. Use `waitFor` instead of fixed timeouts
3. Check for race conditions

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
