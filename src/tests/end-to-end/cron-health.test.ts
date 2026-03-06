import { test, expect } from '@playwright/test'

// ─── Test 1: Superadmin can access Cron Health and see live data ───

test.describe('Cron Health — Superadmin', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('can access Cron Health and see live data', async ({ page }) => {
    await page.goto('/app/admin/cron-health')

    // Page title visible
    await expect(page.getByRole('heading', { name: 'Cron Health' })).toBeVisible()

    // Registered Cron Jobs table is present with rows
    const jobsTable = page.locator('table').first()
    await expect(jobsTable).toBeVisible()

    const jobRows = jobsTable.locator('tbody tr')
    await expect(jobRows).not.toHaveCount(0)

    // At least one job shows a Last Run value that is NOT "Never"
    // (this catches the name-mismatch bug we fixed)
    const lastRunCells = jobsTable.locator('tbody td:nth-child(5)')
    const cellTexts = await lastRunCells.allTextContents()
    const hasRealLastRun = cellTexts.some(
      (text) => text.trim() !== 'Never' && text.trim() !== '—' && text.trim() !== ''
    )
    expect(hasRealLastRun, 'Expected at least one job to show a Last Run value that is not "Never"').toBe(true)

    // At least one job shows a success rate percentage
    const successRateCells = jobsTable.locator('tbody td:nth-child(7)')
    const rateTexts = await successRateCells.allTextContents()
    const hasSuccessRate = rateTexts.some((text) => text.includes('%'))
    expect(hasSuccessRate, 'Expected at least one job to show a success rate percentage').toBe(true)

    // Recent Executions section exists and has log rows
    const recentHeading = page.getByRole('heading', { name: 'Recent Executions' })
    await expect(recentHeading).toBeVisible()

    const logsTable = page.locator('table').nth(1)
    await expect(logsTable).toBeVisible()
    const logRows = logsTable.locator('tbody tr')
    await expect(logRows).not.toHaveCount(0)
  })
})

// ─── Test 2: Member is blocked from Cron Health ───

test.describe('Cron Health — Member', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/member.json' })

  test('member is blocked from Cron Health', async ({ page }) => {
    await page.goto('/app/admin/cron-health')

    // Should see "Access Restricted" (SuperAdminRoute guard)
    await expect(page.getByText('Access Restricted')).toBeVisible({ timeout: 10000 })

    // Should redirect to /app within 5 seconds
    await page.waitForURL('**/app', { timeout: 6000 })
    expect(page.url()).not.toContain('/cron-health')
  })
})

// ─── Test 3: Admin is blocked from Cron Health ───

test.describe('Cron Health — Admin', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/admin.json' })

  test('admin is blocked from Cron Health', async ({ page }) => {
    await page.goto('/app/admin/cron-health')

    // Should see "Access Restricted" (SuperAdminRoute guard)
    await expect(page.getByText('Access Restricted')).toBeVisible({ timeout: 10000 })

    // Should redirect to /app within 5 seconds
    await page.waitForURL('**/app', { timeout: 6000 })
    expect(page.url()).not.toContain('/cron-health')
  })
})
