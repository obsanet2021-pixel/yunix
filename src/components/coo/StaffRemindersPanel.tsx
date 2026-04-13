import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Bell, Plus, CheckCircle2, Clock, AlertTriangle, 
  Trash2, Calendar as CalendarIcon, User, RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  assigned_to: string;
  created_by: string;
  completed_at: string | null;
  assignee?: {
    id: string;
    name: string;
  };
}

interface StaffMember {
  id: string;
  name: string;
  role?: {
    name: string;
  };
}

export function StaffRemindersPanel() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadReminders(), loadStaff()]);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    const { data, error } = await supabase
      .from('staff_reminders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reminders:', error);
      return;
    }

    // Get staff names for assigned_to
    const staffIds = [...new Set(data?.map(r => r.assigned_to) || [])];
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name')
        .in('id', staffIds);

      const staffMap = new Map(staffData?.map(s => [s.id, s]) || []);
      
      const remindersWithAssignee = (data || []).map(r => ({
        ...r,
        assignee: staffMap.get(r.assigned_to)
      }));
      
      setReminders(remindersWithAssignee);
    } else {
      setReminders(data || []);
    }
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role_id')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error loading staff:', error);
      return;
    }

    setStaffMembers(data || []);
  };

  const handleCreateReminder = async () => {
    if (!title.trim() || !assignedTo) {
      toast.error('Please fill in required fields');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get staff ID for current user
      const { data: currentStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentStaff) throw new Error('Staff record not found');

      const { data: newReminder, error } = await supabase
        .from('staff_reminders')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDate?.toISOString() || null,
          assigned_to: assignedTo,
          created_by: currentStaff.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send Telegram notification to assigned staff
      try {
        const { data: notificationResult } = await supabase.functions.invoke('send-reminder-notification', {
          body: {
            reminder_id: newReminder.id,
            assigned_to_staff_id: assignedTo,
            title: title.trim(),
            description: description.trim() || null,
            priority,
            due_date: dueDate?.toISOString() || null,
            created_by_staff_id: currentStaff.id,
          },
        });

        if (notificationResult?.sent) {
          toast.success(`Reminder created and ${notificationResult.staff_name} was notified via Telegram`);
        } else if (notificationResult?.reason === 'not_linked') {
          toast.success('Reminder created successfully');
          toast.info(`${notificationResult.staff_name} is not linked to Telegram - no notification sent`);
        } else {
          toast.success('Reminder created successfully');
          console.log('Notification not sent:', notificationResult);
        }
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        toast.success('Reminder created successfully');
      }

      setShowCreateModal(false);
      resetForm();
      loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (reminderId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = currentStaff?.id;
      }

      const { error } = await supabase
        .from('staff_reminders')
        .update(updateData)
        .eq('id', reminderId);

      if (error) throw error;

      toast.success(`Reminder marked as ${newStatus}`);
      loadReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const { error } = await supabase
        .from('staff_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Reminder deleted');
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('normal');
    setDueDate(undefined);
    setAssignedTo('');
  };

  const filteredReminders = reminders.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'in_progress') return r.status === 'in_progress';
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  });

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const inProgressCount = reminders.filter(r => r.status === 'in_progress').length;
  const completedCount = reminders.filter(r => r.status === 'completed').length;

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[priority] || styles.normal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            Staff Reminders
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage reminders for staff members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Reminder
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <RefreshCw className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{inProgressCount}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders List */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                In Progress ({inProgressCount})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed ({completedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filteredReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No {activeTab.replace('_', ' ')} reminders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-medium">{reminder.title}</h4>
                        {reminder.description && (
                          <p className="text-sm text-muted-foreground">{reminder.description}</p>
                        )}
                      </div>
                      <Badge className={getPriorityBadge(reminder.priority)}>
                        {reminder.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {reminder.assignee?.name || 'Unknown'}
                      </div>
                      {reminder.due_date && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(reminder.due_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      {reminder.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(reminder.id, 'in_progress')}
                        >
                          Start Work
                        </Button>
                      )}
                      {reminder.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                          onClick={() => handleUpdateStatus(reminder.id, 'completed')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive ml-auto"
                        onClick={() => handleDeleteReminder(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Reminder Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Reminder</DialogTitle>
            <DialogDescription>
              Assign a task or reminder to a staff member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter reminder title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter additional details (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReminder} disabled={creating}>
              {creating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
