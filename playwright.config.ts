import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for end-to-end testing
 * Supports multiple browsers and devices for comprehensive testing
 */
export default defineConfig({
  // Test directory
  testDir: './src/tests/end-to-end',
  
  // Global setup and teardown
  globalSetup: './src/tests/e2e-setup.ts',
  globalTeardown: './src/tests/e2e-teardown.ts',
  
  // Test timeout
  timeout: 30000,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Artifacts
  use: {
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Trace files
    trace: 'on-first-retry',
    
    // Base URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Storage state
    storageState: './src/tests/storage-state.json',
    
    // Action and navigation timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // Reporter configuration
  reporter: [
    // HTML report
    ['html', { 
      outputFolder: './test-results/html',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    
    // JSON report
    ['json', { 
      outputFile: './test-results/results.json'
    }],
    
    // JUnit report for CI
    ['junit', { 
      outputFile: './test-results/results.xml'
    }],
    
    // Console reporter
    ['list'],
    
    // Line reporter
    ['line']
  ],
  
  // Output directory
  outputDir: './test-results',
  
  // Browser projects
  projects: [
    // Desktop Chrome
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write', 'camera', 'microphone']
        }
      },
    },
    
    // Desktop Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Desktop Safari (WebKit)
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write', 'camera', 'microphone']
        }
      },
    },
    
    // Tablet Safari
    {
      name: 'tablet-safari',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write', 'camera', 'microphone']
        }
      },
    },
    
    // Mobile Safari
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 14 Pro'],
        viewport: { width: 430, height: 932 },
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write', 'camera', 'microphone']
        }
      },
    },
  ],
  
  // Test files to include/exclude
  testMatch: [
    '**/*.e2e.ts',
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**'
  ],
  
  // Maximum test failures
  maxFailures: 10,
  
  // Parallel execution
  fullyParallel: true,
  
  // Worker configuration
  workers: process.env.CI ? 2 : 4,
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120000,
  },
  
  // Environment variables
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
    NEXT_PUBLIC_WS_URL: 'ws://localhost:3000',
  },
  
  // Metadata
  metadata: {
    'Test Environment': 'E2E Testing',
    'Browser Coverage': 'Chrome, Firefox, Safari, Mobile',
    'Device Coverage': 'Desktop, Tablet, Mobile',
    'Test Type': 'End-to-End',
    'Framework': 'Playwright'
  }
})
