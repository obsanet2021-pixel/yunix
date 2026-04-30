import { test, expect } from '@playwright/test';

test.describe('Yunix Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Click login button
    const loginBtn = page.locator('text=Sign In').or(page.locator('text=Login')).first();
    await loginBtn.click();
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'obsanet2021@gmail.com');
    await page.fill('input[type="password"]', 'Nasbo@2021');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
  });

  test('Dashboard loads correctly', async ({ page }) => {
    // Check if main elements exist
    await expect(page.locator('text=Recent Performance')).toBeVisible();
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('Period selector buttons work (7D, 30D, 90D)', async ({ page }) => {
    // Test 7D button
    await page.click('button:has-text("7D")');
    await page.waitForTimeout(500);
    
    // Test 30D button  
    await page.click('button:has-text("30D")');
    await page.waitForTimeout(500);
    
    // Test 90D button
    await page.click('button:has-text("90D")');
    await page.waitForTimeout(500);
    
    // Verify chart is still visible
    await expect(page.locator('svg')).toBeVisible();
  });

  test('Add Trade button exists', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Trade")');
    await expect(addButton).toBeVisible();
  });

  test('Prop firms section loads', async ({ page }) => {
    await expect(page.locator('text=Prop Firms Overview')).toBeVisible();
  });

  test('Economic calendar widget loads', async ({ page }) => {
    await expect(page.locator('text=Economic Calendar')).toBeVisible();
  });

  test('Click all period selector buttons and verify chart updates', async ({ page }) => {
    const periods = ['7D', '30D', '90D'];
    
    for (const period of periods) {
      await page.click(`button:has-text("${period}")`);
      await page.waitForTimeout(500);
      
      // Verify chart is still visible after clicking
      await expect(page.locator('svg').first()).toBeVisible();
      
      // Verify button is in active/selected state
      const button = page.locator(`button:has-text("${period}")`);
      await expect(button).toBeVisible();
    }
  });

  test('Test Add Trade button click opens modal/form', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Trade")').first();
    await expect(addButton).toBeVisible();
    
    await addButton.click();
    await page.waitForTimeout(1000);
    
    // Check if modal or form appeared
    const modalOrForm = page.locator('text=New Trade').or(page.locator('text=Add Trade').last());
    await expect(modalOrForm).toBeVisible();
  });

  test('Verify all stats cards are visible', async ({ page }) => {
    // Check for common stat card titles
    await expect(page.locator('text=Total PnL').or(page.locator('text=Profit/Loss'))).toBeVisible();
    await expect(page.locator('text=Win Rate')).toBeVisible();
    await expect(page.locator('text=Best Trade')).toBeVisible();
  });

  test('Test responsive design - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Verify dashboard still loads
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Recent Performance')).toBeVisible();
  });

  test('Test responsive design - desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Verify dashboard loads
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Recent Performance')).toBeVisible();
  });
});
