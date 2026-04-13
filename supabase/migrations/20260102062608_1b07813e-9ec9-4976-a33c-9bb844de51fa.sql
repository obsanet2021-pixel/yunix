-- Add MT5 fields to prop_firms table
ALTER TABLE prop_firms
ADD COLUMN IF NOT EXISTS investor_password TEXT,
ADD COLUMN IF NOT EXISTS mt5_server TEXT,
ADD COLUMN IF NOT EXISTS mt5_login TEXT;

-- Add MT5 fields to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS trade_type TEXT,
ADD COLUMN IF NOT EXISTS volume NUMERIC,
ADD COLUMN IF NOT EXISTS entry_price NUMERIC,
ADD COLUMN IF NOT EXISTS take_profit NUMERIC,
ADD COLUMN IF NOT EXISTS stop_loss NUMERIC,
ADD COLUMN IF NOT EXISTS close_price NUMERIC,
ADD COLUMN IF NOT EXISTS open_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS close_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mt5_ticket BIGINT,
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN prop_firms.investor_password IS 'MT5 investor password for read-only access';
COMMENT ON COLUMN prop_firms.mt5_server IS 'MT5 broker server name (e.g., ICMarkets-MT5)';
COMMENT ON COLUMN prop_firms.mt5_login IS 'MT5 login ID if different from account_number';
COMMENT ON COLUMN trades.trade_type IS 'Buy or Sell';
COMMENT ON COLUMN trades.volume IS 'Lot size';
COMMENT ON COLUMN trades.entry_price IS 'Trade open price';
COMMENT ON COLUMN trades.take_profit IS 'Take profit price level';
COMMENT ON COLUMN trades.stop_loss IS 'Stop loss price level';
COMMENT ON COLUMN trades.close_price IS 'Trade close price';
COMMENT ON COLUMN trades.open_time IS 'Exact trade open timestamp';
COMMENT ON COLUMN trades.close_time IS 'Exact trade close timestamp';
COMMENT ON COLUMN trades.mt5_ticket IS 'MT5 position ticket ID';
COMMENT ON COLUMN trades.is_synced IS 'Whether trade was imported from MT5';