import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EMOTION_TAGS, MISTAKE_TAGS } from "@/lib/tradeCalculations";
import { Button } from "@/components/ui/button";

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  propFirms?: any[];
  getCyclesForFirm?: (id: string) => any[];
  getActiveCycleForFirm?: (id: string) => any | null;
  onSubmitLabel?: string;
  onSubmitDisabled?: boolean;
}

const SESSIONS = ["London", "New York", "Asia"];

export default function TradeForm({ formData, setFormData, propFirms = [], getCyclesForFirm, getActiveCycleForFirm, onSubmitLabel = "Save", onSubmitDisabled = false }: Props) {
  return (
    <div className="space-y-4 pt-2">
      {/* Prop firm selection (optional) */}
      {propFirms.length > 0 && (
        <div className="space-y-2">
          <Label>Prop Firm (Optional)</Label>
          <Select
            value={formData.prop_firm_id || ""}
            onValueChange={(value) => setFormData({ ...formData, prop_firm_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account (optional)" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="">None</SelectItem>
              {propFirms.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Currency Pair *</Label>
        <Input value={formData.pair || ""} onChange={(e) => setFormData({ ...formData, pair: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.trade_type || ""} onValueChange={(v) => setFormData({ ...formData, trade_type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Buy / Sell" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Buy">Buy</SelectItem>
              <SelectItem value="Sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Volume (Lots)</Label>
          <Input type="number" step="0.01" value={formData.volume || ""} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Entry Price</Label>
          <Input type="number" step="0.00001" value={formData.entry_price || ""} onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Close Price</Label>
          <Input type="number" step="0.00001" value={formData.close_price || ""} onChange={(e) => setFormData({ ...formData, close_price: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Take Profit</Label>
          <Input type="number" step="0.00001" value={formData.take_profit || ""} onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Stop Loss</Label>
          <Input type="number" step="0.00001" value={formData.stop_loss || ""} onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Profit/Loss ($) *</Label>
        <Input type="number" step="0.01" value={formData.profit || ""} onChange={(e) => setFormData({ ...formData, profit: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Session</Label>
          <Select value={formData.session || ""} onValueChange={(v) => setFormData({ ...formData, session: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Emotion</Label>
          <Select value={formData.emotion_tag || ""} onValueChange={(v) => setFormData({ ...formData, emotion_tag: v })}>
            <SelectTrigger>
              <SelectValue placeholder="How did you feel?" />
            </SelectTrigger>
            <SelectContent>
              {EMOTION_TAGS.map(e => (
                <SelectItem key={e.value} value={e.value}><span className={`px-2 py-0.5 rounded text-xs ${e.color}`}>{e.label}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox checked={!!formData.rule_broken} onCheckedChange={(c) => setFormData({ ...formData, rule_broken: c === true })} />
        <Label className="text-sm">I broke my trading rules</Label>
      </div>

      {formData.rule_broken && (
        <div className="space-y-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
          <Label className="text-sm">What mistakes did you make?</Label>
          <div className="grid grid-cols-2 gap-2">
            {MISTAKE_TAGS.map(m => (
              <div key={m.value} className="flex items-center space-x-2">
                <Checkbox
                  checked={Array.isArray(formData.mistake_tags) && formData.mistake_tags.includes(m.value)}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(formData.mistake_tags) ? formData.mistake_tags : [];
                    if (checked) setFormData({ ...formData, mistake_tags: [...current, m.value] });
                    else setFormData({ ...formData, mistake_tags: current.filter((t: string) => t !== m.value) });
                  }}
                />
                <Label className="text-xs">{m.label}</Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Date *</Label>
        <Input type="date" value={formData.trade_date || new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, trade_date: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
      </div>

      <Button type="submit" className="w-full" disabled={onSubmitDisabled}>{onSubmitLabel}</Button>
    </div>
  );
}
