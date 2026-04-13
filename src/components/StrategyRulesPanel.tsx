import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, BookOpen, Shield, Clock, Target, DollarSign, Newspaper, Crosshair } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StrategyRule {
  id: string;
  rule_text: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "session", label: "Session", icon: Clock },
  { value: "pairs", label: "Pairs", icon: Target },
  { value: "entry", label: "Entry", icon: Crosshair },
  { value: "exit", label: "Exit", icon: DollarSign },
  { value: "risk", label: "Risk", icon: Shield },
  { value: "news", label: "News", icon: Newspaper },
  { value: "general", label: "General", icon: BookOpen },
];

const CATEGORY_COLORS: Record<string, string> = {
  session: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pairs: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  entry: "bg-green-500/10 text-green-500 border-green-500/20",
  exit: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  risk: "bg-red-500/10 text-red-500 border-red-500/20",
  news: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  general: "bg-muted text-muted-foreground border-border",
};

interface StrategyRulesPanelProps {
  onRulesChange?: (rules: StrategyRule[]) => void;
}

export default function StrategyRulesPanel({ onRulesChange }: StrategyRulesPanelProps) {
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [newRule, setNewRule] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (data) {
      setRules(data as StrategyRule[]);
      onRulesChange?.(data as StrategyRule[]);
    }
  };

  const addRule = async () => {
    if (!newRule.trim()) return;
    setIsAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_strategies").insert({
      user_id: user.id,
      rule_text: newRule.trim(),
      category: newCategory,
    });

    if (!error) {
      setNewRule("");
      toast({ title: "Rule added ✅" });
      loadRules();
    }
    setIsAdding(false);
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("user_strategies").update({ is_active: isActive }).eq("id", id);
    loadRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("user_strategies").delete().eq("id", id);
    toast({ title: "Rule removed 🗑️" });
    loadRules();
  };

  const activeCount = rules.filter(r => r.is_active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">My Strategy Rules</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {activeCount} active
        </Badge>
      </div>

      {/* Add new rule */}
      <div className="flex gap-2">
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value} className="text-xs">
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addRule()}
          placeholder="e.g. Only trade during London session..."
          className="flex-1 h-8 text-xs"
        />
        <Button size="sm" className="h-8 px-2" onClick={addRule} disabled={isAdding || !newRule.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Rules list */}
      <ScrollArea className="max-h-48">
        {rules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No rules yet. Teach me your strategy! 🎯
          </p>
        ) : (
          <div className="space-y-1.5">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-muted/50">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  className="scale-75"
                />
                <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 ${CATEGORY_COLORS[rule.category] || CATEGORY_COLORS.general}`}>
                  {rule.category}
                </Badge>
                <span className={`text-xs flex-1 ${!rule.is_active ? "line-through text-muted-foreground" : ""}`}>
                  {rule.rule_text}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
