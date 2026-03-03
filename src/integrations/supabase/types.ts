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
      companies: {
        Row: {
          branding: Json | null
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
          company_id: string
          compose_phase: string | null
          created_at: string
          created_by: string
          current_step: number | null
          id: string
          image_url: string | null
          objective: string | null
          platform_contents: Json | null
          post_source: string | null
          selected_account_ids: string[] | null
          selected_article_id: string | null
          status: string
          strategy: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          compose_phase?: string | null
          created_at?: string
          created_by: string
          current_step?: number | null
          id?: string
          image_url?: string | null
          objective?: string | null
          platform_contents?: Json | null
          post_source?: string | null
          selected_account_ids?: string[] | null
          selected_article_id?: string | null
          status?: string
          strategy?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          compose_phase?: string | null
          created_at?: string
          created_by?: string
          current_step?: number | null
          id?: string
          image_url?: string | null
          objective?: string | null
          platform_contents?: Json | null
          post_source?: string | null
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
      rss_feed_items: {
        Row: {
          created_at: string
          description: string | null
          feed_id: string
          full_content: string | null
          guid: string
          id: string
          image_url: string | null
          link: string | null
          post_id: string | null
          processed_at: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["rss_item_status"]
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          feed_id: string
          full_content?: string | null
          guid: string
          id?: string
          image_url?: string | null
          link?: string | null
          post_id?: string | null
          processed_at?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["rss_item_status"]
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          feed_id?: string
          full_content?: string | null
          guid?: string
          id?: string
          image_url?: string | null
          link?: string | null
          post_id?: string | null
          processed_at?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["rss_item_status"]
          title?: string | null
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_email: { Args: never; Returns: string }
      get_accessible_companies: {
        Args: { _user_id: string }
        Returns: string[]
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
      is_media_company_admin: {
        Args: { _media_company_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
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
      user_is_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
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
      app_role: ["owner", "admin", "member"],
      rss_item_status: ["pending", "posted", "failed", "skipped"],
    },
  },
} as const
