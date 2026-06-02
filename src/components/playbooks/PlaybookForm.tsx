/**
 * PlaybookForm.tsx
 * Shared form for creating and editing playbooks.
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";
import {
  PLAYBOOK_COLORS,
  type PlaybookFormData,
  EMPTY_PLAYBOOK_FORM,
} from "@/hooks/usePlaybooks";

const SESSIONS = ["London", "New York", "Asia", "Pre-market", "London/NY Overlap"];

interface Props {
  initialData?: PlaybookFormData;
  onSubmit: (data: PlaybookFormData) => Promise<boolean>;
  isLoading: boolean;
  submitLabel: string;
}

export default function PlaybookForm({ initialData, onSubmit, isLoading, submitLabel }: Props) {
  const [form, setForm] = useState<PlaybookFormData>(initialData ?? EMPTY_PLAYBOOK_FORM);
  const [newRule, setNewRule] = useState("");
  const [newPair, setNewPair] = useState("");

  const set = (patch: Partial<PlaybookFormData>) => setForm(f => ({ ...f, ...patch }));

  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    set({ entry_rules: [...form.entry_rules, trimmed] });
    setNewRule("");
  };

  const removeRule = (i: number) =>
    set({ entry_rules: form.entry_rules.filter((_, idx) => idx !== i) });

  const addPair = () => {
    const trimmed = newPair.trim().toUpperCase();
    if (!trimmed || form.preferred_pairs.includes(trimmed)) return;
    set({ preferred_pairs: [...form.preferred_pairs, trimmed] });
    setNewPair("");
  };

  const removePair = (p: string) =>
    set({ preferred_pairs: form.preferred_pairs.filter(x => x !== p) });

  const toggleSession = (s: string) => {
    const has = form.preferred_sessions.includes(s);
    set({ preferred_sessions: has ? form.preferred_sessions.filter(x => x !== s) : [...form.preferred_sessions, s] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">

      {/* Name + color */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-2">
          <Label>Playbook Name *</Label>
          <Input
            value={form.name}
            onChange={e => set({ name: e.target.value })}
            placeholder="e.g. London Breakout, NY Reversal"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Colour</Label>
          <Select value={form.color} onValueChange={v => set({ color: v })}>
            <SelectTrigger className="w-[110px]">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  PLAYBOOK_COLORS.find(c => c.value === form.color)?.class.split(" ")[0] ?? "bg-blue-500"
                }`} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {PLAYBOOK_COLORS.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${c.class.split(" ")[0]}`} />
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea
          value={form.description}
          onChange={e => set({ description: e.target.value })}
          placeholder="Describe the market conditions and logic behind this setup..."
          rows={2}
        />
      </div>

      <Separator />

      {/* Entry rules checklist */}
      <div className="space-y-3">
        <Label>Entry Rules Checklist</Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Define the conditions that must be met before entering this setup.
        </p>
        {form.entry_rules.length > 0 && (
          <div className="space-y-2">
            {form.entry_rules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0 w-5">{i + 1}.</span>
                <span className="text-sm flex-1">{rule}</span>
                <button type="button" onClick={() => removeRule(i)} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            placeholder="e.g. Price above 200 EMA"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRule(); } }}
            className="text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addRule} className="shrink-0 gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      <Separator />

      {/* Risk parameters */}
      <div className="space-y-2">
        <Label>Risk Parameters <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Risk per trade ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.risk_per_trade}
              onChange={e => set({ risk_per_trade: e.target.value })}
              placeholder="e.g. 50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Max daily loss ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.max_daily_loss}
              onChange={e => set({ max_daily_loss: e.target.value })}
              placeholder="e.g. 150"
            />
          </div>
        </div>
      </div>

      {/* Preferred sessions */}
      <div className="space-y-2">
        <Label>Preferred Sessions <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <div className="flex flex-wrap gap-2">
          {SESSIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSession(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                form.preferred_sessions.includes(s)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred pairs */}
      <div className="space-y-2">
        <Label>Preferred Pairs <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.preferred_pairs.map(p => (
            <Badge key={p} variant="outline" className="gap-1 text-xs">
              {p}
              <button type="button" onClick={() => removePair(p)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newPair}
            onChange={e => setNewPair(e.target.value)}
            placeholder="e.g. XAUUSD"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPair(); } }}
            className="text-sm uppercase"
          />
          <Button type="button" variant="outline" size="sm" onClick={addPair} className="shrink-0 gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading || !form.name.trim()} className="w-full bg-primary hover:bg-primary/90">
        {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : submitLabel}
      </Button>
    </form>
  );
}
