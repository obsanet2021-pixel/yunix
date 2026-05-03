import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bot, Check, Copy, ExternalLink, RefreshCw, Trash2, Wifi, WifiOff, Crown, ArrowLeft, Bell, Users, Search } from 'lucide-react';
import { toast } from 'sonner';

interface CEOConfig {
  id: string;
  telegram_chat_id: number;
  is_active: boolean;
  group_chat_id: number | null;
  auto_notify_new_orders: boolean | null;
}

export default function CEOBotManagement() {
  const navigate = useNavigate();
  const { isCEO, loading: permLoading } = useStaffPermissions();
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkedConfig, setLinkedConfig] = useState<CEOConfig | null>(null);
  const [linkCode] = useState('YUNIX-CEO-2024');
  const [copied, setCopied] = useState(false);
  const [groupChatId, setGroupChatId] = useState('');
  const [autoNotify, setAutoNotify] = useState(true);

  const WEBHOOK_URL = `https://ounphbavkyrmotskydto.supabase.co/functions/v1/ceo-bot-webhook`;

  useEffect(() => {
    if (!permLoading && !isCEO) {
      navigate('/app/dashboard');
    }
  }, [isCEO, permLoading, navigate]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ceo_telegram_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setLinkedConfig(data);
        setGroupChatId(data.group_chat_id?.toString() || '');
        setAutoNotify(data.auto_notify_new_orders ?? true);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopied(false), 1000);
  };

  const handleCopyLinkCode = () => {
    navigator.clipboard.writeText(`/start ${linkCode}`);
    toast.success('Link command copied to clipboard');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', message: { text: '/test', chat: { id: 0 } } }),
      });

      const responseData = await response.text();
      
      if (response.ok) {
        toast.success('Webhook is responding correctly');
      } else {
        console.error('Webhook error:', response.status, responseData);
        toast.error(`Webhook error: ${response.status} - ${responseData || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to connect to webhook:', error);
      toast.error(`Failed to connect: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedConfig) return;
    
    try {
      const { error } = await supabase
        .from('ceo_telegram_config')
        .update({ is_active: false })
        .eq('id', linkedConfig.id);

      if (error) throw error;

      setLinkedConfig(null);
      toast.success('CEO Bot unlinked successfully');
    } catch (error) {
      console.error('Error unlinking:', error);
      toast.error('Failed to unlink CEO Bot');
    }
  };

  const handleSaveGroupChatId = async () => {
    if (!linkedConfig) return;
    setSaving(true);
    
    try {
      const groupId = groupChatId ? parseInt(groupChatId, 10) : null;
      
      if (groupChatId && isNaN(groupId as number)) {
        toast.error('Please enter a valid numeric Chat ID');
        return;
      }

      const { error } = await supabase
        .from('ceo_telegram_config')
        .update({ group_chat_id: groupId })
        .eq('id', linkedConfig.id);

      if (error) throw error;

      setLinkedConfig({ ...linkedConfig, group_chat_id: groupId });
      toast.success('Group Chat ID saved successfully');
    } catch (error) {
      console.error('Error saving group chat ID:', error);
      toast.error('Failed to save Group Chat ID');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoNotify = async (enabled: boolean) => {
    if (!linkedConfig) return;
    
    try {
      const { error } = await supabase
        .from('ceo_telegram_config')
        .update({ auto_notify_new_orders: enabled })
        .eq('id', linkedConfig.id);

      if (error) throw error;

      setAutoNotify(enabled);
      setLinkedConfig({ ...linkedConfig, auto_notify_new_orders: enabled });
      toast.success(enabled ? 'Auto-notifications enabled' : 'Auto-notifications disabled');
    } catch (error) {
      console.error('Error toggling auto-notify:', error);
      toast.error('Failed to update notification settings');
    }
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCEO) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/admin/ceo')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30">
            <Bot className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              CEO Bot Management
            </h1>
            <p className="text-muted-foreground">Manage your CEO Telegram bot for order statistics</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {linkedConfig ? (
                <Wifi className="h-5 w-5 text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400" />
              )}
              Connection Status
            </CardTitle>
            <CardDescription>
              Current status of your CEO Telegram bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Status</span>
              {linkedConfig ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                  Not Connected
                </Badge>
              )}
            </div>

            {linkedConfig && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Private Chat ID</span>
                <code className="text-sm bg-background px-2 py-1 rounded">
                  {linkedConfig.telegram_chat_id}
                </code>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="flex-1"
              >
                {testingConnection ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>

              {linkedConfig && (
                <Button
                  variant="destructive"
                  onClick={handleUnlink}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Unlink Bot
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to set up your CEO Bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Create your CEO Bot</p>
                  <p className="text-sm text-muted-foreground">
                    Create a new bot via @BotFather on Telegram and add the token as CEO_BOT_TOKEN secret.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Set Webhook URL</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Set this webhook URL for your bot:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={WEBHOOK_URL}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Link Your Account</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Send this command to your CEO bot:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={`/start ${linkCode}`}
                      readOnly
                      className="font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLinkCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Chat Configuration */}
      {linkedConfig && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Group Chat Configuration
            </CardTitle>
            <CardDescription>
              Configure a private group to receive order logs (read-only notifications)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-semibold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Create a Private Group</p>
                  <p className="text-sm text-muted-foreground">
                    Create a private Telegram group and add your CEO bot to it
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-semibold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Get the Group Chat ID</p>
                  <p className="text-sm text-muted-foreground">
                    Send any message in the group, then check the webhook logs or use a bot like @getidsbot
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-semibold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Enter Group Chat ID</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Paste the group chat ID below (usually starts with -100):
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={groupChatId}
                      onChange={(e) => setGroupChatId(e.target.value)}
                      placeholder="-1001234567890"
                      className="font-mono"
                    />
                    <Button 
                      onClick={handleSaveGroupChatId}
                      disabled={saving}
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {linkedConfig.group_chat_id && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-green-400">Group Chat Linked</span>
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    {linkedConfig.group_chat_id}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {linkedConfig && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-400" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure automatic notifications for orders and events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="font-medium">Auto-notify New Orders</p>
                <p className="text-sm text-muted-foreground">
                  Receive automatic notifications when new orders are placed
                </p>
              </div>
              <Switch
                checked={autoNotify}
                onCheckedChange={handleToggleAutoNotify}
              />
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400">
                <strong>Note:</strong> Notifications are sent to your private chat. 
                If you've configured a group chat, logs will also be sent there.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Commands */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Available Commands</CardTitle>
          <CardDescription>Commands you can use with the CEO Bot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { cmd: '/orders', desc: 'View pending orders' },
              { cmd: '/today', desc: "View today's orders summary" },
              { cmd: '/stats', desc: 'View overall statistics' },
              { cmd: '/revenue', desc: 'View revenue overview' },
              { cmd: '/search <ID>', desc: 'Search order by ID' },
              { cmd: '/help', desc: 'Show available commands' },
            ].map((item) => (
              <div key={item.cmd} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <code className="text-primary font-semibold">{item.cmd}</code>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
