import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, Upload, Shield, Loader2, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TradeData {
  pair: string;
  profit: number;
  trade_type: string | null;
  volume: number | null;
  entry_price: number | null;
  close_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  session: string | null;
  emotion_tag: string | null;
  rule_broken: boolean | null;
  mistake_tags: string[] | null;
  notes: string | null;
  trade_date: string;
}

interface TraderAssistPanelProps {
  trade: TradeData;
  screenshots: string[];
  propFirmName: string | null;
}

export default function TraderAssistPanel({ trade, screenshots, propFirmName }: TraderAssistPanelProps) {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showPermission, setShowPermission] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);

  const buildDomData = useCallback(() => {
    return {
      pair: trade.pair,
      trade_type: trade.trade_type,
      entry_price: trade.entry_price,
      close_price: trade.close_price,
      take_profit: trade.take_profit,
      stop_loss: trade.stop_loss,
      volume: trade.volume,
      session: trade.session,
      profit: trade.profit,
      account: propFirmName || "Personal",
    };
  }, [trade, propFirmName]);

  const buildJournalData = useCallback(() => {
    return {
      emotion_tag: trade.emotion_tag,
      rule_broken: trade.rule_broken,
      mistake_tags: trade.mistake_tags,
      notes: trade.notes,
      trade_date: trade.trade_date,
      profit: trade.profit,
    };
  }, [trade]);

  const handleAnalyze = () => {
    setShowPermission(true);
  };

  const handleUploadChart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setCustomImage(base64);
      toast({ title: "Chart uploaded", description: "Ready to analyze." });
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    setShowPermission(false);
    setAnalyzing(true);
    setAnalysis(null);

    try {
      // Get image: custom upload > first screenshot > null
      let imageBase64: string | null = customImage;

      if (!imageBase64 && selectedScreenshot) {
        // Fetch screenshot and convert to base64
        try {
          const resp = await fetch(selectedScreenshot);
          const blob = await resp.blob();
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          });
        } catch {
          // Continue without image
        }
      }

      if (!imageBase64 && screenshots.length > 0 && !selectedScreenshot) {
        try {
          const resp = await fetch(screenshots[0]);
          const blob = await resp.blob();
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          });
        } catch {
          // Continue without image
        }
      }

      const { data, error } = await supabase.functions.invoke("trader-assist-ai", {
        body: {
          imageBase64,
          domData: buildDomData(),
          journalData: buildJournalData(),
        },
      });

      if (error) throw error;

      if (data?.success) {
        setAnalysis(data.analysis);
      } else {
        throw new Error(data?.error || "Analysis failed");
      }
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message || "Could not analyze trade",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Extract verdict from analysis
  const getVerdictBadge = () => {
    if (!analysis) return null;
    if (analysis.includes("VALID ✅")) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">VALID ✅</Badge>;
    if (analysis.includes("WEAK ⚠️")) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">WEAK ⚠️</Badge>;
    if (analysis.includes("INVALID ❌")) return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">INVALID ❌</Badge>;
    return null;
  };

  return (
    <>
      <Card className="glow-card border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">Trader Assist AI</CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 w-full sm:w-auto"
                disabled={analyzing}
              >
                <ImageIcon className="h-4 w-4" />
                <label htmlFor="chart-upload" className="cursor-pointer">
                  Upload Chart
                </label>
                <input
                  id="chart-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadChart}
                />
              </Button>
              <Button
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="gap-1.5 w-full sm:w-auto"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {analyzing ? "Analyzing..." : "Analyze with AI"}
              </Button>
            </div>
          </div>
          {customImage && (
            <p className="text-xs text-primary mt-1">✓ Custom chart uploaded — will be used for analysis</p>
          )}
          {!customImage && screenshots.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Will use first trade screenshot for visual analysis
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!analysis && !analyzing && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click "Analyze with AI" to get expert trade feedback</p>
              <p className="text-xs mt-1">AI will analyze your chart, trade data, and journal notes</p>
            </div>
          )}

          {analyzing && (
            <div className="text-center py-8">
              <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing trade setup...</p>
              <p className="text-xs text-muted-foreground mt-1">Reading chart patterns + trade data + journal context</p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getVerdictBadge()}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:mt-1 [&_li]:text-sm [&_p]:text-sm">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyze}
                className="w-full sm:w-auto"
              >
                <Brain className="h-4 w-4 mr-1.5" />
                Re-analyze
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Dialog */}
      <Dialog open={showPermission} onOpenChange={setShowPermission}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              AI Trade Analysis
            </DialogTitle>
            <DialogDescription>
              YUNIX AI will analyze your trade using:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Chart screenshot (visual pattern recognition)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Trade data (pair, entry, SL, TP, profit)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Journal notes & emotion tags</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              No data is stored externally. Analysis is processed securely and not shared.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPermission(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={runAnalysis} className="w-full sm:w-auto">
              <Brain className="h-4 w-4 mr-1.5" />
              Analyze Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
