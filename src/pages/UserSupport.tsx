import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, MessageCircle, Clock, Plus, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

export default function UserSupport() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      
      const channel = supabase
        .channel(`ticket-${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data);
    }
  };

  const loadMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const createTicket = async () => {
    if (!subject.trim() || !messageText.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        message: messageText.trim(),
        status: 'open',
        priority: 'normal'
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
    } else if (ticket) {
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: messageText.trim(),
          is_staff_reply: false
        });

      toast({
        title: "Ticket Created",
        description: "A support agent will respond shortly",
      });
      setSubject('');
      setMessageText('');
      setShowNewForm(false);
      setSelectedTicket(ticket);
      loadTickets();
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        message: newMessage.trim(),
        is_staff_reply: false
      });

    if (!error) {
      setNewMessage('');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
            <HelpCircle className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              Support Centre
            </h1>
            <p className="text-muted-foreground">Get help from our support team</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowNewForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-400" />
              Your Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No tickets yet</p>
            ) : (
              <div className="space-y-2">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowNewForm(false);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate flex-1">
                        {ticket.subject}
                      </span>
                      <Badge variant="outline" className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat / New Form */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50">
          {showNewForm ? (
            <>
              <CardHeader>
                <CardTitle>New Support Enquiry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue in detail..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={8}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowNewForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createTicket} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Submitting...' : 'Submit Enquiry'}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : selectedTicket ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedTicket.subject}</CardTitle>
                  <Badge variant="outline" className={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col h-[400px]">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_staff_reply ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.is_staff_reply
                              ? 'bg-muted/50 rounded-bl-none'
                              : 'bg-green-600/20 border border-green-500/30 rounded-br-none'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedTicket.status !== 'closed' && (
                  <div className="flex gap-2 pt-4 border-t border-border/50 mt-4">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button onClick={sendMessage} size="icon" className="bg-green-600 hover:bg-green-700">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a ticket or create a new enquiry</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}