import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
  });

  test('should navigate to login page', async ({ page }) => {
    // Check if login button/link exists
    const loginLink = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await expect(loginLink).toBeVisible();
  });

  test('should show login form with email and password fields', async ({ page }) => {
    // Click login button to open form
    const loginBtn = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await loginBtn.click();
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]')).first();
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    
    // Check for submit button
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('text=Sign In').last()).first();
    await expect(submitBtn).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to login
    const loginBtn = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await loginBtn.click();
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message (case-insensitive regex)
    const errorMessage = page.locator('text=Invalid').or(page.locator('text=/error/i')).first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Navigate to login
    const loginBtn = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await loginBtn.click();
    
    // Fill in valid credentials
    await page.fill('input[type="email"]', 'obsanet2021@gmail.com');
    await page.fill('input[type="password"]', 'Nasbo@2021');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation and check for dashboard elements
    await expect(page.locator('text=Welcome Back').or(page.locator('text=Dashboard'))).toBeVisible({ timeout: 10000 });
  });

  test('should test responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    const loginBtn = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await expect(loginBtn).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    
    await expect(loginBtn).toBeVisible();
  });
});
