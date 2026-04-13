import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AccountCycle {
  id: string;
  prop_firm_id: string;
  cycle_number: number;
  starting_balance: number;
  ending_balance: number | null;
  withdrawn_amount: number;
  status: 'active' | 'closed';
  start_date: string;
  end_date: string | null;
  profit_target: number | null;
}

interface CycleStats {
  activeCycle: AccountCycle | null;
  totalWithdrawn: number;
  cycleCount: number;
  cyclePnl: number;
}

export function useAccountCycles(propFirmId: string | null) {
  const [cycles, setCycles] = useState<AccountCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<AccountCycle | null>(null);
  const [stats, setStats] = useState<CycleStats>({
    activeCycle: null,
    totalWithdrawn: 0,
    cycleCount: 0,
    cyclePnl: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (propFirmId) {
      fetchCycles(propFirmId);
    } else {
      setCycles([]);
      setActiveCycle(null);
      setStats({
        activeCycle: null,
        totalWithdrawn: 0,
        cycleCount: 0,
        cyclePnl: 0
      });
    }
  }, [propFirmId]);

  const fetchCycles = async (firmId: string) => {
    setIsLoading(true);
    try {
      const { data: cyclesData, error } = await supabase
        .from("account_cycles")
        .select("*")
        .eq("prop_firm_id", firmId)
        .order("cycle_number", { ascending: false });

      if (error) throw error;

      const typedCycles = (cyclesData || []) as AccountCycle[];
      setCycles(typedCycles);

      const active = typedCycles.find(c => c.status === 'active') || null;
      setActiveCycle(active);

      // Calculate stats
      const totalWithdrawn = typedCycles.reduce((sum, c) => sum + (c.withdrawn_amount || 0), 0);

      // Get active cycle P&L from trades
      let cyclePnl = 0;
      if (active) {
        const { data: trades } = await supabase
          .from("trades")
          .select("profit")
          .eq("cycle_id", active.id);
        
        cyclePnl = trades?.reduce((sum, t) => sum + (t.profit || 0), 0) || 0;
      }

      setStats({
        activeCycle: active,
        totalWithdrawn,
        cycleCount: typedCycles.length,
        cyclePnl
      });
    } catch (error) {
      console.error("Failed to fetch cycles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveCycleId = async (firmId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("account_cycles")
      .select("id")
      .eq("prop_firm_id", firmId)
      .eq("status", "active")
      .single();
    
    if (error || !data) return null;
    return data.id;
  };

  const refresh = () => {
    if (propFirmId) {
      fetchCycles(propFirmId);
    }
  };

  return {
    cycles,
    activeCycle,
    stats,
    isLoading,
    getActiveCycleId,
    refresh
  };
}

export function useAllCyclesForUser() {
  const [cyclesByFirm, setCyclesByFirm] = useState<Map<string, AccountCycle[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllCycles();
  }, []);

  const fetchAllCycles = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("account_cycles")
        .select("*")
        .eq("user_id", user.id)
        .order("cycle_number", { ascending: false });

      if (error) throw error;

      // Group by prop_firm_id
      const grouped = new Map<string, AccountCycle[]>();
      (data || []).forEach(cycle => {
        const existing = grouped.get(cycle.prop_firm_id) || [];
        existing.push(cycle as AccountCycle);
        grouped.set(cycle.prop_firm_id, existing);
      });

      setCyclesByFirm(grouped);
    } catch (error) {
      console.error("Failed to fetch all cycles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCyclesForFirm = (propFirmId: string): AccountCycle[] => {
    return cyclesByFirm.get(propFirmId) || [];
  };

  const getActiveCycleForFirm = (propFirmId: string): AccountCycle | null => {
    const cycles = getCyclesForFirm(propFirmId);
    return cycles.find(c => c.status === 'active') || null;
  };

  return {
    cyclesByFirm,
    getCyclesForFirm,
    getActiveCycleForFirm,
    isLoading,
    refresh: fetchAllCycles
  };
}
