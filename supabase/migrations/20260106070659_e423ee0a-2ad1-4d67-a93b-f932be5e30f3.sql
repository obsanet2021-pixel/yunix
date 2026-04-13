-- Enable real-time on trades table (open_positions already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;