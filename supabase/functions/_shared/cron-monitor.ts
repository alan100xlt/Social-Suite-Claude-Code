
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SLACK_GATEWAY_URL = 'https://connector-gateway.lovable.dev/slack/api';

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SLACK_API_KEY = Deno.env.get('SLACK_API_KEY');

    if (!LOVABLE_API_KEY || !SLACK_API_KEY) {
      console.warn('Skipping Slack alert: Missing API keys');
      return;
    }

    // Default channel - ideally this would be configurable
    // Using a common default like #general or #alerts if specific one isn't known
    // For now, let's try to find a channel or just use the default configured in the token
    // Actually, usually users configure a default channel for the bot.
    // Or we can try to look up a channel named 'alerts' or 'dev-alerts'.
    // Let's just post to #general for now as a fallback, or let the user configure it.
    // The Slack connector instructions say: "The connection have access to all public channels"
    
    // We'll construct a nice message block
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
    
    // Add details if interesting
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
        // First, list channels to find a suitable one if we don't have one
        // Ideally we'd post to #engineering or #alerts. For now let's default to the first public channel found or 'general'
        // Since we can't easily discover the "best" channel without user input, we'll try to join/post to #alerts first, if not exist, #general.
        // To be safe and simple, we'll just try to post to a channel named 'alerts'. If it fails, we log it.
        // Better: let's try to post to 'general' as it almost always exists.
        
        const channelName = 'general'; 
        
        await fetch(`${SLACK_GATEWAY_URL}/chat.postMessage`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': SLACK_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: channelName, 
                text: `Cron job ${this.jobName} failed: ${errorMessage}`, // Fallback text
                blocks: blocks
            }),
        });
    } catch (slackErr) {
        console.error('Failed to send Slack alert:', slackErr);
    }
  }
}
