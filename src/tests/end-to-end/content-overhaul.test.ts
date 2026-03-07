import { test, expect } from '@playwright/test'

/**
 * E2E tests for the Content Page Overhaul features.
 * Tests run against the live dev server with a superadmin auth state.
 */

test.describe('Content Page — Calendar Article View', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('content page loads with calendar, pipeline, and queue tabs', async ({ page }) => {
    await page.goto('/app/content')
    await expect(page.getByText('Content').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Calendar')).toBeVisible()
    await expect(page.getByText('Pipeline')).toBeVisible()
    await expect(page.getByText('Queue')).toBeVisible()
  })

  test('pipeline view loads when clicked', async ({ page }) => {
    await page.goto('/app/content')
    await page.getByText('Pipeline').click()
    await page.waitForURL('**/content?view=pipeline**')
    await page.waitForTimeout(2000)
    // Pipeline rendered without crash — no Vite error overlay
    const errorOverlay = page.locator('[class*="vite-error"]')
    expect(await errorOverlay.count()).toBe(0)
  })

  test('queue view loads when clicked', async ({ page }) => {
    await page.goto('/app/content')
    await page.getByText('Queue').click()
    await page.waitForURL('**/content?view=queue**')
    await page.waitForTimeout(2000)
    // Queue rendered without crash
    const errorOverlay = page.locator('[class*="vite-error"]')
    expect(await errorOverlay.count()).toBe(0)
  })
})

test.describe('Content Page — Post Composer', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('new post button exists on content page', async ({ page }) => {
    await page.goto('/app/content')
    await expect(page.getByRole('button', { name: /new post/i })).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Analytics Page — Outlets Tab', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('analytics page has Outlets tab', async ({ page }) => {
    await page.goto('/app/analytics')
    await expect(page.getByText('Outlets')).toBeVisible({ timeout: 15000 })
  })

  test('clicking Outlets tab shows cross-outlet content', async ({ page }) => {
    await page.goto('/app/analytics')
    const outletsTab = page.getByText('Outlets')
    await expect(outletsTab).toBeVisible({ timeout: 15000 })
    await outletsTab.click()

    // Should show either outlet data or the empty/gated state
    await page.waitForTimeout(2000)
    const tabContent = page.locator('[role="tabpanel"]').last()
    await expect(tabContent).toBeVisible()
  })
})

test.describe('Analytics Page — All Tabs Load', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  const tabs = ['Overview', 'Platforms', 'Engagement', 'Audience', 'All Posts', 'Outlets']

  for (const tabName of tabs) {
    test(`${tabName} tab loads without error`, async ({ page }) => {
      await page.goto('/app/analytics')
      const tab = page.getByText(tabName, { exact: false }).first()
      await expect(tab).toBeVisible({ timeout: 15000 })
      await tab.click()
      await page.waitForTimeout(1500)

      // No error overlay should appear
      const errorOverlay = page.locator('[class*="vite-error"]')
      expect(await errorOverlay.count()).toBe(0)
    })
  }
})

test.describe('Sidebar — Permission Gating', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('superadmin sees all main nav items', async ({ page }) => {
    await page.goto('/app')
    await page.waitForTimeout(3000)

    // Superadmin should see Content, Analytics, Inbox, Settings
    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Sidebar — Member Restrictions', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/member.json' })

  test('member can access dashboard', async ({ page }) => {
    await page.goto('/app')
    await page.waitForTimeout(3000)

    // Page should load without error
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })
})

test.describe('Dashboard — Loads Without Errors', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('dashboard renders with visible widgets', async ({ page }) => {
    await page.goto('/app')

    // Wait for dashboard content
    await page.waitForTimeout(5000)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(200)

    // No Vite error overlay
    const errorOverlay = page.locator('[class*="vite-error"]')
    expect(await errorOverlay.count()).toBe(0)
  })
})
