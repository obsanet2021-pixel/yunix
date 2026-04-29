import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PropFirmCertificateSizesGuide } from '@/components/help/PropFirmCertificateSizesGuide';
import { 
  Search, HelpCircle, BookOpen, CreditCard, GraduationCap, 
  Settings, MessageCircle, Send, Bot, User, Loader2, 
  ArrowLeft, Clock, CheckCircle2, AlertCircle, ChevronDown
} from 'lucide-react';

const POPULAR_FAQS = [
  { 
    question: 'How do I reset my password?', 
    answer: 'To reset your password, go to the login page and click "Forgot Password". Enter your registered email address and you\'ll receive a verification code. Use this code to set a new password. If you\'re already logged in, you can also change your password from your Profile settings.'
  },
  { 
    question: 'How do I get my certificate?', 
    answer: 'Certificates are automatically generated when you complete a course and you can order your passed prop firm certificate. Go to the Certificates page from your dashboard to view and download all your earned certificates. You can also order physical plaques of your certificates from that page.'
  },
  { 
    question: 'What payment methods do you accept?', 
    answer: 'We accept bank transfers and mobile money payments. For plaque orders, you can upload proof of payment which will be verified by our team. All payment details are provided during the checkout process.'
  },
  { 
    question: 'How do I access my courses?', 
    answer: 'Navigate to the Courses section from your dashboard. All available courses will be listed there. Click on any course to start learning. Your progress is automatically saved, so you can continue from where you left off anytime.'
  },
  { 
    question: 'How do I contact support?', 
    answer: 'You can contact support by clicking the "Chat with AI Assistant" button above - our AI can help with most questions instantly. For complex issues, the AI can escalate your query to our human support team who will respond via the support ticket system.'
  }
];

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

const KNOWLEDGE_CATEGORIES = [
  { id: 'getting-started', name: 'Getting Started', icon: BookOpen, description: 'New to YUNIX? Start here' },
  { id: 'billing', name: 'Billing & Payments', icon: CreditCard, description: 'Payments, refunds, and invoices' },
  { id: 'courses', name: 'Courses & Certificates', icon: GraduationCap, description: 'Learning and certifications' },
  { id: 'technical', name: 'Technical Issues', icon: Settings, description: 'Platform problems and bugs' },
  { id: 'account', name: 'Account & Login', icon: User, description: 'Profile and access issues' },
  { id: 'general', name: 'General Questions', icon: HelpCircle, description: 'Other inquiries' },
];

export default function HelpCenter() {
  const { toast } = useToast();
  const { isEnabled } = useFeatureToggles();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'chat' | 'tickets'>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ticketMessages]);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, subject, status, created_at')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTickets(data);
    }
  };

  const startChat = (category?: string) => {
    setSelectedCategory(category || null);
    setActiveView('chat');
    setMessages([{
      id: '1',
      role: 'assistant',
      content: category 
        ? `Hi! I'm the YUNIX Support Assistant. I see you have a question about **${KNOWLEDGE_CATEGORIES.find(c => c.id === category)?.name}**. How can I help you today?`
        : "Hi! I'm the YUNIX Support Assistant. How can I help you today?\n\nYou can ask me about:\n• Account & Login issues\n• Course access problems\n• Certificates\n• Payment inquiries\n• Technical bugs",
      timestamp: new Date()
    }]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('ai-support-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          category: selectedCategory
        }
      });

      console.log('Full response:', JSON.stringify(response, null, 2));

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.message || "I apologize, but I couldn't process that request. Would you like to speak with a support agent?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if escalation is needed
      if (response.data.shouldEscalate) {
        await createTicketFromChat();
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Would you like me to create a support ticket for you?",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const createTicketFromChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create ticket with chat history
    const chatHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    const subject = selectedCategory 
      ? `${KNOWLEDGE_CATEGORIES.find(c => c.id === selectedCategory)?.name} - Support Request`
      : 'Support Request';

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        message: chatHistory,
        status: 'open',
        priority: 'normal',
        category: selectedCategory || 'general'
      })
      .select()
      .single();

    if (!error && ticket) {
      // Add initial message to ticket
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: chatHistory,
          is_staff_reply: false
        });

      const ticketNumber = `YNX-${ticket.id.slice(0, 5).toUpperCase()}`;
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `✅ **Ticket Created**\n\n**Ticket ID:** ${ticketNumber}\n**Status:** Open\n\nOur support team will respond to this conversation shortly. You can continue chatting here or view your ticket in "My Tickets".`,
        timestamp: new Date()
      }]);

      setCurrentTicketId(ticket.id);
      loadTickets();
      
      toast({
        title: "Ticket Created",
        description: `Your ticket ${ticketNumber} has been submitted.`
      });
    }
  };

  const escalateToHuman = () => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: "I'll connect you with our support team right away. Let me create a ticket for you...",
      timestamp: new Date()
    }]);
    
    setTimeout(() => createTicketFromChat(), 1000);
  };

  const viewTicket = async (ticketId: string) => {
    setCurrentTicketId(ticketId);
    setActiveView('chat');
    
    const { data: msgs } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    
    if (msgs) {
      setTicketMessages(msgs);
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          setTicketMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendTicketMessage = async () => {
    if (!inputMessage.trim() || !currentTicketId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('support_messages')
      .insert({
        ticket_id: currentTicketId,
        sender_id: user.id,
        message: inputMessage.trim(),
        is_staff_reply: false
      });

    setInputMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'in_progress': case 'live': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'resolved': case 'closed': return 'bg-green-500/10 text-green-500 border-green-500/30';
      default: return 'bg-muted';
    }
  };

  // Ticket Chat View
  if (activeView === 'chat' && currentTicketId && ticketMessages.length > 0) {
    const ticket = tickets.find(t => t.id === currentTicketId);
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => {
            setActiveView('tickets');
            setCurrentTicketId(null);
            setTicketMessages([]);
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <div>
            <h2 className="font-semibold">{ticket?.subject}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>YNX-{currentTicketId.slice(0, 5).toUpperCase()}</span>
              <Badge variant="outline" className={getStatusColor(ticket?.status || '')}>
                {ticket?.status}
              </Badge>
            </div>
          </div>
        </div>

        <Card className="h-[500px] flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {ticketMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_staff_reply ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.is_staff_reply
                      ? 'bg-muted rounded-bl-none'
                      : 'bg-primary/20 border border-primary/30 rounded-br-none'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {ticket?.status !== 'closed' && (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTicketMessage()}
                />
                <Button onClick={sendTicketMessage} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // AI Chat View
  if (activeView === 'chat') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => {
            setActiveView('home');
            setMessages([]);
            setSelectedCategory(null);
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>
          <div>
            <h2 className="font-semibold">AI Support Assistant</h2>
            <p className="text-sm text-muted-foreground">Get instant help from our AI</p>
          </div>
        </div>

        <Card className="h-[500px] flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'assistant' ? 'bg-primary/20' :
                      msg.role === 'system' ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      {msg.role === 'assistant' && <Bot className="h-4 w-4 text-primary" />}
                      {msg.role === 'system' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {msg.role === 'user' && <User className="h-4 w-4" />}
                    </div>
                    <div className={`p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary/20 border border-primary/30 rounded-br-none'
                        : msg.role === 'system'
                        ? 'bg-green-500/10 border border-green-500/30 rounded-bl-none'
                        : 'bg-muted rounded-bl-none'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t space-y-3">
            {messages.length > 2 && !currentTicketId && (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={escalateToHuman}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Talk to Support Agent
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading}
              />
              <Button onClick={sendMessage} size="icon" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Tickets View
  if (activeView === 'tickets') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveView('home')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>
          <div>
            <h2 className="font-semibold">My Tickets</h2>
            <p className="text-sm text-muted-foreground">View your support conversations</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets yet</p>
                <Button variant="outline" className="mt-4" onClick={() => startChat()}>
                  Start a Conversation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => viewTicket(ticket.id)}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ticket.subject}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                          <span>•</span>
                          <span>YNX-{ticket.id.slice(0, 5).toUpperCase()}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Home View
  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 w-full overflow-x-hidden px-1">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20">
          <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        </div>
        <h1 className="text-xl sm:text-3xl font-bold">YUNIX Help Center</h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
          Find answers to common questions or get help from our support team
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <Input
          placeholder="Search for help articles..."
          className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
        <Button onClick={() => startChat()} size="sm" className="gap-2 h-9 sm:h-10 text-sm">
          <Bot className="h-4 w-4" />
          Chat with AI
        </Button>
        <Button variant="outline" onClick={() => setActiveView('tickets')} size="sm" className="gap-2 h-9 sm:h-10 text-sm">
          <MessageCircle className="h-4 w-4" />
          My Tickets ({tickets.length})
        </Button>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KNOWLEDGE_CATEGORIES.map((category) => (
            <Card 
              key={category.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => startChat(category.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {POPULAR_FAQS.map((faq, i) => (
            <Collapsible 
              key={i}
              open={expandedFaq === i}
              onOpenChange={(open) => setExpandedFaq(open ? i : null)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{faq.question}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedFaq === i ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="px-3 pb-3 pt-1 ml-7 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Prop Firm Certificate Sizes Guide - Only show if feature is enabled */}
      {isEnabled('certificate_size_guide') && <PropFirmCertificateSizesGuide />}
    </div>
  );
}