import { test as setup, expect } from '@playwright/test'

const TEST_ACCOUNTS = {
  superadmin: {
    email: 'alan@100xlt.ai',
    password: 'pam12ela',
    storageState: './src/tests/end-to-end/.auth/superadmin.json',
  },
  admin: {
    email: 'test-admin@longtale.ai',
    password: 'TestPass123',
    storageState: './src/tests/end-to-end/.auth/admin.json',
  },
  member: {
    email: 'test-member@longtale.ai',
    password: 'TestPass123',
    storageState: './src/tests/end-to-end/.auth/member.json',
  },
}

for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for redirect to /app (dashboard) — proves login succeeded
    await page.waitForURL('**/app**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/app/)

    await page.context().storageState({ path: account.storageState })
  })
}
