import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, CheckCircle2, XCircle, RefreshCw, Copy, Users, 
  Settings, Send, AlertTriangle, Link, MessageSquare
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

interface SupportAgent {
  id: string;
  staff_id: string;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  role: string;
  is_active: boolean;
  linked_at: string | null;
  staff: {
    name: string;
    email: string;
    invite_token: string | null;
  } | null;
}

interface GroupConfig {
  id: string;
  group_chat_id: number;
  group_name: string | null;
  is_active: boolean;
}

export default function TelegramBotManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCEO, loading: permLoading } = useStaffPermissions();
  
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [groupConfig, setGroupConfig] = useState<GroupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingWebhook, setSettingWebhook] = useState(false);

  useEffect(() => {
    if (!permLoading && !isCEO) {
      navigate('/app/admin/ceo');
    }
  }, [isCEO, permLoading, navigate]);

  useEffect(() => {
    if (isCEO) {
      loadData();
    }
  }, [isCEO]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadWebhookStatus(),
      loadAgents(),
      loadGroupConfig()
    ]);
    setLoading(false);
  };

  const loadWebhookStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-support-webhook', {
        body: { action: 'get_webhook_info' }
      });
      if (!error && data?.result) {
        setWebhookInfo(data.result);
      }
    } catch (err) {
      console.error('Failed to load webhook status:', err);
    }
  };

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from('telegram_support_agents')
      .select('*, staff:staff_id(name, email, invite_token)')
      .order('role', { ascending: false });

    if (!error && data) {
      setAgents(data as any);
    }
  };

  const loadGroupConfig = async () => {
    const { data, error } = await supabase
      .from('support_group_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      setGroupConfig(data);
    }
  };

  const setupWebhook = async () => {
    setSettingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-support-webhook', {
        body: { action: 'setup_webhook' }
      });

      if (error) throw error;

      toast({
        title: 'Webhook Configured',
        description: 'The Telegram webhook has been set up successfully.',
      });
      
      await loadWebhookStatus();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to configure webhook.',
        variant: 'destructive',
      });
    } finally {
      setSettingWebhook(false);
    }
  };

  const deleteWebhook = async () => {
    try {
      const { error } = await supabase.functions.invoke('telegram-support-webhook', {
        body: { action: 'delete_webhook' }
      });

      if (error) throw error;

      toast({
        title: 'Webhook Removed',
        description: 'The Telegram webhook has been deleted.',
      });
      
      setWebhookInfo(null);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook.',
        variant: 'destructive',
      });
    }
  };

  const sendTestNotification = async () => {
    try {
      const { error } = await supabase.functions.invoke('telegram-support-webhook', {
        body: { action: 'test_notification' }
      });

      if (error) throw error;

      toast({
        title: 'Test Sent',
        description: 'A test notification has been sent to the support group.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification.',
        variant: 'destructive',
      });
    }
  };

  const copyLinkCommand = (token: string) => {
    const command = `/link_support ${token}`;
    navigator.clipboard.writeText(command);
    toast({
      title: 'Copied',
      description: 'Link command copied to clipboard.',
    });
  };

  const expectedWebhookUrl = `https://bduwtkejrfmcggfwniqe.supabase.co/functions/v1/telegram-support-webhook`;
  const isWebhookCorrect = webhookInfo?.url === expectedWebhookUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30">
            <Bot className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
              Telegram Bot Management
            </h1>
            <p className="text-muted-foreground">Configure Support Bot B and manage agents</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Status */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              Webhook Status
            </CardTitle>
            <CardDescription>Bot B webhook configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhookInfo?.url ? (
              <>
                <div className="flex items-center gap-2">
                  {isWebhookCorrect ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Wrong URL
                    </Badge>
                  )}
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono break-all">
                  {webhookInfo.url}
                </div>

                {webhookInfo.pending_update_count > 0 && (
                  <p className="text-sm text-yellow-400">
                    ⚠️ {webhookInfo.pending_update_count} pending updates
                  </p>
                )}

                {webhookInfo.last_error_message && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                    <p className="text-sm text-red-400">
                      Last Error: {webhookInfo.last_error_message}
                    </p>
                    {webhookInfo.last_error_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(webhookInfo.last_error_date * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!isWebhookCorrect && (
                    <Button onClick={setupWebhook} disabled={settingWebhook} size="sm">
                      {settingWebhook ? 'Setting...' : 'Fix Webhook'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={deleteWebhook} size="sm">
                    Delete Webhook
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  The webhook is not set up. Click below to configure it automatically.
                </p>
                <Button onClick={setupWebhook} disabled={settingWebhook}>
                  {settingWebhook ? 'Setting up...' : 'Setup Webhook'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Support Group */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-400" />
              Support Group
            </CardTitle>
            <CardDescription>Telegram group for ticket notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupConfig ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Registered
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Group Name:</span>{' '}
                    {groupConfig.group_name || 'Unknown'}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Chat ID:</span>{' '}
                    <code className="text-xs bg-muted/50 px-2 py-0.5 rounded">{groupConfig.group_chat_id}</code>
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={sendTestNotification}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Registered
                  </Badge>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-sm font-medium">To register a support group:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Create a Telegram group</li>
                    <li>Add Bot B as an administrator</li>
                    <li>Send <code className="bg-muted/50 px-1 rounded">/register_group</code> in the group</li>
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support Agents */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Support Agents
          </CardTitle>
          <CardDescription>Staff members linked to Telegram for support notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No agents linked yet</p>
              <p className="text-sm mt-2">
                Staff members can link their Telegram using <code>/link_support &lt;token&gt;</code>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(agent => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.staff?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.staff?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        agent.role === 'ceo' 
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }>
                        {agent.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agent.telegram_username ? (
                        <span className="text-blue-400">@{agent.telegram_username}</span>
                      ) : agent.telegram_chat_id ? (
                        <code className="text-xs bg-muted/50 px-2 py-0.5 rounded">{agent.telegram_chat_id}</code>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {agent.is_active && agent.telegram_chat_id ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.linked_at 
                        ? new Date(agent.linked_at).toLocaleDateString() 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {agent.staff?.invite_token && !agent.telegram_chat_id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyLinkCommand(agent.staff!.invite_token!)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link Command
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-cyan-400" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium">For Support Agents</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Open Bot B in Telegram</li>
                <li>Send the link command with your invite token:
                  <code className="block mt-1 bg-muted/50 px-2 py-1 rounded text-xs">
                    /link_support YOUR_INVITE_TOKEN
                  </code>
                </li>
                <li>You'll receive ticket notifications automatically</li>
              </ol>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium">For CEO</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Follow the same steps as support agents</li>
                <li>The bot will detect your CEO role automatically</li>
                <li>You'll receive escalated tickets and can reply as Management</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
