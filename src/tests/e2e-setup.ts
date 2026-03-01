import { chromium, firefox, webkit, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright E2E tests
 * Sets up test environment, databases, and services
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'
  process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3000'
  
  // Start test database if needed
  if (process.env.TEST_DB_SETUP === 'true') {
    console.log('📊 Setting up test database...')
    // Here you would typically:
    // - Create test database
    // - Run migrations
    // - Seed test data
    // - Set up test users and companies
  }
  
  // Start external services if needed
  if (process.env.TEST_SERVICES === 'true') {
    console.log('🔧 Starting test services...')
    // Here you would typically:
    // - Start Redis for caching tests
    // - Start mock external APIs
    // - Set up test file storage
  }
  
  // Create test storage directory
  const fs = require('fs')
  const path = require('path')
  
  const storageDir = path.join(__dirname, '../test-storage')
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }
  
  // Create test assets directory
  const assetsDir = path.join(__dirname, '../test-assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }
  
  // Generate test data files
  await generateTestData()
  
  console.log('✅ E2E test environment setup complete')
}

/**
 * Generate test data for E2E tests
 */
async function generateTestData() {
  const fs = require('fs')
  const path = require('path')
  
  // Create test users
  const testUsers = [
    {
      id: 'test-admin-1',
      email: 'admin@test.com',
      password: 'TestPassword123!',
      name: 'Test Admin User',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'admin']
    },
    {
      id: 'test-manager-1',
      email: 'manager@test.com',
      password: 'TestPassword123!',
      name: 'Test Manager User',
      role: 'manager',
      permissions: ['read', 'write', 'delete']
    },
    {
      id: 'test-user-1',
      email: 'user@test.com',
      password: 'TestPassword123!',
      name: 'Test Regular User',
      role: 'user',
      permissions: ['read', 'write']
    }
  ]
  
  // Create test companies
  const testCompanies = [
    {
      id: 'test-company-1',
      name: 'Test TechCorp',
      domain: 'testtechcorp.com',
      industry: 'Technology',
      size: 'enterprise',
      settings: {
        autoApprove: false,
        requireApproval: true,
        maxUsers: 100
      }
    },
    {
      id: 'test-company-2',
      name: 'Test Marketing Co',
      domain: 'testmarketing.com',
      industry: 'Marketing',
      size: 'medium',
      settings: {
        autoApprove: true,
        requireApproval: false,
        maxUsers: 50
      }
    }
  ]
  
  // Create test content
  const testContent = [
    {
      id: 'test-content-1',
      title: 'Test Product Launch',
      description: 'Test product launch campaign',
      type: 'marketing',
      platforms: ['facebook', 'instagram', 'twitter'],
      status: 'draft',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'test-content-2',
      title: 'Test Blog Post',
      description: 'Test blog post content',
      type: 'blog',
      platforms: ['website', 'linkedin'],
      status: 'published',
      publishedAt: new Date().toISOString()
    }
  ]
  
  // Write test data to files
  const testDataDir = path.join(__dirname, '../test-data')
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(testDataDir, 'users.json'),
    JSON.stringify(testUsers, null, 2)
  )
  
  fs.writeFileSync(
    path.join(testDataDir, 'companies.json'),
    JSON.stringify(testCompanies, null, 2)
  )
  
  fs.writeFileSync(
    path.join(testDataDir, 'content.json'),
    JSON.stringify(testContent, null, 2)
  )
  
  // Create test image assets
  await createTestImages()
}

/**
 * Create test image assets for file upload tests
 */
async function createTestImages() {
  const fs = require('fs')
  const path = require('path')
  const sharp = require('sharp')
  
  const assetsDir = path.join(__dirname, '../test-assets')
  
  // Create a simple test image (1x1 pixel)
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  )
  
  // Create different sized test images
  const imageSizes = [
    { name: 'product-image.jpg', width: 800, height: 600 },
    { name: 'banner-image.jpg', width: 1200, height: 400 },
    { name: 'thumbnail-image.jpg', width: 150, height: 150 },
    { name: 'avatar-image.jpg', width: 64, height: 64 }
  ]
  
  for (const size of imageSizes) {
    try {
      const resizedImage = await sharp(testImageBuffer)
        .resize(size.width, size.height)
        .jpeg({ quality: 80 })
        .toBuffer()
      
      fs.writeFileSync(path.join(assetsDir, size.name), resizedImage)
    } catch (error) {
      console.warn(`Could not create ${size.name}:`, error.message)
    }
  }
  
  // Create test documents
  const testDocuments = [
    { name: 'test-document.pdf', content: 'Test PDF content' },
    { name: 'test-spreadsheet.xlsx', content: 'Test,Data,Here' },
    { name: 'test-presentation.pptx', content: 'Test Presentation Content' }
  ]
  
  for (const doc of testDocuments) {
    fs.writeFileSync(path.join(assetsDir, doc.name), doc.content)
  }
}

export default globalSetup
