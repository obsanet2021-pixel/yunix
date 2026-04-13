import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, Play, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getEmotionTagStyle, getMistakeTagLabel, EMOTION_TAGS } from "@/lib/tradeCalculations";
import TraderAssistPanel from "@/components/TraderAssistPanel";

interface Trade {
  id: string;
  pair: string;
  profit: number;
  session: string | null;
  emotion: string | null;
  notes: string | null;
  trade_date: string;
  prop_firm_id: string | null;
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

interface PropFirm {
  name: string;
}

export default function JournalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [propFirmName, setPropFirmName] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchTradeDetails();
  }, [id]);

  const fetchTradeDetails = async () => {
    if (!id) {
      navigate("/app/trade-journal");
      return;
    }

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load trade details",
        variant: "destructive",
      });
      navigate("/app/trade-journal");
      return;
    }

    if (!data) {
      toast({
        title: "Trade Not Found",
        description: "This trade doesn't exist or has been deleted",
        variant: "destructive",
      });
      navigate("/app/trade-journal");
      return;
    }

    setTrade(data);
    
    // Set screenshots from either new array or legacy single screenshot
    const existingScreenshots = data.screenshots || (data.screenshot_url ? [data.screenshot_url] : []);
    setScreenshots(existingScreenshots);

    if (data.prop_firm_id) {
      const { data: propFirm } = await supabase
        .from("prop_firms")
        .select("name")
        .eq("id", data.prop_firm_id)
        .maybeSingle();

      if (propFirm) {
        setPropFirmName(propFirm.name);
      }
    }
  };

  // Shared function to process and upload files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedUrls: string[] = [];
      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file.type.startsWith('image/')) continue;
        
        const fileExt = file.name?.split(".").pop() || 'png';
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("prop-firm-screenshots")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("prop-firm-screenshots")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length === 0) {
        toast({
          title: "No images",
          description: "No valid image files found",
          variant: "destructive",
        });
        return;
      }

      const newScreenshots = [...screenshots, ...uploadedUrls];
      setScreenshots(newScreenshots);

      // Update database
      await supabase
        .from("trades")
        .update({ screenshots: newScreenshots })
        .eq("id", id);

      toast({
        title: "Success",
        description: `${uploadedUrls.length} screenshot(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload screenshots",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [screenshots, id, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) await processFiles(files);
  };

  // Drag and drop handlers
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        const imageFiles = Array.from(items)
          .filter(item => item.type.startsWith('image/'))
          .map(item => item.getAsFile())
          .filter(Boolean) as File[];
        if (imageFiles.length > 0) {
          await processFiles(imageFiles);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const handleRemoveScreenshot = async (urlToRemove: string) => {
    const newScreenshots = screenshots.filter(url => url !== urlToRemove);
    setScreenshots(newScreenshots);

    await supabase
      .from("trades")
      .update({ screenshots: newScreenshots })
      .eq("id", id);

    toast({
      title: "Success",
      description: "Screenshot removed",
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({
      title: "Video Upload",
      description: "Video upload via Cloudflare Stream coming soon",
    });
  };

  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <TrendingUp className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Trade Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This trade doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/app/trade-journal")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trade Journal
          </Button>
        </div>
      </div>
    );
  }

  const isProfit = trade.profit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/trade-journal")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Trade Details</h1>
          <p className="text-muted-foreground">View and manage your trade</p>
        </div>
      </div>

      {/* Trade Details Card */}
      <Card className="glow-card">
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pair</p>
              <p className="text-lg font-semibold">{trade.pair}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              {trade.trade_type ? (
                <Badge variant="outline" className={trade.trade_type === 'Buy' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}>
                  {trade.trade_type}
                </Badge>
              ) : (
                <p className="text-lg font-semibold">—</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volume</p>
              <p className="text-lg font-semibold font-mono">{trade.volume?.toFixed(2) || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit/Loss</p>
              <div className="flex items-center gap-2">
                {isProfit ? (
                  <TrendingUp className="h-4 w-4 text-secondary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <p className={`text-lg font-semibold ${isProfit ? 'text-secondary' : 'text-destructive'}`}>
                  ${trade.profit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Entry Price</p>
              <p className="text-lg font-semibold font-mono">{trade.entry_price?.toFixed(5) || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Close Price</p>
              <p className="text-lg font-semibold font-mono">{trade.close_price?.toFixed(5) || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Take Profit</p>
              <p className="text-lg font-semibold font-mono text-green-500">{trade.take_profit?.toFixed(5) || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stop Loss</p>
              <p className="text-lg font-semibold font-mono text-red-500">{trade.stop_loss?.toFixed(5) || "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-lg font-semibold">{new Date(trade.trade_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Session</p>
              <Badge variant="outline">{trade.session || "N/A"}</Badge>
            </div>
            {propFirmName && (
              <div>
                <p className="text-sm text-muted-foreground">Account</p>
                <p className="text-lg font-semibold">{propFirmName}</p>
              </div>
            )}
          </div>

          {trade.emotion_tag && (
            <div>
              <p className="text-sm text-muted-foreground">Emotion</p>
              <Badge className={getEmotionTagStyle(trade.emotion_tag)}>
                {EMOTION_TAGS.find(e => e.value === trade.emotion_tag)?.label || trade.emotion_tag}
              </Badge>
            </div>
          )}

          {trade.emotion && !trade.emotion_tag && (
            <div>
              <p className="text-sm text-muted-foreground">Emotion (Legacy)</p>
              <Badge variant="outline">{trade.emotion}</Badge>
            </div>
          )}

          {/* Rule Broken & Mistake Tags */}
          {trade.rule_broken && (
            <div className="col-span-full p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Rules Broken</span>
              </div>
              {trade.mistake_tags && trade.mistake_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {trade.mistake_tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="text-xs bg-destructive/10 text-destructive border-destructive/30"
                    >
                      {getMistakeTagLabel(tag)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {trade.notes && (
            <div className="col-span-full">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-base leading-relaxed">{trade.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Block */}
      <Card className="glow-card">
        <CardHeader>
          <CardTitle>Trade Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Win/Loss</p>
              <p className="text-2xl font-bold">{isProfit ? "WIN" : "LOSS"}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Amount</p>
              <p className="text-2xl font-bold">${Math.abs(trade.profit).toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Session</p>
              <p className="text-2xl font-bold">{trade.session || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trader Assist AI */}
      <TraderAssistPanel
        trade={trade}
        screenshots={screenshots}
        propFirmName={propFirmName}
      />

      {/* Media Section */}
      <Card 
        className={`glow-card transition-all ${isDragging ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Media</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 h-8 sm:h-9 w-full sm:w-auto" disabled={uploading}>
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <label htmlFor="screenshot-upload" className="cursor-pointer truncate">
                  {uploading ? "Uploading..." : "Screenshots"}
                </label>
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 h-8 sm:h-9 w-full sm:w-auto">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <label htmlFor="video-upload" className="cursor-pointer truncate">
                  Video
                </label>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Drag & drop or paste (Ctrl+V) images here
          </p>
        </CardHeader>
        <CardContent>
          {screenshots.length === 0 && !trade.video_url ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No media uploaded yet</p>
              <p className="text-sm mt-2">Add screenshots or videos to document your trade</p>
            </div>
          ) : (
            <>
              {/* Screenshots Gallery */}
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {screenshots.map((url, index) => (
                    <div key={index} className="relative group">
                      <div 
                        className="aspect-square rounded-lg overflow-hidden border border-border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => setSelectedImage(url)}
                      >
                        <img 
                          src={url} 
                          alt={`Trade screenshot ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveScreenshot(url)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Video Player */}
              {trade.video_url && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Trade Video</p>
                  <div className="aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                    <video controls className="w-full h-full">
                      <source src={trade.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Full size screenshot"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
