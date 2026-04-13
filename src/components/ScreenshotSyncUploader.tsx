import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, CheckCircle, Edit, Loader2, X } from "lucide-react";

interface PropFirm {
  id: string;
  name: string;
}

interface ExtractedData {
  balance?: number;
  equity?: number;
  floating_pnl?: number;
  margin_used?: number;
  free_margin?: number;
  open_trades?: number;
}

interface ScreenshotSyncUploaderProps {
  propFirms: PropFirm[];
  onSyncComplete?: () => void;
}

export default function ScreenshotSyncUploader({ propFirms, onSyncComplete }: ScreenshotSyncUploaderProps) {
  const [selectedFirmId, setSelectedFirmId] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<ExtractedData>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    setExtracted(null);
    setEditing(false);
  };

  const handleExtract = async () => {
    if (!imagePreview) return;
    setExtracting(true);
    try {
      const base64 = imagePreview.includes(",") ? imagePreview.split(",")[1] : imagePreview;
      const res = await supabase.functions.invoke("screenshot-parser", {
        body: { imageBase64: base64 }
      });
      if (res.data?.success && res.data?.data) {
        setExtracted(res.data.data);
        setEditData(res.data.data);
      } else {
        toast({ title: "Could not extract data", description: "Try a clearer screenshot.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Extraction failed", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    const data = editing ? editData : extracted;
    if (!data) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload screenshot
      let screenshotUrl: string | null = null;
      if (file) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("prop-firm-screenshots").upload(fileName, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("prop-firm-screenshots").getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("account_snapshots").insert({
        user_id: user.id,
        prop_firm_id: selectedFirmId || null,
        balance: data.balance,
        equity: data.equity,
        floating_pnl: data.floating_pnl,
        margin_used: data.margin_used,
        free_margin: data.free_margin,
        open_trades: data.open_trades,
        screenshot_url: screenshotUrl,
        extracted_data: data as any,
      });

      if (error) throw error;

      toast({ title: "Snapshot saved! ✅" });
      setExtracted(null);
      setImagePreview(null);
      setFile(null);
      setEditing(false);
      onSyncComplete?.();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    setImagePreview(null);
    setFile(null);
    setExtracted(null);
    setEditing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card className="glow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Screenshot Account Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Upload a screenshot of your trading platform to sync your account data using AI vision.
        </p>

        <div className="space-y-2">
          <Label className="text-xs">Account (optional)</Label>
          <Select value={selectedFirmId} onValueChange={setSelectedFirmId}>
            <SelectTrigger><SelectValue placeholder="Link to account" /></SelectTrigger>
            <SelectContent>
              {propFirms.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!imagePreview ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
            <p className="text-xs text-muted-foreground mt-1">MT4, MT5, cTrader, TradingView</p>
          </div>
        ) : (
          <div className="relative">
            <img src={imagePreview} alt="Screenshot" className="rounded-lg w-full max-h-48 object-contain bg-muted" />
            <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={clear}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <Input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        {imagePreview && !extracted && (
          <Button onClick={handleExtract} disabled={extracting} className="w-full gap-2">
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {extracting ? "Analyzing..." : "Extract Account Data"}
          </Button>
        )}

        {extracted && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Detected Information</p>
              {(editing ? Object.entries(editData) : Object.entries(extracted)).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  {editing ? (
                    <Input
                      type="number"
                      step="any"
                      value={val ?? ""}
                      onChange={e => setEditData(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-28 h-7 text-right text-xs"
                    />
                  ) : (
                    <span className="font-mono font-medium">{typeof val === "number" ? `$${val.toFixed(2)}` : val}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-1">
                <Edit className="h-3 w-3" /> {editing ? "Preview" : "Edit"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 gap-1">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                {saving ? "Saving..." : "Confirm & Save"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
