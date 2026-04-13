import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, Clock, CheckCircle2, Bot, User, ThumbsUp, ThumbsDown, ArrowLeft, Loader2, AlertCircle, BookOpen, CreditCard, Settings, Bug, HelpCircle } from 'lucide-react';
interface SupportEnquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
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
interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}
const SUPPORT_CATEGORIES = [{
  id: 'account',
  label: 'Account & Login',
  icon: Settings,
  description: 'Login issues, profile settings'
}, {
  id: 'courses',
  label: 'Course Access',
  icon: BookOpen,
  description: 'Course content, progress issues'
}, {
  id: 'certificates',
  label: 'Certificates',
  icon: CheckCircle2,
  description: 'Certificate questions, plaques'
}, {
  id: 'payment',
  label: 'Payment Issues',
  icon: CreditCard,
  description: 'Billing, refunds, payments'
}, {
  id: 'technical',
  label: 'Technical Bug',
  icon: Bug,
  description: 'App errors, display issues'
}, {
  id: 'other',
  label: 'Other',
  icon: HelpCircle,
  description: 'General questions'
}];
export default function SupportEnquiryModal({
  open,
  onOpenChange
}: SupportEnquiryModalProps) {
  const {
    toast
  } = useToast();
  const [view, setView] = useState<'list' | 'new' | 'chat' | 'ai'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState('');
  useEffect(() => {
    if (open) {
      loadTickets();
      // Start with AI chat
      setView('ai');
      setAiMessages([{
        role: 'assistant',
        content: "Hi! I'm YUNIX Support Assistant. I can help with questions about courses, certificates, your account, and more.\n\nPlease select a category below or type your question:"
      }]);
    }
  }, [open]);
  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      const channel = supabase.channel(`ticket-${selectedTicket.id}`).on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${selectedTicket.id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, aiMessages]);
  const loadTickets = async () => {
    const {
      data,
      error
    } = await supabase.from('support_tickets').select('*').order('created_at', {
      ascending: false
    });
    if (!error && data) {
      setTickets(data);
    }
  };
  const loadMessages = async (ticketId: string) => {
    const {
      data,
      error
    } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', {
      ascending: true
    });
    if (!error && data) {
      setMessages(data);
    }
  };
  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = SUPPORT_CATEGORIES.find(c => c.id === categoryId);

    // For payment category, immediately suggest escalation
    if (categoryId === 'payment') {
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: "I understand you have a payment-related question. Since payment issues require personal attention, I recommend connecting with our support team directly.\n\nClick 'Create Support Ticket' below to get help from a human agent who can access your account details."
      }]);
      setShowFeedback(true);
      return;
    }
    setAiMessages(prev => [...prev, {
      role: 'assistant',
      content: `You selected "${category?.label}". How can I help you with this? Please describe your issue.`
    }]);
  };
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);
    setAiLoading(true);
    setShowFeedback(false);
    try {
      const response = await supabase.functions.invoke('ai-support-chat', {
        body: {
          messages: [...aiMessages, {
            role: 'user',
            content: userMessage
          }],
          category: selectedCategory
        }
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      const {
        message,
        shouldEscalate
      } = response.data;
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: message
      }]);
      setLastAiResponse(message);
      setShowFeedback(true);
      if (shouldEscalate) {
        // Add escalation prompt
        setTimeout(() => {
          setAiMessages(prev => [...prev, {
            role: 'assistant',
            content: "Would you like me to create a support ticket for you? A human agent will review your case."
          }]);
        }, 500);
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or create a support ticket for assistance."
      }]);
    } finally {
      setAiLoading(false);
    }
  };
  const handleFeedback = (helpful: boolean) => {
    setShowFeedback(false);
    if (helpful) {
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: "Great! Is there anything else I can help you with?"
      }]);
    } else {
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry I couldn't fully help. Would you like to create a support ticket? A human agent will review your question and get back to you."
      }]);
    }
  };
  const escalateToTicket = () => {
    // Pre-fill subject based on conversation
    const topic = selectedCategory ? SUPPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label : 'Support Request';
    setSubject(`${topic} - From AI Chat`);
    setMessageText(aiMessages.filter(m => m.role === 'user').map(m => m.content).join('\n'));
    setView('new');
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    const {
      data: ticket,
      error
    } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject: subject.trim(),
      message: messageText.trim(),
      status: 'open',
      priority: selectedCategory === 'payment' ? 'high' : 'normal',
      category: selectedCategory || 'general'
    }).select().single();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
    } else if (ticket) {
      await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: messageText.trim(),
        is_staff_reply: false
      });

      // Add AI chat history if available
      if (aiMessages.length > 1) {
        const chatHistory = aiMessages.map(m => `[${m.role === 'user' ? 'User' : 'AI'}]: ${m.content}`).join('\n\n');
        await supabase.from('support_messages').insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: `--- AI Chat History ---\n\n${chatHistory}`,
          is_staff_reply: false
        });
      }
      toast({
        title: "Ticket Created",
        description: "A support agent will respond shortly"
      });
      setSubject('');
      setMessageText('');
      setSelectedTicket(ticket);
      setView('chat');
      loadTickets();
    }
    setLoading(false);
  };
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      error
    } = await supabase.from('support_messages').insert({
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
      case 'open':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'closed':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return '';
    }
  };
  const resetAiChat = () => {
    setAiMessages([{
      role: 'assistant',
      content: "Hi! I'm YUNIX Support Assistant. I can help with questions about courses, certificates, your account, and more.\n\nPlease select a category below or type your question:"
    }]);
    setSelectedCategory(null);
    setShowFeedback(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === 'ai' && <Bot className="h-5 w-5 text-primary" />}
            {view === 'list' && <MessageCircle className="h-5 w-5 text-green-500" />}
            {view === 'new' && <MessageCircle className="h-5 w-5 text-green-500" />}
            {view === 'chat' && <MessageCircle className="h-5 w-5 text-green-500" />}
            
            {view === 'ai' && 'AI Support Assistant'}
            {view === 'list' && 'Support Centre'}
            {view === 'new' && 'New Ticket'}
            {view === 'chat' && selectedTicket?.subject}
          </DialogTitle>
        </DialogHeader>

        {/* AI Chat View */}
        {view === 'ai' && <div className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 pr-4 max-h-[350px]">
              <div className="space-y-3">
                {aiMessages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[85%]`}>
                      {msg.role === 'assistant' && <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>}
                      <div className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted/50 rounded-bl-none'}`}>
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      </div>
                      {msg.role === 'user' && <div className="p-1.5 rounded-full bg-muted shrink-0">
                          <User className="h-4 w-4" />
                        </div>}
                    </div>
                  </div>)}

                {/* Category buttons - show only at start */}
                {aiMessages.length === 1 && !selectedCategory && <div className="grid grid-cols-2 gap-2 mt-4 my-[18px] pb-0 pr-[119px]">
                    {SUPPORT_CATEGORIES.map(cat => <Button key={cat.id} variant="outline" onClick={() => handleCategorySelect(cat.id)} className="h-auto p-3 flex flex-col items-center gap-1 hover:bg-primary/5 hover:border-primary/30 py-[3px] px-0 pr-[60px] pb-[13px]">
                        <cat.icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium pr-0 pl-[55px]">{cat.label}</span>
                      </Button>)}
                  </div>}

                {/* Feedback buttons */}
                {showFeedback && <div className="flex items-center justify-center gap-4 py-2">
                    <span className="text-xs text-muted-foreground">Was this helpful?</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleFeedback(true)}>
                        <ThumbsUp className="h-3 w-3" />
                        Yes
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleFeedback(false)}>
                        <ThumbsDown className="h-3 w-3" />
                        No
                      </Button>
                    </div>
                  </div>}

                {aiLoading && <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* AI Input */}
            <div className="pt-3 border-t border-border/50 mt-3 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Type your question..." value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAiMessage()} disabled={aiLoading} />
                <Button onClick={sendAiMessage} size="icon" disabled={aiLoading || !aiInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setView('list')}>
                  View My Tickets
                </Button>
                <Button variant="secondary" size="sm" className="flex-1" onClick={escalateToTicket}>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Create Ticket
                </Button>
              </div>
            </div>
          </div>}

        {/* Ticket List View */}
        {view === 'list' && <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => {
            resetAiChat();
            setView('ai');
          }} variant="outline" className="flex-1">
                <Bot className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>
              <Button onClick={() => setView('new')} className="flex-1 bg-green-600 hover:bg-green-700">
                <MessageCircle className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Your Tickets</p>
              {tickets.length === 0 ? <p className="text-center py-8 text-muted-foreground">No tickets yet</p> : <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {tickets.map(ticket => <div key={ticket.id} onClick={() => {
                setSelectedTicket(ticket);
                setView('chat');
              }} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
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
                      </div>)}
                  </div>
                </ScrollArea>}
            </div>
          </div>}

        {/* New Ticket View */}
        {view === 'new' && <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Brief description of your issue" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Describe your issue in detail..." value={messageText} onChange={e => setMessageText(e.target.value)} rows={5} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView('ai')} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={createTicket} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </div>}

        {/* Chat View */}
        {view === 'chat' && selectedTicket && <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 pb-3 border-b border-border/50 mb-3">
              <Badge variant="outline" className={getStatusColor(selectedTicket.status)}>
                {selectedTicket.status}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => {
            setView('list');
            setSelectedTicket(null);
          }}>
                ← Back
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4 max-h-[300px]">
              <div className="space-y-3">
                {messages.map(msg => <div key={msg.id} className={`flex ${msg.is_staff_reply ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${msg.is_staff_reply ? 'bg-muted/50 rounded-bl-none' : 'bg-green-600/20 border border-green-500/30 rounded-br-none'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>)}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {selectedTicket.status !== 'closed' && <div className="flex gap-2 pt-3 border-t border-border/50 mt-3">
                <Input placeholder="Type your message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                <Button onClick={sendMessage} size="icon" className="bg-green-600 hover:bg-green-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>}

            {selectedTicket.status === 'closed' && <div className="flex items-center justify-center gap-2 py-3 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">This ticket has been resolved</span>
              </div>}
          </div>}
      </DialogContent>
    </Dialog>;
}