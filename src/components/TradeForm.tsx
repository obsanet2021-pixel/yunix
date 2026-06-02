import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, AlertTriangle, Loader2 } from "lucide-react";
import { EMOTION_TAGS, MISTAKE_TAGS } from "@/lib/tradeCalculations";
import { usePlaybooks, getPlaybookColorClass } from "@/hooks/usePlaybooks";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  showPlaybookSelector?: boolean;
  propFirms?: any[];
  getCyclesForFirm?: (id: string) => any[];
  getActiveCycleForFirm?: (id: string) => any | null;
  onSubmitLabel?: string;
  onSubmitDisabled?: boolean;
  // Screenshot
  screenshot?: File | null;
  onScreenshotChange?: (file: File | null) => void;
  existingScreenshotUrl?: string | null;
  // Import buttons (only shown in Add flow)
  onHtmlUpload?: (file: File | undefined) => void;
  onExcelUpload?: (file: File | undefined) => void;
  isParsingFile?: boolean;
}

const SESSIONS = ["London", "New York", "Asia", "Pre-market", "London/NY Overlap"];

export default function TradeForm({
  formData,
  setFormData,
  propFirms = [],
  getCyclesForFirm,
  getActiveCycleForFirm,
  onSubmitLabel = "Save",
  onSubmitDisabled = false,
  screenshot,
  onScreenshotChange,
  existingScreenshotUrl,
  onHtmlUpload,
  onExcelUpload,
  isParsingFile = false,
  showPlaybookSelector = true,
}: Props) {
  const set = (patch: any) => setFormData({ ...formData, ...patch });
  const { playbooks } = usePlaybooks();

  // Two-step firm → account selection
  const normalizeCase = (s: string) => s.trim().toLowerCase();
  const uniqueFirmNames = (() => {
    const map = new Map<string, string>();
    propFirms.forEach(f => {
      const key = normalizeCase(f.name);
      if (!map.has(key)) map.set(key, f.name);
    });
    return Array.from(map.values());
  })();

  // Derive selected firm name from prop_firm_id
  const selectedFirm = propFirms.find(f => f.id === formData.prop_firm_id);
  const selectedFirmName = selectedFirm?.name ?? "";
  const accountsForFirm = propFirms.filter(
    f => normalizeCase(f.name) === normalizeCase(selectedFirmName)
  );

  const isFunded = selectedFirm?.account_type === "Funded";
  const firmCycles = formData.prop_firm_id && getCyclesForFirm ? getCyclesForFirm(formData.prop_firm_id) : [];
  const activeCycle = formData.prop_firm_id && getActiveCycleForFirm ? getActiveCycleForFirm(formData.prop_firm_id) : null;

  return (
    <div className="space-y-4 pt-2">

      {/* ── Prop firm (two-step) ── */}
      {propFirms.length > 0 && (
        <>
          <div className="space-y-2">
            <Label>Prop Firm (Optional)</Label>
            <Select
              value={selectedFirmName || "none"}
              onValueChange={(name) => {
                if (name === "none") set({ prop_firm_id: "", cycle_id: "" });
                else {
                  // pick first account of this firm by default
                  const first = propFirms.find(f => normalizeCase(f.name) === normalizeCase(name));
                  set({ prop_firm_id: first?.id ?? "", cycle_id: "" });
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select prop firm" /></SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="none">None</SelectItem>
                {uniqueFirmNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFirmName && selectedFirmName !== "none" && accountsForFirm.length > 1 && (
            <div className="space-y-2">
              <Label>Account</Label>
              <Select
                value={formData.prop_firm_id}
                onValueChange={id => set({ prop_firm_id: id, cycle_id: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent className="z-50">
                  {accountsForFirm.map(firm => (
                    <SelectItem key={firm.id} value={firm.id}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          firm.account_type === "Funded" ? "bg-green-500/20 text-green-400" :
                          firm.account_type === "Evaluation 1" ? "bg-blue-500/20 text-blue-400" :
                          firm.account_type === "Evaluation 2" ? "bg-purple-500/20 text-purple-400" :
                          "bg-slate-500/20 text-slate-400"
                        }`}>{firm.account_type || "Personal"}</span>
                        <span className="text-xs text-muted-foreground">${(firm.balance || 0).toLocaleString()}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isFunded && firmCycles.length > 0 && (
            <div className="space-y-1">
              <Label>Cycle <span className="text-muted-foreground text-xs">(optional — for backlogging)</span></Label>
              <Select
                value={formData.cycle_id || "active"}
                onValueChange={v => set({ cycle_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="active">
                    Active Cycle{activeCycle ? ` #${activeCycle.cycle_number}` : ""} (auto)
                  </SelectItem>
                  {firmCycles.filter((c: any) => c.status !== "active").map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      Cycle #{c.cycle_number} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Separator />
        </>
      )}

      {/* ── Trade details ── */}
      <div className="space-y-2">
        <Label>Currency Pair *</Label>
        <Input value={formData.pair || ""} onChange={e => set({ pair: e.target.value })} placeholder="e.g. EUR/USD, XAUUSD" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.trade_type || ""} onValueChange={v => set({ trade_type: v })}>
            <SelectTrigger><SelectValue placeholder="Buy / Sell" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Buy">Buy</SelectItem>
              <SelectItem value="Sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Volume (Lots)</Label>
          <Input type="number" step="0.01" value={formData.volume || ""} onChange={e => set({ volume: e.target.value })} placeholder="0.10" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Entry Price</Label>
          <Input type="number" step="0.00001" value={formData.entry_price || ""} onChange={e => set({ entry_price: e.target.value })} placeholder="1925.50" />
        </div>
        <div className="space-y-2">
          <Label>Close Price</Label>
          <Input type="number" step="0.00001" value={formData.close_price || ""} onChange={e => set({ close_price: e.target.value })} placeholder="1930.50" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Take Profit</Label>
          <Input type="number" step="0.00001" value={formData.take_profit || ""} onChange={e => set({ take_profit: e.target.value })} placeholder="TP price" />
        </div>
        <div className="space-y-2">
          <Label>Stop Loss</Label>
          <Input type="number" step="0.00001" value={formData.stop_loss || ""} onChange={e => set({ stop_loss: e.target.value })} placeholder="SL price" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Profit/Loss ($) *</Label>
        <Input type="number" step="0.01" value={formData.profit || ""} onChange={e => set({ profit: e.target.value })} placeholder="150.00 or -50.00" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Session</Label>
          <Select value={formData.session || ""} onValueChange={v => set({ session: v })}>
            <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={formData.trade_date || new Date().toISOString().split("T")[0]} onChange={e => set({ trade_date: e.target.value })} required />
        </div>
      </div>

      <Separator />

      {/* ── Playbook ── */}
      {showPlaybookSelector && playbooks.length > 0 && (
        <div className="space-y-2">
          <Label>Playbook <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Select
            value={formData.playbook_id || "none"}
            onValueChange={v => set({ playbook_id: v === "none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tag to a playbook..." />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="none">No playbook</SelectItem>
              {playbooks.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${getPlaybookColorClass(p.color).split(" ")[0]}`} />
                    <span>{p.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* ── Discipline ── */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Discipline</p>
        <div className="space-y-2">
          <Label>Emotion</Label>
          <Select value={formData.emotion_tag || ""} onValueChange={v => set({ emotion_tag: v })}>
            <SelectTrigger><SelectValue placeholder="How did you feel?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {EMOTION_TAGS.map(e => (
                <SelectItem key={e.value} value={e.value}>
                  <span className={`px-2 py-0.5 rounded text-xs ${e.color}`}>{e.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="rule_broken"
            checked={!!formData.rule_broken}
            onCheckedChange={c => set({ rule_broken: c === true, mistake_tags: [] })}
          />
          <Label htmlFor="rule_broken" className="cursor-pointer flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            I broke my trading rules
          </Label>
        </div>

        {formData.rule_broken && (
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
            <Label className="text-sm">What mistakes did you make?</Label>
            <div className="grid grid-cols-2 gap-2">
              {MISTAKE_TAGS.map(m => (
                <div key={m.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mistake_${m.value}`}
                    checked={Array.isArray(formData.mistake_tags) && formData.mistake_tags.includes(m.value)}
                    onCheckedChange={checked => {
                      const current = Array.isArray(formData.mistake_tags) ? formData.mistake_tags : [];
                      set({ mistake_tags: checked ? [...current, m.value] : current.filter((t: string) => t !== m.value) });
                    }}
                  />
                  <Label htmlFor={`mistake_${m.value}`} className="text-xs cursor-pointer">{m.label}</Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Notes ── */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes || ""} onChange={e => set({ notes: e.target.value })} placeholder="Trade details and observations..." rows={3} />
      </div>

      {/* ── Screenshot & import ── */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Screenshot (Optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={e => onScreenshotChange?.(e.target.files?.[0] ?? null)}
          />
          {existingScreenshotUrl && !screenshot && (
            <p className="text-xs text-muted-foreground">A screenshot is attached. Upload a new one to replace it.</p>
          )}
        </div>

        {(onHtmlUpload || onExcelUpload) && (
          <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Import from MT5 history export</p>
            <div className="flex flex-wrap gap-2">
              {onHtmlUpload && (
                <>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={isParsingFile}
                    onClick={() => document.getElementById("tf-html-upload")?.click()}>
                    {isParsingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Import HTML
                  </Button>
                  <input id="tf-html-upload" type="file" accept=".html,.htm" className="hidden"
                    onChange={e => onHtmlUpload(e.target.files?.[0])} />
                </>
              )}
              {onExcelUpload && (
                <>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={isParsingFile}
                    onClick={() => document.getElementById("tf-excel-upload")?.click()}>
                    {isParsingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Import XLSX
                  </Button>
                  <input id="tf-excel-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => onExcelUpload(e.target.files?.[0])} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={onSubmitDisabled || isParsingFile}>
        {onSubmitDisabled ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : onSubmitLabel}
      </Button>
    </div>
  );
}
