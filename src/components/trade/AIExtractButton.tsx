import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  RefreshCw,
  Save,
  Loader2,
  Camera,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  extractTradeData,
  convertToTradeRecord,
  type ExtractedTrade,
  type ExtractionResult,
} from "@/lib/aiTradeExtraction";
import { supabase } from "@/integrations/supabase/client";

interface AIExtractButtonProps {
  userId: string;
  onTradesExtracted: (trades: any[]) => void;
  propFirmId?: string | null;
  cycleId?: string | null;
}

export function AIExtractButton({
  userId,
  onTradesExtracted,
  propFirmId,
  cycleId,
}: AIExtractButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setError(null);
          await extractTrades(file);
        } else {
          setError("Please upload an image file (PNG, JPG, JPEG)");
        }
      }
    },
    [userId]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.type.startsWith("image/")) {
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setError(null);
          await extractTrades(file);
        } else {
          setError("Please upload an image file (PNG, JPG, JPEG)");
        }
      }
    },
    [userId]
  );

  const extractTrades = async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setExtractionResult(null);

    try {
      const result = await extractTradeData(file);
      setExtractionResult(result);

      if (result.trades.length === 0) {
        setError("No trades found in the screenshot. Please try a clearer image.");
      } else {
        toast({
          title: "Trades Extracted",
          description: `Found ${result.trades.length} trade${result.trades.length > 1 ? "s" : ""} using ${result.metadata?.provider === "gemini" ? "Gemini AI" : "OpenRouter AI"}`,
        });
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract trades. Please try again."
      );
      toast({
        title: "Extraction Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("trade-screenshots")
        .upload(fileName, file);

      if (uploadError) {
        // If bucket doesn't exist, try without bucket prefix
        if (uploadError.message?.includes("bucket")) {
          console.warn("Storage bucket may not exist, continuing without screenshot URL");
          return null;
        }
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("trade-screenshots").getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.warn("Screenshot upload failed:", err);
      return null;
    }
  };

  const handleSaveTrades = async () => {
    if (!extractionResult?.trades.length || !selectedFile) return;

    setIsSaving(true);

    try {
      // Upload screenshot first
      const screenshotUrl = await uploadScreenshot(selectedFile);

      // Convert and save each trade
      const savedTrades = [];
      for (const extractedTrade of extractionResult.trades) {
        const tradeRecord = convertToTradeRecord(
          extractedTrade,
          userId,
          screenshotUrl,
          propFirmId,
          cycleId
        );

        const { data, error: insertError } = await supabase
          .from("trades")
          .insert(tradeRecord as any)
          .select()
          .single();

        if (insertError) throw insertError;
        savedTrades.push(data);
      }

      toast({
        title: "Trades Saved",
        description: `Successfully added ${savedTrades.length} trade${savedTrades.length > 1 ? "s" : ""} to your journal`,
      });

      onTradesExtracted(savedTrades);
      handleClose();
    } catch (err) {
      console.error("Save error:", err);
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Failed to save trades",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractionResult(null);
    setError(null);
    setIsExtracting(false);
    setIsSaving(false);
  };

  const handleRetry = () => {
    if (selectedFile) {
      extractTrades(selectedFile);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        Extract from Screenshot
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Extract Trades from Screenshot
            </DialogTitle>
            <DialogDescription>
              Upload a screenshot of your trade history and AI will extract the
              trade details automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Upload Area */}
          {!selectedFile && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your screenshot here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: PNG, JPG, JPEG
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="screenshot-upload"
              />
              <label htmlFor="screenshot-upload">
                <Button variant="secondary" className="mt-4" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="rounded-lg border max-h-64 object-contain mx-auto"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setExtractionResult(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isExtracting && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing screenshot with AI...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Trying Gemini 1.5 Flash first, then OpenRouter fallback if needed
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isExtracting && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Extraction Failed
                  </p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="mt-3 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Results */}
          {extractionResult && extractionResult.trades.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    Found {extractionResult.trades.length} Trade
                    {extractionResult.trades.length > 1 ? "s" : ""}
                  </span>
                </div>
                <Badge variant="secondary">
                  {extractionResult.metadata?.provider === "gemini"
                    ? "Gemini AI"
                    : "OpenRouter AI"}
                </Badge>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {extractionResult.trades.map((trade, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{trade.symbol}</Badge>
                          <span
                            className={`text-sm font-medium ${
                              trade.outcome === "Win"
                                ? "text-green-500"
                                : trade.outcome === "Loss"
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {trade.outcome === "Win" ? (
                              <TrendingUp className="h-4 w-4 inline mr-1" />
                            ) : trade.outcome === "Loss" ? (
                              <TrendingDown className="h-4 w-4 inline mr-1" />
                            ) : null}
                            ${trade.net_pnl.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {trade.type}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>
                            Entry: {trade.entry_price} → Exit:{" "}
                            {trade.exit_price}
                          </span>
                          <span>Size: {trade.amount || trade.volume || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>
                            {trade.entry_time.split(" ")[1]} -{" "}
                            {trade.exit_time.split(" ")[1]}
                          </span>
                          <span>Duration: {trade.duration || "-"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveTrades}
                  disabled={isSaving}
                  className="flex-1 gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save to Journal
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setExtractionResult(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
