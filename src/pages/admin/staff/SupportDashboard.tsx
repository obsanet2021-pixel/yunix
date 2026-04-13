import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  HeadphonesIcon, MessageSquare, Clock, Send, User,
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, Globe, AlertTriangle,
  FileText, Image as ImageIcon, ChevronDown, Eye, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  category?: string;
  telegram_user_chat_id?: number;
  telegram_thread_id?: string;
  escalated?: boolean;
  escalated_at?: string;
  user_email?: string;
  user_name?: string;
  assigned_to?: string;
}

interface UnifiedMessage {
  id: string;
  message: string;
  sender_type: 'user' | 'support' | 'ceo' | 'staff';
  sender_name?: string;
  created_at: string;
  source: 'web' | 'telegram';
  is_staff_reply?: boolean;
  has_attachment?: boolean;
  attachment_url?: string;
}

interface SupportTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function SupportDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { staffData, isCEO, hasPermission, loading: permLoading } = useStaffPermissions();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSupport = staffData?.role?.name === 'Support' || 
    staffData?.role?.name === 'Support Specialist' ||
    staffData?.role?.name === 'QA & Support' || 
    isCEO ||
    hasPermission('manage_support');

  useEffect(() => {
    if (!permLoading && !isSupport) {
      navigate('/app/dashboard');
    }
  }, [isSupport, permLoading, navigate]);

  useEffect(() => {
    if (isSupport) {
      loadTickets();
      loadTemplates();
    }
  }, [isSupport]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      
      // Subscribe to both tables for real-time updates
      const webChannel = supabase
        .channel(`staff-ticket-web-${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`
          },
          () => loadMessages(selectedTicket.id)
        )
        .subscribe();

      const telegramChannel = supabase
        .channel(`staff-ticket-telegram-${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`
          },
          () => loadMessages(selectedTicket.id)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(webChannel);
        supabase.removeChannel(telegramChannel);
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('support_templates')
      .select('*')
      .eq('is_active', true)
      .order('category');
    
    if (data) {
      setTemplates(data);
    }
  };

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Load user names and emails
        const userIds = [...new Set(data.map(t => t.user_id).filter(Boolean))];
        const { data: profiles } = userIds.length > 0 
          ? await supabase.from('profiles').select('id, name, email').in('id', userIds)
          : { data: [] };

        const ticketsWithUserInfo = data.map(ticket => {
          const profile = profiles?.find(p => p.id === ticket.user_id);
          return {
            ...ticket,
            user_name: profile?.name || (ticket.telegram_user_chat_id ? `Telegram User` : 'Unknown User'),
            user_email: profile?.email || (ticket.telegram_thread_id || 'N/A')
          };
        });

        setTickets(ticketsWithUserInfo);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    // Fetch from both support_messages (web) and ticket_messages (telegram)
    const [webResult, telegramResult] = await Promise.all([
      supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
    ]);

    const unifiedMessages: UnifiedMessage[] = [];

    // Map web messages
    if (webResult.data) {
      for (const msg of webResult.data) {
        unifiedMessages.push({
          id: msg.id,
          message: msg.message,
          sender_type: msg.is_staff_reply ? 'support' : 'user',
          created_at: msg.created_at,
          source: 'web',
          is_staff_reply: msg.is_staff_reply,
        });
      }
    }

    // Map telegram messages
    if (telegramResult.data) {
      for (const msg of telegramResult.data) {
        unifiedMessages.push({
          id: msg.id,
          message: msg.message,
          sender_type: msg.sender_type as any,
          sender_name: msg.sender_name,
          created_at: msg.created_at,
          source: 'telegram',
          has_attachment: msg.has_attachment,
          attachment_url: msg.attachment_url,
        });
      }
    }

    // Sort by created_at
    unifiedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    setMessages(unifiedMessages);
  };

  const applyTemplate = (template: SupportTemplate) => {
    const agentName = staffData?.name || 'Support';
    const content = template.content.replace('{agent_name}', agentName);
    setNewMessage(content);
  };

  const sendReply = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Auto-assign ticket to this agent if not already assigned
    if (!selectedTicket.assigned_to && staffData?.id) {
      await supabase
        .from('support_tickets')
        .update({ assigned_to: staffData.id })
        .eq('id', selectedTicket.id);
      
      setSelectedTicket({ ...selectedTicket, assigned_to: staffData.id });
    }

    // Insert into support_messages
    const { error: webError } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        message: newMessage.trim(),
        is_staff_reply: true
      });

    // Also insert into ticket_messages if this is a Telegram ticket
    if (selectedTicket.telegram_user_chat_id) {
      const staffName = staffData?.name || 'Support';
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_type: isCEO ? 'ceo' : 'support',
          sender_id: user.id,
          sender_name: staffName,
          message: newMessage.trim(),
        });

      // Send to Telegram user via edge function
      try {
        await supabase.functions.invoke('telegram-support-webhook', {
          body: {
            action: 'send_reply',
            ticket_id: selectedTicket.id,
            message: newMessage.trim(),
            sender_name: staffName,
            is_ceo: isCEO
          }
        });
      } catch (err) {
        console.error('Failed to send Telegram notification:', err);
      }
    }

    if (!webError) {
      setNewMessage('');
      
      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
        loadTickets();
      }
    }
  };

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;

    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', selectedTicket.id);

    if (!error) {
      setSelectedTicket({ ...selectedTicket, status });
      loadTickets();
      toast({
        title: "Status Updated",
        description: `Ticket marked as ${status}`,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'closed': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      default: return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'normal': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'low': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      default: return '';
    }
  };

  const getSenderLabel = (msg: UnifiedMessage) => {
    if (msg.source === 'telegram') {
      switch (msg.sender_type) {
        case 'user': return msg.sender_name || 'User';
        case 'ceo': return `👔 ${msg.sender_name || 'Management'}`;
        case 'support': return `🧑‍💼 ${msg.sender_name || 'Support'}`;
        default: return msg.sender_name || 'Unknown';
      }
    }
    return msg.is_staff_reply ? 'You (Support)' : 'User';
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    escalated: tickets.filter(t => t.escalated).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30">
            <HeadphonesIcon className="h-8 w-8 text-pink-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
              Support Dashboard
            </h1>
            <p className="text-muted-foreground">Manage User Enquiries & Tickets (Web + Telegram)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadTickets}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-blue-400">Open</p>
            <p className="text-2xl font-bold text-blue-400">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-400">In Progress</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-green-400">Resolved</p>
            <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-red-400">Escalated</p>
            <p className="text-2xl font-bold text-red-400">{stats.escalated}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-400" />
                Tickets
              </CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {filteredTickets.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No tickets</p>
              ) : (
                <div className="space-y-2">
                  {filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id 
                          ? 'bg-pink-500/10 border border-pink-500/30' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {ticket.telegram_user_chat_id ? (
                            <Smartphone className="h-3 w-3 text-blue-400" />
                          ) : (
                            <Globe className="h-3 w-3 text-green-400" />
                          )}
                          <span className="font-medium text-sm truncate flex-1">
                            {ticket.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {ticket.escalated && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                          <Badge variant="outline" className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.user_name}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="truncate">{ticket.telegram_thread_id || ticket.user_email}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50">
          {selectedTicket ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedTicket.telegram_user_chat_id ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Telegram
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                          <Globe className="h-3 w-3 mr-1" />
                          Web
                        </Badge>
                      )}
                      {selectedTicket.escalated && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Escalated
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-2">{selectedTicket.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedTicket.telegram_thread_id 
                        ? `Ticket: ${selectedTicket.telegram_thread_id}` 
                        : `From: ${selectedTicket.user_name} (${selectedTicket.user_email})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                    <Select 
                      value={selectedTicket.status} 
                      onValueChange={updateTicketStatus}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col h-[450px]">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type !== 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.sender_type !== 'user'
                              ? 'bg-pink-600/20 border border-pink-500/30 rounded-br-none'
                              : 'bg-muted/50 rounded-bl-none'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            {msg.source === 'telegram' ? (
                              <Smartphone className="h-3 w-3 text-blue-400" />
                            ) : (
                              <Globe className="h-3 w-3 text-green-400" />
                            )}
                            <span>{getSenderLabel(msg)}</span>
                            {msg.has_attachment && (
                              <span className="text-yellow-400">📎</span>
                            )}
                          </div>
                          <p className="text-sm">{msg.message}</p>
                          {/* Display image if attachment URL exists */}
                          {msg.attachment_url && (
                            <div className="mt-2 relative group">
                              <img 
                                src={msg.attachment_url} 
                                alt="Attachment" 
                                className="max-w-full max-h-48 rounded-lg border border-border/50"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                                onClick={() => setPreviewImage(msg.attachment_url!)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {selectedTicket.status !== 'closed' && (
                  <div className="space-y-2 pt-4 border-t border-border/50 mt-4">
                    {/* Quick Templates */}
                    {templates.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                              <FileText className="h-3 w-3" />
                              Quick Replies
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-1">
                              {templates.map(template => (
                                <Button
                                  key={template.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-left h-auto py-2"
                                  onClick={() => applyTemplate(template)}
                                >
                                  <div>
                                    <div className="font-medium text-sm">{template.title}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {template.content.substring(0, 50)}...
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                      />
                      <Button onClick={sendReply} className="bg-pink-600 hover:bg-pink-700">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTicket.status === 'closed' && (
                  <div className="flex items-center justify-center gap-2 py-3 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">This ticket is closed</span>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view conversation</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
