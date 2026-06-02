/**
 * usePlaybooks.ts
 *
 * Central hook for all playbook operations.
 * Computes live win rate, total profit, and trade count
 * from the actual trades table — never trusts the denormalized counters.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Playbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  entry_rules: string[];
  risk_per_trade: number | null;
  max_daily_loss: number | null;
  preferred_sessions: string[];
  preferred_pairs: string[];
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed from live trades
  total_trades?: number;
  winning_trades?: number;
  total_profit?: number;
}

export interface PlaybookStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit: number;
  avg_profit: number;
  best_trade: number;
  worst_trade: number;
}

export interface PlaybookFormData {
  name: string;
  description: string;
  entry_rules: string[];
  risk_per_trade: string;
  max_daily_loss: string;
  preferred_sessions: string[];
  preferred_pairs: string[];
  color: string;
}

export const EMPTY_PLAYBOOK_FORM: PlaybookFormData = {
  name: '',
  description: '',
  entry_rules: [],
  risk_per_trade: '',
  max_daily_loss: '',
  preferred_sessions: [],
  preferred_pairs: [],
  color: 'blue',
};

export const PLAYBOOK_COLORS = [
  { value: 'blue',   label: 'Blue',   class: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { value: 'green',  label: 'Green',  class: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { value: 'amber',  label: 'Amber',  class: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'red',    label: 'Red',    class: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30' },
  { value: 'pink',   label: 'Pink',   class: 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30' },
] as const;

export function getPlaybookColorClass(color: string): string {
  return PLAYBOOK_COLORS.find(c => c.value === color)?.class
    ?? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
}

export function usePlaybooks() {
  const { toast } = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlaybooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pbs, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;

      // Compute live stats from trades for each playbook
      const { data: trades } = await supabase
        .from('trades')
        .select('playbook_id, profit')
        .eq('user_id', user.id)
        .not('playbook_id', 'is', null) as any;

      const statsMap: Record<string, { total: number; wins: number; profit: number }> = {};
      (trades ?? []).forEach((t: any) => {
        if (!t.playbook_id) return;
        if (!statsMap[t.playbook_id]) statsMap[t.playbook_id] = { total: 0, wins: 0, profit: 0 };
        statsMap[t.playbook_id].total++;
        if (Number(t.profit) > 0) statsMap[t.playbook_id].wins++;
        statsMap[t.playbook_id].profit += Number(t.profit);
      });

      const enriched = (pbs ?? []).map((pb: Playbook) => ({
        ...pb,
        total_trades: statsMap[pb.id]?.total ?? 0,
        winning_trades: statsMap[pb.id]?.wins ?? 0,
        total_profit: statsMap[pb.id]?.profit ?? 0,
      }));

      setPlaybooks(enriched);
    } catch (err) {
      console.error('[usePlaybooks] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaybooks(); }, [fetchPlaybooks]);

  // ── Create ──────────────────────────────────────────────────────────────

  async function createPlaybook(form: PlaybookFormData): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase.from('playbooks').insert({
        user_id: user.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        entry_rules: form.entry_rules.filter(r => r.trim()),
        risk_per_trade: form.risk_per_trade ? parseFloat(form.risk_per_trade) : null,
        max_daily_loss: form.max_daily_loss ? parseFloat(form.max_daily_loss) : null,
        preferred_sessions: form.preferred_sessions,
        preferred_pairs: form.preferred_pairs.map(p => p.trim().toUpperCase()).filter(Boolean),
        color: form.color,
      }) as any);

      if (error) throw error;
      toast({ title: 'Playbook created', description: `"${form.name}" is ready to use` });
      await fetchPlaybooks();
      return true;
    } catch (err) {
      console.error('[usePlaybooks] create error:', err);
      toast({ title: 'Error', description: 'Failed to create playbook', variant: 'destructive' });
      return false;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────

  async function updatePlaybook(id: string, form: PlaybookFormData): Promise<boolean> {
    try {
      const { error } = await (supabase.from('playbooks').update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        entry_rules: form.entry_rules.filter(r => r.trim()),
        risk_per_trade: form.risk_per_trade ? parseFloat(form.risk_per_trade) : null,
        max_daily_loss: form.max_daily_loss ? parseFloat(form.max_daily_loss) : null,
        preferred_sessions: form.preferred_sessions,
        preferred_pairs: form.preferred_pairs.map(p => p.trim().toUpperCase()).filter(Boolean),
        color: form.color,
      }).eq('id', id) as any);

      if (error) throw error;
      toast({ title: 'Playbook updated' });
      await fetchPlaybooks();
      return true;
    } catch (err) {
      console.error('[usePlaybooks] update error:', err);
      toast({ title: 'Error', description: 'Failed to update playbook', variant: 'destructive' });
      return false;
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async function deletePlaybook(id: string): Promise<boolean> {
    try {
      // Unlink trades first (FK is ON DELETE SET NULL so this is automatic, but be explicit)
      const { error } = await (supabase.from('playbooks').delete().eq('id', id) as any);
      if (error) throw error;
      toast({ title: 'Playbook deleted' });
      await fetchPlaybooks();
      return true;
    } catch (err) {
      console.error('[usePlaybooks] delete error:', err);
      toast({ title: 'Error', description: 'Failed to delete playbook', variant: 'destructive' });
      return false;
    }
  }

  // ── Detailed stats for a single playbook ────────────────────────────────

  async function getPlaybookStats(playbookId: string): Promise<PlaybookStats | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: trades } = await (supabase
        .from('trades')
        .select('profit')
        .eq('user_id', user.id)
        .eq('playbook_id', playbookId) as any);

      if (!trades || trades.length === 0) {
        return { total_trades: 0, winning_trades: 0, losing_trades: 0, win_rate: 0, total_profit: 0, avg_profit: 0, best_trade: 0, worst_trade: 0 };
      }

      const profits = trades.map((t: any) => Number(t.profit));
      const wins = profits.filter(p => p > 0);
      const losses = profits.filter(p => p < 0);
      const total = profits.reduce((a, b) => a + b, 0);

      return {
        total_trades: profits.length,
        winning_trades: wins.length,
        losing_trades: losses.length,
        win_rate: profits.length > 0 ? (wins.length / profits.length) * 100 : 0,
        total_profit: total,
        avg_profit: profits.length > 0 ? total / profits.length : 0,
        best_trade: profits.length > 0 ? Math.max(...profits) : 0,
        worst_trade: profits.length > 0 ? Math.min(...profits) : 0,
      };
    } catch {
      return null;
    }
  }

  return {
    playbooks,
    isLoading,
    fetchPlaybooks,
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
    getPlaybookStats,
  };
}
