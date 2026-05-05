import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, Trash2, X, Pencil, Upload, RotateCcw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CycleFilter } from "@/components/propfirms/CycleFilter";
import { useAllCyclesForUser } from "@/hooks/useAccountCycles";
import { Checkbox } from "@/components/ui/checkbox";
import { EMOTION_TAGS, MISTAKE_TAGS, getEmotionTagStyle, getMistakeTagLabel } from "@/lib/tradeCalculations";

interface PropFirm {
  id: string;
  name: string;
  account_type?: string;
  balance?: number | null;
}

interface Trade {
  id: string;
  pair: string;
  profit: number;
  session: string | null;
  emotion: string | null;
  notes: string | null;
  trade_date: string;
  prop_firm_id: string | null;
  cycle_id: string | null;
  screenshot_url: string | null;
  screenshots: string[] | null;
  video_url: string | null;
  // MT5 fields
  trade_type: string | null;
  volume: number | null;
  entry_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  close_price: number | null;
  // Discipline tracking
  emotion_tag: string | null;
  rule_broken: boolean | null;
  mistake_tags: string[] | null;
}

export default function TradeJournal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateFilter = searchParams.get('date');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [selectedPropFirmName, setSelectedPropFirmName] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("current");
  const [filterPropFirmId, setFilterPropFirmId] = useState<string>("all");
  const { toast } = useToast();

  // Get all cycles for the user
  const { cyclesByFirm, getCyclesForFirm, getActiveCycleForFirm } = useAllCyclesForUser();

  const [formData, setFormData] = useState({
    pair: "",
    profit: "",
    session: "",
    emotion: "",
    notes: "",
    prop_firm_id: "",
    cycle_id: "",
    trade_date: new Date().toISOString().split("T")[0],
    // MT5 fields
    trade_type: "",
    volume: "",
    entry_price: "",
    take_profit: "",
    stop_loss: "",
    close_price: "",
    // Discipline tracking
    emotion_tag: "",
    rule_broken: false,
    mistake_tags: [] as string[]
  });

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchTrades();
    fetchPropFirms();
  }, [dateFilter]);

  // Real-time subscription for new trades from MT5 bridge
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('trades-journal-realtime')
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
          toast({
            title: "New trade synced",
            description: `${(payload.new as Trade).pair} - ${(payload.new as Trade).trade_type || 'Trade'}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id);

    // Apply date filter if present
    if (dateFilter) {
      query = query.eq('trade_date', dateFilter);
    }

    const { data, error } = await query.order("trade_date", { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
      return;
    }

    setTrades(data as Trade[] || []);
  };

  const fetchPropFirms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("prop_firms")
      .select("id, name, account_type, balance")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching prop firms:", error);
      return;
    }

    setPropFirms(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      let screenshotUrl = null;

      if (screenshot) {
        const fileExt = screenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("prop-firm-screenshots")
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("prop-firm-screenshots")
          .getPublicUrl(fileName);

        screenshotUrl = publicUrl;
      }

      // Get cycle_id for funded accounts - use manual selection or auto-select active cycle
      let cycleId: string | null = null;
      const propFirmId = formData.prop_firm_id === "none" ? null : formData.prop_firm_id || null;
      
      if (propFirmId) {
        const selectedFirm = propFirms.find(f => f.id === propFirmId);
        if (selectedFirm?.account_type === 'Funded') {
          // If a specific cycle is selected, use it; otherwise auto-select active cycle
          if (formData.cycle_id && formData.cycle_id !== "active") {
            cycleId = formData.cycle_id;
          } else {
            // Get active cycle for this funded account
            const { data: activeCycleData } = await supabase
              .from("account_cycles")
              .select("id")
              .eq("prop_firm_id", propFirmId)
              .eq("status", "active")
              .single();
            
            if (activeCycleData) {
              cycleId = activeCycleData.id;
            }
          }
        }
      }

      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        prop_firm_id: propFirmId,
        cycle_id: cycleId,
        pair: formData.pair,
        profit: parseFloat(formData.profit),
        session: formData.session || null,
        emotion: formData.emotion || null,
        notes: formData.notes || null,
        trade_date: formData.trade_date,
        screenshot_url: screenshotUrl,
        screenshots: screenshotUrl ? [screenshotUrl] : [],
        // MT5 fields
        trade_type: formData.trade_type || null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        close_price: formData.close_price ? parseFloat(formData.close_price) : null,
        // Discipline tracking
        emotion_tag: formData.emotion_tag || null,
        rule_broken: formData.rule_broken,
        mistake_tags: formData.mistake_tags.length > 0 ? formData.mistake_tags : null,
      });

      if (error) throw error;

      // Update prop firm's current_profit and equity if linked
      if (formData.prop_firm_id) {
        const { data: propFirm } = await supabase
          .from("prop_firms")
          .select("current_profit, balance")
          .eq("id", formData.prop_firm_id)
          .single();

        if (propFirm) {
          const tradeProfit = parseFloat(formData.profit);
          const newProfit = (propFirm.current_profit || 0) + tradeProfit;
          const newEquity = (propFirm.balance || 0) + newProfit;
          
          await supabase
            .from("prop_firms")
            .update({ 
              current_profit: newProfit,
              equity: newEquity
            })
            .eq("id", formData.prop_firm_id);
        }
      }

      toast({
        title: "Success",
        description: "Trade added successfully",
      });

      setOpen(false);
      setFormData({
        pair: "",
        profit: "",
        session: "",
        emotion: "",
        notes: "",
        prop_firm_id: "",
        cycle_id: "",
        trade_date: new Date().toISOString().split("T")[0],
        trade_type: "",
        volume: "",
        entry_price: "",
        take_profit: "",
        stop_loss: "",
        close_price: "",
        emotion_tag: "",
        rule_broken: false,
        mistake_tags: []
      });
      setScreenshot(null);
      fetchTrades();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add trade",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (trade: Trade) => {
    setTradeToEdit(trade);
    setFormData({
      pair: trade.pair,
      profit: trade.profit.toString(),
      session: trade.session || "",
      emotion: trade.emotion || "",
      notes: trade.notes || "",
      prop_firm_id: trade.prop_firm_id || "",
      cycle_id: trade.cycle_id || "",
      trade_date: trade.trade_date,
      trade_type: trade.trade_type || "",
      volume: trade.volume?.toString() || "",
      entry_price: trade.entry_price?.toString() || "",
      take_profit: trade.take_profit?.toString() || "",
      stop_loss: trade.stop_loss?.toString() || "",
      close_price: trade.close_price?.toString() || "",
      emotion_tag: trade.emotion_tag || "",
      rule_broken: trade.rule_broken || false,
      mistake_tags: trade.mistake_tags || []
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeToEdit) return;

    setIsLoading(true);

    try {
      let screenshotUrl = tradeToEdit.screenshot_url;
      let updatedScreenshots = tradeToEdit.screenshots || [];

      if (screenshot) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const fileExt = screenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("prop-firm-screenshots")
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("prop-firm-screenshots")
          .getPublicUrl(fileName);

        screenshotUrl = publicUrl;
        // Add the new screenshot to the screenshots array for the Media section
        updatedScreenshots = [...(tradeToEdit.screenshots || []), publicUrl];
      }

      const { error } = await supabase
        .from("trades")
        .update({
          pair: formData.pair,
          profit: parseFloat(formData.profit),
          session: formData.session || null,
          emotion: formData.emotion || null,
          notes: formData.notes || null,
          trade_date: formData.trade_date,
          prop_firm_id: formData.prop_firm_id === "none" ? null : formData.prop_firm_id || null,
          screenshot_url: screenshotUrl,
          screenshots: updatedScreenshots,
          // MT5 fields
          trade_type: formData.trade_type || null,
          volume: formData.volume ? parseFloat(formData.volume) : null,
          entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
          take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
          stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
          close_price: formData.close_price ? parseFloat(formData.close_price) : null,
        })
        .eq("id", tradeToEdit.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trade updated successfully",
      });

      setEditOpen(false);
      setTradeToEdit(null);
      setFormData({
        pair: "",
        profit: "",
        session: "",
        emotion: "",
        notes: "",
        prop_firm_id: "",
        cycle_id: "",
        trade_date: new Date().toISOString().split("T")[0],
        trade_type: "",
        volume: "",
        entry_price: "",
        take_profit: "",
        stop_loss: "",
        close_price: "",
        emotion_tag: "",
        rule_broken: false,
        mistake_tags: []
      });
      setScreenshot(null);
      fetchTrades();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update trade",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (trade: Trade) => {
    setTradeToDelete(trade);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tradeToDelete) return;

    try {
      // Delete the trade
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeToDelete.id);

      if (error) throw error;

      // Update prop firm profit if linked
      if (tradeToDelete.prop_firm_id) {
        const { data: propFirm } = await supabase
          .from("prop_firms")
          .select("current_profit, balance")
          .eq("id", tradeToDelete.prop_firm_id)
          .single();

        if (propFirm) {
          const newProfit = (propFirm.current_profit || 0) - Number(tradeToDelete.profit);
          const newEquity = (propFirm.balance || 0) + newProfit;
          
          await supabase
            .from("prop_firms")
            .update({ 
              current_profit: newProfit,
              equity: newEquity
            })
            .eq("id", tradeToDelete.prop_firm_id);
        }
      }

      toast({
        title: "Success",
        description: "Trade deleted successfully",
      });

      setDeleteDialogOpen(false);
      setTradeToDelete(null);
      fetchTrades();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete trade",
        variant: "destructive",
      });
    }
  };

  const clearDateFilter = () => {
    setSearchParams({});
  };

  // Get funded accounts for cycle filtering
  const fundedAccounts = propFirms.filter(f => f.account_type === 'Funded');
  const selectedFilterAccount = propFirms.find(f => f.id === filterPropFirmId);
  const isFundedFilter = selectedFilterAccount?.account_type === 'Funded';
  const filterCycles = filterPropFirmId !== 'all' ? getCyclesForFirm(filterPropFirmId) : [];
  const filterActiveCycle = filterPropFirmId !== 'all' ? getActiveCycleForFirm(filterPropFirmId) : null;

  // Filter trades by prop firm and cycle
  const displayedTrades = trades.filter(trade => {
    // Prop firm filter
    if (filterPropFirmId !== 'all' && trade.prop_firm_id !== filterPropFirmId) {
      return false;
    }
    
    // Cycle filter (only for funded accounts)
    if (isFundedFilter && selectedCycleFilter !== 'all') {
      if (selectedCycleFilter === 'current') {
        if (!filterActiveCycle || trade.cycle_id !== filterActiveCycle.id) return false;
      } else {
        if (trade.cycle_id !== selectedCycleFilter) return false;
      }
    }
    
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">Track and review your daily trades</p>
          {dateFilter && (
            <Badge variant="secondary" className="mt-2 gap-2 text-xs">
              Filtered by: {dateFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={clearDateFilter} />
            </Badge>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 h-8 sm:h-9 px-3 text-sm shrink-0">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Add Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Trade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Prop Firm (Optional)</Label>
                <Select
                  value={selectedPropFirmName}
                  onValueChange={(value) => {
                    setSelectedPropFirmName(value);
                    setFormData({ ...formData, prop_firm_id: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prop firm profile" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="none">None</SelectItem>
                    {(() => {
                      // Case-insensitive unique prop firm names
                      const normalizeCase = (name: string) => name.trim().toLowerCase();
                      const uniqueNamesMap = new Map<string, string>();
                      propFirms.forEach(f => {
                        const key = normalizeCase(f.name);
                        if (!uniqueNamesMap.has(key)) {
                          uniqueNamesMap.set(key, f.name);
                        }
                      });
                      return Array.from(uniqueNamesMap.values()).map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
              {selectedPropFirmName && selectedPropFirmName !== "none" && (
                <div className="space-y-2">
                  <Label>Select Account</Label>
                  <Select
                    value={formData.prop_firm_id}
                    onValueChange={(value) => setFormData({ ...formData, prop_firm_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {(() => {
                        const normalizeCase = (name: string) => name.trim().toLowerCase();
                        return propFirms.filter(f => normalizeCase(f.name) === normalizeCase(selectedPropFirmName)).map((firm) => (
                          <SelectItem key={firm.id} value={firm.id}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                                firm.account_type === 'Funded' ? 'bg-green-500/20 text-green-400' :
                                firm.account_type === 'Evaluation 1' ? 'bg-blue-500/20 text-blue-400' :
                                firm.account_type === 'Evaluation 2' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}>{firm.account_type || 'Personal'}</span>
                              <span className="text-xs text-muted-foreground">${(firm.balance || 0).toLocaleString()}</span>
                            </div>
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Cycle selector for funded accounts */}
              {(() => {
                const selectedFirm = propFirms.find(f => f.id === formData.prop_firm_id);
                if (selectedFirm?.account_type === 'Funded') {
                  const firmCycles = getCyclesForFirm(formData.prop_firm_id);
                  const activeCycle = getActiveCycleForFirm(formData.prop_firm_id);
                  return (
                    <div className="space-y-2">
                      <Label>Cycle (for backlogging trades)</Label>
                      <Select
                        value={formData.cycle_id || "active"}
                        onValueChange={(value) => setFormData({ ...formData, cycle_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Active Cycle (Auto)" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="active">
                            Active Cycle {activeCycle ? `#${activeCycle.cycle_number}` : ''} (Auto)
                          </SelectItem>
                          {firmCycles.filter(c => c.status !== 'active').map((cycle) => (
                            <SelectItem key={cycle.id} value={cycle.id}>
                              Cycle #{cycle.cycle_number} ({cycle.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select a specific cycle to backlog trades, or leave on Active to auto-assign
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="space-y-2">
                <Label htmlFor="pair">Currency Pair *</Label>
                <Input
                  id="pair"
                  value={formData.pair}
                  onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                  placeholder="e.g. EUR/USD, XAUUSD"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="trade_type">Type</Label>
                  <Select
                    value={formData.trade_type}
                    onValueChange={(value) => setFormData({ ...formData, trade_type: value })}
                  >
                    <SelectTrigger id="trade_type">
                      <SelectValue placeholder="Buy/Sell" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buy">Buy</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume">Volume (Lots)</Label>
                  <Input
                    id="volume"
                    type="number"
                    step="0.01"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    placeholder="e.g. 0.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="entry_price">Entry Price</Label>
                  <Input
                    id="entry_price"
                    type="number"
                    step="0.00001"
                    value={formData.entry_price}
                    onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                    placeholder="e.g. 1925.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="close_price">Close Price</Label>
                  <Input
                    id="close_price"
                    type="number"
                    step="0.00001"
                    value={formData.close_price}
                    onChange={(e) => setFormData({ ...formData, close_price: e.target.value })}
                    placeholder="e.g. 1930.50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="take_profit">Take Profit</Label>
                  <Input
                    id="take_profit"
                    type="number"
                    step="0.00001"
                    value={formData.take_profit}
                    onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                    placeholder="TP price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stop_loss">Stop Loss</Label>
                  <Input
                    id="stop_loss"
                    type="number"
                    step="0.00001"
                    value={formData.stop_loss}
                    onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                    placeholder="SL price"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profit">Profit/Loss ($) *</Label>
                <Input
                  id="profit"
                  type="number"
                  step="0.01"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                  placeholder="e.g. 150.00 or -50.00"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="session">Session</Label>
                  <Input
                    id="session"
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                    placeholder="e.g. NY, London"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emotion Tag</Label>
                  <Select
                    value={formData.emotion_tag}
                    onValueChange={(value) => setFormData({ ...formData, emotion_tag: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="How did you feel?" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOTION_TAGS.map((emotion) => (
                        <SelectItem key={emotion.value} value={emotion.value}>
                          <span className={`px-2 py-0.5 rounded text-xs ${emotion.color}`}>
                            {emotion.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Rule Broken Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rule_broken"
                  checked={formData.rule_broken}
                  onCheckedChange={(checked) => setFormData({ ...formData, rule_broken: checked === true })}
                />
                <Label htmlFor="rule_broken" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  I broke my trading rules
                </Label>
              </div>

              {/* Mistake Tags */}
              {formData.rule_broken && (
                <div className="space-y-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <Label className="text-sm">What mistakes did you make?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MISTAKE_TAGS.map((mistake) => (
                      <div key={mistake.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mistake-${mistake.value}`}
                          checked={formData.mistake_tags.includes(mistake.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, mistake_tags: [...formData.mistake_tags, mistake.value] });
                            } else {
                              setFormData({ ...formData, mistake_tags: formData.mistake_tags.filter(t => t !== mistake.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`mistake-${mistake.value}`} className="text-xs cursor-pointer">
                          {mistake.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="trade_date">Date *</Label>
                <Input
                  id="trade_date"
                  type="date"
                  value={formData.trade_date}
                  onChange={(e) => setFormData({ ...formData, trade_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Trade details and observations..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="screenshot">Screenshot (Optional)</Label>
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-muted-foreground self-center">or upload:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => document.getElementById('html_upload')?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    HTML
                  </Button>
                  <input
                    id="html_upload"
                    type="file"
                    accept=".html,.htm"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        toast({
                          title: "HTML file selected",
                          description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
                        });
                        // TODO: Handle HTML upload logic
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => document.getElementById('excel_upload')?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    XLSX/Excel
                  </Button>
                  <input
                    id="excel_upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        toast({
                          title: "Excel file selected",
                          description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
                        });
                        // TODO: Handle Excel upload logic
                      }
                    }}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
                {isLoading ? "Saving..." : "Save Trade"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cycle Filter Section */}
      {fundedAccounts.length > 0 && (
        <Card className="glow-card p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Filter by Account & Cycle:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterPropFirmId} onValueChange={(value) => {
                setFilterPropFirmId(value);
                setSelectedCycleFilter("current");
              }}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {propFirms.map(firm => (
                    <SelectItem key={firm.id} value={firm.id}>
                      <div className="flex items-center gap-2">
                        <span>{firm.name}</span>
                        {firm.account_type === 'Funded' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">Funded</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {isFundedFilter && (
                <CycleFilter
                  cycles={filterCycles}
                  selectedCycleId={selectedCycleFilter}
                  onCycleChange={setSelectedCycleFilter}
                  showAllOption={true}
                />
              )}
            </div>
          </div>
          {isFundedFilter && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedCycleFilter === "current" 
                ? `Showing trades from current active cycle${filterActiveCycle ? ` (#${filterActiveCycle.cycle_number})` : ''}`
                : selectedCycleFilter === "all"
                ? "Showing all trades across all cycles"
                : `Showing trades from Cycle #${filterCycles.find(c => c.id === selectedCycleFilter)?.cycle_number || ''}`}
            </p>
          )}
        </Card>
      )}

      {/* Edit Trade Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Prop Firm (Optional)</Label>
              <Select
                value={selectedPropFirmName}
                onValueChange={(value) => {
                  setSelectedPropFirmName(value);
                  setFormData({ ...formData, prop_firm_id: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select prop firm profile" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="none">None</SelectItem>
                  {(() => {
                    // Case-insensitive unique prop firm names
                    const normalizeCase = (name: string) => name.trim().toLowerCase();
                    const uniqueNamesMap = new Map<string, string>();
                    propFirms.forEach(f => {
                      const key = normalizeCase(f.name);
                      if (!uniqueNamesMap.has(key)) {
                        uniqueNamesMap.set(key, f.name);
                      }
                    });
                    return Array.from(uniqueNamesMap.values()).map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            {selectedPropFirmName && selectedPropFirmName !== "none" && (
              <div className="space-y-2">
                <Label>Select Account</Label>
                <Select
                  value={formData.prop_firm_id}
                  onValueChange={(value) => setFormData({ ...formData, prop_firm_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {(() => {
                      const normalizeCase = (name: string) => name.trim().toLowerCase();
                      return propFirms.filter(f => normalizeCase(f.name) === normalizeCase(selectedPropFirmName)).map((firm) => (
                        <SelectItem key={firm.id} value={firm.id}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                              firm.account_type === 'Funded' ? 'bg-green-500/20 text-green-400' :
                              firm.account_type === 'Evaluation 1' ? 'bg-blue-500/20 text-blue-400' :
                              firm.account_type === 'Evaluation 2' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>{firm.account_type || 'Personal'}</span>
                            <span className="text-xs text-muted-foreground">${(firm.balance || 0).toLocaleString()}</span>
                          </div>
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit_pair">Currency Pair *</Label>
              <Input
                id="edit_pair"
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                placeholder="e.g. EUR/USD, XAUUSD"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_trade_type">Type</Label>
                <Select
                  value={formData.trade_type}
                  onValueChange={(value) => setFormData({ ...formData, trade_type: value })}
                >
                  <SelectTrigger id="edit_trade_type">
                    <SelectValue placeholder="Buy/Sell" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_volume">Volume (Lots)</Label>
                <Input
                  id="edit_volume"
                  type="number"
                  step="0.01"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  placeholder="e.g. 0.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_entry_price">Entry Price</Label>
                <Input
                  id="edit_entry_price"
                  type="number"
                  step="0.00001"
                  value={formData.entry_price}
                  onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                  placeholder="e.g. 1925.50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_close_price">Close Price</Label>
                <Input
                  id="edit_close_price"
                  type="number"
                  step="0.00001"
                  value={formData.close_price}
                  onChange={(e) => setFormData({ ...formData, close_price: e.target.value })}
                  placeholder="e.g. 1930.50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_take_profit">Take Profit</Label>
                <Input
                  id="edit_take_profit"
                  type="number"
                  step="0.00001"
                  value={formData.take_profit}
                  onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                  placeholder="TP price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_stop_loss">Stop Loss</Label>
                <Input
                  id="edit_stop_loss"
                  type="number"
                  step="0.00001"
                  value={formData.stop_loss}
                  onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                  placeholder="SL price"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_profit">Profit/Loss ($) *</Label>
              <Input
                id="edit_profit"
                type="number"
                step="0.01"
                value={formData.profit}
                onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                placeholder="e.g. 150.00 or -50.00"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit_session">Session</Label>
                <Input
                  id="edit_session"
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                  placeholder="e.g. NY, London"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_emotion">Emotion</Label>
                <Input
                  id="edit_emotion"
                  value={formData.emotion}
                  onChange={(e) => setFormData({ ...formData, emotion: e.target.value })}
                  placeholder="e.g. Calm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_trade_date">Date *</Label>
              <Input
                id="edit_trade_date"
                type="date"
                value={formData.trade_date}
                onChange={(e) => setFormData({ ...formData, trade_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Trade details and observations..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_screenshot">Screenshot (Optional)</Label>
              <Input
                id="edit_screenshot"
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              />
              {tradeToEdit?.screenshot_url && (
                <p className="text-xs text-muted-foreground">Current screenshot will be replaced if you upload a new one</p>
              )}
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
              {isLoading ? "Saving..." : "Update Trade"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Trade Cards */}
      {displayedTrades.length === 0 ? (
        <Card className="glow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {dateFilter ? `No Trades for ${dateFilter}` : filterPropFirmId !== 'all' ? 'No Trades for Selected Filter' : 'No Trades Yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {dateFilter 
                ? 'No trades were recorded for this date. Try a different date or add a new trade.' 
                : filterPropFirmId !== 'all'
                ? 'No trades match the selected account/cycle filter.'
                : 'Add your first trade to start tracking'}
            </p>
            <div className="flex gap-2">
              {(dateFilter || filterPropFirmId !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchParams({});
                    setFilterPropFirmId('all');
                    setSelectedCycleFilter('current');
                    navigate('/app/trade-journal');
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Trade
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayedTrades.map((trade) => {
            const isProfit = Number(trade.profit) > 0;
            const Icon = isProfit ? TrendingUp : TrendingDown;
            const propFirm = propFirms.find(f => f.id === trade.prop_firm_id);
            const propFirmName = propFirm?.name;
            const isFunded = propFirm?.account_type === 'Funded';
            const tradeCycles = trade.prop_firm_id ? getCyclesForFirm(trade.prop_firm_id) : [];
            const tradeCycle = tradeCycles.find(c => c.id === trade.cycle_id);
            
            return (
              <Card 
                key={trade.id} 
                className="glow-card cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => navigate(`/app/journal/${trade.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center justify-between sm:block">
                      <div>
                        <CardTitle className="text-lg sm:text-xl">{trade.pair}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {propFirmName && (
                            <p className="text-xs sm:text-sm text-muted-foreground">{propFirmName}</p>
                          )}
                          {isFunded && tradeCycle && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Cycle #{tradeCycle.cycle_number}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 sm:hidden ${isProfit ? 'text-secondary' : 'text-destructive'}`}>
                        <Icon className="h-4 w-4" />
                        <span className="font-mono text-lg font-bold">
                          {isProfit ? '+' : ''}{Number(trade.profit).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                      <div className={`hidden sm:flex items-center gap-2 ${isProfit ? 'text-secondary' : 'text-destructive'}`}>
                        <Icon className="h-5 w-5" />
                        <span className="font-mono text-xl font-bold">
                          {isProfit ? '+' : ''}{Number(trade.profit).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(trade);
                          }}
                          className="hover:bg-primary/10 h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(trade);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">Type</p>
                      {trade.trade_type ? (
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-medium ${
                            trade.trade_type.toLowerCase() === 'buy' 
                              ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                              : 'bg-red-500/20 text-red-500 border-red-500/30'
                          }`}
                        >
                          {trade.trade_type.toUpperCase()}
                        </Badge>
                      ) : (
                        <p className="font-medium text-sm text-muted-foreground">N/A</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">Volume</p>
                      <p className="font-medium font-mono text-sm">{trade.volume ? `${trade.volume} lots` : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">Session</p>
                      <p className="font-medium text-sm">{trade.session || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">Date</p>
                      <p className="font-medium font-mono text-sm">{trade.trade_date}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">Notes</p>
                      <p className="font-medium truncate text-sm">{trade.notes || trade.emotion || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
