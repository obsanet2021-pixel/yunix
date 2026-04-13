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
    PostgrestVersion: "13.0.5"
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          action_type: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
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
      bridge_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          ip_address: string | null
          prop_firm_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          prop_firm_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: string | null
          prop_firm_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          user_id?: string
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
          auto_sync_enabled: boolean
          created_at: string
          id: string
          last_sync_at: string | null
          notifications_enabled: boolean
          sync_balance: boolean
          sync_interval_minutes: number
          sync_positions: boolean
          sync_trades: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          id?: string
          last_sync_at?: string | null
          notifications_enabled?: boolean
          sync_balance?: boolean
          sync_interval_minutes?: number
          sync_positions?: boolean
          sync_trades?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          id?: string
          last_sync_at?: string | null
          notifications_enabled?: boolean
          sync_balance?: boolean
          sync_interval_minutes?: number
          sync_positions?: boolean
          sync_trades?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ceo_telegram_config: {
        Row: {
          auto_notify_new_orders: boolean | null
          created_at: string | null
          group_chat_id: number | null
          id: string
          is_active: boolean | null
          telegram_chat_id: number
          updated_at: string | null
        }
        Insert: {
          auto_notify_new_orders?: boolean | null
          created_at?: string | null
          group_chat_id?: number | null
          id?: string
          is_active?: boolean | null
          telegram_chat_id: number
          updated_at?: string | null
        }
        Update: {
          auto_notify_new_orders?: boolean | null
          created_at?: string | null
          group_chat_id?: number | null
          id?: string
          is_active?: boolean | null
          telegram_chat_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          description: string | null
          file_type: string
          file_url: string
          id: string
          issued_date: string | null
          prop_firm_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type: string
          file_url: string
          id?: string
          issued_date?: string | null
          prop_firm_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
          issued_date?: string | null
          prop_firm_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          author_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          hours: number | null
          id: string
          level: string | null
          published: boolean | null
          resources: Json | null
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          level?: string | null
          published?: boolean | null
          resources?: Json | null
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          hours?: number | null
          id?: string
          level?: string | null
          published?: boolean | null
          resources?: Json | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          ai_response: string | null
          checkin_date: string
          confidence_level: number | null
          created_at: string | null
          daily_risk_limit: number | null
          id: string
          max_trades: number | null
          mood: string | null
          planned_pairs: string[] | null
          sleep_quality: string | null
          stress_level: number | null
          trading_plan: string | null
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
          mood?: string | null
          planned_pairs?: string[] | null
          sleep_quality?: string | null
          stress_level?: number | null
          trading_plan?: string | null
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
          mood?: string | null
          planned_pairs?: string[] | null
          sleep_quality?: string | null
          stress_level?: number | null
          trading_plan?: string | null
          user_id?: string
        }
        Relationships: []
      }
      delivery_bot_agents: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          linked_at: string | null
          staff_id: string | null
          telegram_chat_id: number | null
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          staff_id?: string | null
          telegram_chat_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          staff_id?: string | null
          telegram_chat_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_bot_agents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pricing: {
        Row: {
          city_name: string
          created_at: string | null
          delivery_fee: number
          id: string
          is_active: boolean
          is_fallback: boolean
          is_free: boolean
          updated_at: string | null
        }
        Insert: {
          city_name: string
          created_at?: string | null
          delivery_fee?: number
          id?: string
          is_active?: boolean
          is_fallback?: boolean
          is_free?: boolean
          updated_at?: string | null
        }
        Update: {
          city_name?: string
          created_at?: string | null
          delivery_fee?: number
          id?: string
          is_active?: boolean
          is_fallback?: boolean
          is_free?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          min_order_value: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "discount_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      final_certificates: {
        Row: {
          certificate_url: string
          created_at: string | null
          id: string
          issued_at: string | null
          issued_by: string
          user_id: string
        }
        Insert: {
          certificate_url: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by: string
          user_id: string
        }
        Update: {
          certificate_url?: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string | null
          id: string
          order_index: number
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_progress: {
        Row: {
          admin_locked: boolean
          admin_notes: string | null
          completed_orders: number
          created_at: string
          current_cycle: number
          discount_status: string
          discount_unlocked_at: string | null
          discount_used_at: string | null
          discount_used_on_order_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_locked?: boolean
          admin_notes?: string | null
          completed_orders?: number
          created_at?: string
          current_cycle?: number
          discount_status?: string
          discount_unlocked_at?: string | null
          discount_used_at?: string | null
          discount_used_on_order_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_locked?: boolean
          admin_notes?: string | null
          completed_orders?: number
          created_at?: string
          current_cycle?: number
          discount_status?: string
          discount_unlocked_at?: string | null
          discount_used_at?: string | null
          discount_used_on_order_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_progress_discount_used_on_order_id_fkey"
            columns: ["discount_used_on_order_id"]
            isOneToOne: false
            referencedRelation: "plaque_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_bridge_config: {
        Row: {
          bridge_api_key: string | null
          bridge_url: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_global_sync_at: string | null
          sync_interval_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          bridge_api_key?: string | null
          bridge_url: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_global_sync_at?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          bridge_api_key?: string | null
          bridge_url?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_global_sync_at?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      open_positions: {
        Row: {
          created_at: string | null
          current_price: number | null
          id: string
          last_updated: string | null
          mt5_ticket: number
          open_price: number
          open_time: string
          prop_firm_id: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          unrealized_pnl: number | null
          user_id: string
          volume: number
        }
        Insert: {
          created_at?: string | null
          current_price?: number | null
          id?: string
          last_updated?: string | null
          mt5_ticket: number
          open_price: number
          open_time: string
          prop_firm_id: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          trade_type: string
          unrealized_pnl?: number | null
          user_id: string
          volume: number
        }
        Update: {
          created_at?: string | null
          current_price?: number | null
          id?: string
          last_updated?: string | null
          mt5_ticket?: number
          open_price?: number
          open_time?: string
          prop_firm_id?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          unrealized_pnl?: number | null
          user_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "open_positions_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_type: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string | null
          status_type: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_type?: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status?: string | null
          status_type?: string
        }
        Update: {
          changed_by?: string | null
          changed_by_type?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string | null
          status_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "plaque_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_rewards: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          discount_cap: number
          discount_percentage: number
          id: string
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          status: string
          updated_at: string
          used_at: string | null
          used_on_order_id: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          discount_cap?: number
          discount_percentage?: number
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          used_on_order_id?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          discount_cap?: number
          discount_percentage?: number
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          used_on_order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_rewards_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_rewards_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_rewards_used_on_order_id_fkey"
            columns: ["used_on_order_id"]
            isOneToOne: false
            referencedRelation: "plaque_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number | null
          certificate_url: string
          created_at: string | null
          extracted_data: Json | null
          firm_name: string | null
          id: string
          notes: string | null
          payout_date: string | null
          prop_firm_id: string | null
          trader_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          certificate_url: string
          created_at?: string | null
          extracted_data?: Json | null
          firm_name?: string | null
          id?: string
          notes?: string | null
          payout_date?: string | null
          prop_firm_id?: string | null
          trader_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          certificate_url?: string
          created_at?: string | null
          extracted_data?: Json | null
          firm_name?: string | null
          id?: string
          notes?: string | null
          payout_date?: string | null
          prop_firm_id?: string | null
          trader_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      plaque_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ceo_action: string | null
          ceo_action_at: string | null
          ceo_action_by: string | null
          ceo_action_reason: string | null
          certificate_id: string | null
          created_at: string
          customer_confirmation_requested_at: string | null
          customer_confirmed_at: string | null
          delivered_at: string | null
          delivered_by: string | null
          delivery_city: string | null
          delivery_confirmation_code: string | null
          delivery_fee: number | null
          delivery_method: string
          delivery_status: string | null
          delivery_type: string | null
          discount_amount: number | null
          discount_code_id: string | null
          final_certificate_id: string | null
          full_name: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_status: string | null
          phone: string
          price: number | null
          pricing_id: string | null
          quantity: number
          shipped_at: string | null
          shipped_by: string | null
          shipping_address: string
          size: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ceo_action?: string | null
          ceo_action_at?: string | null
          ceo_action_by?: string | null
          ceo_action_reason?: string | null
          certificate_id?: string | null
          created_at?: string
          customer_confirmation_requested_at?: string | null
          customer_confirmed_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_city?: string | null
          delivery_confirmation_code?: string | null
          delivery_fee?: number | null
          delivery_method: string
          delivery_status?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          final_certificate_id?: string | null
          full_name: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_status?: string | null
          phone: string
          price?: number | null
          pricing_id?: string | null
          quantity?: number
          shipped_at?: string | null
          shipped_by?: string | null
          shipping_address: string
          size: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ceo_action?: string | null
          ceo_action_at?: string | null
          ceo_action_by?: string | null
          ceo_action_reason?: string | null
          certificate_id?: string | null
          created_at?: string
          customer_confirmation_requested_at?: string | null
          customer_confirmed_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_city?: string | null
          delivery_confirmation_code?: string | null
          delivery_fee?: number | null
          delivery_method?: string
          delivery_status?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          final_certificate_id?: string | null
          full_name?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_status?: string | null
          phone?: string
          price?: number | null
          pricing_id?: string | null
          quantity?: number
          shipped_at?: string | null
          shipped_by?: string | null
          shipping_address?: string
          size?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaque_orders_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plaque_orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plaque_orders_final_certificate_id_fkey"
            columns: ["final_certificate_id"]
            isOneToOne: false
            referencedRelation: "final_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plaque_orders_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "plaque_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      plaque_payments: {
        Row: {
          amount: number
          created_at: string
          email: string
          full_name: string
          id: string
          order_id: string
          payment_method: string
          phone: string
          proof_image_url: string | null
          received_at: string | null
          received_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          full_name: string
          id?: string
          order_id: string
          payment_method: string
          phone: string
          proof_image_url?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          order_id?: string
          payment_method?: string
          phone?: string
          proof_image_url?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaque_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "plaque_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      plaque_prices: {
        Row: {
          created_at: string
          dimensions: string
          express_surcharge: number | null
          id: string
          is_active: boolean
          price: number
          size_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimensions: string
          express_surcharge?: number | null
          id?: string
          is_active?: boolean
          price?: number
          size_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimensions?: string
          express_surcharge?: number | null
          id?: string
          is_active?: boolean
          price?: number
          size_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          balance: number
          created_at: string
          equity: number
          free_margin: number | null
          id: string
          margin: number | null
          margin_level: number | null
          open_positions_count: number | null
          profit: number | null
          prop_firm_id: string | null
          snapshot_type: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          equity?: number
          free_margin?: number | null
          id?: string
          margin?: number | null
          margin_level?: number | null
          open_positions_count?: number | null
          profit?: number | null
          prop_firm_id?: string | null
          snapshot_type?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          equity?: number
          free_margin?: number | null
          id?: string
          margin?: number | null
          margin_level?: number | null
          open_positions_count?: number | null
          profit?: number | null
          prop_firm_id?: string | null
          snapshot_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          telegram_chat_id: number | null
          telegram_link_code: string | null
          telegram_linked_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          telegram_chat_id?: number | null
          telegram_link_code?: string | null
          telegram_linked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          telegram_chat_id?: number | null
          telegram_link_code?: string | null
          telegram_linked_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prop_firm_certificate_sizes: {
        Row: {
          certificate_type: string
          created_at: string
          id: string
          prop_firm_name: string
          size: string
          updated_at: string
        }
        Insert: {
          certificate_type: string
          created_at?: string
          id?: string
          prop_firm_name: string
          size: string
          updated_at?: string
        }
        Update: {
          certificate_type?: string
          created_at?: string
          id?: string
          prop_firm_name?: string
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      prop_firms: {
        Row: {
          account_number: string | null
          account_status: Database["public"]["Enums"]["account_status"] | null
          account_type: Database["public"]["Enums"]["prop_firm_account_type"]
          auto_sync_enabled: boolean | null
          balance: number | null
          bridge_api_key: string | null
          bridge_url: string | null
          consistency_percentage: number | null
          created_at: string
          current_profit: number | null
          dashboard_screenshot_url: string | null
          encryption_iv: string | null
          equity: number | null
          funded_balance: number | null
          id: string
          investor_password: string | null
          investor_password_encrypted: string | null
          last_sync_at: string | null
          mt5_login: string | null
          mt5_server: string | null
          name: string
          profit_target: number | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          account_type?: Database["public"]["Enums"]["prop_firm_account_type"]
          auto_sync_enabled?: boolean | null
          balance?: number | null
          bridge_api_key?: string | null
          bridge_url?: string | null
          consistency_percentage?: number | null
          created_at?: string
          current_profit?: number | null
          dashboard_screenshot_url?: string | null
          encryption_iv?: string | null
          equity?: number | null
          funded_balance?: number | null
          id?: string
          investor_password?: string | null
          investor_password_encrypted?: string | null
          last_sync_at?: string | null
          mt5_login?: string | null
          mt5_server?: string | null
          name: string
          profit_target?: number | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          account_type?: Database["public"]["Enums"]["prop_firm_account_type"]
          auto_sync_enabled?: boolean | null
          balance?: number | null
          bridge_api_key?: string | null
          bridge_url?: string | null
          consistency_percentage?: number | null
          created_at?: string
          current_profit?: number | null
          dashboard_screenshot_url?: string | null
          encryption_iv?: string | null
          equity?: number | null
          funded_balance?: number | null
          id?: string
          investor_password?: string | null
          investor_password_encrypted?: string | null
          last_sync_at?: string | null
          mt5_login?: string | null
          mt5_server?: string | null
          name?: string
          profit_target?: number | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_links: {
        Row: {
          banned_at: string | null
          banned_reason: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          qualified_referrals: number
          total_signups: number
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_reason?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          qualified_referrals?: number
          total_signups?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_reason?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          qualified_referrals?: number
          total_signups?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          first_order_at: string | null
          first_order_id: string | null
          id: string
          ip_address: string | null
          is_qualified: boolean
          is_suspicious: boolean
          referral_link_id: string
          referred_user_id: string
          referrer_id: string
          signup_at: string
          suspicious_reason: string | null
        }
        Insert: {
          created_at?: string
          first_order_at?: string | null
          first_order_id?: string | null
          id?: string
          ip_address?: string | null
          is_qualified?: boolean
          is_suspicious?: boolean
          referral_link_id: string
          referred_user_id: string
          referrer_id: string
          signup_at?: string
          suspicious_reason?: string | null
        }
        Update: {
          created_at?: string
          first_order_at?: string | null
          first_order_id?: string | null
          id?: string
          ip_address?: string | null
          is_qualified?: boolean
          is_suspicious?: boolean
          referral_link_id?: string
          referred_user_id?: string
          referrer_id?: string
          signup_at?: string
          suspicious_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_first_order_id_fkey"
            columns: ["first_order_id"]
            isOneToOne: false
            referencedRelation: "plaque_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          campaign_name: string | null
          clicks: number | null
          comments: number | null
          created_at: string
          created_by: string | null
          id: string
          likes: number | null
          platform: string
          post_title: string | null
          post_url: string
          posted_at: string
          shares: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          campaign_name?: string | null
          clicks?: number | null
          comments?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number | null
          platform: string
          post_title?: string | null
          post_url: string
          posted_at?: string
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          campaign_name?: string | null
          clicks?: number | null
          comments?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number | null
          platform?: string
          post_title?: string | null
          post_url?: string
          posted_at?: string
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_token: string | null
          invited_at: string
          name: string
          role_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_token?: string | null
          invited_at?: string
          name: string
          role_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_token?: string | null
          invited_at?: string
          name?: string
          role_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_reminders: {
        Row: {
          assigned_to: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          lesson_id: string | null
          progress_percentage: number | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      support_group_config: {
        Row: {
          created_at: string | null
          group_chat_id: number
          group_name: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_chat_id: number
          group_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_chat_id?: number
          group_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          escalated: boolean | null
          escalated_at: string | null
          escalated_by: string | null
          id: string
          message: string
          priority: string
          status: string
          subject: string
          telegram_thread_id: string | null
          telegram_user_chat_id: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_by?: string | null
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          telegram_thread_id?: string | null
          telegram_user_chat_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_by?: string | null
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          telegram_thread_id?: string | null
          telegram_user_chat_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          positions_synced: number | null
          prop_firm_id: string
          started_at: string | null
          status: string
          trades_synced: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          positions_synced?: number | null
          prop_firm_id: string
          started_at?: string | null
          status: string
          trades_synced?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          positions_synced?: number | null
          prop_firm_id?: string
          started_at?: string | null
          status?: string
          trades_synced?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      telegram_broadcast_logs: {
        Row: {
          broadcast_id: string
          error_message: string | null
          id: string
          recipient_chat_id: number
          recipient_email: string | null
          sent_at: string
          status: string
        }
        Insert: {
          broadcast_id: string
          error_message?: string | null
          id?: string
          recipient_chat_id: number
          recipient_email?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          broadcast_id?: string
          error_message?: string | null
          id?: string
          recipient_chat_id?: number
          recipient_email?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_broadcast_logs_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "telegram_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_broadcasts: {
        Row: {
          created_at: string
          created_by: string | null
          failed_sends: number | null
          id: string
          image_url: string | null
          message: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          successful_sends: number | null
          target_audience: string
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failed_sends?: number | null
          id?: string
          image_url?: string | null
          message: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          successful_sends?: number | null
          target_audience?: string
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failed_sends?: number | null
          id?: string
          image_url?: string | null
          message?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          successful_sends?: number | null
          target_audience?: string
          title?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_otp: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          link_token: string
          otp_code: string
          purpose: string
          telegram_chat_id: number | null
          used: boolean | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          link_token: string
          otp_code: string
          purpose?: string
          telegram_chat_id?: number | null
          used?: boolean | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          link_token?: string
          otp_code?: string
          purpose?: string
          telegram_chat_id?: number | null
          used?: boolean | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      telegram_support_agents: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          linked_at: string | null
          pending_reply_ticket_id: string | null
          role: string
          staff_id: string | null
          telegram_chat_id: number | null
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          pending_reply_ticket_id?: string | null
          role?: string
          staff_id?: string | null
          telegram_chat_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          linked_at?: string | null
          pending_reply_ticket_id?: string | null
          role?: string
          staff_id?: string | null
          telegram_chat_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_support_agents_pending_reply_ticket_id_fkey"
            columns: ["pending_reply_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_support_agents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved: boolean
          company: string | null
          created_at: string
          id: string
          name: string
          quote: string
          rating: number
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          company?: string | null
          created_at?: string
          id?: string
          name: string
          quote: string
          rating?: number
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          company?: string | null
          created_at?: string
          id?: string
          name?: string
          quote?: string
          rating?: number
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          created_at: string | null
          has_attachment: boolean | null
          id: string
          message: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          telegram_message_id: number | null
          ticket_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string | null
          has_attachment?: boolean | null
          id?: string
          message: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
          telegram_message_id?: number | null
          ticket_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string | null
          has_attachment?: boolean | null
          id?: string
          message?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          telegram_message_id?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          close_price: number | null
          close_time: string | null
          created_at: string
          cycle_id: string | null
          emotion: string | null
          emotion_tag: string | null
          entry_price: number | null
          id: string
          is_synced: boolean | null
          mistake_tags: string[] | null
          mt5_ticket: number | null
          notes: string | null
          open_time: string | null
          pair: string
          profit: number
          prop_firm_id: string | null
          rule_broken: boolean | null
          screenshot_url: string | null
          screenshots: string[] | null
          session: string | null
          stop_loss: number | null
          take_profit: number | null
          trade_date: string
          trade_type: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          volume: number | null
        }
        Insert: {
          close_price?: number | null
          close_time?: string | null
          created_at?: string
          cycle_id?: string | null
          emotion?: string | null
          emotion_tag?: string | null
          entry_price?: number | null
          id?: string
          is_synced?: boolean | null
          mistake_tags?: string[] | null
          mt5_ticket?: number | null
          notes?: string | null
          open_time?: string | null
          pair: string
          profit: number
          prop_firm_id?: string | null
          rule_broken?: boolean | null
          screenshot_url?: string | null
          screenshots?: string[] | null
          session?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          trade_date: string
          trade_type?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          volume?: number | null
        }
        Update: {
          close_price?: number | null
          close_time?: string | null
          created_at?: string
          cycle_id?: string | null
          emotion?: string | null
          emotion_tag?: string | null
          entry_price?: number | null
          id?: string
          is_synced?: boolean | null
          mistake_tags?: string[] | null
          mt5_ticket?: number | null
          notes?: string | null
          open_time?: string | null
          pair?: string
          profit?: number
          prop_firm_id?: string | null
          rule_broken?: boolean | null
          screenshot_url?: string | null
          screenshots?: string[] | null
          session?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          trade_date?: string
          trade_type?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "account_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          account_name: string
          created_at: string
          encryption_iv: string | null
          id: string
          investor_password_encrypted: string | null
          is_active: boolean | null
          last_sync_at: string | null
          mt5_login: string
          mt5_server: string
          prop_firm_id: string | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          encryption_iv?: string | null
          id?: string
          investor_password_encrypted?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          mt5_login: string
          mt5_server: string
          prop_firm_id?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          encryption_iv?: string | null
          id?: string
          investor_password_encrypted?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          mt5_login?: string
          mt5_server?: string
          prop_firm_id?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_accounts_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_strategies: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          rule_text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text?: string
          user_id?: string
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
          telegram_chat_id: number
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_ticket_id?: string | null
          id?: string
          selected_category?: string | null
          session_state?: string | null
          telegram_chat_id: number
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_ticket_id?: string | null
          id?: string
          selected_category?: string | null
          session_state?: string | null
          telegram_chat_id?: number
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_telegram_sessions_current_ticket_id_fkey"
            columns: ["current_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      generate_referral_code: { Args: never; Returns: string }
      get_active_cycle: { Args: { _prop_firm_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ceo: { Args: { _user_id: string }; Returns: boolean }
      link_staff_account: {
        Args: { _user_email: string; _user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action_type: string
          _new_value: Json
          _old_value: Json
          _reason: string
          _target_id: string
          _target_table: string
        }
        Returns: string
      }
      recalculate_prop_firm_financials: {
        Args: { _prop_firm_id: string }
        Returns: undefined
      }
      staff_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "In Progress" | "Passed" | "Failed"
      account_type: "Personal" | "Evaluation" | "Funded"
      app_role: "admin" | "user"
      prop_firm_account_type:
        | "Personal"
        | "Funded"
        | "Evaluation 1"
        | "Evaluation 2"
        | "Evaluation 3"
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
      account_status: ["In Progress", "Passed", "Failed"],
      account_type: ["Personal", "Evaluation", "Funded"],
      app_role: ["admin", "user"],
      prop_firm_account_type: [
        "Personal",
        "Funded",
        "Evaluation 1",
        "Evaluation 2",
        "Evaluation 3",
      ],
    },
  },
} as const
