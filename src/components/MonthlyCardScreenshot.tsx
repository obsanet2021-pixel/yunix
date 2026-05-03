import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Download, Twitter, Instagram, Share2, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Dynamically import html2canvas to avoid build errors
let html2canvas: typeof import('html2canvas') | null = null;

interface MonthlyCardScreenshotProps {
  currentMonth: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string;
  totalProfit: number;
  totalTradingDays: number;
  invitationCode?: string;
  children: React.ReactNode;
}

export function MonthlyCardScreenshot({
  currentMonth,
  totalTrades,
  winningTrades,
  losingTrades,
  winRate,
  totalProfit,
  totalTradingDays,
  invitationCode,
  children
}: MonthlyCardScreenshotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [html2canvasLoaded, setHtml2canvasLoaded] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const brandedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Dynamically load html2canvas
  useEffect(() => {
    const loadHtml2Canvas = async () => {
      try {
        const module = await import('html2canvas');
        html2canvas = module.default || module;
        setHtml2canvasLoaded(true);
      } catch (error) {
        console.error('Failed to load html2canvas:', error);
        toast({ 
          title: "Library not loaded", 
          description: "Please run 'npm install' to enable screenshot functionality.", 
          variant: "destructive" 
        });
      }
    };
    loadHtml2Canvas();
  }, [toast]);

  const getPnLColor = (profit: number) => {
    if (profit > 0) return "text-green-500";
    if (profit < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const captureCalendar = async () => {
    if (!captureRef.current || !html2canvas) {
      toast({ title: "Error", description: "Screenshot library not loaded. Please run 'npm install html2canvas'.", variant: "destructive" });
      return;
    }
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        logging: false,
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      setCapturedImage(image);
      toast({ title: "Calendar captured!", description: "Your monthly calendar has been captured." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to capture calendar", variant: "destructive" });
    } finally {
      setIsCapturing(false);
    }
  };

  const generateBrandedImage = async () => {
    if (!brandedRef.current || !html2canvas) {
      toast({ title: "Error", description: "Screenshot library not loaded. Please run 'npm install html2canvas'.", variant: "destructive" });
      return;
    }
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(brandedRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      setCapturedImage(image);
      toast({ title: "Branded image created!", description: "Share-ready image generated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate image", variant: "destructive" });
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadImage = () => {
    if (!capturedImage) return;
    const link = document.createElement("a");
    link.download = `yunix-calendar-${format(currentMonth, "yyyy-MM")}.png`;
    link.href = capturedImage;
    link.click();
    toast({ title: "Downloaded!", description: "Image saved to your device." });
  };

  const shareToTwitter = () => {
    if (!capturedImage) return;
    const text = invitationCode
      ? `Check out my ${format(currentMonth, "MMMM yyyy")} trading performance on Yunix! 📈 Join with my invite code: ${invitationCode}`
      : `Check out my ${format(currentMonth, "MMMM yyyy")} trading performance on Yunix! 📈`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast({ 
      title: "Twitter opened", 
      description: "Attach the downloaded image to your tweet." 
    });
  };

  const shareToInstagram = async () => {
    if (!capturedImage) return;
    
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], `yunix-${format(currentMonth, "yyyy-MM")}.png`, { type: "image/png" });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My Yunix Trading Performance",
            text: invitationCode 
              ? `Check out my trading stats! Join Yunix with code: ${invitationCode}`
              : "Check out my trading stats on Yunix!"
          });
          return;
        }
      } catch (error) {
        console.error("Native share failed:", error);
      }
    }
    
    downloadImage();
    toast({ 
      title: "Image ready for Instagram", 
      description: "The image has been downloaded. Open Instagram and share it to your story or feed!" 
    });
  };

  const nativeShare = async () => {
    if (!capturedImage) return;
    
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `yunix-${format(currentMonth, "yyyy-MM")}.png`, { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My Yunix Trading Performance",
          text: invitationCode 
            ? `My ${format(currentMonth, "MMMM yyyy")} trading stats! Join Yunix: ${invitationCode}`
            : `My ${format(currentMonth, "MMMM yyyy")} trading stats!`
        });
      } else {
        downloadImage();
      }
    } catch (error) {
      downloadImage();
    }
  };

  return (
    <>
      <div className="absolute -left-[9999px] top-0">
        <div ref={captureRef} className="p-6 bg-[#0a0a0a] rounded-xl w-[400px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">Y</span>
              </div>
              <span className="font-bold text-white">Yunix</span>
            </div>
            <span className="text-sm text-muted-foreground">{format(currentMonth, "MMMM yyyy")}</span>
          </div>
          {children}
          <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalTradingDays} trading days</span>
            {invitationCode && <span>Code: {invitationCode}</span>}
          </div>
        </div>

        <div ref={brandedRef} className="p-8 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] rounded-2xl w-[420px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Yunix</h1>
                <p className="text-xs text-muted-foreground">Trade Smarter</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Period</p>
              <p className="text-white font-semibold">{format(currentMonth, "MMMM yyyy")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
              <p className={`text-2xl font-bold ${getPnLColor(totalProfit)}`}>
                {totalProfit >= 0 ? "+" : "-"}${Math.abs(totalProfit).toFixed(0)}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-white">{winRate}%</p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
              <p className="text-2xl font-bold text-white">{totalTrades}</p>
              <p className="text-xs text-muted-foreground">{winningTrades}W / {losingTrades}L</p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
              <p className="text-xs text-muted-foreground mb-1">Trading Days</p>
              <p className="text-2xl font-bold text-white">{totalTradingDays}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <p className="text-xs text-muted-foreground">yunix.trade</p>
            {invitationCode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Join with code:</span>
                <span className="text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded">{invitationCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="h-8">
        <Camera className="h-4 w-4 mr-1" />
        {invitationCode ? `Share (${invitationCode})` : "Share"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Share Your Performance
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!capturedImage ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Choose how you want to capture your trading performance
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={captureCalendar}
                    disabled={isCapturing || !html2canvasLoaded}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">Calendar View</p>
                      <p className="text-xs text-muted-foreground">
                        {html2canvasLoaded ? "Capture monthly calendar" : "Loading library..."}
                      </p>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={generateBrandedImage}
                    disabled={isCapturing || !html2canvasLoaded}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Share2 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">Branded Card</p>
                      <p className="text-xs text-muted-foreground">
                        {html2canvasLoaded ? "Yunix branded stats" : "Loading library..."}
                      </p>
                    </div>
                  </Button>
                </div>
                {!html2canvasLoaded && (
                  <p className="text-xs text-center text-destructive">
                    Please run <code className="bg-muted px-1 rounded">npm install html2canvas</code> to enable screenshots
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={capturedImage} 
                    alt="Captured performance" 
                    className="w-full h-auto"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={downloadImage} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={nativeShare} variant="secondary" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-3 text-center">Share to social media</p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={shareToTwitter}
                      className="flex-1 bg-[#1DA1F2]/10 border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/20 text-[#1DA1F2]"
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter/X
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={shareToInstagram}
                      className="flex-1 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border-pink-500/30 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-orange-500/20"
                    >
                      <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                      Instagram
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
