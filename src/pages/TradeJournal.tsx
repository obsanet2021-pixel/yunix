import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, Trash2, X, Pencil, Upload, RotateCcw, AlertTriangle, FileSpreadsheet } from "lucide-react";
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
import { AIExtractButton } from "@/components/trade/AIExtractButton";
import * as XLSX from 'xlsx';
import TradeForm from "@/components/TradeForm";

interface PropFirm {
  id: string;
  name: string;
  account_type?: string;
  balance?: number | null;
  account_number?: string;
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
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [parsedAccountInfo, setParsedAccountInfo] = useState<{account?: string; company?: string}>({});
  const [showImportDialog, setShowImportDialog] = useState(false);

  interface ParsedTrade {
    openTime: string;
    position: string;
    symbol: string;
    type: string;
    volume: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    closeTime: string;
    closePrice: number;
    commission: number;
    swap: number;
    profit: number;
  }

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

  // Parse HTML file to extract Positions table
  const parseHtmlPositions = (htmlContent: string): { trades: ParsedTrade[]; accountInfo: {account?: string; company?: string} } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Extract account info from text content
    const textContent = doc.body.textContent || '';
    const accountMatch = textContent.match(/Account:\s*(\d+)/i);
    const companyMatch = textContent.match(/Company:\s*([^\n]+)/i);
    
    const accountInfo = {
      account: accountMatch?.[1],
      company: companyMatch?.[1]?.trim()
    };

    // Find the Positions table - look for table with specific headers
    const tables = doc.querySelectorAll('table');
    let positionsTable: HTMLTableElement | null = null;
    
    for (const table of tables) {
      const headers = table.querySelectorAll('th');
      const headerText = Array.from(headers).map(h => h.textContent?.trim()).join(' ');
      
      // Check if this is the Positions table (has Time, Position, Symbol, Type, etc.)
      if (headerText.includes('Time') && headerText.includes('Position') && headerText.includes('Symbol') && headerText.includes('Type')) {
        positionsTable = table;
        break;
      }
    }

    if (!positionsTable) {
      throw new Error('Positions table not found in HTML');
    }

    const rows = positionsTable.querySelectorAll('tr');
    const trades: ParsedTrade[] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length >= 12) {
        const openTime = cells[0]?.textContent?.trim() || '';
        const position = cells[1]?.textContent?.trim() || '';
        const symbol = cells[2]?.textContent?.trim() || '';
        const type = cells[3]?.textContent?.trim()?.toLowerCase() || '';
        const volume = parseFloat(cells[4]?.textContent?.trim() || '0');
        const entryPrice = parseFloat(cells[5]?.textContent?.trim() || '0');
        const stopLoss = cells[6]?.textContent?.trim() ? parseFloat(cells[6].textContent!) : undefined;
        const takeProfit = cells[7]?.textContent?.trim() ? parseFloat(cells[7].textContent!) : undefined;
        const closeTime = cells[8]?.textContent?.trim() || '';
        const closePrice = parseFloat(cells[9]?.textContent?.trim() || '0');
        const commission = parseFloat(cells[10]?.textContent?.trim() || '0');
        const swap = parseFloat(cells[11]?.textContent?.trim() || '0');
        const profit = parseFloat(cells[12]?.textContent?.trim() || '0');

        if (symbol && volume > 0) {
          trades.push({
            openTime,
            position,
            symbol,
            type: type === 'buy' ? 'Buy' : type === 'sell' ? 'Sell' : type,
            volume,
            entryPrice,
            stopLoss,
            takeProfit,
            closeTime,
            closePrice,
            commission,
            swap,
            profit
          });
        }
      }
    }

    return { trades, accountInfo };
  };

  // Parse Excel file to extract Positions sheet
  const parseExcelPositions = (arrayBuffer: ArrayBuffer): { trades: ParsedTrade[]; accountInfo: {account?: string; company?: string} } => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Look for Positions sheet
    const positionsSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('position') || 
      name.toLowerCase().includes('closed')
    ) || workbook.SheetNames[0];
    
    const worksheet = workbook.Sheets[positionsSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];
    
    if (jsonData.length < 2) {
      throw new Error('No data found in Excel file');
    }

    // Find account info from first rows (often in first few rows before table)
    let accountInfo: {account?: string; company?: string} = {};
    let dataStartRow = 0;
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      const rowText = row.join(' ');
      
      const accountMatch = rowText.match(/Account:\s*(\d+)/i);
      const companyMatch = rowText.match(/Company:\s*([^,]+)/i);
      
      if (accountMatch) accountInfo.account = accountMatch[1];
      if (companyMatch) accountInfo.company = companyMatch[1].trim();
      
      // Check if this is header row
      const headerText = rowText.toLowerCase();
      if (headerText.includes('time') && headerText.includes('position') && headerText.includes('symbol')) {
        dataStartRow = i;
        break;
      }
    }

    const trades: ParsedTrade[] = [];
    const headers = jsonData[dataStartRow] as string[];
    
    // Map column indices based on headers
    const colIndices: Record<string, number> = {};
    headers.forEach((h, idx) => {
      const header = String(h).toLowerCase().trim();
      if (header.includes('time') && !header.includes('close')) colIndices.openTime = idx;
      if (header.includes('position')) colIndices.position = idx;
      if (header.includes('symbol')) colIndices.symbol = idx;
      if (header.includes('type')) colIndices.type = idx;
      if (header.includes('volume')) colIndices.volume = idx;
      if (header.includes('price') && !header.includes('close')) colIndices.entryPrice = idx;
      if (header.includes('s / l') || header.includes('stop')) colIndices.stopLoss = idx;
      if (header.includes('t / p') || header.includes('take')) colIndices.takeProfit = idx;
      if (header.includes('time') && idx !== colIndices.openTime) colIndices.closeTime = idx;
      if (header.includes('price') && idx !== colIndices.entryPrice) colIndices.closePrice = idx;
      if (header.includes('commission')) colIndices.commission = idx;
      if (header.includes('swap')) colIndices.swap = idx;
      if (header.includes('profit')) colIndices.profit = idx;
    });

    for (let i = dataStartRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row[colIndices.symbol]) continue;
      
      const volume = parseFloat(String(row[colIndices.volume] || '0'));
      if (volume <= 0) continue;

      const type = String(row[colIndices.type] || '').toLowerCase();
      
      trades.push({
        openTime: String(row[colIndices.openTime] || ''),
        position: String(row[colIndices.position] || ''),
        symbol: String(row[colIndices.symbol] || ''),
        type: type === 'buy' ? 'Buy' : type === 'sell' ? 'Sell' : type,
        volume,
        entryPrice: parseFloat(String(row[colIndices.entryPrice] || '0')),
        stopLoss: row[colIndices.stopLoss] ? parseFloat(String(row[colIndices.stopLoss])) : undefined,
        takeProfit: row[colIndices.takeProfit] ? parseFloat(String(row[colIndices.takeProfit])) : undefined,
        closeTime: String(row[colIndices.closeTime] || ''),
        closePrice: parseFloat(String(row[colIndices.closePrice] || '0')),
        commission: parseFloat(String(row[colIndices.commission] || '0')),
        swap: parseFloat(String(row[colIndices.swap] || '0')),
        profit: parseFloat(String(row[colIndices.profit] || '0'))
      });
    }

    return { trades, accountInfo };
  };

  // Find matching prop firm based on account number and company
  const findMatchingPropFirm = (accountInfo: {account?: string; company?: string}): PropFirm | null => {
    if (!accountInfo.account && !accountInfo.company) return null;
    
    return propFirms.find(firm => {
      // Match by account number (if stored in name or account_number field)
      const accountMatch = accountInfo.account && 
        (firm.name.includes(accountInfo.account) || 
         firm.account_number === accountInfo.account);
      
      // Match by company name
      const companyMatch = accountInfo.company && 
        firm.name.toLowerCase().includes(accountInfo.company.toLowerCase());
      
      return accountMatch || companyMatch;
    }) || null;
  };

  // Handle HTML file upload
  const handleHtmlUpload = async (file: File | undefined) => {
    if (!file) return;
    
    setIsParsingFile(true);
    try {
      const text = await file.text();
      const { trades, accountInfo } = parseHtmlPositions(text);
      
      setParsedTrades(trades);
      setParsedAccountInfo(accountInfo);
      
      const matchedFirm = findMatchingPropFirm(accountInfo);
      
      toast({
        title: `Parsed ${trades.length} trades from HTML`,
        description: matchedFirm 
          ? `Matched to: ${matchedFirm.name} (Account: ${accountInfo.account})`
          : `Account: ${accountInfo.account}, Company: ${accountInfo.company} (No matching prop firm found)`,
      });
      
      // Show dialog to confirm import
      if (trades.length > 0) {
        setShowImportDialog(true);
      }
    } catch (error) {
      toast({
        title: "Error parsing HTML",
        description: error instanceof Error ? error.message : "Failed to parse positions",
        variant: "destructive",
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  // Handle Excel file upload
  const handleExcelUpload = async (file: File | undefined) => {
    if (!file) return;
    
    setIsParsingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { trades, accountInfo } = parseExcelPositions(arrayBuffer);
      
      setParsedTrades(trades);
      setParsedAccountInfo(accountInfo);
      
      const matchedFirm = findMatchingPropFirm(accountInfo);
      
      toast({
        title: `Parsed ${trades.length} trades from Excel`,
        description: matchedFirm 
          ? `Matched to: ${matchedFirm.name} (Account: ${accountInfo.account})`
          : `Account: ${accountInfo.account}, Company: ${accountInfo.company} (No matching prop firm found)`,
      });
      
      if (trades.length > 0) {
        setShowImportDialog(true);
      }
    } catch (error) {
      toast({
        title: "Error parsing Excel",
        description: error instanceof Error ? error.message : "Failed to parse positions",
        variant: "destructive",
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  // Save parsed trades to database
  const saveParsedTrades = async () => {
    if (parsedTrades.length === 0) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const matchedFirm = findMatchingPropFirm(parsedAccountInfo);
      
      // Prepare trades for insertion
      const tradesToInsert = parsedTrades.map(trade => ({
        user_id: user.id,
        prop_firm_id: matchedFirm?.id || null,
        pair: trade.symbol,
        trade_type: trade.type,
        volume: trade.volume,
        entry_price: trade.entryPrice,
        close_price: trade.closePrice,
        take_profit: trade.takeProfit || null,
        stop_loss: trade.stopLoss || null,
        profit: trade.profit,
        trade_date: trade.openTime.split(' ')[0] || new Date().toISOString().split('T')[0],
        session: null,
        emotion: null,
        notes: `Imported from ${parsedAccountInfo.company || 'Unknown'} account ${parsedAccountInfo.account || 'N/A'}`,
        screenshot_url: null,
        screenshots: [],
        commission: trade.commission,
        swap: trade.swap,
      }));

      const { error } = await supabase.from("trades").insert(tradesToInsert as any);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${tradesToInsert.length} trades successfully`,
      });
      
      setShowImportDialog(false);
      setParsedTrades([]);
      fetchTrades();
    } catch (error) {
      toast({
        title: "Error importing trades",
        description: error instanceof Error ? error.message : "Failed to save trades",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              .single() as any;
            
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
      } as any);

      if (error) throw error;

      // Update prop firm's current_profit and equity if linked
      if (formData.prop_firm_id) {
        const { data: propFirm } = await supabase
          .from("prop_firms")
          .select("current_profit, balance")
          .eq("id", formData.prop_firm_id)
          .single() as any;

        if (propFirm) {
          const tradeProfit = parseFloat(formData.profit);
          const newProfit = (propFirm.current_profit || 0) + tradeProfit;
          const newEquity = (propFirm.balance || 0) + newProfit;
          
          await (supabase
            .from("prop_firms")
            .update({ 
              current_profit: newProfit,
              equity: newEquity
            })
            .eq("id", formData.prop_firm_id) as any);
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

      const { error } = await (supabase
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
        .eq("id", tradeToEdit.id) as any);

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
          .single() as any;

        if (propFirm) {
          const newProfit = (propFirm.current_profit || 0) - Number(tradeToDelete.profit);
          const newEquity = (propFirm.balance || 0) + newProfit;
          
          await (supabase
            .from("prop_firms")
            .update({ 
              current_profit: newProfit,
              equity: newEquity
            })
            .eq("id", tradeToDelete.prop_firm_id) as any);
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
              <TradeForm
                formData={formData}
                setFormData={setFormData}
                propFirms={propFirms}
                getCyclesForFirm={getCyclesForFirm}
                getActiveCycleForFirm={getActiveCycleForFirm}
                onSubmitLabel={isLoading ? "Saving..." : "Save Trade"}
                onSubmitDisabled={isLoading}
              />
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
            <TradeForm
              formData={formData}
              setFormData={setFormData}
              propFirms={propFirms}
              getCyclesForFirm={getCyclesForFirm}
              getActiveCycleForFirm={getActiveCycleForFirm}
              onSubmitLabel={isLoading ? "Saving..." : "Update Trade"}
              onSubmitDisabled={isLoading}
              screenshot={screenshot}
              onScreenshotChange={setScreenshot}
              existingScreenshotUrl={tradeToEdit?.screenshot_url}
            />
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
              <AIExtractButton
                userId={userId || ""}
                propFirmId={formData.prop_firm_id || null}
                cycleId={formData.cycle_id || null}
                onTradesExtracted={(newTrades) => {
                  setTrades((prev) => [...newTrades, ...prev]);
                  toast({
                    title: "Trades Added",
                    description: `${newTrades.length} trade${newTrades.length > 1 ? "s" : ""} extracted and saved successfully`,
                  });
                }}
              />
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

      {/* Import Trades Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import {parsedTrades.length} Trades
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Account Info */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Account Information</p>
              <p className="text-xs text-muted-foreground">
                Account: {parsedAccountInfo.account || 'N/A'} | Company: {parsedAccountInfo.company || 'N/A'}
              </p>
              {findMatchingPropFirm(parsedAccountInfo) && (
                <p className="text-xs text-green-400 mt-1">
                  Matched to: {findMatchingPropFirm(parsedAccountInfo)?.name}
                </p>
              )}
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium">Symbol</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Volume</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Entry</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Close</th>
                      <th className="px-3 py-2 text-right text-xs font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedTrades.slice(0, 10).map((trade, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="px-3 py-2 font-medium">{trade.symbol}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs ${trade.type.toLowerCase() === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-3 py-2">{trade.volume}</td>
                        <td className="px-3 py-2 font-mono">{trade.entryPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono">{trade.closePrice.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right font-mono ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedTrades.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ... and {parsedTrades.length - 10} more trades
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveParsedTrades}
                disabled={isLoading}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Importing..." : `Import ${parsedTrades.length} Trades`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
