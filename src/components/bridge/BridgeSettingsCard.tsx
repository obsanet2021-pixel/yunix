import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, RefreshCw, Bell, TrendingUp, Wallet, BarChart3, Loader2 } from "lucide-react";

interface BridgeSettings {
  id?: string;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  notifications_enabled: boolean;
  sync_trades: boolean;
  sync_positions: boolean;
  sync_balance: boolean;
  last_sync_at: string | null;
}

const DEFAULT_SETTINGS: BridgeSettings = {
  auto_sync_enabled: true,
  sync_interval_minutes: 30,
  notifications_enabled: true,
  sync_trades: true,
  sync_positions: true,
  sync_balance: true,
  last_sync_at: null
};

export const BridgeSettingsCard = () => {
  const [settings, setSettings] = useState<BridgeSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bridge_user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to load bridge settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bridge_user_settings")
        .upsert({
          user_id: user.id,
          auto_sync_enabled: settings.auto_sync_enabled,
          sync_interval_minutes: settings.sync_interval_minutes,
          notifications_enabled: settings.notifications_enabled,
          sync_trades: settings.sync_trades,
          sync_positions: settings.sync_positions,
          sync_balance: settings.sync_balance
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your bridge settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof BridgeSettings>(key: K, value: BridgeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Bridge Settings
        </CardTitle>
        <CardDescription>
          Configure how your MT5 accounts sync with the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Auto-Sync
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync your MT5 data at regular intervals
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={settings.auto_sync_enabled}
            onCheckedChange={(checked) => updateSetting("auto_sync_enabled", checked)}
          />
        </div>

        {/* Sync Interval */}
        <div className="space-y-2">
          <Label htmlFor="sync-interval">Sync Interval</Label>
          <Select
            value={settings.sync_interval_minutes.toString()}
            onValueChange={(value) => updateSetting("sync_interval_minutes", parseInt(value))}
            disabled={!settings.auto_sync_enabled}
          >
            <SelectTrigger id="sync-interval">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">Every 15 minutes</SelectItem>
              <SelectItem value="30">Every 30 minutes</SelectItem>
              <SelectItem value="60">Every hour</SelectItem>
              <SelectItem value="120">Every 2 hours</SelectItem>
              <SelectItem value="360">Every 6 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified about sync status and important updates
            </p>
          </div>
          <Switch
            id="notifications"
            checked={settings.notifications_enabled}
            onCheckedChange={(checked) => updateSetting("notifications_enabled", checked)}
          />
        </div>

        {/* Data Sync Options */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Data to Sync</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Trade History</span>
            </div>
            <Switch
              checked={settings.sync_trades}
              onCheckedChange={(checked) => updateSetting("sync_trades", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Open Positions</span>
            </div>
            <Switch
              checked={settings.sync_positions}
              onCheckedChange={(checked) => updateSetting("sync_positions", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Account Balance</span>
            </div>
            <Switch
              checked={settings.sync_balance}
              onCheckedChange={(checked) => updateSetting("sync_balance", checked)}
            />
          </div>
        </div>

        {/* Last Sync Info */}
        {settings.last_sync_at && (
          <div className="text-sm text-muted-foreground pt-2">
            Last synced: {new Date(settings.last_sync_at).toLocaleString()}
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
