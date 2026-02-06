/**
 * End-to-End tests for Brand Creation Flow
 * 
 * To run these tests, you'll need to install Playwright:
 * npm install -D @playwright/test
 * 
 * Then run: npx playwright test
 */

import { test, expect } from '@playwright/test'

const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Brand Creation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to brand creation page (assumes user is logged in)
    await page.goto('/brands/new')
  })

  test('should complete full brand creation flow', async ({ page }) => {
    // Step 1: Fill in brand details
    await page.fill('[data-testid="brand-name-input"]', 'Test Brand')
    await page.fill('[data-testid="domain-input"]', 'testbrand.com')
    
    // Wait for auto-generated subdomain
    await expect(page.locator('[data-testid="subdomain-input"]')).toHaveValue('test-brand')
    
    // Continue to next step
    await page.click('button:has-text("Continue")')
    
    // Step 2: Review and submit
    await expect(page.locator('text=Test Brand')).toBeVisible()
    await expect(page.locator('text=testbrand.com')).toBeVisible()
    
    // Submit form
    await page.click('button:has-text("Create Brand")')
    
    // Wait for success message
    await expect(page.locator('text=Brand created successfully')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    // Try to continue without filling fields
    await page.click('button:has-text("Continue")')
    
    // Button should be disabled
    await expect(page.locator('button:has-text("Continue")')).toBeDisabled()
  })

  test('should validate brand name length', async ({ page }) => {
    await page.fill('[data-testid="brand-name-input"]', 'A')
    
    // Should show validation message
    await expect(page.locator('text=must be at least 2 characters')).toBeVisible()
  })

  test('should validate subdomain format', async ({ page }) => {
    await page.fill('[data-testid="brand-name-input"]', 'Test Brand')
    await page.fill('[data-testid="domain-input"]', 'testbrand.com')
    await page.click('button:has-text("Continue")')
    
    // Try to set invalid subdomain
    await page.fill('[data-testid="subdomain-input"]', 'invalid_subdomain')
    
    // Should show validation error
    await expect(page.locator('text=Invalid subdomain')).toBeVisible()
  })

  test('should verify domain ownership', async ({ page }) => {
    // Assuming user email matches domain
    await page.fill('[data-testid="brand-name-input"]', 'Test Brand')
    await page.fill('[data-testid="domain-input"]', 'matchingdomain.com')
    
    // Wait for verification to complete
    await page.waitForTimeout(600) // Debounce time + buffer
    
    await page.click('button:has-text("Continue")')
    
    // Should show verification badge
    await expect(page.locator('[data-testid="verification-badge"]')).toBeVisible()
  })

  test('should handle subdomain already taken error', async ({ page }) => {
    await page.fill('[data-testid="brand-name-input"]', 'Existing Brand')
    await page.fill('[data-testid="domain-input"]', 'existing.com')
    await page.click('button:has-text("Continue")')
    
    // Use a subdomain that's already taken
    await page.fill('[data-testid="subdomain-input"]', 'taken-subdomain')
    await page.click('button:has-text("Create Brand")')
    
    // Should show error message
    await expect(page.locator('text=subdomain is already taken')).toBeVisible()
  })

  test('should sanitize input to prevent XSS', async ({ page }) => {
    const xssPayload = '<script>alert("xss")</script>'
    await page.fill('[data-testid="brand-name-input"]', xssPayload)
    
    // Input should be sanitized
    const value = await page.inputValue('[data-testid="brand-name-input"]')
    expect(value).not.toContain('<script>')
  })

  test('should go back from step 2 to step 1', async ({ page }) => {
    await page.fill('[data-testid="brand-name-input"]', 'Test Brand')
    await page.fill('[data-testid="domain-input"]', 'testbrand.com')
    await page.click('button:has-text("Continue")')
    
    // Click back button
    await page.click('button:has-text("Back")')
    
    // Should be back at step 1 with form values preserved
    await expect(page.locator('[data-testid="brand-name-input"]')).toHaveValue('Test Brand')
  })

  test('should disable submit button while loading', async ({ page }) => {
    await page.fill('[data-testid="brand-name-input"]', 'Test Brand')
    await page.fill('[data-testid="domain-input"]', 'testbrand.com')
    await page.click('button:has-text("Continue")')
    
    // Click create button
    await page.click('button:has-text("Create Brand")')
    
    // Button should show loading state and be disabled
    await expect(page.locator('button:has-text("Create Brand")')).toBeDisabled()
    await expect(page.locator('.animate-spin')).toBeVisible()
  })

  test('should enforce maximum character limits', async ({ page }) => {
    const longBrandName = 'A'.repeat(300)
    await page.fill('[data-testid="brand-name-input"]', longBrandName)
    
    // Should be limited to 255 characters
    const value = await page.inputValue('[data-testid="brand-name-input"]')
    expect(value.length).toBeLessThanOrEqual(255)
  })
})
