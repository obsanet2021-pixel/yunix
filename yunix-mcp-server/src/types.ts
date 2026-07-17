// Domain types mirroring Yunix's Supabase schema.
// Adjust field names/types here if your actual migrations differ —
// this is the single place the rest of the server depends on.

export interface Trade {
  id: string;
  user_id: string;
  prop_firm_id: string | null;
  cycle_id: string | null;
  pair: string;
  profit: number;
  session: string | null;
  emotion: string | null;
  emotion_tag: string | null;
  rule_broken: boolean | null;
  mistake_tags: string[] | null;
  notes: string | null;
  trade_date: string;
  created_at: string;
  updated_at: string;
  // MT5 sync fields (read-only for now)
  trade_type: string | null;
  volume: number | null;
  entry_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  close_price: number | null;
  open_time: string | null;
  close_time: string | null;
  mt5_ticket: number | null;
  is_synced: boolean | null;
}

export interface PropFirm {
  id: string;
  user_id: string;
  name: string;
  account_number: string | null;
  balance: number | null;
  equity: number | null;
  profit_target: number | null;
  current_profit: number | null;
  consistency_percentage: number | null;
  dashboard_screenshot_url: string | null;
  account_type: "Personal" | "Funded" | "Evaluation 1" | "Evaluation 2";
  funded_balance: number | null;
  // MT5 fields (read-only for now)
  investor_password: string | null;
  investor_password_encrypted: string | null;
  encryption_iv: string | null;
  mt5_server: string | null;
  mt5_login: string | null;
  bridge_url: string | null;
  bridge_api_key: string | null;
  last_sync_at: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountCycle {
  id: string;
  prop_firm_id: string;
  user_id: string;
  cycle_number: number;
  starting_balance: number;
  ending_balance: number | null;
  withdrawn_amount: number;
  profit_target: number | null;
  max_drawdown_percentage: number | null;
  status: "active" | "closed";
  start_date: string;
  end_date: string | null;
  payout_proof_url: string | null;
  notes: string | null;
  migration_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  prop_firm_id: string | null;
  issued_date: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_r_multiple: number | null;
  best_trade_pnl: number | null;
  worst_trade_pnl: number | null;
  open_positions: number;
}

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}
