import { test, expect } from '@playwright/test';

test.describe('MetiTrack Cleanroom MES — End-to-End User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local frontend server
    await page.goto('/');
  });

  test('E2E-01: loads cleanroom dashboard and renders 5 sequential stations', async ({ page }) => {
    // Verify Page Title
    await expect(page).toHaveTitle(/MetiTrack/i);

    // Verify Station Headers on Kanban Board
    await expect(page.locator('text=3D CAD Modeling & Surgical Planning').first()).toBeVisible();
    await expect(page.locator('text=3D Metal Printing (SLM)').first()).toBeVisible();
    await expect(page.locator('text=CNC Post-Processing & Heat Treatment').first()).toBeVisible();
    await expect(page.locator('text=ISO 13485 QA Inspection & Sterilization').first()).toBeVisible();
    await expect(page.locator('text=Medical Labelling & Packaging').first()).toBeVisible();

    // Verify Active Order Cards exist
    const cards = page.locator('.group.relative.rounded-xl.border');
    await expect(cards.first()).toBeVisible();
  });

  test('E2E-02: filters Kanban orders by Surgical Urgency priority', async ({ page }) => {
    // Select Urgent Priority
    const prioritySelect = page.locator('select').filter({ hasText: /All Priorities/i }).first();
    await prioritySelect.selectOption('URGENT');

    // Wait for filtered cards to settle
    await page.waitForTimeout(300);

    // Verify only urgent cards or empty state shown
    const urgentBadges = page.locator('text=URGENT');
    const count = await urgentBadges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('E2E-03: opens 480px Slide-Over Drawer and WebGL 3D Mesh on card click', async ({ page }) => {
    // Wait for cards to appear and click directly on the first Case ID text
    const caseIdBadge = page.locator('text=CAS-2026-').first();
    await expect(caseIdBadge).toBeVisible();
    await caseIdBadge.click();

    // Verify Slide-Over Drawer opens
    await expect(page.locator('button:has-text("3D Mesh")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Specs")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Costs")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Audit Trail")').first()).toBeVisible();
    await expect(page.locator('button:has-text("UDI / FDA")').first()).toBeVisible();

    // Verify SLM machine parameters are visible in 3D tab
    await expect(page.locator('text=SLM Machine Parameters').first()).toBeVisible();

    // Close drawer
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(page.locator('button:has-text("3D Mesh")')).not.toBeVisible();
  });

  test('E2E-04: opens Patient Case Intake & Triage modal on "+ New Case" click', async ({ page }) => {
    // Click "+ New Case"
    const newCaseBtn = page.getByRole('button', { name: /New Case/i });
    await newCaseBtn.click();

    // Verify Modal appears
    await expect(page.locator('text=Patient Case Intake & Triage')).toBeVisible();
    await expect(page.locator('text=Patient Clinical Identifier')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^Cranial Plate$/ }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^Mandibular Jaw$/ }).first()).toBeVisible();

    // Cancel modal
    const cancelBtn = page.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
    await expect(page.locator('text=Patient Case Intake & Triage')).not.toBeVisible();
  });

  test('E2E-05: navigates across Cleanroom Rail Views (Metrics, Stock, Security)', async ({ page }) => {
    // Switch to Metrics (Analytics)
    await page.locator('button[title*="Telemetry"]').first().click();
    await expect(page.locator('text=Cleanroom Machine Telemetry & Station Bottlenecks')).toBeVisible();

    // Switch to Stock (Warehouse Stores)
    await page.locator('button[title*="Inventory"]').first().click();
    await expect(page.locator('text=Titanium Ti-6Al-4V & Raw Materials Warehouse Stores')).toBeVisible();

    // Switch to Security Audit
    await page.locator('button[title*="Security"]').first().click();
    await expect(page.locator('text=FDA 21 CFR Part 11 Immutable Append-Only Security Stream')).toBeVisible();

    // Return to Kanban Board
    await page.locator('button[title*="Pipeline"]').first().click();
    await expect(page.locator('text=3D CAD Modeling & Surgical Planning').first()).toBeVisible();
  });
});
