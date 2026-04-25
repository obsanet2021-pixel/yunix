import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Trade {
  id: string;
  pair: string;
  profit: number | null;
  session: string | null;
  emotion: string | null;
  notes: string | null;
  trade_date: string;
  prop_firm_id: string | null;
  cycle_id: string | null;
  screenshot_url: string | null;
  screenshots: string[] | null;
  video_url: string | null;
  trade_type: string | null;
  volume: number | null;
  entry_price: number | null;
  close_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  open_time: string | null;
  close_time: string | null;
  mt5_ticket: number | null;
  is_synced: boolean | null;
  user_id: string;
  created_at: string;
}

export function useRealtimeTrades(userId: string | null) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    // Fetch trades directly from trades table
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("trade_date", { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
    } else {
      setTrades((data as Trade[]) || []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setTrades(prev => [payload.new as Trade, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setTrades(prev => 
            prev.map(trade => 
              trade.id === payload.new.id ? payload.new as Trade : trade
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setTrades(prev => prev.filter(trade => trade.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { trades, isLoading, refetch: fetchTrades };
}
