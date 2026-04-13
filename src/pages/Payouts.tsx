import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, X, Upload, Loader2, Image as ImageIcon, DollarSign, Calendar, Building2, User } from "lucide-react";
import { format } from "date-fns";

interface Payout {
  id: string;
  user_id: string;
  prop_firm_id: string | null;
  amount: number | null;
  payout_date: string | null;
  trader_name: string | null;
  firm_name: string | null;
  certificate_url: string;
  extracted_data: any;
  notes: string | null;
  created_at: string;
}

export default function Payouts() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ trader_name: "", firm_name: "", amount: "", payout_date: "", notes: "" });
  const [extracting, setExtracting] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ url: string; extracted: any } | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("payouts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayouts((data as Payout[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payout-certificates")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("payout-certificates")
        .getPublicUrl(path);

      // AI extraction
      setExtracting(true);
      let extracted: any = {};
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(file);
        });

        const { data: aiData } = await supabase.functions.invoke("screenshot-parser", {
          body: { imageBase64: base64 },
        });
        if (aiData?.success && aiData?.data) {
          extracted = aiData.data;
        }
      } catch { /* AI extraction failed, user can fill manually */ }
      setExtracting(false);

      setPendingUpload({ url: urlData.publicUrl, extracted });
      setEditForm({
        trader_name: extracted.trader_name || extracted.name || "",
        firm_name: extracted.firm_name || extracted.firm || "",
        amount: extracted.amount?.toString() || extracted.payout_amount?.toString() || "",
        payout_date: extracted.payout_date || extracted.date || new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowUploadForm(true);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const savePayout = async () => {
    if (!pendingUpload) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("payouts").insert({
      user_id: user.id,
      certificate_url: pendingUpload.url,
      trader_name: editForm.trader_name || null,
      firm_name: editForm.firm_name || null,
      amount: editForm.amount ? parseFloat(editForm.amount) : null,
      payout_date: editForm.payout_date || null,
      extracted_data: pendingUpload.extracted,
      notes: editForm.notes || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payout saved!" });
    setShowUploadForm(false);
    setPendingUpload(null);
    fetchPayouts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payouts").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payout deleted" });
    setGalleryOpen(false);
    setSelectedPayout(null);
    fetchPayouts();
  };

  const handleEdit = (payout: Payout) => {
    setEditForm({
      trader_name: payout.trader_name || "",
      firm_name: payout.firm_name || "",
      amount: payout.amount?.toString() || "",
      payout_date: payout.payout_date || "",
      notes: payout.notes || "",
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!selectedPayout) return;
    const { error } = await supabase.from("payouts").update({
      trader_name: editForm.trader_name || null,
      firm_name: editForm.firm_name || null,
      amount: editForm.amount ? parseFloat(editForm.amount) : null,
      payout_date: editForm.payout_date || null,
      notes: editForm.notes || null,
    }).eq("id", selectedPayout.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payout updated!" });
    setEditMode(false);
    setGalleryOpen(false);
    fetchPayouts();
  };

  const totalPayouts = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Payouts</h1>
          <p className="text-sm text-muted-foreground">Track your payout certificates</p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading || extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="hidden sm:inline">Add Payout</span>
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {/* Total Payout Summary */}
      <Card className="glow-card bg-card border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Payouts</p>
            <p className="text-2xl font-bold font-mono text-primary">${totalPayouts.toLocaleString()}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-muted-foreground">Certificates</p>
            <p className="text-2xl font-bold">{payouts.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payout Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : payouts.length === 0 ? (
        <Card className="glow-card">
          <CardContent className="p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No payout certificates yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload your first payout proof to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-3 sm:space-y-0">
          {payouts.map((payout) => (
            <Card
              key={payout.id}
              className="glow-card cursor-pointer overflow-hidden group"
              onClick={() => { setSelectedPayout(payout); setGalleryOpen(true); setEditMode(false); }}
            >
              <CardContent className="p-3 flex items-center gap-3">
                {/* Square Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted/20 shrink-0">
                  <img
                    src={payout.certificate_url}
                    alt="Payout certificate"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm truncate">
                    {payout.firm_name || "Unknown Firm"}
                  </p>
                  {payout.amount && (
                    <p className="text-primary font-bold font-mono text-sm">
                      ${payout.amount.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {payout.trader_name && (
                      <span className="truncate flex items-center gap-1">
                        <User className="h-3 w-3 shrink-0" />
                        {payout.trader_name}
                      </span>
                    )}
                    {payout.payout_date && (
                      <span className="shrink-0">
                        {format(new Date(payout.payout_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Form Dialog */}
      <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payout Certificate</DialogTitle>
          </DialogHeader>
          {pendingUpload && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden h-40 bg-muted/20">
                <img src={pendingUpload.url} alt="Certificate" className="w-full h-full object-cover" />
              </div>
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI is reading your certificate...
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Trader Name</Label>
                  <Input value={editForm.trader_name} onChange={(e) => setEditForm({ ...editForm, trader_name: e.target.value })} placeholder="Your name" />
                </div>
                <div>
                  <Label className="text-xs">Firm Name</Label>
                  <Input value={editForm.firm_name} onChange={(e) => setEditForm({ ...editForm, firm_name: e.target.value })} placeholder="Prop firm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Amount ($)</Label>
                    <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={editForm.payout_date} onChange={(e) => setEditForm({ ...editForm, payout_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Any notes..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowUploadForm(false); setPendingUpload(null); }}>Cancel</Button>
                <Button className="flex-1" onClick={savePayout}>Save Payout</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={(open) => { setGalleryOpen(open); if (!open) { setEditMode(false); setSelectedPayout(null); } }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedPayout && (
            <div>
              {/* Certificate Image */}
              <div className="relative bg-muted/10">
                <img
                  src={selectedPayout.certificate_url}
                  alt="Payout certificate"
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Info & Actions */}
              <div className="p-4 space-y-3">
                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Trader Name</Label>
                      <Input value={editForm.trader_name} onChange={(e) => setEditForm({ ...editForm, trader_name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Firm Name</Label>
                      <Input value={editForm.firm_name} onChange={(e) => setEditForm({ ...editForm, firm_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Amount ($)</Label>
                        <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input type="date" value={editForm.payout_date} onChange={(e) => setEditForm({ ...editForm, payout_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
                      <Button className="flex-1" onClick={saveEdit}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      {selectedPayout.firm_name && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{selectedPayout.firm_name}</span>
                        </div>
                      )}
                      {selectedPayout.trader_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedPayout.trader_name}</span>
                        </div>
                      )}
                      {selectedPayout.amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="font-bold text-primary font-mono">${selectedPayout.amount.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedPayout.payout_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{format(new Date(selectedPayout.payout_date), "MMMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => handleEdit(selectedPayout)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleDelete(selectedPayout.id)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
