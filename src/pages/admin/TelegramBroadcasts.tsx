import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, Save, Trash2, Image as ImageIcon, Users, Radio, 
  Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, 
  RefreshCw, Eye, Upload
} from 'lucide-react';
import { format } from 'date-fns';

interface BroadcastStats {
  broadcasts_today: number;
  max_per_day: number;
  total_linked_users: number;
  verified_linked_users: number;
}

interface Broadcast {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  target_audience: 'all' | 'verified';
  status: 'draft' | 'sent' | 'scheduled' | 'failed';
  sent_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
}

const TelegramBroadcasts = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'verified'>('all');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  
  // Data state
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [drafts, setDrafts] = useState<Broadcast[]>([]);
  const [history, setHistory] = useState<Broadcast[]>([]);
  
  // Dialog state
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadDrafts(), loadHistory()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const { data, error } = await supabase.functions.invoke('telegram-broadcast', {
      body: { action: 'get_stats' }
    });
    if (error) throw error;
    setStats(data);
  };

  const loadDrafts = async () => {
    const { data, error } = await supabase.functions.invoke('telegram-broadcast', {
      body: { action: 'get_drafts' }
    });
    if (error) throw error;
    setDrafts(data.drafts || []);
  };

  const loadHistory = async () => {
    const { data, error } = await supabase.functions.invoke('telegram-broadcast', {
      body: { action: 'get_history' }
    });
    if (error) throw error;
    setHistory(data.history || []);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileName = `broadcast-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('broadcast-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('broadcast-images')
        .getPublicUrl(data.path);

      setImageUrl(publicUrl);
      toast({
        title: 'Image uploaded',
        description: 'Image has been uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Title and message are required.',
        variant: 'destructive',
      });
      return;
    }

    setSavingDraft(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-broadcast', {
        body: {
          action: 'save_draft',
          title,
          message,
          image_url: imageUrl || null,
          target_audience: targetAudience,
          broadcast_id: currentDraftId,
        }
      });

      if (error) throw error;

      setCurrentDraftId(data.broadcast?.id || null);
      await loadDrafts();
      
      toast({
        title: 'Draft saved',
        description: 'Your broadcast has been saved as a draft.',
      });
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Title and message are required.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setConfirmSendOpen(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('telegram-broadcast', {
        body: {
          action: 'send_broadcast',
          title,
          message,
          image_url: imageUrl || null,
          target_audience: targetAudience,
          broadcast_id: currentDraftId,
        }
      });

      if (error) throw error;

      toast({
        title: 'Broadcast sent!',
        description: `Successfully sent to ${data.successful_sends}/${data.total_recipients} users.`,
      });

      // Reset form
      clearForm();
      await loadData();
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Send failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const loadDraft = (draft: Broadcast) => {
    setTitle(draft.title);
    setMessage(draft.message);
    setImageUrl(draft.image_url || '');
    setTargetAudience(draft.target_audience);
    setCurrentDraftId(draft.id);
    
    toast({
      title: 'Draft loaded',
      description: 'You can now edit and send this broadcast.',
    });
  };

  const clearForm = () => {
    setTitle('');
    setMessage('');
    setImageUrl('');
    setTargetAudience('all');
    setCurrentDraftId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format preview message
  const previewMessage = `🐺 YUNIX OFFICIAL UPDATE

${title || '[Title]'}

${message || '[Message body]'}

— Yunix System Notification`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Telegram Updates</h1>
          <p className="text-muted-foreground text-sm">
            Send official system updates to users via the Yunix Telegram bot.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Broadcasts Today</p>
                <p className="text-2xl font-bold">
                  {stats?.broadcasts_today || 0} / {stats?.max_per_day || 3}
                </p>
              </div>
              <Radio className="h-8 w-8 text-primary" />
            </div>
            {(stats?.broadcasts_today || 0) >= (stats?.max_per_day || 3) && (
              <p className="text-xs text-amber-500 mt-2 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Daily limit reached
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">All Linked Users</p>
                <p className="text-2xl font-bold">{stats?.total_linked_users || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified Users</p>
                <p className="text-2xl font-bold">{stats?.verified_linked_users || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Update
            </CardTitle>
            <CardDescription>
              Write a formal announcement. This message will be delivered exactly as written.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="System Maintenance Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Write your announcement here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
            </div>

            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <div className="flex items-center gap-2">
                {imageUrl ? (
                  <div className="flex items-center gap-2 flex-1">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="h-10 w-10 object-cover rounded"
                    />
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      Image uploaded
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setImageUrl('')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-1">
                              Click to upload (JPG, PNG, WebP - max 5MB)
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={targetAudience} onValueChange={(v: 'all' | 'verified') => setTargetAudience(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users ({stats?.total_linked_users || 0})</SelectItem>
                  <SelectItem value="verified">Verified Users Only ({stats?.verified_linked_users || 0})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="flex-1"
                    disabled={!title.trim() || !message.trim() || sending || (stats?.broadcasts_today || 0) >= (stats?.max_per_day || 3)}
                  >
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send Update
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Broadcast</DialogTitle>
                    <DialogDescription>
                      You are about to send this update to {targetAudience === 'all' ? stats?.total_linked_users : stats?.verified_linked_users} users.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {previewMessage}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmSendOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendBroadcast} disabled={sending}>
                      {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Confirm & Send
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>

              {(title || message || imageUrl) && (
                <Button variant="ghost" onClick={clearForm}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              How your message will appear in Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-[#1a1a2e] rounded-lg p-4 text-white font-sans">
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt="Broadcast" 
                  className="w-full rounded-lg mb-3 max-h-[200px] object-cover"
                />
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {previewMessage}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drafts & History Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Broadcast History</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No broadcasts sent yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((broadcast) => (
                      <TableRow key={broadcast.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {broadcast.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {broadcast.target_audience === 'all' ? 'All Users' : 'Verified Only'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                        <TableCell>
                          <span className="text-green-500">{broadcast.successful_sends}</span>
                          {' / '}
                          <span className="text-muted-foreground">{broadcast.total_recipients}</span>
                          {broadcast.failed_sends > 0 && (
                            <span className="text-red-500 ml-1">({broadcast.failed_sends} failed)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {broadcast.sent_at ? format(new Date(broadcast.sent_at), 'MMM d, yyyy HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts">
          <Card>
            <CardContent className="pt-6">
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No drafts saved
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((draft) => (
                      <TableRow key={draft.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {draft.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {draft.target_audience === 'all' ? 'All Users' : 'Verified Only'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(draft.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => loadDraft(draft)}>
                            Load Draft
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TelegramBroadcasts;
