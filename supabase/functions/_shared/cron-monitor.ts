
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CronMonitorOptions {
  jobName: string;
  details?: Record<string, unknown>;
}

export class CronMonitor {
  private supabase: ReturnType<typeof createClient>;
  private jobName: string;
  private startTime: number;
  private logId: string | null = null;
  private details: Record<string, unknown>;

  constructor(jobName: string, supabaseClient: ReturnType<typeof createClient>, details: Record<string, unknown> = {}) {
    this.jobName = jobName;
    this.supabase = supabaseClient;
    this.startTime = Date.now();
    this.details = details;
  }

  async start() {
    try {
      const { data, error } = await this.supabase
        .from('cron_health_logs')
        .insert({
          job_name: this.jobName,
          status: 'running',
          started_at: new Date().toISOString(),
          details: this.details,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log cron start:', error);
      } else {
        this.logId = data.id;
      }
    } catch (err) {
      console.error('Error starting cron monitor:', err);
    }
  }

  async success(details: Record<string, unknown> = {}) {
    const duration = Date.now() - this.startTime;
    const mergedDetails = { ...this.details, ...details };

    try {
      if (this.logId) {
        await this.supabase
          .from('cron_health_logs')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            details: mergedDetails,
          })
          .eq('id', this.logId);
      } else {
        // Fallback if start wasn't logged
        await this.supabase.from('cron_health_logs').insert({
          job_name: this.jobName,
          status: 'success',
          started_at: new Date(this.startTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          details: mergedDetails,
        });
      }
    } catch (err) {
      console.error('Error logging cron success:', err);
    }
  }

  async error(error: Error | string, details: Record<string, unknown> = {}) {
    const duration = Date.now() - this.startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const mergedDetails = { ...this.details, ...details };

    try {
      // 1. Update/Insert DB Log
      if (this.logId) {
        await this.supabase
          .from('cron_health_logs')
          .update({
            status: 'error',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: errorMessage,
            details: mergedDetails,
          })
          .eq('id', this.logId);
      } else {
        await this.supabase.from('cron_health_logs').insert({
          job_name: this.jobName,
          status: 'error',
          started_at: new Date(this.startTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error_message: errorMessage,
          details: mergedDetails,
        });
      }

      // 2. Send Slack Notification
      await this.sendSlackAlert(errorMessage, mergedDetails);

    } catch (err) {
      console.error('Error logging cron failure:', err);
    }
  }

  private async sendSlackAlert(errorMessage: string, details: Record<string, unknown>) {
    const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');

    if (!SLACK_BOT_TOKEN) {
      console.warn('Skipping Slack alert: SLACK_BOT_TOKEN not set');
      return;
    }

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 Cron Job Failed: ${this.jobName}`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Status:*\nFailed`
          },
          {
            type: "mrkdwn",
            text: `*Duration:*\n${((Date.now() - this.startTime) / 1000).toFixed(2)}s`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error:*\n\`\`\`${errorMessage}\`\`\``
        }
      }
    ];

    if (Object.keys(details).length > 0) {
       blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Details:*\n\`\`\`${JSON.stringify(details, null, 2).substring(0, 1000)}\`\`\``
        }
      });
    }

    try {
        await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: 'general',
                text: `Cron job ${this.jobName} failed: ${errorMessage}`,
                blocks: blocks
            }),
        });
    } catch (slackErr) {
        console.error('Failed to send Slack alert:', slackErr);
    }
  }
}
