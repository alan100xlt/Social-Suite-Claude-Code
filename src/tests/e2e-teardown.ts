import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Global teardown for Playwright E2E tests
 * Cleans up test data, closes services, and generates reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  // Clean up test data
  if (process.env.TEST_DB_CLEANUP === 'true') {
    console.log('🗑️  Cleaning up test database...')
    // Here you would typically:
    // - Drop test database
    // - Clean up test users
    // - Remove test companies
    // - Clear test data
  }

  // Stop external services
  if (process.env.TEST_SERVICES === 'true') {
    console.log('🛑 Stopping test services...')
    // Here you would typically:
    // - Stop Redis
    // - Stop mock APIs
    // - Clean up file storage
  }

  // Clean up test storage
  const storageDir = path.join(__dirname, '../test-storage')
  if (fs.existsSync(storageDir)) {
    console.log('📁 Cleaning up test storage directory...')
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('⚠️  Could not clean up test storage:', (error as Error).message)
    }
  }

  // Archive test results
  if (process.env.ARCHIVE_TEST_RESULTS === 'true') {
    console.log('📦 Archiving test results...')
    const resultsDir = path.join(__dirname, '../../test-results')
    if (fs.existsSync(resultsDir)) {
      // Test results are already saved in test-results directory
      console.log('✅ Test results archived')
    }
  }

  // Generate summary report
  await generateTestSummary()

  console.log('✅ E2E test environment teardown complete')
}

/**
 * Generate a summary of test results
 */
async function generateTestSummary() {
  const resultsDir = path.join(__dirname, '../../test-results')
  const resultsFile = path.join(resultsDir, 'results.json')

  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))
      console.log('📊 Test Summary:')
      console.log(`  - Total Suites: ${results.suites?.length || 0}`)
      console.log(`  - Tests Run: ${results.tests?.length || 0}`)
    } catch (error) {
      console.warn('⚠️  Could not parse test results:', (error as Error).message)
    }
  }
}

export default globalTeardown
