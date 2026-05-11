export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'admin' | 'staff' | 'user'

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: AppRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: AppRole
          created_at?: string
        }
      }
      staff: {
        Row: {
          id: number
          email: string
          name: string
          role_id: number | null
          status: string
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          email: string
          name: string
          role_id?: number | null
          status?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          email?: string
          name?: string
          role_id?: number | null
          status?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_roles: {
        Row: {
          id: number
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: number
          email: string
          user_id: string | null
          token_hash: string
          created_at: string
          expires_at: string
          revoked: boolean
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: number
          email: string
          user_id?: string | null
          token_hash: string
          created_at?: string
          expires_at: string
          revoked?: boolean
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: number
          email?: string
          user_id?: string | null
          token_hash?: string
          created_at?: string
          expires_at?: string
          revoked?: boolean
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      auth_challenges: {
        Row: {
          id: string
          user_id: string | null
          email: string
          type: string
          channel: string
          code_hash: string
          token: string
          expires_at: string
          used: boolean
          metadata: Json
          created_at: string
          attempt_count: number
          locked_until: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          type: string
          channel: string
          code_hash: string
          token: string
          expires_at: string
          used?: boolean
          metadata?: Json
          created_at?: string
          attempt_count?: number
          locked_until?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          type?: string
          channel?: string
          code_hash?: string
          token?: string
          expires_at?: string
          used?: boolean
          metadata?: Json
          created_at?: string
          attempt_count?: number
          locked_until?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
      link_staff_account: {
        Args: {
          _user_id: string
          _user_email: string
        }
        Returns: boolean
      }
      link_staff_account_secure: {
        Args: {
          _user_id: string
          _user_email: string
          _admin_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: AppRole
    }
  }
}
