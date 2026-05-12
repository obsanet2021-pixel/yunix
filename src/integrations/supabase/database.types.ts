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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_cycles: {
        Row: {
          created_at: string | null
          cycle_number: number
          end_date: string | null
          ending_balance: number | null
          id: string
          max_drawdown_percentage: number | null
          migration_note: string | null
          notes: string | null
          payout_proof_url: string | null
          profit_target: number | null
          prop_firm_id: string
          start_date: string
          starting_balance: number
          status: string
          updated_at: string | null
          user_id: string
          withdrawn_amount: number | null
        }
        Insert: {
          created_at?: string | null
          cycle_number?: number
          end_date?: string | null
          ending_balance?: number | null
          id?: string
          max_drawdown_percentage?: number | null
          migration_note?: string | null
          notes?: string | null
          payout_proof_url?: string | null
          profit_target?: number | null
          prop_firm_id: string
          start_date?: string
          starting_balance: number
          status?: string
          updated_at?: string | null
          user_id: string
          withdrawn_amount?: number | null
        }
        Update: {
          created_at?: string | null
          cycle_number?: number
          end_date?: string | null
          ending_balance?: number | null
          id?: string
          max_drawdown_percentage?: number | null
          migration_note?: string | null
          notes?: string | null
          payout_proof_url?: string | null
          profit_target?: number | null
          prop_firm_id?: string
          start_date?: string
          starting_balance?: number
          status?: string
          updated_at?: string | null
          user_id?: string
          withdrawn_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_cycles_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      account_snapshots: {
        Row: {
          balance: number | null
          created_at: string | null
          equity: number | null
          extracted_data: Json | null
          floating_pnl: number | null
          free_margin: number | null
          id: string
          margin_used: number | null
          open_trades: number | null
          prop_firm_id: string | null
          screenshot_url: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          equity?: number | null
          extracted_data?: Json | null
          floating_pnl?: number | null
          free_margin?: number | null
          id?: string
          margin_used?: number | null
          open_trades?: number | null
          prop_firm_id?: string | null
          screenshot_url?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          equity?: number | null
          extracted_data?: Json | null
          floating_pnl?: number | null
          free_margin?: number | null
          id?: string
          margin_used?: number | null
          open_trades?: number | null
          prop_firm_id?: string | null
          screenshot_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_snapshots_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action_type: string | null
          admin_email: string | null
          admin_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type?: string | null
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string | null
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      auth_challenges: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          hashed_code: string
          id: string
          locked_until: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          hashed_code: string
          id?: string
          locked_until?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          hashed_code?: string
          id?: string
          locked_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bridge_activity_logs: {
        Row: {
          action_type: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          ip_address: string | null
          prop_firm_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          prop_firm_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          prop_firm_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bridge_activity_logs_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bridge_user_settings: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          notifications_enabled: boolean | null
          sync_balance: boolean | null
          sync_interval_minutes: number | null
          sync_positions: boolean | null
          sync_trades: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          notifications_enabled?: boolean | null
          sync_balance?: boolean | null
          sync_interval_minutes?: number | null
          sync_positions?: boolean | null
          sync_trades?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          notifications_enabled?: boolean | null
          sync_balance?: boolean | null
          sync_interval_minutes?: number | null
          sync_positions?: boolean | null
          sync_trades?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certificate_plaque_orders: {
        Row: {
          certificate_id: string | null
          created_at: string | null
          id: string
          price_paid: number
          shipping_address: Json | null
          shipping_status: string | null
          status: string
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string | null
          id?: string
          price_paid: number
          shipping_address?: Json | null
          shipping_status?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_id?: string | null
          created_at?: string | null
          id?: string
          price_paid?: number
          shipping_address?: Json | null
          shipping_status?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_plaque_orders_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "trading_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_responses: {
        Row: {
          ai_message: string | null
          created_at: string | null
          id: string
          responder_id: string | null
          response_text: string
          target_date: string
          target_user_id: string | null
        }
        Insert: {
          ai_message?: string | null
          created_at?: string | null
          id?: string
          responder_id?: string | null
          response_text: string
          target_date?: string
          target_user_id?: string | null
        }
        Update: {
          ai_message?: string | null
          created_at?: string | null
          id?: string
          responder_id?: string | null
          response_text?: string
          target_date?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      competition_winners: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          id: string
          invitation_count: number
          prize_amount: number
          prize_paid: boolean | null
          ranking: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          invitation_count?: number
          prize_amount: number
          prize_paid?: boolean | null
          ranking: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          invitation_count?: number
          prize_amount?: number
          prize_paid?: boolean | null
          ranking?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          confidence_level: number
          created_at: string | null
          daily_risk_limit: number | null
          emotion_tag: string | null
          id: string
          max_trades: number | null
          mistake_tags: string[] | null
          mood: string
          planned_pairs: string[] | null
          rule_broken: boolean | null
          sleep_quality: string
          stress_level: number
          trading_plan: string | null
          user_id: string
        }
        Insert: {
          confidence_level: number
          created_at?: string | null
          daily_risk_limit?: number | null
          emotion_tag?: string | null
          id?: string
          max_trades?: number | null
          mistake_tags?: string[] | null
          mood: string
          planned_pairs?: string[] | null
          rule_broken?: boolean | null
          sleep_quality: string
          stress_level: number
          trading_plan?: string | null
          user_id: string
        }
        Update: {
          confidence_level?: number
          created_at?: string | null
          daily_risk_limit?: number | null
          emotion_tag?: string | null
          id?: string
          max_trades?: number | null
          mistake_tags?: string[] | null
          mood?: string
          planned_pairs?: string[] | null
          rule_broken?: boolean | null
          sleep_quality?: string
          stress_level?: number
          trading_plan?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitation_contest_participants: {
        Row: {
          contest_start_date: string | null
          created_at: string | null
          email_sent: boolean | null
          id: string
          invitation_count: number | null
          last_calculated_at: string | null
          prize_amount: number | null
          ranking: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contest_start_date?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          invitation_count?: number | null
          last_calculated_at?: string | null
          prize_amount?: number | null
          ranking?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contest_start_date?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          invitation_count?: number | null
          last_calculated_at?: string | null
          prize_amount?: number | null
          ranking?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          claimed: boolean | null
          claimed_at: string | null
          code: string
          contest_participation_id: string | null
          created_at: string | null
          id: string
          inviter_id: string
        }
        Insert: {
          claimed?: boolean | null
          claimed_at?: string | null
          code: string
          contest_participation_id?: string | null
          created_at?: string | null
          id?: string
          inviter_id: string
        }
        Update: {
          claimed?: boolean | null
          claimed_at?: string | null
          code?: string
          contest_participation_id?: string | null
          created_at?: string | null
          id?: string
          inviter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_contest_participation_id_fkey"
            columns: ["contest_participation_id"]
            isOneToOne: false
            referencedRelation: "invitation_contest_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_accounts: {
        Row: {
          account_name: string | null
          created_at: string | null
          encryption_iv: string | null
          id: string
          investor_password_encrypted: string | null
          is_active: boolean | null
          last_sync_at: string | null
          mt5_login: string | null
          mt5_server: string | null
          prop_firm_id: string | null
          sync_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          encryption_iv?: string | null
          id?: string
          investor_password_encrypted?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          mt5_login?: string | null
          mt5_server?: string | null
          prop_firm_id?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          encryption_iv?: string | null
          id?: string
          investor_password_encrypted?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          mt5_login?: string | null
          mt5_server?: string | null
          prop_firm_id?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_plan: string | null
          email: string | null
          full_name: string | null
          id: string
          plan: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_plan?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          plan?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_plan?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      prop_firms: {
        Row: {
          account_number: string | null
          account_type: string | null
          balance: number | null
          company: string | null
          created_at: string | null
          current_profit: number | null
          equity: number | null
          evaluation_stage: string | null
          id: string
          login: string | null
          max_drawdown: number | null
          name: string
          payout_request_date: string | null
          platform: string | null
          profit_target: number | null
          server: string | null
          starting_balance: number | null
          status: string | null
          target_profit: number | null
          trailing_drawdown: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          balance?: number | null
          company?: string | null
          created_at?: string | null
          current_profit?: number | null
          equity?: number | null
          evaluation_stage?: string | null
          id?: string
          login?: string | null
          max_drawdown?: number | null
          name: string
          payout_request_date?: string | null
          platform?: string | null
          profit_target?: number | null
          server?: string | null
          starting_balance?: number | null
          status?: string | null
          target_profit?: number | null
          trailing_drawdown?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          balance?: number | null
          company?: string | null
          created_at?: string | null
          current_profit?: number | null
          equity?: number | null
          evaluation_stage?: string | null
          id?: string
          login?: string | null
          max_drawdown?: number | null
          name?: string
          payout_request_date?: string | null
          platform?: string | null
          profit_target?: number | null
          server?: string | null
          starting_balance?: number | null
          status?: string | null
          target_profit?: number | null
          trailing_drawdown?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: string
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          subject: string | null
          telegram_chat_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets_duplicate: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          subject: string | null
          telegram_chat_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string | null
          replied_by: string | null
          ticket_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string | null
          replied_by?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string | null
          replied_by?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_tags: {
        Row: {
          created_at: string | null
          id: string
          tag: string
          trade_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag: string
          trade_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          tag?: string
          trade_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          ai_extraction_metadata: Json | null
          close_price: number | null
          close_time: string | null
          commission: number | null
          created_at: string | null
          cycle_id: string | null
          emotion: string | null
          emotion_tag: string | null
          entry_price: number | null
          extracted_from_screenshot: boolean | null
          fee_swap: number | null
          id: string
          is_synced: boolean | null
          mistake_tags: string[] | null
          mt5_ticket: string | null
          net_profit: number | null
          notes: string | null
          open_time: string | null
          pair: string
          profit: number
          prop_firm_id: string | null
          risk_reward: number | null
          rule_broken: boolean | null
          screenshot_url: string | null
          screenshots: string[] | null
          session: string | null
          stop_loss: number | null
          swap: number | null
          take_profit: number | null
          trade_date: string
          trade_type: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
          volume: number | null
        }
        Insert: {
          ai_extraction_metadata?: Json | null
          close_price?: number | null
          close_time?: string | null
          commission?: number | null
          created_at?: string | null
          cycle_id?: string | null
          emotion?: string | null
          emotion_tag?: string | null
          entry_price?: number | null
          extracted_from_screenshot?: boolean | null
          fee_swap?: number | null
          id?: string
          is_synced?: boolean | null
          mistake_tags?: string[] | null
          mt5_ticket?: string | null
          net_profit?: number | null
          notes?: string | null
          open_time?: string | null
          pair: string
          profit: number
          prop_firm_id?: string | null
          risk_reward?: number | null
          rule_broken?: boolean | null
          screenshot_url?: string | null
          screenshots?: string[] | null
          session?: string | null
          stop_loss?: number | null
          swap?: number | null
          take_profit?: number | null
          trade_date?: string
          trade_type?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          volume?: number | null
        }
        Update: {
          ai_extraction_metadata?: Json | null
          close_price?: number | null
          close_time?: string | null
          commission?: number | null
          created_at?: string | null
          cycle_id?: string | null
          emotion?: string | null
          emotion_tag?: string | null
          entry_price?: number | null
          extracted_from_screenshot?: boolean | null
          fee_swap?: number | null
          id?: string
          is_synced?: boolean | null
          mistake_tags?: string[] | null
          mt5_ticket?: string | null
          net_profit?: number | null
          notes?: string | null
          open_time?: string | null
          pair?: string
          profit?: number
          prop_firm_id?: string | null
          risk_reward?: number | null
          rule_broken?: boolean | null
          screenshot_url?: string | null
          screenshots?: string[] | null
          session?: string | null
          stop_loss?: number | null
          swap?: number | null
          take_profit?: number | null
          trade_date?: string
          trade_type?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_certificates: {
        Row: {
          achieved_at: string | null
          certificate_date: string
          certificate_number: string | null
          certificate_type: string
          company_name: string | null
          created_at: string | null
          funded_account: string | null
          id: string
          is_shared: boolean | null
          milestone: string
          pdf_url: string | null
          profit_amount: number | null
          screenshot_url: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          certificate_date?: string
          certificate_number?: string | null
          certificate_type?: string
          company_name?: string | null
          created_at?: string | null
          funded_account?: string | null
          id?: string
          is_shared?: boolean | null
          milestone: string
          pdf_url?: string | null
          profit_amount?: number | null
          screenshot_url?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          certificate_date?: string
          certificate_number?: string | null
          certificate_type?: string
          company_name?: string | null
          created_at?: string | null
          funded_account?: string | null
          id?: string
          is_shared?: boolean | null
          milestone?: string
          pdf_url?: string | null
          profit_amount?: number | null
          screenshot_url?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_daily_checkins: {
        Row: {
          ai_response: string | null
          checkin_date: string
          confidence_level: number | null
          created_at: string | null
          daily_risk_limit: number | null
          id: string
          max_trades: number | null
          mistake_tags: string[] | null
          mood: string | null
          planned_pairs: string[] | null
          rule_broken: boolean | null
          sleep_quality: string | null
          stress_level: number | null
          trading_plan: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          checkin_date?: string
          confidence_level?: number | null
          created_at?: string | null
          daily_risk_limit?: number | null
          id?: string
          max_trades?: number | null
          mistake_tags?: string[] | null
          mood?: string | null
          planned_pairs?: string[] | null
          rule_broken?: boolean | null
          sleep_quality?: string | null
          stress_level?: number | null
          trading_plan?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_response?: string | null
          checkin_date?: string
          confidence_level?: number | null
          created_at?: string | null
          daily_risk_limit?: number | null
          id?: string
          max_trades?: number | null
          mistake_tags?: string[] | null
          mood?: string | null
          planned_pairs?: string[] | null
          rule_broken?: boolean | null
          sleep_quality?: string | null
          stress_level?: number | null
          trading_plan?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_strategies: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_text: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_text?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_text?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_telegram_sessions: {
        Row: {
          created_at: string | null
          current_ticket_id: string | null
          id: string
          selected_category: string | null
          session_state: string | null
          telegram_chat_id: string | null
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_ticket_id?: string | null
          id?: string
          selected_category?: string | null
          session_state?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_ticket_id?: string | null
          id?: string
          selected_category?: string | null
          session_state?: string | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_cycle_and_start_new: {
        Args: {
          _payout_proof_url?: string
          _prop_firm_id: string
          _withdrawn_amount: number
        }
        Returns: string
      }
      get_active_cycle: { Args: { _prop_firm_id: string }; Returns: string }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_ceo: { Args: { _user_id: string }; Returns: boolean }
      is_feature_enabled: { Args: { feature_key: string }; Returns: boolean }
      link_staff_account: {
        Args: { _user_email: string; _user_id: string }
        Returns: boolean
      }
      link_staff_account_secure: {
        Args: { _admin_user_id: string; _user_email: string; _user_id: string }
        Returns: boolean
      }
      staff_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      verify_otp_and_create_session: {
        Args: {
          p_code_hash: string
          p_email: string
          p_expires_at: string
          p_ip: string
          p_session_token_hash: string
          p_type: string
          p_user_agent: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_status: "In Progress" | "Passed" | "Blown"
      account_type: "Personal" | "Evaluation" | "Funded"
      app_role: "admin" | "staff" | "user"
      prop_firm_account_type:
        | "Personal"
        | "Funded"
        | "Evaluation 1"
        | "Evaluation 2"
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
      account_status: ["In Progress", "Passed", "Blown"],
      account_type: ["Personal", "Evaluation", "Funded"],
      app_role: ["admin", "staff", "user"],
      prop_firm_account_type: [
        "Personal",
        "Funded",
        "Evaluation 1",
        "Evaluation 2",
      ],
    },
  },
} as const
