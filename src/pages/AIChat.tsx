import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, History, Plus, Trash2, MessageSquare, ImagePlus, X, Save, TrendingUp, Target, Award, BarChart3, Percent, Mic, MicOff, BookOpen, Shield, Brain, ChevronDown, ChevronUp, FileText } from "lucide-react";
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
import { parseTradeTextWithAI, parseTradeHistoryText, ParsedTrade } from "@/lib/tradeTextParser";

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
  notes?: string;
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
  state?: string;
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
  
  // Text paste states
  const [textPasteMode, setTextPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isParsingText, setIsParsingText] = useState(false);
  
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
    const { data } = await supabase.from("prop_firms").select("id, name, account_type, state").eq("user_id", user.id).order("name");
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setConversations(data ?? []);
    } catch (err) {
      console.error("[AIChat] loadConversations failed:", err);
      // Silently degrade — history panel will show empty state
      setConversations([]);
    }
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

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setImagePreview(imageData);
      
      // Auto-extract trades from image
      console.log("🖼️ Image uploaded, auto-extracting trades...");
      const trades = await extractTradesFromImage(imageData);
      
      if (trades.length > 0) {
        setExtractedTrades(trades);
        const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
        
        // Add system message about extraction
        const extractionMessage: Message = {
          role: "assistant",
          content: `📊 **Extracted ${trades.length} Trade${trades.length > 1 ? 's' : ''}!**\n\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n\nReview the trades below and click **Save to Journal** to store them in your real journal database. Once saved, they will appear in Trade Journal, Trade Management, and Analytics. 👇`,
          extractedTrades: trades
        };
        setMessages(prev => [...prev, extractionMessage]);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  // ============ TEXT PASTE EXTRACTION ============
  const handleTextPasteExtraction = async () => {
    if (!pastedText.trim()) {
      toast({
        title: "No Text",
        description: "Please paste trade history text first.",
        variant: "destructive",
      });
      return;
    }

    setIsParsingText(true);
    try {
      // First try local regex parser
      let trades = parseTradeHistoryText(pastedText);
      
      // If no trades found or few trades, try AI parsing
      if (trades.length === 0) {
        console.log("🤖 Regex parsing found no trades, trying AI...");
        trades = await parseTradeTextWithAI(pastedText);
      }

      if (trades.length > 0) {
        // Convert ParsedTrade to ExtractedTradeData format
        const convertedTrades: ExtractedTradeData[] = trades.map(t => ({
          pair: t.pair,
          profit: t.profit,
          volume: t.volume,
          trade_type: t.trade_type as "Buy" | "Sell",
          entry_price: t.entry_price,
          close_price: t.close_price,
          open_time: t.open_time,
          close_time: t.close_time,
          trade_date: t.trade_date,
          session: t.session,
          notes: t.notes
        }));
        
        setExtractedTrades(convertedTrades);
        const totalProfit = convertedTrades.reduce((sum, t) => sum + t.profit, 0);
        
        toast({
          title: "Trades Parsed",
          description: `${convertedTrades.length} trades extracted from text. Total P&L: $${totalProfit.toFixed(2)}`,
        });
        
        // Add assistant message for text parsing
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📊 **Parsed ${convertedTrades.length} Trade${convertedTrades.length > 1 ? 's' : ''} from text!**\n\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n\nReview the table below and click **Save to Journal** to store them in your journal database for Journal, Trade Management, and Analytics. 👇`,
          extractedTrades: convertedTrades
        }]);
        
        // Clear the text area after successful extraction
        setPastedText("");
        setTextPasteMode(false);
      } else {
        toast({
          title: "No Trades Found",
          description: "Could not extract any trades from the pasted text. Please check the format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Text parsing error:", error);
      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : "Failed to parse trade text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsParsingText(false);
    }
  };

  // ============ SAVE TRADES ============
  const saveTradesToJournal = async () => {
    if (extractedTrades.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Not logged in", variant: "destructive" }); return; }

    setIsSavingTrades(true);
    try {
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
        notes: trade.notes || "Imported from AI Chat",
        extracted_from_screenshot: Boolean(uploadedImage),
        ai_extraction_metadata: {
          source: uploadedImage ? "ai_chat_image" : "ai_chat_text",
          imported_at: new Date().toISOString(),
          original_open_time: trade.open_time || null,
          original_close_time: trade.close_time || null,
          original_session: trade.session || null,
          pips: trade.pips ?? null,
          gain: trade.gain ?? null,
        },
      }));

      const { error } = await supabase.from("trades").insert(tradesToInsert as any[]);
      if (error) throw error;

      const totalProfit = extractedTrades.reduce((sum, t) => sum + t.profit, 0);
      toast({ title: `${extractedTrades.length} trades saved to journal! ✅`, description: `Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}` });
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **Saved ${extractedTrades.length} trade${extractedTrades.length > 1 ? 's' : ''} to your journal database.**\n\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n\nThey are now available in Trade Journal, Trade Management, and Analytics. 💪` 
      }]);
      
      setExtractedTrades([]);
      clearImage();
    } catch (error) {
      console.error("Save trades error:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save trades to journal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTrades(false);
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
    const ddmmyyyyWithTimeMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})$/);
    if (ddmmyyyyWithTimeMatch) { const [, d, m, y] = ddmmyyyyWithTimeMatch; return `${y}-${m}-${d}`; }
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr;
  };

  const getSessionFromTime = (timeStr: string | undefined | null, timezone: TimezoneOption): string => {
    if (!timeStr) return "Unknown";
    try {
      const date = new Date(timeStr);
      if (timezone === "Europe/London") {
        const hour = date.getUTCHours();
        if (hour >= 8 && hour < 12) return "London";
        if (hour >= 13 && hour < 17) return "New York";
        if (hour >= 21 || hour < 2) return "Asian";
      } else {
        const hour = date.getHours();
        if (hour >= 8 && hour < 12) return "London";
        if (hour >= 13 && hour < 17) return "New York";
        if (hour >= 21 || hour < 2) return "Asian";
      }
      return "Unknown";
    } catch {
      return "Unknown";
    }
  };

  // ============ TRADE EXTRACTION ============
  const extractTradesFromImage = async (imageData: string): Promise<ExtractedTradeData[]> => {
    setIsExtracting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-trade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract trades");
      }

      const data = await response.json();
      const trades: ExtractedTradeData[] = data.trades || [];
      
      if (trades.length === 0) {
        toast({
          title: "No Trades Found",
          description: "Could not extract any trades from the image. Please ensure the image shows clear trade data.",
          variant: "destructive",
        });
      }

      return trades;
    } catch (error) {
      console.error("Extract trades error:", error);
      toast({
        title: "Extraction Error",
        description: error instanceof Error ? error.message : "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsExtracting(false);
    }
  };

  // ============ CHAT HANDLING ============
  const handleSend = async () => {
    if (!input.trim() && !imagePreview) return;
    if (isLoading) return;

    setIsLoading(true);
    const userMessage: Message = { role: "user", content: input.trim(), image: imagePreview || undefined };
    setMessages(prev => [...prev, userMessage]);

    // If image is present, extract trades first
    if (imagePreview && uploadedImage) {
      const trades = await extractTradesFromImage(imagePreview);
      
      if (trades.length > 0) {
        setExtractedTrades(trades);
        const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
        
        const extractionMessage: Message = {
          role: "assistant",
          content: `🎯 **Found ${trades.length} trade${trades.length > 1 ? 's' : ''}!**\n\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n\nSelect an account and click **Save to Journal** to store them in your real journal database. 👇`,
          extractedTrades: trades
        };
        setMessages(prev => [...prev, extractionMessage]);
        setIsLoading(false);
        return;
      }
      // If extraction fails or no trades found, add extraction context to message for AI chat
      userMessage.content = input.trim() ? `${input}\n\n[User also shared an image - extraction found no trades]` : "Analyze this trade image";
      // Ensure image is preserved in the message for AI analysis
      userMessage.image = imagePreview;
    }

    // Build deep context + strategy rules
    const traderContext = await buildDeepTraderContext();
    const activeRules = strategyRules.filter(r => r.is_active).map(r => r.rule_text);

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    const chatMessages = messages.concat(userMessage).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Send image as separate imageBase64 parameter if present
    const requestBody: any = {
      messages: chatMessages,
      traderContext,
      strategyRules: activeRules.length > 0 ? activeRules : undefined,
    };
    
    if (userMessage.image) {
      requestBody.imageBase64 = userMessage.image;
    }

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        chartAnalysis: data.chartAnalysis,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setChartAnalysis(data.chartAnalysis || null);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setInput("");
      clearImage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) processImage(file);
        e.preventDefault();
        break;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  // ============ QUICK ACTIONS ============
  const quickActions = [
    { icon: TrendingUp, label: "Performance", query: "How am I performing this week?" },
    { icon: Target, label: "Mistakes", query: "What are my most common mistakes?" },
    { icon: Award, label: "Best setups", query: "What are my most profitable setups?" },
    { icon: BarChart3, label: "Analytics", query: "Show me my trading analytics" },
    { icon: Percent, label: "Win rate", query: "What's my current win rate?" },
    { icon: BookOpen, label: "Strategy", query: "Review my strategy rules" },
    { icon: Shield, label: "Risk", query: "Am I managing risk properly?" },
    { icon: Brain, label: "Mindset", query: "Help me improve my trading psychology" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            YUNIX AI Coach
          </h1>
        </div>
        
        {/* New Chat Button */}
        <div className="p-4">
          <Button onClick={startNewChat} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-4">
                <History className="h-4 w-4" />
                Chat History
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Chat History</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 mt-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-3 hover:bg-accent rounded cursor-pointer flex items-center justify-between group"
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => deleteConversation(e, conv.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Strategy Rules */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => setStrategyOpen(!strategyOpen)}
          >
            <Shield className="h-4 w-4" />
            Strategy Rules
            {strategyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
            <CollapsibleContent className="mt-2">
              <StrategyRulesPanel compact={true} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages */}
          <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3" onPaste={handlePaste}>
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {message.role === "user" && message.image && (
                    <img src={message.image} alt="User uploaded" className="max-h-48 rounded mb-2" />
                  )}
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Extracted Trades Display */}
            {extractedTrades.length > 0 && (
              <div className="bg-card border rounded-lg p-4 space-y-3 max-h-[480px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    📊 Extracted {extractedTrades.length} Trade{extractedTrades.length > 1 ? 's' : ''}
                  </h3>
                  <span className={`text-lg font-bold ${extractedTrades.reduce((sum, t) => sum + t.profit, 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {extractedTrades.reduce((sum, t) => sum + t.profit, 0) >= 0 ? '+' : ''}${extractedTrades.reduce((sum, t) => sum + t.profit, 0).toFixed(2)}
                  </span>
                </div>

                {/* Account Selection */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="prop-firm-select" className="text-sm">Account:</Label>
                  <Select value={selectedPropFirmId} onValueChange={setSelectedPropFirmId}>
                    <SelectTrigger id="prop-firm-select" className="w-48">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Account</SelectItem>
                      {propFirms
                        .filter((firm) => firm.state !== 'passed')
                        .map((firm) => (
                          <SelectItem key={firm.id} value={firm.id}>
                            {firm.name} ({firm.account_type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trades Table */}
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Time</TableHead>
                        <TableHead className="text-xs">Pair</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs text-right">Volume</TableHead>
                        <TableHead className="text-xs text-right">Entry</TableHead>
                        <TableHead className="text-xs text-right">Exit</TableHead>
                        <TableHead className="text-xs text-right">Pips</TableHead>
                        <TableHead className="text-xs text-right">P/L</TableHead>
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
                </ScrollArea>

                {/* Save Button */}
                <div className="flex gap-2">
                  <Button onClick={saveTradesToJournal} disabled={isSavingTrades} className="flex-1 gap-2">
                    <Save className="h-4 w-4" />
                    {isSavingTrades ? "Saving to Journal..." : `Save to Journal`}
                  </Button>
                  <Button variant="outline" onClick={() => setExtractedTrades([])}><X className="h-4 w-4" /></Button>
                </div>
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

        {/* Text Paste Mode */}
        {textPasteMode && (
          <div className="border-t border-border/50 p-3 space-y-3 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Trade Data Input
              </Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setTextPasteMode(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste your trade history here...&#10;Example:&#10;XAUUSD  TAKE_PROFIT  2026.04.23, 13:24:30&#10;0.02&#10;$4,729.72&#10;..."
              className="w-full h-48 p-3 text-xs font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isParsingText}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleTextPasteExtraction} 
                disabled={isParsingText || !pastedText.trim()}
                className="flex-1 gap-2"
              >
                {isParsingText ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Extract Trades from Text
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setPastedText(""); setTextPasteMode(false); }}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Works with copy-pasted trade history from MT4/MT5 or prop firm dashboards.
            </p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border/50 p-3 space-y-3">
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isLoading || textPasteMode} title="Upload screenshot (auto-detects)">
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button 
              variant={textPasteMode ? "default" : "outline"} 
              size="icon" 
              className="h-9 w-9 shrink-0" 
              onClick={() => setTextPasteMode(!textPasteMode)} 
              disabled={isLoading}
              title="Paste trade history text"
            >
              <FileText className="h-4 w-4" />
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
  </div>
  );
}
