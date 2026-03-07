export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_analytics_snapshots: {
        Row: {
          account_id: string
          clicks: number
          comments: number
          company_id: string
          created_at: string
          engagement_rate: number
          followers: number
          following: number
          id: string
          impressions: number
          is_active: boolean
          likes: number
          platform: string
          posts_count: number
          reach: number
          saves: number | null
          shares: number
          snapshot_date: string
          views: number
        }
        Insert: {
          account_id: string
          clicks?: number
          comments?: number
          company_id: string
          created_at?: string
          engagement_rate?: number
          followers?: number
          following?: number
          id?: string
          impressions?: number
          is_active?: boolean
          likes?: number
          platform: string
          posts_count?: number
          reach?: number
          saves?: number | null
          shares?: number
          snapshot_date: string
          views?: number
        }
        Update: {
          account_id?: string
          clicks?: number
          comments?: number
          company_id?: string
          created_at?: string
          engagement_rate?: number
          followers?: number
          following?: number
          id?: string
          impressions?: number
          is_active?: boolean
          likes?: number
          platform?: string
          posts_count?: number
          reach?: number
          saves?: number | null
          shares?: number
          snapshot_date?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_analytics_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_logs: {
        Row: {
          account_ids: string[] | null
          action: string
          company_id: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          platform: string | null
          profile_id: string | null
          request_body: Json | null
          response_body: Json | null
          status_code: number | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          account_ids?: string[] | null
          action: string
          company_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          platform?: string | null
          profile_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          account_ids?: string[] | null
          action?: string
          company_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          platform?: string | null
          profile_id?: string | null
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action: string
          article_link: string | null
          article_title: string | null
          company_id: string
          created_at: string
          details: Json | null
          error_message: string | null
          feed_id: string | null
          feed_item_id: string | null
          id: string
          result: string
          rule_id: string | null
          rule_name: string
        }
        Insert: {
          action: string
          article_link?: string | null
          article_title?: string | null
          company_id: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          feed_id?: string | null
          feed_item_id?: string | null
          id?: string
          result: string
          rule_id?: string | null
          rule_name: string
        }
        Update: {
          action?: string
          article_link?: string | null
          article_title?: string | null
          company_id?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          feed_id?: string | null
          feed_item_id?: string | null
          id?: string
          result?: string
          rule_id?: string | null
          rule_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "rss_feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "rss_feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          account_ids: string[]
          action: string
          approval_emails: string[]
          company_id: string
          created_at: string
          feed_id: string | null
          id: string
          is_active: boolean
          name: string
          objective: string
          scheduling: string
          updated_at: string
        }
        Insert: {
          account_ids?: string[]
          action?: string
          approval_emails?: string[]
          company_id: string
          created_at?: string
          feed_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          objective?: string
          scheduling?: string
          updated_at?: string
        }
        Update: {
          account_ids?: string[]
          action?: string
          approval_emails?: string[]
          company_id?: string
          created_at?: string
          feed_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          objective?: string
          scheduling?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "rss_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_posts: {
        Row: {
          added_at: string
          added_by: string | null
          campaign_id: string
          id: string
          post_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          campaign_id: string
          id?: string
          post_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          campaign_id?: string
          id?: string
          post_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          actions: Json | null
          content: string | null
          created_at: string
          id: string
          role: string
          thread_id: string
          tokens_used: number | null
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          actions?: Json | null
          content?: string | null
          created_at?: string
          id?: string
          role: string
          thread_id: string
          tokens_used?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          actions?: Json | null
          content?: string | null
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          tokens_used?: number | null
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          company_id: string
          context_id: string | null
          context_type: string
          created_at: string
          created_by: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          context_id?: string | null
          context_type?: string
          created_at?: string
          created_by: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          context_id?: string | null
          context_type?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          branding: Json | null
          company_tier: string
          created_at: string
          created_by: string | null
          getlate_profile_id: string | null
          id: string
          name: string
          onboarding_status: string
          onboarding_step: number
          slug: string
          website_url: string | null
        }
        Insert: {
          branding?: Json | null
          company_tier?: string
          created_at?: string
          created_by?: string | null
          getlate_profile_id?: string | null
          id?: string
          name: string
          onboarding_status?: string
          onboarding_step?: number
          slug: string
          website_url?: string | null
        }
        Update: {
          branding?: Json | null
          company_tier?: string
          created_at?: string
          created_by?: string | null
          getlate_profile_id?: string | null
          id?: string
          name?: string
          onboarding_status?: string
          onboarding_step?: number
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      company_email_settings: {
        Row: {
          accent_color: string
          accent_color_end: string
          body_background_color: string
          body_text_color: string
          company_id: string
          created_at: string
          footer_text: string | null
          from_email: string
          header_text_color: string
          id: string
          logo_url: string | null
          reply_to_email: string | null
          sender_name: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          accent_color_end?: string
          body_background_color?: string
          body_text_color?: string
          company_id: string
          created_at?: string
          footer_text?: string | null
          from_email?: string
          header_text_color?: string
          id?: string
          logo_url?: string | null
          reply_to_email?: string | null
          sender_name?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          accent_color_end?: string
          body_background_color?: string
          body_text_color?: string
          company_id?: string
          created_at?: string
          footer_text?: string | null
          from_email?: string
          header_text_color?: string
          id?: string
          logo_url?: string | null
          reply_to_email?: string | null
          sender_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_email_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_feature_config: {
        Row: {
          company_id: string
          config: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_voice_settings: {
        Row: {
          brand_tags: string[]
          company_id: string
          content_length: string
          created_at: string
          custom_instructions: string | null
          emoji_style: string
          extract_locations: boolean
          hashtag_strategy: string
          id: string
          optimal_windows_cache: Json | null
          optimal_windows_cached_at: string | null
          require_ai_review: boolean
          tone: string
          updated_at: string
          voice_mode: string
        }
        Insert: {
          brand_tags?: string[]
          company_id: string
          content_length?: string
          created_at?: string
          custom_instructions?: string | null
          emoji_style?: string
          extract_locations?: boolean
          hashtag_strategy?: string
          id?: string
          optimal_windows_cache?: Json | null
          optimal_windows_cached_at?: string | null
          require_ai_review?: boolean
          tone?: string
          updated_at?: string
          voice_mode?: string
        }
        Update: {
          brand_tags?: string[]
          company_id?: string
          content_length?: string
          created_at?: string
          custom_instructions?: string | null
          emoji_style?: string
          extract_locations?: boolean
          hashtag_strategy?: string
          id?: string
          optimal_windows_cache?: Json | null
          optimal_windows_cached_at?: string | null
          require_ai_review?: boolean
          tone?: string
          updated_at?: string
          voice_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_voice_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_decay_cache: {
        Row: {
          company_id: string
          data: Json
          id: string
          platform: string | null
          synced_at: string
        }
        Insert: {
          company_id: string
          data?: Json
          id?: string
          platform?: string | null
          synced_at?: string
        }
        Update: {
          company_id?: string
          data?: Json
          id?: string
          platform?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_decay_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      corrections: {
        Row: {
          assigned_to: string | null
          company_id: string
          conversation_id: string
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          reporter_contact_ids: string[] | null
          resolution_summary: string | null
          resolved_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          conversation_id: string
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          reporter_contact_ids?: string[] | null
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          conversation_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          reporter_contact_ids?: string[] | null
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrections_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_health_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cron_job_settings: {
        Row: {
          created_at: string
          description: string
          edge_function: string
          enabled: boolean
          id: string
          job_name: string
          job_type: string
          schedule: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          edge_function: string
          enabled?: boolean
          id?: string
          job_name: string
          job_type?: string
          schedule: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          edge_function?: string
          enabled?: boolean
          id?: string
          job_name?: string
          job_type?: string
          schedule?: string
          updated_at?: string
        }
        Relationships: []
      }
      discovery_leads: {
        Row: {
          company_id: string | null
          contact_emails: string[]
          contact_phones: string[]
          crawl_data: Json
          created_at: string
          id: string
          social_channels: Json
          website_url: string
        }
        Insert: {
          company_id?: string | null
          contact_emails?: string[]
          contact_phones?: string[]
          crawl_data?: Json
          created_at?: string
          id?: string
          social_channels?: Json
          website_url: string
        }
        Update: {
          company_id?: string | null
          contact_emails?: string[]
          contact_phones?: string[]
          crawl_data?: Json
          created_at?: string
          id?: string
          social_channels?: Json
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evergreen_queue: {
        Row: {
          article_id: string | null
          company_id: string
          created_at: string
          id: string
          original_post_id: string | null
          published_at: string | null
          published_post_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["evergreen_status"]
          updated_at: string
          variation_text: string
        }
        Insert: {
          article_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          original_post_id?: string | null
          published_at?: string | null
          published_post_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["evergreen_status"]
          updated_at?: string
          variation_text: string
        }
        Update: {
          article_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          original_post_id?: string | null
          published_at?: string | null
          published_post_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["evergreen_status"]
          updated_at?: string
          variation_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "evergreen_queue_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "rss_feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evergreen_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      getlate_changelog_checks: {
        Row: {
          ai_analysis: Json | null
          checked_at: string
          entries_found: number
          error_message: string | null
          id: string
          last_seen_entry_id: string | null
          linear_issue_url: string | null
          new_entries: Json | null
          slack_message_ts: string | null
          status: string
        }
        Insert: {
          ai_analysis?: Json | null
          checked_at?: string
          entries_found?: number
          error_message?: string | null
          id?: string
          last_seen_entry_id?: string | null
          linear_issue_url?: string | null
          new_entries?: Json | null
          slack_message_ts?: string | null
          status?: string
        }
        Update: {
          ai_analysis?: Json | null
          checked_at?: string
          entries_found?: number
          error_message?: string | null
          id?: string
          last_seen_entry_id?: string | null
          linear_issue_url?: string | null
          new_entries?: Json | null
          slack_message_ts?: string | null
          status?: string
        }
        Relationships: []
      }
      global_email_settings: {
        Row: {
          accent_color: string
          accent_color_end: string
          body_background_color: string
          body_text_color: string
          created_at: string
          footer_text: string | null
          from_email: string
          header_text_color: string
          id: string
          logo_url: string | null
          reply_to_email: string | null
          sender_name: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          accent_color_end?: string
          body_background_color?: string
          body_text_color?: string
          created_at?: string
          footer_text?: string | null
          from_email?: string
          header_text_color?: string
          id?: string
          logo_url?: string | null
          reply_to_email?: string | null
          sender_name?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          accent_color_end?: string
          body_background_color?: string
          body_text_color?: string
          created_at?: string
          footer_text?: string | null
          from_email?: string
          header_text_color?: string
          id?: string
          logo_url?: string | null
          reply_to_email?: string | null
          sender_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_voice_defaults: {
        Row: {
          brand_tags: string[]
          content_length: string
          created_at: string
          custom_instructions: string | null
          emoji_style: string
          extract_locations: boolean
          hashtag_strategy: string
          id: string
          tone: string
          updated_at: string
        }
        Insert: {
          brand_tags?: string[]
          content_length?: string
          created_at?: string
          custom_instructions?: string | null
          emoji_style?: string
          extract_locations?: boolean
          hashtag_strategy?: string
          id?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          brand_tags?: string[]
          content_length?: string
          created_at?: string
          custom_instructions?: string | null
          emoji_style?: string
          extract_locations?: boolean
          hashtag_strategy?: string
          id?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      inbox_activity_log: {
        Row: {
          action: string
          company_id: string
          conversation_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          conversation_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          conversation_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_activity_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_ai_feedback: {
        Row: {
          company_id: string
          conversation_id: string
          corrected_value: Json
          created_at: string
          feedback_type: string
          id: string
          original_value: Json | null
          user_id: string
        }
        Insert: {
          company_id: string
          conversation_id: string
          corrected_value: Json
          created_at?: string
          feedback_type: string
          id?: string
          original_value?: Json | null
          user_id: string
        }
        Update: {
          company_id?: string
          conversation_id?: string
          corrected_value?: Json
          created_at?: string
          feedback_type?: string
          id?: string
          original_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_ai_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_ai_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_ai_results: {
        Row: {
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          model_version: string | null
          result_data: Json
          result_type: string
        }
        Insert: {
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          model_version?: string | null
          result_data?: Json
          result_type: string
        }
        Update: {
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model_version?: string | null
          result_data?: Json
          result_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_ai_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_ai_results_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_ai_settings: {
        Row: {
          ai_calls_count: number
          ai_calls_reset_at: string
          auto_classify: boolean
          auto_translate: boolean
          company_id: string
          company_type: string
          content_recycling: boolean
          created_at: string
          crisis_detection: boolean
          crisis_threshold: number
          crisis_window_minutes: number
          smart_acknowledgment: boolean
          updated_at: string
        }
        Insert: {
          ai_calls_count?: number
          ai_calls_reset_at?: string
          auto_classify?: boolean
          auto_translate?: boolean
          company_id: string
          company_type?: string
          content_recycling?: boolean
          created_at?: string
          crisis_detection?: boolean
          crisis_threshold?: number
          crisis_window_minutes?: number
          smart_acknowledgment?: boolean
          updated_at?: string
        }
        Update: {
          ai_calls_count?: number
          ai_calls_reset_at?: string
          auto_classify?: boolean
          auto_translate?: boolean
          company_id?: string
          company_type?: string
          content_recycling?: boolean
          created_at?: string
          crisis_detection?: boolean
          crisis_threshold?: number
          crisis_window_minutes?: number
          smart_acknowledgment?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_ai_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_auto_rules: {
        Row: {
          action_type: string
          after_hours_config: Json | null
          ai_prompt_template: string | null
          canned_reply_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          name: string
          notify_user_ids: string[] | null
          notify_via: string[] | null
          trigger_conversation_type: string | null
          trigger_platform: string | null
          trigger_type: string
          trigger_value: string | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          after_hours_config?: Json | null
          ai_prompt_template?: string | null
          canned_reply_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          notify_user_ids?: string[] | null
          notify_via?: string[] | null
          trigger_conversation_type?: string | null
          trigger_platform?: string | null
          trigger_type: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          after_hours_config?: Json | null
          ai_prompt_template?: string | null
          canned_reply_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          notify_user_ids?: string[] | null
          notify_via?: string[] | null
          trigger_conversation_type?: string | null
          trigger_platform?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_auto_rules_canned_reply_id_fkey"
            columns: ["canned_reply_id"]
            isOneToOne: false
            referencedRelation: "inbox_canned_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_auto_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_backfill_jobs: {
        Row: {
          analyzed_posts: number | null
          classified_conversations: number | null
          company_id: string
          completed_at: string | null
          created_at: string
          cursor_state: Json | null
          error: string | null
          id: string
          job_type: string
          report_data: Json | null
          started_at: string | null
          status: string
          synced_conversations: number | null
          synced_messages: number | null
          total_conversations: number | null
          total_posts: number | null
          updated_at: string
        }
        Insert: {
          analyzed_posts?: number | null
          classified_conversations?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          cursor_state?: Json | null
          error?: string | null
          id?: string
          job_type?: string
          report_data?: Json | null
          started_at?: string | null
          status?: string
          synced_conversations?: number | null
          synced_messages?: number | null
          total_conversations?: number | null
          total_posts?: number | null
          updated_at?: string
        }
        Update: {
          analyzed_posts?: number | null
          classified_conversations?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          cursor_state?: Json | null
          error?: string | null
          id?: string
          job_type?: string
          report_data?: Json | null
          started_at?: string | null
          status?: string
          synced_conversations?: number | null
          synced_messages?: number | null
          total_conversations?: number | null
          total_posts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_backfill_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_canned_replies: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          platform: string | null
          shortcut: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          platform?: string | null
          shortcut?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          platform?: string | null
          shortcut?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_canned_replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_contacts: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string | null
          display_name: string | null
          id: string
          metadata: Json | null
          platform: string
          platform_user_id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          metadata?: Json | null
          platform: string
          platform_user_id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          metadata?: Json | null
          platform?: string
          platform_user_id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversation_labels: {
        Row: {
          conversation_id: string
          label_id: string
        }
        Insert: {
          conversation_id: string
          label_id: string
        }
        Update: {
          conversation_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_conversation_labels_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversation_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "inbox_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversations: {
        Row: {
          ai_classified_at: string | null
          article_title: string | null
          article_url: string | null
          assigned_to: string | null
          company_id: string
          contact_id: string | null
          correction_status: string | null
          created_at: string | null
          cross_outlet_source: string | null
          detected_language: string | null
          editorial_value: number | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          message_subtype: string | null
          message_type: string | null
          metadata: Json | null
          platform: string
          platform_conversation_id: string | null
          post_id: string | null
          post_url: string | null
          priority: string | null
          sentiment: string | null
          snooze_until: string | null
          status: string
          subject: string | null
          type: string
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          ai_classified_at?: string | null
          article_title?: string | null
          article_url?: string | null
          assigned_to?: string | null
          company_id: string
          contact_id?: string | null
          correction_status?: string | null
          created_at?: string | null
          cross_outlet_source?: string | null
          detected_language?: string | null
          editorial_value?: number | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          message_subtype?: string | null
          message_type?: string | null
          metadata?: Json | null
          platform: string
          platform_conversation_id?: string | null
          post_id?: string | null
          post_url?: string | null
          priority?: string | null
          sentiment?: string | null
          snooze_until?: string | null
          status?: string
          subject?: string | null
          type: string
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_classified_at?: string | null
          article_title?: string | null
          article_url?: string | null
          assigned_to?: string | null
          company_id?: string
          contact_id?: string | null
          correction_status?: string | null
          created_at?: string | null
          cross_outlet_source?: string | null
          detected_language?: string | null
          editorial_value?: number | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          message_subtype?: string | null
          message_type?: string | null
          metadata?: Json | null
          platform?: string
          platform_conversation_id?: string | null
          post_id?: string | null
          post_url?: string | null
          priority?: string | null
          sentiment?: string | null
          snooze_until?: string | null
          status?: string
          subject?: string | null
          type?: string
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "inbox_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversations_cross_outlet_source_fkey"
            columns: ["cross_outlet_source"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_crisis_events: {
        Row: {
          company_id: string
          created_at: string
          id: string
          negative_count: number
          resolved_at: string | null
          resolved_by: string | null
          sample_conversation_ids: string[] | null
          severity: string
          status: string
          summary: string | null
          threshold: number
          topics: string[] | null
          updated_at: string
          window_minutes: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          negative_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          sample_conversation_ids?: string[] | null
          severity?: string
          status?: string
          summary?: string | null
          threshold?: number
          topics?: string[] | null
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          negative_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          sample_conversation_ids?: string[] | null
          severity?: string
          status?: string
          summary?: string | null
          threshold?: number
          topics?: string[] | null
          updated_at?: string
          window_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "inbox_crisis_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_labels: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_labels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          company_id: string
          contact_id: string | null
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string | null
          fts: unknown
          id: string
          is_internal_note: boolean | null
          media_url: string | null
          metadata: Json | null
          parent_message_id: string | null
          platform_message_id: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          content: string
          content_type?: string | null
          conversation_id: string
          created_at?: string | null
          fts?: unknown
          id?: string
          is_internal_note?: boolean | null
          media_url?: string | null
          metadata?: Json | null
          parent_message_id?: string | null
          platform_message_id?: string | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          content?: string
          content_type?: string | null
          conversation_id?: string
          created_at?: string | null
          fts?: unknown
          id?: string
          is_internal_note?: boolean | null
          media_url?: string | null
          metadata?: Json | null
          parent_message_id?: string | null
          platform_message_id?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "inbox_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "inbox_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_read_status: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_read_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_sync_state: {
        Row: {
          company_id: string
          cursor: string | null
          last_synced_at: string | null
          metadata: Json | null
          platform: string
          sync_type: string
        }
        Insert: {
          company_id: string
          cursor?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          platform: string
          sync_type: string
        }
        Update: {
          company_id?: string
          cursor?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          platform?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_sync_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journalists: {
        Row: {
          bio: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journalists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_companies: {
        Row: {
          contact_email: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      media_company_analytics: {
        Row: {
          calculated_at: string | null
          data_source: string | null
          id: string
          media_company_id: string
          period_end: string
          period_start: string
          platform_breakdown: Json | null
          total_companies: number | null
          total_engagement: number | null
          total_followers: number | null
          total_posts: number | null
        }
        Insert: {
          calculated_at?: string | null
          data_source?: string | null
          id?: string
          media_company_id: string
          period_end: string
          period_start: string
          platform_breakdown?: Json | null
          total_companies?: number | null
          total_engagement?: number | null
          total_followers?: number | null
          total_posts?: number | null
        }
        Update: {
          calculated_at?: string | null
          data_source?: string | null
          id?: string
          media_company_id?: string
          period_end?: string
          period_start?: string
          platform_breakdown?: Json | null
          total_companies?: number | null
          total_engagement?: number | null
          total_followers?: number | null
          total_posts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_company_analytics_media_company_id_fkey"
            columns: ["media_company_id"]
            isOneToOne: false
            referencedRelation: "media_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_company_children: {
        Row: {
          child_company_id: string
          created_at: string | null
          id: string
          parent_company_id: string
          relationship_type: string | null
        }
        Insert: {
          child_company_id: string
          created_at?: string | null
          id?: string
          parent_company_id: string
          relationship_type?: string | null
        }
        Update: {
          child_company_id?: string
          created_at?: string | null
          id?: string
          parent_company_id?: string
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_company_children_child_company_id_fkey"
            columns: ["child_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_company_children_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "media_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_company_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          is_active: boolean | null
          media_company_id: string
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          media_company_id: string
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          media_company_id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_company_members_media_company_id_fkey"
            columns: ["media_company_id"]
            isOneToOne: false
            referencedRelation: "media_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          company_id: string
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "inbox_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          company_id: string
          email: boolean | null
          event_type: string
          in_app: boolean | null
          user_id: string
        }
        Insert: {
          company_id: string
          email?: boolean | null
          event_type: string
          in_app?: boolean | null
          user_id: string
        }
        Update: {
          company_id?: string
          email?: boolean | null
          event_type?: string
          in_app?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      og_company_settings: {
        Row: {
          brand_color: string | null
          brand_color_secondary: string | null
          company_id: string
          created_at: string | null
          disabled_template_ids: string[] | null
          font_family: string | null
          font_family_title: string | null
          logo_dark_url: string | null
          logo_url: string | null
          preferred_template_ids: string[] | null
          show_author: boolean
          show_category_tag: boolean
          show_date: boolean
          show_description: boolean
          show_logo: boolean
          show_source_name: boolean
          show_title: boolean
          updated_at: string | null
        }
        Insert: {
          brand_color?: string | null
          brand_color_secondary?: string | null
          company_id: string
          created_at?: string | null
          disabled_template_ids?: string[] | null
          font_family?: string | null
          font_family_title?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          preferred_template_ids?: string[] | null
          show_author?: boolean
          show_category_tag?: boolean
          show_date?: boolean
          show_description?: boolean
          show_logo?: boolean
          show_source_name?: boolean
          show_title?: boolean
          updated_at?: string | null
        }
        Update: {
          brand_color?: string | null
          brand_color_secondary?: string | null
          company_id?: string
          created_at?: string | null
          disabled_template_ids?: string[] | null
          font_family?: string | null
          font_family_title?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          preferred_template_ids?: string[] | null
          show_author?: boolean
          show_category_tag?: boolean
          show_date?: boolean
          show_description?: boolean
          show_logo?: boolean
          show_source_name?: boolean
          show_title?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "og_company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          platform_domain: string | null
          platform_favicon_url: string | null
          platform_logo_url: string | null
          platform_name: string
          primary_color: string | null
          secondary_color: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_domain?: string | null
          platform_favicon_url?: string | null
          platform_logo_url?: string | null
          platform_name?: string
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_domain?: string | null
          platform_favicon_url?: string | null
          platform_logo_url?: string | null
          platform_name?: string
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post_analytics_snapshots: {
        Row: {
          account_id: string | null
          clicks: number
          comments: number
          company_id: string
          content: string | null
          created_at: string
          engagement_rate: number
          id: string
          impressions: number
          likes: number
          objective: string | null
          platform: string
          post_id: string
          post_url: string | null
          published_at: string | null
          reach: number
          saves: number | null
          shares: number
          snapshot_date: string
          source: string | null
          thumbnail_url: string | null
          views: number
        }
        Insert: {
          account_id?: string | null
          clicks?: number
          comments?: number
          company_id: string
          content?: string | null
          created_at?: string
          engagement_rate?: number
          id?: string
          impressions?: number
          likes?: number
          objective?: string | null
          platform: string
          post_id: string
          post_url?: string | null
          published_at?: string | null
          reach?: number
          saves?: number | null
          shares?: number
          snapshot_date: string
          source?: string | null
          thumbnail_url?: string | null
          views?: number
        }
        Update: {
          account_id?: string | null
          clicks?: number
          comments?: number
          company_id?: string
          content?: string | null
          created_at?: string
          engagement_rate?: number
          id?: string
          impressions?: number
          likes?: number
          objective?: string | null
          platform?: string
          post_id?: string
          post_url?: string | null
          published_at?: string | null
          reach?: number
          saves?: number | null
          shares?: number
          snapshot_date?: string
          source?: string | null
          thumbnail_url?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      post_approvals: {
        Row: {
          approved_at: string | null
          article_image_url: string | null
          article_link: string | null
          article_title: string | null
          company_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          image_url: string | null
          link_as_comment: Json | null
          objective: string | null
          platform_contents: Json
          recipient_email: string
          selected_account_ids: string[]
          status: string
          token: string
        }
        Insert: {
          approved_at?: string | null
          article_image_url?: string | null
          article_link?: string | null
          article_title?: string | null
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          image_url?: string | null
          link_as_comment?: Json | null
          objective?: string | null
          platform_contents?: Json
          recipient_email: string
          selected_account_ids?: string[]
          status?: string
          token?: string
        }
        Update: {
          approved_at?: string | null
          article_image_url?: string | null
          article_link?: string | null
          article_title?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          link_as_comment?: Json | null
          objective?: string | null
          platform_contents?: Json
          recipient_email?: string
          selected_account_ids?: string[]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      post_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          company_id: string
          compose_phase: string | null
          created_at: string
          created_by: string
          current_step: number | null
          due_at: string | null
          feed_item_id: string | null
          id: string
          image_url: string | null
          objective: string | null
          platform_contents: Json | null
          post_source: string | null
          rejection_reason: string | null
          reviewer_id: string | null
          selected_account_ids: string[] | null
          selected_article_id: string | null
          status: string
          strategy: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          company_id: string
          compose_phase?: string | null
          created_at?: string
          created_by: string
          current_step?: number | null
          due_at?: string | null
          feed_item_id?: string | null
          id?: string
          image_url?: string | null
          objective?: string | null
          platform_contents?: Json | null
          post_source?: string | null
          rejection_reason?: string | null
          reviewer_id?: string | null
          selected_account_ids?: string[] | null
          selected_article_id?: string | null
          status?: string
          strategy?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          company_id?: string
          compose_phase?: string | null
          created_at?: string
          created_by?: string
          current_step?: number | null
          due_at?: string | null
          feed_item_id?: string | null
          id?: string
          image_url?: string | null
          objective?: string | null
          platform_contents?: Json | null
          post_source?: string | null
          rejection_reason?: string | null
          reviewer_id?: string | null
          selected_account_ids?: string[] | null
          selected_article_id?: string | null
          status?: string
          strategy?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_drafts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_drafts_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "rss_feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_default_permissions: {
        Row: {
          granted: boolean
          id: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          granted?: boolean
          id?: string
          permission_name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          granted?: boolean
          id?: string
          permission_name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      routing_rules: {
        Row: {
          assigned_to: string | null
          category: string
          company_id: string
          created_at: string | null
          desk_name: string | null
          enabled: boolean | null
          id: string
          priority_override: string | null
          subcategory: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          company_id: string
          created_at?: string | null
          desk_name?: string | null
          enabled?: boolean | null
          id?: string
          priority_override?: string | null
          subcategory?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          company_id?: string
          created_at?: string | null
          desk_name?: string | null
          enabled?: boolean | null
          id?: string
          priority_override?: string | null
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_feed_items: {
        Row: {
          byline: string | null
          content_classification: Json | null
          created_at: string
          description: string | null
          feed_id: string
          full_content: string | null
          guid: string
          id: string
          image_url: string | null
          journalist_id: string | null
          last_recycled_at: string | null
          link: string | null
          og_ai_reasoning: string | null
          og_image_url: string | null
          og_template_id: string | null
          post_id: string | null
          processed_at: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["rss_item_status"]
          title: string | null
        }
        Insert: {
          byline?: string | null
          content_classification?: Json | null
          created_at?: string
          description?: string | null
          feed_id: string
          full_content?: string | null
          guid: string
          id?: string
          image_url?: string | null
          journalist_id?: string | null
          last_recycled_at?: string | null
          link?: string | null
          og_ai_reasoning?: string | null
          og_image_url?: string | null
          og_template_id?: string | null
          post_id?: string | null
          processed_at?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["rss_item_status"]
          title?: string | null
        }
        Update: {
          byline?: string | null
          content_classification?: Json | null
          created_at?: string
          description?: string | null
          feed_id?: string
          full_content?: string | null
          guid?: string
          id?: string
          image_url?: string | null
          journalist_id?: string | null
          last_recycled_at?: string | null
          link?: string | null
          og_ai_reasoning?: string | null
          og_image_url?: string | null
          og_template_id?: string | null
          post_id?: string | null
          processed_at?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["rss_item_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rss_feed_items_journalist"
            columns: ["journalist_id"]
            isOneToOne: false
            referencedRelation: "journalists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rss_feed_items_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "rss_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_feeds: {
        Row: {
          auto_publish: boolean
          company_id: string
          created_at: string
          enable_scraping: boolean
          etag: string | null
          id: string
          is_active: boolean
          last_modified: string | null
          last_polled_at: string | null
          name: string
          poll_interval_minutes: number
          updated_at: string
          url: string
        }
        Insert: {
          auto_publish?: boolean
          company_id: string
          created_at?: string
          enable_scraping?: boolean
          etag?: string | null
          id?: string
          is_active?: boolean
          last_modified?: string | null
          last_polled_at?: string | null
          name: string
          poll_interval_minutes?: number
          updated_at?: string
          url: string
        }
        Update: {
          auto_publish?: boolean
          company_id?: string
          created_at?: string
          enable_scraping?: boolean
          etag?: string | null
          id?: string
          is_active?: boolean
          last_modified?: string | null
          last_polled_at?: string | null
          name?: string
          poll_interval_minutes?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rss_feeds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted: boolean
          id: string
          permission_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted?: boolean
          id?: string
          permission_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted?: boolean
          id?: string
          permission_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_event_log: {
        Row: {
          company_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          processing_status: string
          provider: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload?: Json
          processing_status?: string
          provider?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processing_status?: string
          provider?: string
        }
        Relationships: []
      }
      webhook_registrations: {
        Row: {
          company_id: string
          consecutive_failures: number
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          provider: string
          secret: string
          updated_at: string | null
          webhook_id: string | null
        }
        Insert: {
          company_id: string
          consecutive_failures?: number
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          provider?: string
          secret: string
          updated_at?: string | null
          webhook_id?: string | null
        }
        Update: {
          company_id?: string
          consecutive_failures?: number
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          provider?: string
          secret?: string
          updated_at?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_registrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_email: { Args: never; Returns: string }
      cron_interval_minutes: { Args: { _schedule: string }; Returns: number }
      cron_watchdog: { Args: never; Returns: undefined }
      dispatch_company_sync: { Args: { _function_name: string }; Returns: Json }
      get_accessible_companies: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_followers_by_date_platform: {
        Args: { _company_id: string; _end_date: string; _start_date: string }
        Returns: {
          followers: number
          platform: string
          snapshot_date: string
        }[]
      }
      get_media_companies: { Args: { _user_id: string }; Returns: string[] }
      get_media_company_hierarchy: {
        Args: {
          _include_analytics?: boolean
          _media_company_id: string
          _period_days?: number
        }
        Returns: {
          company_id: string
          company_name: string
          platform_breakdown: Json
          relationship_type: string
          total_engagement: number
          total_followers: number
          total_posts: number
        }[]
      }
      get_optimal_posting_windows: {
        Args: { _company_id: string; _platform?: string; _timezone?: string }
        Returns: {
          avg_engagement: number
          confidence_level: string
          day_of_week: number
          hour: number
          platform: string
          post_count: number
        }[]
      }
      get_post_analytics_by_date: {
        Args: {
          _company_id: string
          _end_date: string
          _platform?: string
          _start_date: string
        }
        Returns: {
          avg_engagement_rate: number
          clicks: number
          comments: number
          impressions: number
          likes: number
          post_count: number
          reach: number
          shares: number
          snapshot_date: string
          views: number
        }[]
      }
      get_post_analytics_by_date_platform: {
        Args: { _company_id: string; _end_date: string; _start_date: string }
        Returns: {
          clicks: number
          impressions: number
          platform: string
          snapshot_date: string
          views: number
        }[]
      }
      get_post_analytics_by_platform: {
        Args: { _company_id: string; _end_date: string; _start_date: string }
        Returns: {
          platform: string
          total_engagement: number
          total_impressions: number
          total_posts: number
          total_views: number
        }[]
      }
      get_post_analytics_by_publish_date: {
        Args: {
          _company_id: string
          _end_date: string
          _platform?: string
          _start_date: string
        }
        Returns: {
          avg_engagement_rate: number
          clicks: number
          comments: number
          impressions: number
          likes: number
          post_count: number
          publish_date: string
          reach: number
          shares: number
          views: number
        }[]
      }
      get_post_analytics_totals: {
        Args: {
          _company_id: string
          _end_date: string
          _platform?: string
          _start_date: string
        }
        Returns: {
          avg_engagement_rate: number
          total_clicks: number
          total_comments: number
          total_impressions: number
          total_likes: number
          total_posts: number
          total_reach: number
          total_shares: number
          total_views: number
        }[]
      }
      get_posting_frequency_analysis: {
        Args: { _company_id: string; _platform?: string }
        Returns: {
          average_engagement_rate: number
          platform: string
          posts_per_week: number
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      has_media_company_permission: {
        Args: {
          _media_company_id: string
          _required_role?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inbox_resurface_snoozed: { Args: never; Returns: undefined }
      increment_ai_calls: { Args: { _company_id: string }; Returns: undefined }
      is_media_company_admin: {
        Args: { _media_company_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
      trigger_cron_job: { Args: { _job_name: string }; Returns: Json }
      update_cron_job: {
        Args: {
          _description?: string
          _enabled?: boolean
          _job_name: string
          _schedule?: string
        }
        Returns: Json
      }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _company_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      user_is_media_company_admin: {
        Args: { _user_id: string }
        Returns: string[]
      }
      user_is_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_media_company_ids: { Args: { _user_id: string }; Returns: string[] }
      user_team_member_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "member"
        | "manager"
        | "collaborator"
        | "community_manager"
      campaign_status: "draft" | "active" | "completed" | "archived"
      evergreen_status: "pending" | "published" | "skipped" | "failed"
      rss_item_status: "pending" | "posted" | "failed" | "skipped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "owner",
        "admin",
        "member",
        "manager",
        "collaborator",
        "community_manager",
      ],
      campaign_status: ["draft", "active", "completed", "archived"],
      evergreen_status: ["pending", "published", "skipped", "failed"],
      rss_item_status: ["pending", "posted", "failed", "skipped"],
    },
  },
} as const
