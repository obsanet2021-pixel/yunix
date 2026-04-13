import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Calendar, DollarSign, TrendingUp, Clock, FileText, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AccountCycle {
  id: string;
  cycle_number: number;
  starting_balance: number;
  ending_balance: number | null;
  withdrawn_amount: number;
  status: 'active' | 'closed';
  start_date: string;
  end_date: string | null;
  profit_target: number | null;
  payout_proof_url: string | null;
  migration_note: string | null;
  trade_count?: number;
  cycle_pnl?: number;
  win_rate?: number;
}

interface CycleViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propFirmId: string;
  propFirmName: string;
  fundedBalance: number;
}

export function CycleViewModal({
  open,
  onOpenChange,
  propFirmId,
  propFirmName,
  fundedBalance
}: CycleViewModalProps) {
  const [cycles, setCycles] = useState<AccountCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchCycles();
    }
  }, [open, propFirmId]);

  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      // Fetch cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from("account_cycles")
        .select("*")
        .eq("prop_firm_id", propFirmId)
        .order("cycle_number", { ascending: false });

      if (cyclesError) throw cyclesError;

      // For each cycle, fetch trade stats
      const cyclesWithStats = await Promise.all(
        (cyclesData || []).map(async (cycle) => {
          const { data: trades } = await supabase
            .from("trades")
            .select("profit")
            .eq("cycle_id", cycle.id);

          const tradeCount = trades?.length || 0;
          const cyclePnl = trades?.reduce((sum, t) => sum + (t.profit || 0), 0) || 0;
          const winCount = trades?.filter(t => t.profit > 0).length || 0;
          const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;

          return {
            ...cycle,
            trade_count: tradeCount,
            cycle_pnl: cyclePnl,
            win_rate: winRate
          } as AccountCycle;
        })
      );

      setCycles(cyclesWithStats);
    } catch (error) {
      console.error("Failed to fetch cycles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalWithdrawn = cycles.reduce((sum, c) => sum + (c.withdrawn_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Account Cycles - {propFirmName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Funded Balance</div>
              <div className="text-lg font-mono font-bold text-primary">
                ${fundedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Total Withdrawn</div>
              <div className="text-lg font-mono font-bold text-green-500">
                ${totalWithdrawn.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No cycles found for this account.
          </div>
        ) : (
          <div className="space-y-3">
            {cycles.map((cycle) => (
              <Card 
                key={cycle.id} 
                className={`${cycle.status === 'active' ? 'border-primary/50 bg-primary/5' : 'bg-muted/20'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Cycle #{cycle.cycle_number}</span>
                      <Badge 
                        variant={cycle.status === 'active' ? 'default' : 'secondary'}
                        className={cycle.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/50' : ''}
                      >
                        {cycle.status === 'active' ? 'Active' : 'Closed'}
                      </Badge>
                    </div>
                    {cycle.migration_note && (
                      <span title={cycle.migration_note}>
                        <FileText className="h-4 w-4 text-amber-500" />
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        Starting
                      </div>
                      <div className="font-mono">
                        ${cycle.starting_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        P&L
                      </div>
                      <div className={`font-mono ${(cycle.cycle_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(cycle.cycle_pnl || 0) >= 0 ? '+' : ''}${(cycle.cycle_pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Trades</div>
                      <div className="font-mono">{cycle.trade_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                      <div className="font-mono">{(cycle.win_rate || 0).toFixed(1)}%</div>
                    </div>
                  </div>

                  {cycle.status === 'closed' && (
                    <>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Ending Balance</div>
                          <div className="font-mono">
                            ${(cycle.ending_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Withdrawn</div>
                          <div className="font-mono text-green-500">
                            ${(cycle.withdrawn_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Payout Proof Thumbnail */}
                      {cycle.payout_proof_url && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Image className="h-3 w-3" />
                            Payout Proof
                          </div>
                          <div 
                            className="w-16 h-16 rounded-lg border border-border/50 overflow-hidden cursor-pointer hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all group"
                            onClick={() => setPreviewImage(cycle.payout_proof_url)}
                          >
                            <img 
                              src={cycle.payout_proof_url} 
                              alt="Payout proof" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Started: {format(new Date(cycle.start_date), 'MMM d, yyyy')}
                    </div>
                    {cycle.end_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ended: {format(new Date(cycle.end_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>

      {/* Full-size Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
          <div className="relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={previewImage || ''} 
              alt="Payout proof" 
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
