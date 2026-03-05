// Slack Service for Enterprise Progress Notifications
// Integrates with Linear development progress tracking

interface SlackMessage {
  text?: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

interface SlackBlock {
  type: string
  text?: SlackText
  elements?: SlackElement[]
  accessory?: SlackAccessory
}

interface SlackText {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

interface SlackElement {
  type: string
  text?: string
  url?: string
  style?: 'primary' | 'danger'
  emoji?: boolean
}

interface SlackAccessory {
  type: string
  image_url?: string
  alt_text?: string
}

interface SlackAttachment {
  color?: string
  fields?: SlackField[]
  footer?: string
  ts?: number
}

interface SlackField {
  title: string
  value: string
  short?: boolean
}

export class SlackService {
  private webhookUrl: string | null = null
  private defaultChannel: string = '#social-suite-development'

  constructor() {
    // Vite exposes env vars via import.meta.env, not process.env
    this.webhookUrl = import.meta.env.VITE_SLACK_WEBHOOK_URL || null
  }

  /**
   * Initialize Slack service with webhook URL
   */
  initialize(webhookUrl: string, defaultChannel?: string): void {
    this.webhookUrl = webhookUrl
    if (defaultChannel) {
      this.defaultChannel = defaultChannel
    }
  }

  /**
   * Send message to Slack
   */
  async sendMessage(message: SlackMessage, channel?: string): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('Slack webhook URL not configured')
      return false
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel || this.defaultChannel,
          ...message
        })
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Failed to send Slack message:', error)
      return false
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
  ): Promise<boolean> {
    const message: SlackMessage = {
      text: `🎉 Phase ${phaseNumber}: ${phaseName} - COMPLETE!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎉 Phase ${phaseNumber} Complete: ${phaseName}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Enterprise Media Company System* - ${progressPercentage}% Overall Progress Complete`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*✅ Completed Stories:*\n${completedStories.map(story => `• ${story}`).join('\n')}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🚀 Next Phase:* ${nextPhase}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Linear Issue',
                emoji: true
              },
              url: 'https://linear.app/social-suite-cc/issue/SOC-18',
              style: 'primary'
            }
          ]
        }
      ],
      attachments: [
        {
          color: 'good',
          fields: [
            {
              title: 'Progress',
              value: `${progressPercentage}% Complete`,
              short: true
            },
            {
              title: 'Stories Completed',
              value: completedStories.length.toString(),
              short: true
            },
            {
              title: 'Next Milestone',
              value: nextPhase,
              short: true
            },
            {
              title: 'Status',
              value: '✅ Ready for Next Phase',
              short: true
            }
          ],
          footer: 'Enterprise Media Company System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    return this.sendMessage(message)
  }

  /**
   * Send story completion notification
   */
  async sendStoryCompletion(
    storyTitle: string,
    storyDescription: string,
    implementationDetails: string[],
    performanceMetrics?: Record<string, string>
  ): Promise<boolean> {
    const message: SlackMessage = {
      text: `✅ Story Complete: ${storyTitle}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `✅ Story Complete: ${storyTitle}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${storyDescription}*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🔧 Implementation Details:*\n${implementationDetails.map(detail => `• ${detail}`).join('\n')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Progress',
                emoji: true
              },
              url: 'https://linear.app/social-suite-cc/issue/SOC-18',
              style: 'primary'
            }
          ]
        }
      ]
    }

    // Add performance metrics if provided
    if (performanceMetrics && Object.keys(performanceMetrics).length > 0) {
      message.attachments = [
        {
          color: 'good',
          fields: Object.entries(performanceMetrics).map(([key, value]) => ({
            title: key,
            value: value,
            short: true
          })),
          footer: 'Performance Metrics',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    return this.sendMessage(message)
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(
    errorTitle: string,
    errorMessage: string,
    context?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    const severityColors = {
      low: 'warning',
      medium: 'danger',
      high: 'danger',
      critical: '#ff0000'
    }

    const severityEmojis = {
      low: '⚠️',
      medium: '🚨',
      high: '🔥',
      critical: '💀'
    }

    const message: SlackMessage = {
      text: `${severityEmojis[severity]} Error: ${errorTitle}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmojis[severity]} Error: ${errorTitle}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error Message:*\n\`\`\`${errorMessage}\`\`\``
          }
        }
      ]
    }

    if (context) {
      message.blocks!.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Context:*\n${context}`
        }
      })
    }

    message.blocks!.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Linear Issue',
            emoji: true
          },
          url: 'https://linear.app/social-suite-cc/issue/SOC-18',
          style: 'danger'
        }
      ]
    })

    message.attachments = [
      {
        color: severityColors[severity],
        fields: [
          {
            title: 'Severity',
            value: severity.toUpperCase(),
            short: true
          },
          {
            title: 'Status',
            value: '🔍 Investigation Required',
            short: true
          }
        ],
        footer: 'Error Notification System',
        ts: Math.floor(Date.now() / 1000)
      }
    ]

    return this.sendMessage(message)
  }

  /**
   * Send performance metrics notification
   */
  async sendPerformanceMetrics(
    metrics: Record<string, string>,
    targetAchieved: boolean,
    benchmark?: string
  ): Promise<boolean> {
    const message: SlackMessage = {
      text: `📊 Performance Metrics ${targetAchieved ? '✅ Target Achieved!' : '⚠️ Below Target'}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 Performance Metrics ${targetAchieved ? '✅ Target Achieved!' : '⚠️ Below Target'}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Enterprise Performance Results*${benchmark ? `\n*Benchmark:* ${benchmark}` : ''}`
          }
        }
      ],
      attachments: [
        {
          color: targetAchieved ? 'good' : 'warning',
          fields: Object.entries(metrics).map(([key, value]) => ({
            title: key,
            value: value,
            short: true
          })),
          footer: 'Performance Monitoring System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    return this.sendMessage(message)
  }

  /**
   * Send development milestone notification
   */
  async sendMilestoneNotification(
    milestoneTitle: string,
    milestoneDescription: string,
    achievements: string[],
    nextMilestone?: string
  ): Promise<boolean> {
    const message: SlackMessage = {
      text: `🏆 Milestone Achieved: ${milestoneTitle}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🏆 Milestone Achieved: ${milestoneTitle}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${milestoneDescription}*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🎯 Key Achievements:*\n${achievements.map(achievement => `✅ ${achievement}`).join('\n')}`
          }
        }
      ]
    }

    if (nextMilestone) {
      message.blocks!.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚀 Next Milestone:* ${nextMilestone}`
        }
      })
    }

    message.blocks!.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Progress',
            emoji: true
          },
          url: 'https://linear.app/social-suite-cc/issue/SOC-18',
          style: 'primary'
        }
      ]
    })

    message.attachments = [
      {
        color: 'good',
        fields: [
          {
            title: 'Status',
            value: '🎉 Milestone Complete',
            short: true
          },
          {
            title: 'Achievements',
            value: achievements.length.toString(),
            short: true
          }
        ],
        footer: 'Enterprise Development Milestones',
        ts: Math.floor(Date.now() / 1000)
      }
    ]

    return this.sendMessage(message)
  }

  /**
   * Send daily progress summary
   */
  async sendDailyProgress(
    date: string,
    completedTasks: string[],
    inProgressTasks: string[],
    blockers?: string[]
  ): Promise<boolean> {
    const message: SlackMessage = {
      text: `📅 Daily Progress Summary - ${date}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📅 Daily Progress Summary - ${date}`,
            emoji: true
          }
        }
      ]
    }

    const fields: SlackField[] = []

    if (completedTasks.length > 0) {
      fields.push({
        title: '✅ Completed',
        value: completedTasks.length.toString(),
        short: true
      })
    }

    if (inProgressTasks.length > 0) {
      fields.push({
        title: '🔄 In Progress',
        value: inProgressTasks.length.toString(),
        short: true
      })
    }

    if (blockers && blockers.length > 0) {
      fields.push({
        title: '🚧 Blockers',
        value: blockers.length.toString(),
        short: true
      })
    }

    if (completedTasks.length > 0) {
      message.blocks!.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ Completed Today:*\n${completedTasks.map(task => `• ${task}`).join('\n')}`
        }
      })
    }

    if (inProgressTasks.length > 0) {
      message.blocks!.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔄 Continuing Tomorrow:*\n${inProgressTasks.map(task => `• ${task}`).join('\n')}`
        }
      })
    }

    if (blockers && blockers.length > 0) {
      message.blocks!.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚧 Blockers:*\n${blockers.map(blocker => `• ${blocker}`).join('\n')}`
        }
      })
    }

    message.attachments = [
      {
        color: blockers && blockers.length > 0 ? 'warning' : 'good',
        fields,
        footer: 'Daily Progress Report',
        ts: Math.floor(Date.now() / 1000)
      }
    ]

    return this.sendMessage(message)
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<boolean> {
    const message: SlackMessage = {
      text: '🔔 Slack Integration Test - Enterprise Media Company System',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 Slack Integration Test',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Slack notifications are working correctly!*\\n\\nYou will receive real-time updates for:\\n• Phase completions\\n• Story implementations\\n• Performance metrics\\n• Error notifications\\n• Daily progress summaries'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Linear Issue',
                emoji: true
              },
              url: 'https://linear.app/social-suite-cc/issue/SOC-18',
              style: 'primary'
            }
          ]
        }
      ],
      attachments: [
        {
          color: 'good',
          fields: [
            {
              title: 'Integration Status',
              value: '✅ Connected',
              short: true
            },
            {
              title: 'Notification Type',
              value: 'Real-time Updates',
              short: true
            }
          ],
          footer: 'Enterprise Media Company System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    return this.sendMessage(message)
  }
}

// Singleton instance
export const slackService = new SlackService()
