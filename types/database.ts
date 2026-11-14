export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ContentStatus =
  | 'generating'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'skipped'
  | 'publish_unknown'

export type ContentFormat = 'text' | 'image'

export type AutomationStatus =
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'skipped'

export interface Database {
  public: {
    Tables: {
      recurring_rules: {
        Row: {
          id: string
          posting_time: string
          generation_lead_minutes: number
          enabled: boolean
          effective_date: string
          revision: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          posting_time: string
          generation_lead_minutes: number
          enabled?: boolean
          effective_date: string
          revision?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          posting_time?: string
          generation_lead_minutes?: number
          enabled?: boolean
          effective_date?: string
          revision?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          id: string
          recurring_rule_id: string | null
          local_date: string
          scheduled_for: string
          generate_after: string
          source: 'routine' | 'ad_hoc' | 'legacy'
          lifecycle: 'scheduled' | 'cancelled' | 'missed' | 'completed' | 'legacy'
          revision: number
          context: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recurring_rule_id?: string | null
          local_date: string
          scheduled_for: string
          generate_after: string
          source: 'routine' | 'ad_hoc' | 'legacy'
          lifecycle?: 'scheduled' | 'cancelled' | 'missed' | 'completed' | 'legacy'
          revision?: number
          context?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recurring_rule_id?: string | null
          local_date?: string
          scheduled_for?: string
          generate_after?: string
          source?: 'routine' | 'ad_hoc' | 'legacy'
          lifecycle?: 'scheduled' | 'cancelled' | 'missed' | 'completed' | 'legacy'
          revision?: number
          context?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      threads_oauth_states: {
        Row: { state_hash: string; admin_id: string; account_revision: string; expires_at: string }
        Insert: { state_hash: string; admin_id: string; account_revision: string; expires_at: string }
        Update: { state_hash?: string; admin_id?: string; account_revision?: string; expires_at?: string }
        Relationships: []
      }
      admin_users: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          singleton: boolean
          timezone: string
          generation_time: string
          posting_time: string
          automation_enabled: boolean
          image_target_ratio: number
          language: string
          persona_prompt: string | null
          max_generation_retries: number
          topic_mode: 'mix' | 'focus' | 'schedule'
          focus_topic_id: string | null
          topic_rotation_cooldown_days: number
          angle_candidates_count: number
          style_reference_enabled: boolean
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          singleton?: boolean
          timezone?: string
          generation_time?: string
          posting_time?: string
          automation_enabled?: boolean
          image_target_ratio?: number
          language?: string
          persona_prompt?: string | null
          max_generation_retries?: number
          topic_mode?: 'mix' | 'focus' | 'schedule'
          focus_topic_id?: string | null
          topic_rotation_cooldown_days?: number
          angle_candidates_count?: number
          style_reference_enabled?: boolean
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          singleton?: boolean
          timezone?: string
          generation_time?: string
          posting_time?: string
          automation_enabled?: boolean
          image_target_ratio?: number
          language?: string
          persona_prompt?: string | null
          max_generation_retries?: number
          topic_mode?: 'mix' | 'focus' | 'schedule'
          focus_topic_id?: string | null
          topic_rotation_cooldown_days?: number
          angle_candidates_count?: number
          style_reference_enabled?: boolean
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          id: string
          platform: 'threads'
          external_user_id: string
          username: string | null
          encrypted_access_token: string
          token_expires_at: string | null
          granted_scopes: string[]
          refresh_lease: string | null
          refresh_lease_until: string | null
          last_token_refresh_at: string | null
          is_active: boolean
          connected_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform?: 'threads'
          external_user_id: string
          username?: string | null
          encrypted_access_token: string
          token_expires_at?: string | null
          granted_scopes?: string[]
          refresh_lease?: string | null
          refresh_lease_until?: string | null
          last_token_refresh_at?: string | null
          is_active?: boolean
          connected_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform?: 'threads'
          external_user_id?: string
          username?: string | null
          encrypted_access_token?: string
          token_expires_at?: string | null
          granted_scopes?: string[]
          refresh_lease?: string | null
          refresh_lease_until?: string | null
          last_token_refresh_at?: string | null
          is_active?: boolean
          connected_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          id: string
          slot_id: string | null
          run_date: string
          idempotency_key: string
          status: AutomationStatus
          current_stage: string
          started_at: string
          completed_at: string | null
          lease_id: string | null
          lease_expires_at: string | null
          attempts: number
          next_attempt_at: string | null
          error_code: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          slot_id?: string | null
          run_date: string
          idempotency_key: string
          status?: AutomationStatus
          current_stage?: string
          started_at?: string
          completed_at?: string | null
          lease_id?: string | null
          lease_expires_at?: string | null
          attempts?: number
          next_attempt_at?: string | null
          error_code?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          slot_id?: string | null
          run_date?: string
          idempotency_key?: string
          status?: AutomationStatus
          current_stage?: string
          started_at?: string
          completed_at?: string | null
          lease_id?: string | null
          lease_expires_at?: string | null
          attempts?: number
          next_attempt_at?: string | null
          error_code?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      topic_history: {
        Row: {
          id: string
          topic: string
          pillar: string
          angle: string | null
          source_title: string | null
          source_url: string | null
          source_note: string | null
          used_at: string
          created_at: string
          topic_id: string | null
          angle_type: string | null
          angle_fingerprint: string | null
          selection_mode: 'mix' | 'focus' | 'schedule'
          candidate_angles: Json
          metadata: Json
        }
        Insert: {
          id?: string
          topic: string
          pillar: string
          angle?: string | null
          source_title?: string | null
          source_url?: string | null
          source_note?: string | null
          used_at?: string
          created_at?: string
          topic_id?: string | null
          angle_type?: string | null
          angle_fingerprint?: string | null
          selection_mode?: 'mix' | 'focus' | 'schedule'
          candidate_angles?: Json
          metadata?: Json
        }
        Update: {
          id?: string
          topic?: string
          pillar?: string
          angle?: string | null
          source_title?: string | null
          source_url?: string | null
          source_note?: string | null
          used_at?: string
          created_at?: string
          topic_id?: string | null
          angle_type?: string | null
          angle_fingerprint?: string | null
          selection_mode?: 'mix' | 'focus' | 'schedule'
          candidate_angles?: Json
          metadata?: Json
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          id: string
          slot_id: string | null
          run_id: string | null
          social_account_id: string | null
          topic_history_id: string | null
          scheduled_date: string | null
          scheduled_for: string | null
          content: string
          content_type: ContentFormat
          pillar: string
          tone: string | null
          image_prompt: string | null
          image_storage_path: string | null
          image_public_url: string | null
          image_alt_text: string | null
          content_fingerprint: string
          quality_score: number | null
          quality_notes: Json
          status: ContentStatus
          threads_container_id: string | null
          threads_media_id: string | null
          threads_permalink: string | null
          publish_attempts: number
          last_attempt_at: string | null
          published_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          generation_metadata: Json
          context: string | null
          created_at: string
          updated_at: string
          topic_id: string | null
          angle: string | null
          style_reference_snapshot: Json
        }
        Insert: {
          id?: string
          slot_id?: string | null
          run_id?: string | null
          social_account_id?: string | null
          topic_history_id?: string | null
          scheduled_date?: string | null
          scheduled_for?: string | null
          content: string
          content_type?: ContentFormat
          pillar: string
          tone?: string | null
          image_prompt?: string | null
          image_storage_path?: string | null
          image_public_url?: string | null
          image_alt_text?: string | null
          content_fingerprint: string
          quality_score?: number | null
          quality_notes?: Json
          status?: ContentStatus
          threads_container_id?: string | null
          threads_media_id?: string | null
          threads_permalink?: string | null
          publish_attempts?: number
          last_attempt_at?: string | null
          published_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          generation_metadata?: Json
          context?: string | null
          created_at?: string
          updated_at?: string
          topic_id?: string | null
          angle?: string | null
          style_reference_snapshot?: Json
        }
        Update: {
          id?: string
          slot_id?: string | null
          run_id?: string | null
          social_account_id?: string | null
          topic_history_id?: string | null
          scheduled_date?: string | null
          scheduled_for?: string | null
          content?: string
          content_type?: ContentFormat
          pillar?: string
          tone?: string | null
          image_prompt?: string | null
          image_storage_path?: string | null
          image_public_url?: string | null
          image_alt_text?: string | null
          content_fingerprint?: string
          quality_score?: number | null
          quality_notes?: Json
          status?: ContentStatus
          threads_container_id?: string | null
          threads_media_id?: string | null
          threads_permalink?: string | null
          publish_attempts?: number
          last_attempt_at?: string | null
          published_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          generation_metadata?: Json
          context?: string | null
          created_at?: string
          updated_at?: string
          topic_id?: string | null
          angle?: string | null
          style_reference_snapshot?: Json
        }
        Relationships: []
      }
      content_topics: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          source_type: 'system' | 'custom'
          is_active: boolean
          priority: number
          last_selected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string
          source_type?: 'system' | 'custom'
          is_active?: boolean
          priority?: number
          last_selected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          source_type?: 'system' | 'custom'
          is_active?: boolean
          priority?: number
          last_selected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      style_references: {
        Row: {
          id: string
          label: string
          sample_text: string
          source_label: string | null
          source_url: string | null
          analysis_status: 'pending' | 'analyzed' | 'failed'
          style_traits: Json
          is_active: boolean
          analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          sample_text: string
          source_label?: string | null
          source_url?: string | null
          analysis_status?: 'pending' | 'analyzed' | 'failed'
          style_traits?: Json
          is_active?: boolean
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          sample_text?: string
          source_label?: string | null
          source_url?: string | null
          analysis_status?: 'pending' | 'analyzed' | 'failed'
          style_traits?: Json
          is_active?: boolean
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          id: string
          run_id: string | null
          content_post_id: string | null
          level: 'debug' | 'info' | 'warning' | 'error'
          event: string
          message: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          run_id?: string | null
          content_post_id?: string | null
          level: 'debug' | 'info' | 'warning' | 'error'
          event: string
          message: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string | null
          content_post_id?: string | null
          level?: 'debug' | 'info' | 'warning' | 'error'
          event: string
          message: string
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      materialize_routine_slots: { Args: Record<string, never>; Returns: undefined }
      claim_daily_generation: { Args: { p_date: string; p_lease: string; p_manual: boolean; p_version: string | null }; Returns: boolean }
      finalize_daily_generation: { Args: { p_date: string; p_lease: string; p_version: string | null; p_post: Json; p_history: Json; p_manual: boolean }; Returns: string }
      fail_daily_generation: { Args: { p_date: string; p_lease: string }; Returns: undefined }
      claim_slot_generation: { Args: { p_date: string; p_slot_id: string; p_lease: string; p_manual: boolean; p_version: string | null }; Returns: boolean }
      finalize_slot_generation: { Args: { p_date: string; p_slot_id: string; p_lease: string; p_version: string | null; p_post: Json; p_history: Json; p_manual: boolean }; Returns: string }
      fail_slot_generation: { Args: { p_date: string; p_slot_id: string; p_lease: string }; Returns: undefined }
      save_threads_account: {
        Args: { p_external_id: string; p_username: string; p_token: string; p_expires: string; p_scopes: string[]; p_revision: string }
        Returns: undefined
      }
      disconnect_threads_account: { Args: Record<string, never>; Returns: undefined }
      claim_threads_refresh: { Args: { p_id: string; p_version: string; p_lease: string }; Returns: boolean }
      claim_scheduled_threads_post: {
        Args: { p_id: string; p_version: string; p_account_id: string; p_account_version: string }
        Returns: Database['public']['Tables']['content_posts']['Row'][]
      }
      claim_threads_post: {
        Args: { p_id: string; p_version: string; p_account_id: string; p_account_version: string }
        Returns: Database['public']['Tables']['content_posts']['Row'][]
      }
      is_threadme_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      content_status: ContentStatus
      content_format: ContentFormat
      automation_status: AutomationStatus
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
