import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, History, Plus, Trash2, MessageSquare, ImagePlus, X, Save, TrendingUp, Target, Award, BarChart3, Percent, Mic, MicOff, BookOpen, Shield, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StrategyRulesPanel from "@/components/StrategyRulesPanel";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
  extractedTrades?: ExtractedTradeData[];
  chartAnalysis?: ChartAnalysis;
};

interface ExtractedTradeData {
  pair: string;
  profit: number;
  volume: number;
  trade_type: "Buy" | "Sell";
  entry_price: number;
  close_price: number;
  open_time?: string;
  close_time?: string;
  trade_date: string;
  pips?: number;
  gain?: number;
  session?: string;
}

type TimezoneOption = "Europe/London" | "America/New_York";

interface ChartAnalysis {
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  patterns: string[];
  candlestick_patterns?: string[];
  key_levels?: { support?: number; resistance?: number };
  trend?: string;
  recommendation: string;
  risk_rating: "low" | "medium" | "high";
  reasoning: string;
}

interface PropFirm {
  id: string;
  name: string;
  account_type: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface StrategyRule {
  id: string;
  rule_text: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const initialMessages: Message[] = [{
  role: "assistant",
  content: "Hey! 👋 I'm YUNIX, your personal trading coach. I learn from your trades, enforce your strategy rules, and help you make better decisions.\n\nUpload screenshots, ask about your performance, or teach me your strategy! 🎯"
}];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  
  // Strategy rules
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>([]);
  
  // Image upload states
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Trade extraction states
  const [extractedTrades, setExtractedTrades] = useState<ExtractedTradeData[]>([]);
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [selectedPropFirmId, setSelectedPropFirmId] = useState<string>("none");
  const [isSavingTrades, setIsSavingTrades] = useState(false);
  
  // Chart analysis state
  const [chartAnalysis, setChartAnalysis] = useState<ChartAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Timezone for session classification
  const [screenshotTimezone, setScreenshotTimezone] = useState<TimezoneOption>("Europe/London");

  // Voice-to-text state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    fetchPropFirms();
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const fetchPropFirms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("prop_firms").select("id, name, account_type").eq("user_id", user.id).order("name");
    if (data) setPropFirms(data);
  };

  // ============ DEEP TRADER CONTEXT BUILDER ============
  const buildDeepTraderContext = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const parts: string[] = [];

    // 1. Fetch trades with extended data
    const { data: trades } = await supabase
      .from("trades")
      .select("profit, trade_date, session, pair, trade_type, emotion, emotion_tag, mistake_tags, rule_broken, entry_price, stop_loss, close_price, volume")
      .eq("user_id", user.id)
      .order("trade_date", { ascending: false })
      .limit(500);

    if (trades && trades.length > 0) {
      const total = trades.length;
      const wins = trades.filter(t => Number(t.profit) > 0);
      const losses = trades.filter(t => Number(t.profit) < 0);
      const totalProfit = trades.reduce((s, t) => s + Number(t.profit), 0);
      const winRate = (wins.length / total * 100).toFixed(1);

      // Weekly stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyTrades = trades.filter(t => new Date(t.trade_date) >= weekAgo);
      const weeklyWins = weeklyTrades.filter(t => Number(t.profit) > 0);
      const weeklyProfit = weeklyTrades.reduce((s, t) => s + Number(t.profit), 0);

      parts.push(`PERFORMANCE OVERVIEW:
- Total Trades: ${total} | Win Rate: ${winRate}% | Total P&L: $${totalProfit.toFixed(2)}
- This Week: ${weeklyTrades.length} trades, ${weeklyTrades.length > 0 ? (weeklyWins.length / weeklyTrades.length * 100).toFixed(0) : 0}% WR, $${weeklyProfit.toFixed(2)}
- Best Trade: $${Math.max(...trades.map(t => Number(t.profit))).toFixed(2)} | Worst: $${Math.min(...trades.map(t => Number(t.profit))).toFixed(2)}
- Avg Profit: $${(totalProfit / total).toFixed(2)}`);

      // Session breakdown
      const sessionStats: Record<string, { wins: number; total: number; profit: number }> = {};
      trades.forEach(t => {
        const s = t.session || "Unknown";
        if (!sessionStats[s]) sessionStats[s] = { wins: 0, total: 0, profit: 0 };
        sessionStats[s].total++;
        sessionStats[s].profit += Number(t.profit);
        if (Number(t.profit) > 0) sessionStats[s].wins++;
      });
      const sessionLines = Object.entries(sessionStats)
        .filter(([k]) => k !== "Unknown")
        .map(([s, d]) => `${s}: ${(d.wins / d.total * 100).toFixed(0)}% WR (${d.total} trades, $${d.profit.toFixed(2)})`)
        .join(" | ");
      if (sessionLines) parts.push(`SESSION PERFORMANCE: ${sessionLines}`);

      // Pair breakdown (top 5)
      const pairStats: Record<string, { wins: number; total: number; profit: number }> = {};
      trades.forEach(t => {
        const p = t.pair || "Unknown";
        if (!pairStats[p]) pairStats[p] = { wins: 0, total: 0, profit: 0 };
        pairStats[p].total++;
        pairStats[p].profit += Number(t.profit);
        if (Number(t.profit) > 0) pairStats[p].wins++;
      });
      const topPairs = Object.entries(pairStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([p, d]) => `${p}: ${(d.wins / d.total * 100).toFixed(0)}% WR (${d.total} trades)`)
        .join(" | ");
      if (topPairs) parts.push(`TOP PAIRS: ${topPairs}`);

      // Day of week analysis
      const dayStats: Record<string, { wins: number; total: number }> = {};
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      trades.forEach(t => {
        const d = dayNames[new Date(t.trade_date).getDay()];
        if (!dayStats[d]) dayStats[d] = { wins: 0, total: 0 };
        dayStats[d].total++;
        if (Number(t.profit) > 0) dayStats[d].wins++;
      });
      const bestDay = Object.entries(dayStats).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];
      const worstDay = Object.entries(dayStats).filter(([, d]) => d.total >= 3).sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))[0];
      if (bestDay && worstDay) {
        parts.push(`DAY PATTERNS: Best day: ${bestDay[0]} (${(bestDay[1].wins / bestDay[1].total * 100).toFixed(0)}% WR) | Worst: ${worstDay[0]} (${(worstDay[1].wins / worstDay[1].total * 100).toFixed(0)}% WR)`);
      }

      // Mistake tracking
      const mistakeCounts: Record<string, number> = {};
      let ruleBreakCount = 0;
      trades.forEach(t => {
        if (t.rule_broken) ruleBreakCount++;
        const tags = t.mistake_tags as string[] | null;
        if (tags && Array.isArray(tags)) {
          tags.forEach((tag: string) => {
            mistakeCounts[tag] = (mistakeCounts[tag] || 0) + 1;
          });
        }
      });
      if (Object.keys(mistakeCounts).length > 0) {
        const topMistakes = Object.entries(mistakeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([m, c]) => `${m} (${c}x)`)
          .join(", ");
        parts.push(`COMMON MISTAKES: ${topMistakes} | Rules broken: ${ruleBreakCount}/${total} trades`);
      }

      // Emotion patterns
      const emotionStats: Record<string, { wins: number; total: number }> = {};
      trades.forEach(t => {
        const e = (t.emotion_tag as string) || (t.emotion as string);
        if (e) {
          if (!emotionStats[e]) emotionStats[e] = { wins: 0, total: 0 };
          emotionStats[e].total++;
          if (Number(t.profit) > 0) emotionStats[e].wins++;
        }
      });
      if (Object.keys(emotionStats).length > 0) {
        const emotionLines = Object.entries(emotionStats)
          .filter(([, d]) => d.total >= 2)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 4)
          .map(([e, d]) => `${e}: ${(d.wins / d.total * 100).toFixed(0)}% WR (${d.total} trades)`)
          .join(" | ");
        if (emotionLines) parts.push(`EMOTION PATTERNS: ${emotionLines}`);
      }

      // Streak detection
      const recentTrades = trades.slice(0, 10);
      let currentStreak = 0;
      let streakType = "";
      for (const t of recentTrades) {
        const isWin = Number(t.profit) > 0;
        if (currentStreak === 0) {
          streakType = isWin ? "winning" : "losing";
          currentStreak = 1;
        } else if ((isWin && streakType === "winning") || (!isWin && streakType === "losing")) {
          currentStreak++;
        } else break;
      }
      if (currentStreak >= 3) {
        parts.push(`CURRENT STREAK: ${currentStreak} ${streakType} trades in a row`);
      }

      // R-Multiple (if stop_loss data available)
      const tradesWithSL = trades.filter(t => t.entry_price && t.stop_loss && t.profit);
      if (tradesWithSL.length >= 5) {
        const rMultiples = tradesWithSL.map(t => {
          const risk = Math.abs(Number(t.entry_price) - Number(t.stop_loss)) * (Number(t.volume) || 1) * 100000;
          return risk > 0 ? Number(t.profit) / risk : 0;
        }).filter(r => isFinite(r) && Math.abs(r) < 100);
        if (rMultiples.length > 0) {
          const avgR = rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length;
          parts.push(`RISK METRICS: Avg R-Multiple: ${avgR.toFixed(2)}R (from ${rMultiples.length} trades with SL data)`);
        }
      }
    }

    // 2. Recent daily check-ins
    const { data: checkins } = await supabase
      .from("daily_checkins")
      .select("mood, stress_level, confidence_level, sleep_quality, max_trades, checkin_date")
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(5);

    if (checkins && checkins.length > 0) {
      const latest = checkins[0];
      const moods = checkins.map(c => c.mood).filter(Boolean).join(" → ");
      parts.push(`RECENT MOOD: ${moods} | Today: stress ${latest.stress_level || '?'}/10, confidence ${latest.confidence_level || '?'}/10, sleep: ${latest.sleep_quality || '?'} | Max trades today: ${latest.max_trades || 'not set'}`);
    }

    // 3. Active cycle info
    const { data: activeCycles } = await supabase
      .from("account_cycles")
      .select("starting_balance, prop_firm_id, cycle_number, max_drawdown_percentage, profit_target")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(5);

    if (activeCycles && activeCycles.length > 0) {
      parts.push(`ACTIVE CYCLES: ${activeCycles.length} funded accounts active`);
    }

    return parts.join("\n");
  };

  // ============ CONVERSATIONS ============
  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("chat_conversations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  const loadConversation = async (conversationId: string) => {
    const { data: messagesData } = await supabase.from("chat_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData as Message[]);
      setCurrentConversationId(conversationId);
    }
    setHistoryOpen(false);
  };

  const startNewChat = () => {
    setMessages(initialMessages);
    setCurrentConversationId(null);
    setHistoryOpen(false);
    setExtractedTrades([]);
    setChartAnalysis(null);
    setUploadedImage(null);
    setImagePreview(null);
  };

  const deleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("chat_conversations").delete().eq("id", conversationId);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) startNewChat();
      toast({ title: "Chat deleted 🗑️" });
    }
  };

  const saveMessage = useCallback(async (message: Message, conversationId: string) => {
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
    });
    const title = message.role === "user" ? message.content.slice(0, 50) : undefined;
    const updateData: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (title && message.role === "user") {
      const { data: existingMessages } = await supabase.from("chat_messages").select("id").eq("conversation_id", conversationId).eq("role", "user");
      if (existingMessages && existingMessages.length <= 1) updateData.title = title;
    }
    await supabase.from("chat_conversations").update(updateData).eq("id", conversationId);
    loadConversations();
  }, []);

  const createConversation = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from("chat_conversations").insert({ user_id: user.id, title: "New Chat" }).select().single();
    if (error || !data) return null;
    return data.id;
  };

  // ============ VOICE-TO-TEXT ============
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not Supported", description: "Voice input is not supported in this browser. Try Chrome or Edge.", variant: "destructive" });
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    let finalTranscript = input;
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim = transcript;
        }
      }
      setInput(finalTranscript + (interim ? " " + interim : ""));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSuggestionClick = (query: string) => setInput(query);

  // ============ IMAGE HANDLING ============
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const processImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { processImage(file); e.preventDefault(); break; }
      }
    }
  };

  // ============ TRADE EXTRACTION ============
  const extractTradesFromImage = async (imageBase64: string): Promise<ExtractedTradeData[]> => {
    setIsExtracting(true);
    try {
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ imageBase64: base64Data })
      });
      if (!response.ok) throw new Error("Failed to extract trades");
      const data = await response.json();
      if (data.success && data.trades?.length > 0) return data.trades as ExtractedTradeData[];
      if (data.success && data.trade) return [data.trade as ExtractedTradeData];
      return [];
    } catch (error) {
      console.error("Extract trades error:", error);
      return [];
    } finally {
      setIsExtracting(false);
    }
  };

  // ============ DATE/TIME HELPERS ============
  const parseDateTime = (dateStr: string | undefined | null): string | null => {
    if (!dateStr) return null;
    const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})$/);
    if (ddmmyyyyMatch) { const [, d, m, y, h, mi, s] = ddmmyyyyMatch; return `${y}-${m}-${d}T${h}:${mi}:${s}`; }
    const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmddMatch) return dateStr;
    const ddmmyyyyOnlyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyyOnlyMatch) { const [, d, m, y] = ddmmyyyyOnlyMatch; return `${y}-${m}-${d}`; }
    if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr;
    return null;
  };

  const parseTradeDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (ddmmyyyyMatch) { const [, d, m, y] = ddmmyyyyMatch; return `${y}-${m}-${d}`; }
    return new Date().toISOString().split('T')[0];
  };

  const getSessionFromTime = (timeStr: string | undefined | null, timezone: TimezoneOption): string | null => {
    if (!timeStr) return null;
    const fullMatch = timeStr.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (!fullMatch) return null;
    const hour = parseInt(fullMatch[1], 10);
    const utcHour = timezone === "Europe/London" ? hour : (hour + 5) % 24;
    if (utcHour >= 0 && utcHour < 8) return "Asia";
    if (utcHour >= 8 && utcHour < 13) return "London";
    if (utcHour >= 13 && utcHour < 21) return "New York";
    return "Asia";
  };

  // ============ SAVE TRADES ============
  const saveAllTrades = async () => {
    if (extractedTrades.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Not logged in", variant: "destructive" }); return; }

    setIsSavingTrades(true);
    try {
      let screenshotUrl: string | null = null;
      let cycleId: string | null = null;

      if (imagePreview && uploadedImage) {
        const fileName = `${user.id}/${Date.now()}-${uploadedImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("prop-firm-screenshots").upload(fileName, uploadedImage);
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("prop-firm-screenshots").getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      if (selectedPropFirmId && selectedPropFirmId !== "none") {
        const selectedFirm = propFirms.find(pf => pf.id === selectedPropFirmId);
        if (selectedFirm?.account_type === "Funded") {
          const { data: cycleData } = await supabase.from("account_cycles").select("id").eq("prop_firm_id", selectedPropFirmId).eq("status", "active").single();
          if (cycleData) cycleId = cycleData.id;
        }
      }

      const tradesToInsert = extractedTrades.map(trade => ({
        user_id: user.id,
        prop_firm_id: selectedPropFirmId !== "none" ? selectedPropFirmId : null,
        cycle_id: cycleId,
        pair: trade.pair,
        profit: trade.profit,
        volume: trade.volume,
        trade_type: trade.trade_type.toLowerCase(),
        entry_price: trade.entry_price,
        close_price: trade.close_price,
        open_time: parseDateTime(trade.open_time),
        close_time: parseDateTime(trade.close_time),
        trade_date: parseTradeDate(trade.trade_date),
        session: getSessionFromTime(trade.open_time, screenshotTimezone),
        screenshot_url: screenshotUrl,
      }));

      const { error: insertError } = await supabase.from("trades").insert(tradesToInsert);
      if (insertError) throw insertError;

      const totalProfit = extractedTrades.reduce((sum, t) => sum + t.profit, 0);
      toast({ title: `${extractedTrades.length} trades saved! ✅`, description: `Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}` });
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `All ${extractedTrades.length} trades saved successfully! 🎉\n\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n\nView them in Trade Journal, Trade Management, and Analytics! 💪`
      }]);

      setExtractedTrades([]);
      setSelectedPropFirmId("none");
      clearImage();
    } catch (error) {
      console.error("Save trades error:", error);
      toast({ title: "Save failed", description: "Could not save trades.", variant: "destructive" });
    } finally {
      setIsSavingTrades(false);
    }
  };

  // ============ SEND MESSAGE ============
  const handleSend = async () => {
    if ((!input.trim() && !imagePreview) || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input || "Analyze this image",
      image: imagePreview || undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createConversation();
      if (conversationId) setCurrentConversationId(conversationId);
    }
    if (conversationId) await saveMessage(userMessage, conversationId);

    try {
      // If image with no text input, try extraction first
      if (imagePreview && !input.trim()) {
        const trades = await extractTradesFromImage(imagePreview);
        if (trades.length > 0) {
          setExtractedTrades(trades);
          const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
          const extractionMessage: Message = {
            role: "assistant",
            content: `Found ${trades.length} trade${trades.length > 1 ? 's' : ''}! 🎯\n\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n\nSelect an account and click "Save All Trades" to add them to your journal! 👇`,
            extractedTrades: trades
          };
          setMessages(prev => [...prev, extractionMessage]);
          if (conversationId) await saveMessage({ role: "assistant", content: extractionMessage.content }, conversationId);
          clearImage();
          setIsLoading(false);
          return;
        }
        // If extraction fails, fall through to AI chat with image
      }

      // Build deep context + strategy rules
      const traderContext = await buildDeepTraderContext();
      const activeRules = strategyRules.filter(r => r.is_active).map(r => r.rule_text);

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content, image: m.image })), userMessage],
          traderContext,
          strategyRules: activeRules.length > 0 ? activeRules : undefined,
        })
      });

      if (response.status === 429) {
        toast({ title: "Rate Limit", description: "Too many requests. Please try again later.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (response.status === 402) {
        toast({ title: "Payment Required", description: "Please add credits to continue.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!response.ok || !response.body) throw new Error("Failed to start stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      clearImage();

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === "assistant") lastMessage.content = assistantContent;
                return newMessages;
              });
            }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === "assistant") lastMessage.content = assistantContent;
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }

      if (conversationId && assistantContent) {
        await saveMessage({ role: "assistant", content: assistantContent }, conversationId);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.content === "") newMessages.pop();
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: "Win Rate", icon: Percent, query: "What's my current win rate and how can I improve it?" },
    { label: "Weekly P/L", icon: TrendingUp, query: "How did I perform this week? Any insights?" },
    { label: "Best Trade", icon: Award, query: "What was my best trade recently and why?" },
    { label: "Strategy Check", icon: Shield, query: "Does my recent trading align with my strategy rules? Any violations?" },
    { label: "My Weaknesses", icon: Brain, query: "What are my biggest recurring mistakes and weaknesses? How can I fix them?" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">AI Coach</h1>
          <Badge variant="outline" className="text-[10px] px-1.5 gap-1">
            <Brain className="h-2.5 w-2.5" />
            Learning
          </Badge>
        </div>
        <div className="flex gap-2">
          <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Strategy</span>
                {strategyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <Button variant="outline" size="sm" onClick={startNewChat} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">New</span>
          </Button>
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">History</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Chat History
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No chat history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors group flex items-start justify-between gap-2 ${
                          currentConversationId === conv.id ? "bg-primary/10 border border-primary/20" : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(conv.updated_at), "MMM d, h:mm a")}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => deleteConversation(e, conv.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Strategy Rules Panel (Collapsible) */}
      <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
        <CollapsibleContent>
          <Card className="mb-3">
            <CardContent className="p-4">
              <StrategyRulesPanel onRulesChange={setStrategyRules} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col min-h-0" onDragOver={handleDragOver} onDrop={handleDrop}>
        <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3" onPaste={handlePaste}>
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`rounded-xl px-3 py-2 max-w-[85%] ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {message.image && (
                  <img src={message.image} alt="Uploaded" className="max-w-full rounded-lg mb-2 max-h-48 object-contain" />
                )}
                {message.role === "assistant" ? (
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-secondary" />
                </div>
              )}
            </div>
          ))}
          
          {/* Extracted Trades Table Card */}
          {extractedTrades.length > 0 && (
            <div className="mx-auto max-w-2xl">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      📊 Extracted {extractedTrades.length} Trade{extractedTrades.length > 1 ? 's' : ''}
                    </h3>
                    <span className={`text-lg font-bold ${extractedTrades.reduce((sum, t) => sum + t.profit, 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {extractedTrades.reduce((sum, t) => sum + t.profit, 0) >= 0 ? '+' : ''}${extractedTrades.reduce((sum, t) => sum + t.profit, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Save to Account</Label>
                      <Select value={selectedPropFirmId} onValueChange={setSelectedPropFirmId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select account..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No account (Nostro)</SelectItem>
                          {propFirms.map(pf => <SelectItem key={pf.id} value={pf.id}>{pf.name} ({pf.account_type})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Screenshot Timezone</Label>
                      <Select value={screenshotTimezone} onValueChange={(v) => setScreenshotTimezone(v as TimezoneOption)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/London">London Time</SelectItem>
                          <SelectItem value="America/New_York">New York Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-8">#</TableHead>
                          <TableHead className="text-xs">Date/Time</TableHead>
                          <TableHead className="text-xs">Symbol</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs text-right">Lots</TableHead>
                          <TableHead className="text-xs text-right">Open</TableHead>
                          <TableHead className="text-xs text-right">Close</TableHead>
                          <TableHead className="text-xs text-right">Pips</TableHead>
                          <TableHead className="text-xs text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedTrades.map((trade, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-medium">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono whitespace-nowrap">{trade.open_time || trade.trade_date}</TableCell>
                            <TableCell className="text-xs font-medium">{trade.pair}</TableCell>
                            <TableCell><Badge variant={trade.trade_type === "Buy" ? "default" : "secondary"} className="text-[10px] px-1.5">{trade.trade_type}</Badge></TableCell>
                            <TableCell className="text-xs text-right font-mono">{trade.volume?.toFixed(2) || '-'}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{trade.entry_price?.toFixed(trade.entry_price > 100 ? 2 : 5) || '-'}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{trade.close_price?.toFixed(trade.close_price > 100 ? 2 : 5) || '-'}</TableCell>
                            <TableCell className={`text-xs text-right font-mono ${(trade.pips ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{trade.pips !== undefined ? trade.pips.toFixed(1) : '-'}</TableCell>
                            <TableCell className={`text-xs text-right font-medium ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveAllTrades} disabled={isSavingTrades} className="flex-1 gap-2">
                      <Save className="h-4 w-4" />
                      {isSavingTrades ? "Saving..." : `Save All ${extractedTrades.length} Trades`}
                    </Button>
                    <Button variant="outline" onClick={() => setExtractedTrades([])}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {(isExtracting || isAnalyzing) && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                {isAnalyzing ? "Analyzing..." : "Extracting trades..."}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Image Preview */}
        {imagePreview && (
          <div className="border-t border-border/50 p-3">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={clearImage}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border/50 p-3 space-y-3">
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Upload screenshot (auto-detects)">
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className={`h-9 w-9 shrink-0 ${isListening ? "animate-pulse" : ""}`}
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              onPaste={handlePaste}
              className="flex-1 h-9"
              disabled={isLoading}
              placeholder={isListening ? "Listening..." : imagePreview ? "Add context or send image..." : "Ask your trading coach anything..."}
            />
            <Button onClick={handleSend} className="h-9 w-9 p-0" disabled={isLoading && !isExtracting && !isAnalyzing}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <Button key={idx} variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleSuggestionClick(action.query)} disabled={isLoading}>
                <action.icon className="h-3 w-3" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
