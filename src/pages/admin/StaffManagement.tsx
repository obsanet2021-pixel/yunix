import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  Edit, 
  UserX, 
  Trash2,
  Mail,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Role {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  status: string;
  invited_at: string;
  role: Role | null;
}

export default function StaffManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCEO, hasPermission, loading: permLoading } = useStaffPermissions();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role_id: ''
  });
  const [sendEmail, setSendEmail] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const canAccess = isCEO || hasPermission('manage_users');

  useEffect(() => {
    if (!permLoading && !canAccess) {
      navigate('/app/dashboard');
    }
  }, [canAccess, permLoading, navigate]);

  useEffect(() => {
    if (canAccess) {
      loadData();
    }
  }, [canAccess]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffResult, rolesResult] = await Promise.all([
        supabase.from('staff').select(`
          id,
          name,
          email,
          status,
          invited_at,
          role:admin_roles(id, name)
        `).order('created_at', { ascending: false }),
        supabase.from('admin_roles').select('id, name')
      ]);

      if (staffResult.data) {
        const formattedStaff = staffResult.data.map(s => ({
          ...s,
          role: Array.isArray(s.role) ? s.role[0] : s.role
        }));
        setStaff(formattedStaff);
      }
      if (rolesResult.data) {
        setRoles(rolesResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.role_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);

    try {
      // Insert staff record and get the ID
      const { data: insertedStaff, error } = await supabase.from('staff').insert({
        name: newStaff.name,
        email: newStaff.email,
        role_id: newStaff.role_id,
        status: 'pending',
        invited_at: new Date().toISOString()
      }).select('id').single();

      if (error) throw error;

      const roleName = roles.find(r => r.id === newStaff.role_id)?.name || 'Staff';
      let emailSent = false;

      // Send invitation email via edge function if toggle is enabled
      if (sendEmail && insertedStaff) {
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-staff-invite', {
            body: {
              email: newStaff.email,
              name: newStaff.name,
              roleName,
              staffId: insertedStaff.id
            }
          });

          if (emailError) {
            console.error('Email sending error:', emailError);
            toast({
              title: 'Staff Added',
              description: 'Staff member added but email failed to send. They can be re-invited later.',
              variant: 'default'
            });
          } else {
            emailSent = true;
          }
        } catch (emailError) {
          console.error('Email function error:', emailError);
        }
      }

      toast({
        title: 'Success',
        description: emailSent 
          ? 'Staff member invited and email sent successfully!' 
          : sendEmail 
            ? 'Staff member added. Email sending may have failed.'
            : 'Staff member added successfully'
      });

      setIsAddDialogOpen(false);
      setNewStaff({ name: '', email: '', role_id: '' });
      setSendEmail(true);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStaff = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from('staff')
        .update({
          name: selectedStaff.name,
          role_id: (selectedStaff.role as any)?.id || null
        })
        .eq('id', selectedStaff.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff member updated successfully'
      });

      setIsEditDialogOpen(false);
      setSelectedStaff(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSuspend = async (staffId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    try {
      const { error } = await supabase
        .from('staff')
        .update({ status: newStatus })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Staff member ${newStatus === 'suspended' ? 'suspended' : 'activated'}`
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleRemove = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff member removed'
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate('/app/admin/ceo')}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Staff Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your team members</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={loadData} className="h-8 sm:h-9 px-2 sm:px-3">
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 sm:h-9 px-2 sm:px-3">
                <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Staff</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newStaff.role_id} onValueChange={(value) => setNewStaff({ ...newStaff, role_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="sendEmail" 
                    checked={sendEmail} 
                    onCheckedChange={(checked) => setSendEmail(checked === true)}
                  />
                  <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                    Send Invitation Email
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSending}>
                  Cancel
                </Button>
                <Button onClick={handleAddStaff} disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {sendEmail ? 'Send Invitation' : 'Add Staff'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Staff Table - Mobile Cards / Desktop Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No staff members yet. Click "Add Staff" to invite someone.
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.role?.name || 'No role'}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>{new Date(member.invited_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStaff(member); setIsEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSuspend(member.id, member.status)}>
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(member.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {staff.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                No staff members yet. Tap "Add" to invite someone.
              </p>
            ) : (
              staff.map((member) => (
                <div key={member.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {getStatusBadge(member.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">{member.role?.name || 'No role'}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(member.invited_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedStaff(member); setIsEditDialogOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSuspend(member.id, member.status)}>
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(member.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={selectedStaff.name}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedStaff.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={selectedStaff.role?.id || ''} 
                  onValueChange={(value) => {
                    const role = roles.find(r => r.id === value);
                    setSelectedStaff({ ...selectedStaff, role: role || null });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStaff}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
