import { test, expect, Page, BrowserContext } from '@playwright/test'
import { randomBytes } from 'crypto'

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retry: 3,
  headless: false, // Set to true for CI
  viewport: { width: 1920, height: 1080 }
}

// Test data
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'TestPassword123!',
    name: 'Admin User',
    role: 'admin'
  },
  manager: {
    email: 'manager@test.com',
    password: 'TestPassword123!',
    name: 'Manager User',
    role: 'manager'
  },
  user: {
    email: 'user@test.com',
    password: 'TestPassword123!',
    name: 'Regular User',
    role: 'user'
  }
}

const TEST_COMPANIES = {
  techcorp: {
    name: 'TechCorp Solutions',
    domain: 'techcorp.com',
    industry: 'Technology',
    size: 'enterprise'
  },
  marketing: {
    name: 'Marketing Masters',
    domain: 'marketingmasters.com',
    industry: 'Marketing',
    size: 'medium'
  },
  creative: {
    name: 'Creative Agency',
    domain: 'creativeagency.com',
    industry: 'Creative',
    size: 'small'
  }
}

test.describe('Enterprise Media Company System - End-to-End Tests', () => {
  let page: Page
  let context: BrowserContext

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      ...TEST_CONFIG,
      permissions: ['clipboard-read', 'clipboard-write']
    })
    page = await context.newPage()
    await page.goto(TEST_CONFIG.baseURL)
  })

  test.afterAll(async () => {
    await context.close()
  })

  test.describe('Authentication & Security', () => {
    test('should login as admin user', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      
      // Verify successful login
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
    })

    test('should enforce role-based access control', async () => {
      // Login as regular user
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.user.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.user.password)
      await page.click('[data-testid="login-button"]')
      
      // Try to access admin features
      await page.goto(`${TEST_CONFIG.baseURL}/admin/automation`)
      
      // Should be redirected or show access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
    })

    test('should handle session timeout correctly', async () => {
      // Login and wait for session timeout
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      
      // Wait for session timeout (simulate)
      await page.evaluate(() => {
        localStorage.removeItem('auth_token')
      })
      
      // Try to access protected page
      await page.goto(`${TEST_CONFIG.baseURL}/admin/dashboard`)
      
      // Should redirect to login
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
    })
  })

  test.describe('Multi-Company Management', () => {
    test.beforeEach(async () => {
      // Login as admin
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
    })

    test('should create and manage multiple companies', async () => {
      // Create first company
      await page.goto(`${TEST_CONFIG.baseURL}/admin/companies`)
      await page.click('[data-testid="create-company-btn"]')
      
      await page.fill('[data-testid="company-name"]', TEST_COMPANIES.techcorp.name)
      await page.fill('[data-testid="company-domain"]', TEST_COMPANIES.techcorp.domain)
      await page.selectOption('[data-testid="company-industry"]', TEST_COMPANIES.techcorp.industry)
      await page.selectOption('[data-testid="company-size"]', TEST_COMPANIES.techcorp.size)
      await page.click('[data-testid="save-company-btn"]')
      
      // Verify company created
      await expect(page.locator(`text=${TEST_COMPANIES.techcorp.name}`)).toBeVisible()
      
      // Create second company
      await page.click('[data-testid="create-company-btn"]')
      await page.fill('[data-testid="company-name"]', TEST_COMPANIES.marketing.name)
      await page.fill('[data-testid="company-domain"]', TEST_COMPANIES.marketing.domain)
      await page.selectOption('[data-testid="company-industry"]', TEST_COMPANIES.marketing.industry)
      await page.selectOption('[data-testid="company-size"]', TEST_COMPANIES.marketing.size)
      await page.click('[data-testid="save-company-btn"]')
      
      // Verify both companies exist
      await expect(page.locator(`text=${TEST_COMPANIES.techcorp.name}`)).toBeVisible()
      await expect(page.locator(`text=${TEST_COMPANIES.marketing.name}`)).toBeVisible()
    })

    test('should switch between companies seamlessly', async () => {
      // Navigate to company switcher
      await page.click('[data-testid="company-switcher"]')
      
      // Select different company
      await page.click(`[data-testid="company-${TEST_COMPANIES.marketing.domain}"]`)
      
      // Verify company context changed
      await expect(page.locator('[data-testid="current-company"]')).toContainText(TEST_COMPANIES.marketing.name)
      
      // Verify data is company-specific
      await page.goto(`${TEST_CONFIG.baseURL}/content`)
      await expect(page.locator('[data-testid="company-content"]')).toBeVisible()
    })
  })

  test.describe('Bulk Content Management', () => {
    test.beforeEach(async () => {
      // Login and select company
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
      
      // Select TechCorp company
      await page.click('[data-testid="company-switcher"]')
      await page.click(`[data-testid="company-${TEST_COMPANIES.techcorp.domain}"]`)
    })

    test('should create bulk content for multiple platforms', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/content/bulk`)
      
      // Fill bulk content form
      await page.fill('[data-testid="content-title"]', 'Q1 Product Launch Campaign')
      await page.fill('[data-testid="content-description"]', 'Comprehensive product launch campaign for Q1 2024')
      
      // Select platforms
      await page.check('[data-testid="platform-facebook"]')
      await page.check('[data-testid="platform-instagram"]')
      await page.check('[data-testid="platform-linkedin"]')
      await page.check('[data-testid="platform-twitter"]')
      
      // Schedule content
      await page.fill('[data-testid="schedule-date"]', '2024-03-15')
      await page.fill('[data-testid="schedule-time"]', '09:00')
      
      // Upload media
      const fileInput = page.locator('[data-testid="media-upload"]')
      await fileInput.setInputFiles('./test-assets/product-image.jpg')
      
      // Create and schedule
      await page.click('[data-testid="create-bulk-content-btn"]')
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="content-created"]')).toContainText('Q1 Product Launch Campaign')
    })

    test('should monitor bulk publishing progress', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/content/bulk`)
      
      // Start bulk publishing
      await page.click('[data-testid="publish-all-btn"]')
      
      // Monitor progress
      await expect(page.locator('[data-testid="publishing-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
      
      // Wait for completion
      await page.waitForSelector('[data-testid="publishing-complete"]', { timeout: 60000 })
      
      // Verify all platforms published
      await expect(page.locator('[data-testid="facebook-published"]')).toBeVisible()
      await expect(page.locator('[data-testid="instagram-published"]')).toBeVisible()
      await expect(page.locator('[data-testid="linkedin-published"]')).toBeVisible()
      await expect(page.locator('[data-testid="twitter-published"]')).toBeVisible()
    })

    test('should handle publishing errors gracefully', async () => {
      // Simulate network error
      await page.route('**/api/publish', route => route.abort())
      
      await page.goto(`${TEST_CONFIG.baseURL}/content/bulk`)
      await page.click('[data-testid="publish-all-btn"]')
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })
  })

  test.describe('Portfolio Analytics', () => {
    test.beforeEach(async () => {
      // Login and select company
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
    })

    test('should display comprehensive portfolio analytics', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/analytics/portfolio`)
      
      // Verify analytics sections
      await expect(page.locator('[data-testid="overview-metrics"]')).toBeVisible()
      await expect(page.locator('[data-testid="performance-charts"]')).toBeVisible()
      await expect(page.locator('[data-testid="engagement-metrics"]')).toBeVisible()
      await expect(page.locator('[data-testid="company-comparison"]')).toBeVisible()
      
      // Verify key metrics
      await expect(page.locator('[data-testid="total-impressions"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-engagement"]')).toBeVisible()
      await expect(page.locator('[data-testid="engagement-rate"]')).toBeVisible()
      await expect(page.locator('[data-testid="reach-metrics"]')).toBeVisible()
    })

    test('should filter analytics by date range', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/analytics/portfolio`)
      
      // Select date range
      await page.click('[data-testid="date-range-selector"]')
      await page.click('[data-testid="last-30-days"]')
      
      // Verify data updates
      await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="analytics-loaded"]')).toBeVisible()
      
      // Verify date range applied
      await expect(page.locator('[data-testid="date-range-display"]')).toContainText('Last 30 days')
    })

    test('should export analytics reports', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/analytics/portfolio`)
      
      // Generate report
      await page.click('[data-testid="export-report-btn"]')
      await page.selectOption('[data-testid="report-format"]', 'csv')
      await page.click('[data-testid="generate-report-btn"]')
      
      // Verify download
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-report-btn"]')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toContain('portfolio-analytics')
    })
  })

  test.describe('Asset Management', () => {
    test.beforeEach(async () => {
      // Login and select company
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
    })

    test('should upload and organize assets', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/assets`)
      
      // Upload asset
      const fileInput = page.locator('[data-testid="asset-upload"]')
      await fileInput.setInputFiles('./test-assets/marketing-banner.jpg')
      
      // Fill asset details
      await page.fill('[data-testid="asset-title"]', 'Q1 Marketing Banner')
      await page.fill('[data-testid="asset-description"]', 'Main banner for Q1 marketing campaigns')
      await page.selectOption('[data-testid="asset-category"]', 'marketing')
      await page.fill('[data-testid="asset-tags"]', 'banner, marketing, q1-2024')
      
      // Save asset
      await page.click('[data-testid="save-asset-btn"]')
      
      // Verify asset uploaded
      await expect(page.locator('[data-testid="asset-uploaded"]')).toBeVisible()
      await expect(page.locator('[data-testid="asset-thumbnail"]')).toBeVisible()
    })

    test('should search and filter assets', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/assets`)
      
      // Search for specific asset
      await page.fill('[data-testid="asset-search"]', 'banner')
      await page.click('[data-testid="search-btn"]')
      
      // Verify search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      await expect(page.locator('[data-testid="asset-item"]')).toHaveCount.greaterThan(0)
      
      // Filter by category
      await page.selectOption('[data-testid="category-filter"]', 'marketing')
      await page.click('[data-testid="apply-filter-btn"]')
      
      // Verify filter applied
      await expect(page.locator('[data-testid="filter-applied"]')).toBeVisible()
    })

    test('should manage asset collections', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/assets`)
      
      // Create collection
      await page.click('[data-testid="create-collection-btn"]')
      await page.fill('[data-testid="collection-name"]', 'Q1 Marketing Assets')
      await page.fill('[data-testid="collection-description"]', 'All assets for Q1 marketing campaigns')
      await page.click('[data-testid="save-collection-btn"]')
      
      // Add assets to collection
      await page.click('[data-testid="asset-item"]:first-child')
      await page.click('[data-testid="add-to-collection-btn"]')
      await page.click('[data-testid="collection-q1-marketing"]')
      
      // Verify collection updated
      await expect(page.locator('[data-testid="collection-updated"]')).toBeVisible()
    })
  })

  test.describe('Automation Rules', () => {
    test.beforeEach(async () => {
      // Login as admin
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
    })

    test('should create and manage automation rules', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/admin/automation`)
      
      // Create new rule
      await page.click('[data-testid="create-rule-btn"]')
      await page.fill('[data-testid="rule-name"]', 'Auto-approve Marketing Content')
      await page.selectOption('[data-testid="rule-type"]', 'content_approval')
      
      // Configure trigger conditions
      await page.fill('[data-testid="trigger-condition"]', 'content_type = marketing')
      await page.fill('[data-testid="trigger-event"]', 'content_created')
      
      // Configure actions
      await page.selectOption('[data-testid="action-type"]', 'approve')
      await page.fill('[data-testid="action-config"]', '{"auto_approve": true, "notify_manager": true}')
      
      // Save rule
      await page.click('[data-testid="save-rule-btn"]')
      
      // Verify rule created
      await expect(page.locator('[data-testid="rule-created"]')).toBeVisible()
      await expect(page.locator('[data-testid="rule-active"]')).toBeVisible()
    })

    test('should execute automation rules correctly', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/admin/automation`)
      
      // Trigger rule execution
      await page.click('[data-testid="test-rule-btn"]')
      await page.fill('[data-testid="test-data"]', '{"content_type": "marketing", "user": "test_user"}')
      await page.click('[data-testid="execute-test-btn"]')
      
      // Verify execution
      await expect(page.locator('[data-testid="execution-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="execution-log"]')).toBeVisible()
    })

    test('should monitor rule execution history', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/admin/automation`)
      
      // View execution history
      await page.click('[data-testid="execution-history-btn"]')
      
      // Verify history displayed
      await expect(page.locator('[data-testid="execution-history"]')).toBeVisible()
      await expect(page.locator('[data-testid="execution-item"]')).toHaveCount.greaterThan(0)
      
      // Filter history
      await page.selectOption('[data-testid="history-filter"]', 'last_7_days')
      await page.click('[data-testid="apply-history-filter"]')
      
      // Verify filter applied
      await expect(page.locator('[data-testid="history-filtered"]')).toBeVisible()
    })
  })

  test.describe('Team Management', () => {
    test.beforeEach(async () => {
      // Login as admin
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
    })

    test('should create hierarchical team structure', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/admin/teams`)
      
      // Create parent team
      await page.click('[data-testid="create-team-btn"]')
      await page.fill('[data-testid="team-name"]', 'Marketing Department')
      await page.selectOption('[data-testid="team-type"]', 'management')
      await page.click('[data-testid="save-team-btn"]')
      
      // Create sub-team
      await page.click('[data-testid="create-subteam-btn"]')
      await page.fill('[data-testid="subteam-name"]', 'Social Media Team')
      await page.selectOption('[data-testid="subteam-type"]', 'operations')
      await page.click('[data-testid="save-subteam-btn"]')
      
      // Verify hierarchy
      await expect(page.locator('[data-testid="team-hierarchy"]')).toBeVisible()
      await expect(page.locator('[data-testid="parent-team"]')).toContainText('Marketing Department')
      await expect(page.locator('[data-testid="sub-team"]')).toContainText('Social Media Team')
    })

    test('should manage team members and permissions', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/admin/teams`)
      
      // Add team member
      await page.click('[data-testid="add-member-btn"]')
      await page.fill('[data-testid="member-email"]', TEST_USERS.manager.email)
      await page.selectOption('[data-testid="member-role"]', 'manager')
      await page.click('[data-testid="save-member-btn"]')
      
      // Verify member added
      await expect(page.locator('[data-testid="member-added"]')).toBeVisible()
      await expect(page.locator('[data-testid="member-list"]')).toContainText(TEST_USERS.manager.name)
      
      // Test permission inheritance
      await page.click('[data-testid="permission-settings"]')
      await expect(page.locator('[data-testid="inherited-permissions"]')).toBeVisible()
      await expect(page.locator('[data-testid="permission-overrides"]')).toBeVisible()
    })
  })

  test.describe('Real-time Collaboration', () => {
    test.beforeEach(async () => {
      // Login as admin
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email)
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForSelector('[data-testid="admin-dashboard"]')
    })

    test('should support real-time document collaboration', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/collaboration/session/test-session`)
      
      // Verify collaboration interface
      await expect(page.locator('[data-testid="document-editor"]')).toBeVisible()
      await expect(page.locator('[data-testid="participant-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible()
      
      // Test real-time editing
      await page.fill('[data-testid="document-content"]', 'Test collaborative editing')
      
      // Verify cursor tracking
      await expect(page.locator('[data-testid="user-cursor"]')).toBeVisible()
      
      // Test chat functionality
      await page.fill('[data-testid="chat-input"]', 'Test message')
      await page.click('[data-testid="send-message-btn"]')
      
      // Verify message sent
      await expect(page.locator('[data-testid="message-sent"]')).toBeVisible()
    })

    test('should handle video calls and screen sharing', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/collaboration/session/test-session`)
      
      // Start video call
      await page.click('[data-testid="start-video-call"]')
      
      // Verify video interface
      await expect(page.locator('[data-testid="video-controls"]')).toBeVisible()
      await expect(page.locator('[data-testid="local-video"]')).toBeVisible()
      
      // Test screen sharing
      await page.click('[data-testid="share-screen"]')
      await expect(page.locator('[data-testid="screen-sharing"]')).toBeVisible()
      
      // End call
      await page.click('[data-testid="end-call"]')
      await expect(page.locator('[data-testid="call-ended"]')).toBeVisible()
    })
  })

  test.describe('Mobile Responsive Design', () => {
    test('should display correctly on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-login-form"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-btn"]')
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    })

    test('should support touch gestures on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      
      // Test swipe gestures
      await page.touchscreen.tap(100, 100)
      await page.waitForTimeout(100)
      await page.touchscreen.tap(200, 100)
      
      // Verify swipe handling
      await expect(page.locator('[data-testid="swipe-handled"]')).toBeVisible()
    })

    test('should work as PWA on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(`${TEST_CONFIG.baseURL}`)
      
      // Verify PWA features
      await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible()
      
      // Test offline functionality
      await page.context().setOffline(true)
      await page.reload()
      
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible()
      await expect(page.locator('[data-testid="cached-content"]')).toBeVisible()
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('should meet performance targets', async () => {
      // Measure page load performance
      const startTime = Date.now()
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      const loadTime = Date.now() - startTime
      
      // Verify performance targets
      expect(loadTime).toBeLessThan(2000) // Page load under 2s
      
      // Check Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            resolve({
              lcp: entries.find(e => e.name === 'largest-contentful-paint')?.startTime || 0,
              fid: entries.find(e => e.name === 'first-input')?.startTime || 0,
              cls: entries.find(e => e.name === 'cumulative-layout-shift')?.startTime || 0
            })
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift'] })
        })
      })
      
      expect(vitals.lcp).toBeLessThan(2500) // LCP under 2.5s
      expect(vitals.fid).toBeLessThan(100) // FID under 100ms
      expect(vitals.cls).toBeLessThan(0.1) // CLS under 0.1
    })

    test('should meet accessibility standards', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      
      // Check accessibility
      const accessibility = await page.accessibility.snapshot()
      
      // Verify WCAG compliance
      expect(accessibility.score).toBeGreaterThan(90) // WCAG AA compliance
      
      // Check keyboard navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
      
      // Check screen reader support
      const ariaLabels = await page.locator('[aria-label]').count()
      expect(ariaLabels).toBeGreaterThan(0)
      
      // Check color contrast
      const contrastRatios = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        return Array.from(elements).map(el => {
          const styles = window.getComputedStyle(el)
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor
          }
        })
      })
      
      // Verify sufficient contrast (simplified check)
      expect(contrastRatios.length).toBeGreaterThan(0)
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.context().setOffline(true)
      
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      
      // Verify offline handling
      await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-connection"]')).toBeVisible()
      
      // Test retry functionality
      await page.context().setOnline(true)
      await page.click('[data-testid="retry-connection"]')
      
      await expect(page.locator('[data-testid="connection-restored"]')).toBeVisible()
    })

    test('should handle server errors gracefully', async () => {
      // Mock server error
      await page.route('**/api/dashboard', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      }))
      
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible()
      await expect(page.locator('[data-testid="support-contact"]')).toBeVisible()
    })

    test('should provide helpful error recovery options', async () => {
      // Mock error scenario
      await page.route('**/api/content', route => route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      }))
      
      await page.goto(`${TEST_CONFIG.baseURL}/content`)
      
      // Verify recovery options
      await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-after-delay"]')).toBeVisible()
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible()
    })
  })

  test.describe('Data Integrity and Security', () => {
    test('should prevent XSS attacks', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/login`)
      
      // Attempt XSS injection
      await page.fill('[data-testid="email-input"]', '<script>alert("xss")</script>@test.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Verify XSS prevented
      await expect(page.locator('[data-testid="xss-alert"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="sanitized-input"]')).toBeVisible()
    })

    test('should validate input data', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/admin/companies`)
      
      // Test invalid email format
      await page.fill('[data-testid="company-email"]', 'invalid-email')
      await page.click('[data-testid="save-company-btn"]')
      
      // Verify validation
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-format-error"]')).toBeVisible()
    })

    test('should handle concurrent operations safely', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/content/bulk`)
      
      // Start multiple operations
      const promises = []
      for (let i = 0; i < 3; i++) {
        promises.push(page.click('[data-testid="create-content-btn"]'))
      }
      
      await Promise.all(promises)
      
      // Verify safe handling
      await expect(page.locator('[data-testid="concurrent-operations"]')).toBeVisible()
      await expect(page.locator('[data-testid="operation-queue"]')).toBeVisible()
    })
  })
})
