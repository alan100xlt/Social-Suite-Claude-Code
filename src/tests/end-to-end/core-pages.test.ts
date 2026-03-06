import { test, expect } from '@playwright/test'

// ─── Login Flow ─────────────────────────────────────────────

test.describe('Login Flow', () => {
  test('valid credentials → redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('alan@100xlt.ai')
    await page.getByLabel('Password').fill('pam12ela')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/app**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/app/)
  })

  test('invalid credentials → shows error, stays on login', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show an error and NOT redirect
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/auth/login')
  })

  test('unauthenticated user → redirected to login', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()
    await page.goto('/app')
    await page.waitForURL('**/auth/login**', { timeout: 10000 })
    expect(page.url()).toContain('/auth/login')
  })
})

// ─── Dashboard (superadmin) ──────────────────────────────────

test.describe('Dashboard — Superadmin', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('dashboard loads with visible content', async ({ page }) => {
    await page.goto('/app')

    // Page should have the sidebar
    await expect(page.locator('nav, [class*="sidebar"], aside').first()).toBeVisible({ timeout: 10000 })

    // Should NOT be a blank page — at least some text content rendered
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })
})

// ─── Content Page (superadmin) ───────────────────────────────

test.describe('Content Page — Superadmin', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('content page loads with tabs', async ({ page }) => {
    await page.goto('/app/content')

    // Should have the Content heading and tab navigation (Calendar, Pipeline, Queue)
    await expect(page.getByText('Content').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Calendar')).toBeVisible()
  })
})

// ─── Analytics Page (superadmin) ─────────────────────────────

test.describe('Analytics — Superadmin', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/superadmin.json' })

  test('analytics page loads', async ({ page }) => {
    await page.goto('/app/analytics')

    // Don't use networkidle — analytics page has polling intervals that keep network active
    // Instead, wait for visible content to confirm the page rendered
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15000 })
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

// ─── Admin Routes — Member Blocked ──────────────────────────

test.describe('Admin Routes — Member Blocked', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/member.json' })

  const adminRoutes = [
    '/app/admin/platform-config',
    '/app/admin/data',
    '/app/admin/api-logs',
    '/app/admin/mapping',
    '/app/admin/cron-health',
    '/app/admin/automation-logs',
    '/app/admin/operations',
  ]

  for (const route of adminRoutes) {
    test(`member blocked from ${route}`, async ({ page }) => {
      await page.goto(route)

      const restricted = page.getByText('Access Restricted')
      const redirected = page.waitForURL('**/app', { timeout: 15000 }).then(() => true).catch(() => false)

      const sawRestricted = await restricted.isVisible().catch(() => false)
      if (sawRestricted) {
        await page.waitForURL('**/app', { timeout: 8000 })
      } else {
        await redirected
      }
      expect(page.url()).not.toContain('/admin/')
    })
  }
})

// ─── Admin Routes — Admin (non-superadmin) Blocked ──────────

test.describe('Admin Routes — Admin Blocked', () => {
  test.use({ storageState: './src/tests/end-to-end/.auth/admin.json' })

  const adminRoutes = [
    '/app/admin/platform-config',
    '/app/admin/api-logs',
    '/app/admin/cron-health',
  ]

  for (const route of adminRoutes) {
    test(`admin blocked from ${route}`, async ({ page }) => {
      await page.goto(route)

      // Either see "Access Restricted" or get redirected away from admin
      const restricted = page.getByText('Access Restricted')
      const redirected = page.waitForURL('**/app', { timeout: 15000 }).then(() => true).catch(() => false)

      const sawRestricted = await restricted.isVisible().catch(() => false)
      if (sawRestricted) {
        // Good — guard showed the block page, now wait for redirect
        await page.waitForURL('**/app', { timeout: 8000 })
      } else {
        // Guard may have redirected before rendering — verify we left admin
        await redirected
      }
      expect(page.url()).not.toContain('/admin/')
    })
  }
})
