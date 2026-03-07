import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Social Suite Docs',
  description: 'Documentation for the Longtale.ai Social Suite platform',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/customer/getting-started' },
      { text: 'API', link: '/api/overview' },
      { text: 'Architecture', link: '/architecture/overview' },
    ],
    sidebar: {
      '/customer/': [
        {
          text: 'User Guide',
          items: [
            { text: 'Getting Started', link: '/customer/getting-started' },
            { text: 'Connecting Platforms', link: '/customer/connecting-platforms' },
            { text: 'Creating Content', link: '/customer/creating-content' },
            { text: 'Scheduling & Calendar', link: '/customer/scheduling-and-calendar' },
            { text: 'RSS Feeds & Automation', link: '/customer/rss-feeds-and-automation' },
            { text: 'Analytics', link: '/customer/analytics' },
            { text: 'Inbox', link: '/customer/inbox' },
            { text: 'Inbox AI', link: '/customer/inbox-ai' },
            { text: 'Team & Roles', link: '/customer/team-and-roles' },
            { text: 'Collaboration', link: '/customer/collaboration' },
            { text: 'Settings', link: '/customer/settings' },
            { text: 'Media Company', link: '/customer/media-company' },
            { text: 'FAQ', link: '/customer/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Content API', link: '/api/content-api' },
            { text: 'Inbox API', link: '/api/inbox-api' },
            { text: 'Analytics API', link: '/api/analytics-api' },
            { text: 'Connections API', link: '/api/connections-api' },
            { text: 'Notifications API', link: '/api/notifications-api' },
            { text: 'Admin API', link: '/api/admin-api' },
            { text: 'Database Schema', link: '/api/database-schema' },
            { text: 'RPC Functions', link: '/api/rpc-functions' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Auth & Multi-tenancy', link: '/architecture/auth-and-multitenancy' },
            { text: 'Content Pipeline', link: '/architecture/content-pipeline' },
            { text: 'Inbox Pipeline', link: '/architecture/inbox-pipeline' },
            { text: 'Analytics Pipeline', link: '/architecture/analytics-pipeline' },
            { text: 'Cron & Webhooks', link: '/architecture/cron-and-webhooks' },
            { text: 'Edge Function Patterns', link: '/architecture/edge-function-patterns' },
            { text: 'Data Fetching Patterns', link: '/architecture/data-fetching-patterns' },
            { text: 'Testing Guide', link: '/architecture/testing-guide' },
            { text: 'Local Setup', link: '/architecture/local-setup' },
          ],
        },
        {
          text: 'Decisions',
          items: [
            { text: 'ADR-001: GetLate API', link: '/architecture/decisions/adr-001-getlate-api' },
            { text: 'ADR-002: Analytics Dates', link: '/architecture/decisions/adr-002-analytics-dates' },
            { text: 'ADR-003: Single Webhook', link: '/architecture/decisions/adr-003-single-webhook' },
            { text: 'ADR-004: Cron Dispatcher', link: '/architecture/decisions/adr-004-cron-dispatcher' },
          ],
        },
      ],
    },
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/longtale-ai/social-suite' },
    ],
  },
})
