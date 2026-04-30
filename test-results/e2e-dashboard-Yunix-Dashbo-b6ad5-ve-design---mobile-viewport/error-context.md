# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\dashboard.spec.ts >> Yunix Dashboard Tests >> Test responsive design - mobile viewport
- Location: e2e\dashboard.spec.ts:94:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1   | ﻿import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Yunix Dashboard Tests', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Navigate to the app
> 6   |     await page.goto('http://localhost:5173');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7   |     
  8   |     // Click login button
  9   |     const loginBtn = page.locator('text=Sign In').or(page.locator('text=Login')).first();
  10  |     await loginBtn.click();
  11  |     
  12  |     // Fill in credentials
  13  |     await page.fill('input[type="email"]', 'obsanet2021@gmail.com');
  14  |     await page.fill('input[type="password"]', 'Nasbo@2021');
  15  |     
  16  |     // Submit form
  17  |     await page.click('button[type="submit"]');
  18  |     
  19  |     // Wait for dashboard to load
  20  |     await page.waitForTimeout(2000);
  21  |   });
  22  | 
  23  |   test('Dashboard loads correctly', async ({ page }) => {
  24  |     // Check if main elements exist
  25  |     await expect(page.locator('text=Recent Performance')).toBeVisible();
  26  |     await expect(page.locator('text=Welcome Back')).toBeVisible();
  27  |   });
  28  | 
  29  |   test('Period selector buttons work (7D, 30D, 90D)', async ({ page }) => {
  30  |     // Test 7D button
  31  |     await page.click('button:has-text("7D")');
  32  |     await page.waitForTimeout(500);
  33  |     
  34  |     // Test 30D button  
  35  |     await page.click('button:has-text("30D")');
  36  |     await page.waitForTimeout(500);
  37  |     
  38  |     // Test 90D button
  39  |     await page.click('button:has-text("90D")');
  40  |     await page.waitForTimeout(500);
  41  |     
  42  |     // Verify chart is still visible
  43  |     await expect(page.locator('svg')).toBeVisible();
  44  |   });
  45  | 
  46  |   test('Add Trade button exists', async ({ page }) => {
  47  |     const addButton = page.locator('button:has-text("Add Trade")');
  48  |     await expect(addButton).toBeVisible();
  49  |   });
  50  | 
  51  |   test('Prop firms section loads', async ({ page }) => {
  52  |     await expect(page.locator('text=Prop Firms Overview')).toBeVisible();
  53  |   });
  54  | 
  55  |   test('Economic calendar widget loads', async ({ page }) => {
  56  |     await expect(page.locator('text=Economic Calendar')).toBeVisible();
  57  |   });
  58  | 
  59  |   test('Click all period selector buttons and verify chart updates', async ({ page }) => {
  60  |     const periods = ['7D', '30D', '90D'];
  61  |     
  62  |     for (const period of periods) {
  63  |       await page.click(`button:has-text("${period}")`);
  64  |       await page.waitForTimeout(500);
  65  |       
  66  |       // Verify chart is still visible after clicking
  67  |       await expect(page.locator('svg').first()).toBeVisible();
  68  |       
  69  |       // Verify button is in active/selected state
  70  |       const button = page.locator(`button:has-text("${period}")`);
  71  |       await expect(button).toBeVisible();
  72  |     }
  73  |   });
  74  | 
  75  |   test('Test Add Trade button click opens modal/form', async ({ page }) => {
  76  |     const addButton = page.locator('button:has-text("Add Trade")').first();
  77  |     await expect(addButton).toBeVisible();
  78  |     
  79  |     await addButton.click();
  80  |     await page.waitForTimeout(1000);
  81  |     
  82  |     // Check if modal or form appeared
  83  |     const modalOrForm = page.locator('text=New Trade').or(page.locator('text=Add Trade').last());
  84  |     await expect(modalOrForm).toBeVisible();
  85  |   });
  86  | 
  87  |   test('Verify all stats cards are visible', async ({ page }) => {
  88  |     // Check for common stat card titles
  89  |     await expect(page.locator('text=Total PnL').or(page.locator('text=Profit/Loss'))).toBeVisible();
  90  |     await expect(page.locator('text=Win Rate')).toBeVisible();
  91  |     await expect(page.locator('text=Best Trade')).toBeVisible();
  92  |   });
  93  | 
  94  |   test('Test responsive design - mobile viewport', async ({ page }) => {
  95  |     // Set mobile viewport
  96  |     await page.setViewportSize({ width: 375, height: 667 });
  97  |     await page.reload();
  98  |     await page.waitForTimeout(2000);
  99  |     
  100 |     // Verify dashboard still loads
  101 |     await expect(page.locator('text=Welcome Back')).toBeVisible();
  102 |     await expect(page.locator('text=Recent Performance')).toBeVisible();
  103 |   });
  104 | 
  105 |   test('Test responsive design - desktop viewport', async ({ page }) => {
  106 |     // Set desktop viewport
```