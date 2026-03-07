import { test, expect } from '@playwright/test'

test.describe('Platform Metrics Matrix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('alan@100xlt.ai')
    await page.getByLabel('Password').fill('pam12ela')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/app**', { timeout: 15000 })
  })

  test('Connections page shows Metrics by Platform section', async ({ page }) => {
    await page.goto('/app/connections')
    await expect(page.getByText('Metrics by Platform')).toBeVisible({ timeout: 10000 })
  })

  test('Matrix shows platform names with icons', async ({ page }) => {
    await page.goto('/app/connections')
    await expect(page.getByText('Metrics by Platform')).toBeVisible({ timeout: 10000 })
    // AG Grid should render platform names
    await expect(page.getByText('Instagram')).toBeVisible()
    await expect(page.getByText('Facebook')).toBeVisible()
  })

  test('Analytics Platforms tab shows Platform Metrics Overview', async ({ page }) => {
    await page.goto('/app/analytics')
    // Click the Platforms tab
    await page.getByRole('tab', { name: /platforms/i }).click()
    await expect(page.getByText('Platform Metrics Overview')).toBeVisible({ timeout: 10000 })
  })
})
