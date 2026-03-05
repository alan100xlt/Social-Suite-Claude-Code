import { slackService } from './SlackService'
import { securityContextService } from '../security/SecurityContextService'

// Unified notification service for enterprise progress tracking
export class NotificationService {
  private slackEnabled: boolean = false

  constructor() {
    // Initialize Slack if webhook URL is available
    // Vite exposes env vars via import.meta.env, not process.env
    const webhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL
    if (webhookUrl) {
      slackService.initialize(webhookUrl, '#social-suite-development')
      this.slackEnabled = true
    }
  }

  /**
   * Send phase completion notification
   */
  async sendPhaseCompletion(
    phaseNumber: number,
    phaseName: string,
    completedStories: string[],
    nextPhase: string,
    progressPercentage: number
  ): Promise<void> {
    try {
      // Send to Slack if enabled
      if (this.slackEnabled) {
        await slackService.sendPhaseCompletion(
          phaseNumber,
          phaseName,
          completedStories,
          nextPhase,
          progressPercentage
        )
      }

      console.log(`🎉 Phase ${phaseNumber} Complete: ${phaseName}`)
    } catch (error) {
      console.error('Failed to send phase completion notification:', error)
    }
  }

  /**
   * Send story completion notification
   */
  async sendStoryCompletion(
    storyTitle: string,
    storyDescription: string,
    implementationDetails: string[],
    performanceMetrics?: Record<string, string>
  ): Promise<void> {
    try {
      // Send to Slack if enabled
      if (this.slackEnabled) {
        await slackService.sendStoryCompletion(
          storyTitle,
          storyDescription,
          implementationDetails,
          performanceMetrics
        )
      }

      console.log(`✅ Story Complete: ${storyTitle}`)
    } catch (error) {
      console.error('Failed to send story completion notification:', error)
    }
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(
    errorTitle: string,
    errorMessage: string,
    context?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      // Send to Slack if enabled
      if (this.slackEnabled) {
        await slackService.sendErrorNotification(
          errorTitle,
          errorMessage,
          context,
          severity
        )
      }

      console.error(`🚨 Error: ${errorTitle} - ${errorMessage}`)
    } catch (error) {
      console.error('Failed to send error notification:', error)
    }
  }

  /**
   * Send performance metrics notification
   */
  async sendPerformanceMetrics(
    metrics: Record<string, string>,
    targetAchieved: boolean,
    benchmark?: string
  ): Promise<void> {
    try {
      // Send to Slack if enabled
      if (this.slackEnabled) {
        await slackService.sendPerformanceMetrics(
          metrics,
          targetAchieved,
          benchmark
        )
      }

      const status = targetAchieved ? '✅' : '⚠️'
      console.log(`${status} Performance Metrics: ${Object.keys(metrics).join(', ')}`)
    } catch (error) {
      console.error('Failed to send performance metrics notification:', error)
    }
  }

  /**
   * Send milestone notification
   */
  async sendMilestoneNotification(
    milestoneTitle: string,
    milestoneDescription: string,
    achievements: string[],
    nextMilestone?: string
  ): Promise<void> {
    try {
      // Send to Slack if enabled
      if (this.slackEnabled) {
        await slackService.sendMilestoneNotification(
          milestoneTitle,
          milestoneDescription,
          achievements,
          nextMilestone
        )
      }

      console.log(`🏆 Milestone: ${milestoneTitle}`)
    } catch (error) {
      console.error('Failed to send milestone notification:', error)
    }
  }

  /**
   * Send daily progress summary
   */
  async sendDailyProgress(
    date: string,
    completedTasks: string[],
    inProgressTasks: string[],
    blockers?: string[]
  ): Promise<void> {
    try {
      // Send to Slack if enabled
      if (this.slackEnabled) {
        await slackService.sendDailyProgress(
          date,
          completedTasks,
          inProgressTasks,
          blockers
        )
      }

      console.log(`📅 Daily Progress - ${date}: ${completedTasks.length} completed, ${inProgressTasks.length} in progress`)
    } catch (error) {
      console.error('Failed to send daily progress notification:', error)
    }
  }

  /**
   * Test all notification channels
   */
  async testNotifications(): Promise<boolean> {
    try {
      console.log('🧪 Testing notification channels...')

      // Test Slack if enabled
      if (this.slackEnabled) {
        const slackTest = await slackService.testConnection()
        if (slackTest) {
          console.log('✅ Slack notifications working')
        } else {
          console.log('❌ Slack notifications failed')
          return false
        }
      } else {
        console.log('⚠️ Slack notifications not configured')
      }

      console.log('✅ All notification channels tested successfully')
      return true
    } catch (error) {
      console.error('Failed to test notifications:', error)
      return false
    }
  }

  /**
   * Get notification status
   */
  getNotificationStatus(): {
    slackEnabled: boolean
    channels: string[]
  } {
    return {
      slackEnabled: this.slackEnabled,
      channels: this.slackEnabled ? ['Slack'] : []
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService()
