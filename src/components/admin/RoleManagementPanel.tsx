import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Shield, 
  Mail, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Edit
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  status: string;
  role: Role | null;
  user_id: string | null;
}

export default function RoleManagementPanel() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffResult, rolesResult] = await Promise.all([
        supabase.from('staff').select(`
          id,
          name,
          email,
          status,
          user_id,
          role:admin_roles(id, name, description)
        `).order('created_at', { ascending: false }),
        supabase.from('admin_roles').select('id, name, description').order('name')
      ]);

      if (staffResult.data) {
        const formattedStaff = staffResult.data.map(s => ({
          ...s,
          role: Array.isArray(s.role) ? s.role[0] : s.role
        }));
        setStaff(formattedStaff);
      }
      
      if (rolesResult.data) setRoles(rolesResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || !formData.role_id) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update({
            name: formData.name,
            email: formData.email,
            role_id: formData.role_id
          })
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Staff member updated successfully' });
      } else {
        // Create new staff - email-based assignment
        const inviteToken = crypto.randomUUID();
        
        const { error } = await supabase
          .from('staff')
          .insert({
            name: formData.name,
            email: formData.email.toLowerCase(),
            role_id: formData.role_id,
            status: 'pending',
            invite_token: inviteToken
          });

        if (error) throw error;

        // Send invitation email
        const selectedRole = roles.find(r => r.id === formData.role_id);
        await supabase.functions.invoke('send-staff-invite', {
          body: {
            email: formData.email.toLowerCase(),
            name: formData.name,
            roleName: selectedRole?.name || 'Staff',
            inviteToken
          }
        });

        toast({ 
          title: 'Success', 
          description: `Invitation sent to ${formData.email}. They will be automatically assigned the ${selectedRole?.name} role when they log in.` 
        });
      }

      setDialogOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', email: '', role_id: '' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (staffId: string, newRoleId: string) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ role_id: newRoleId })
        .eq('id', staffId);

      if (error) throw error;
      
      const newRole = roles.find(r => r.id === newRoleId);
      toast({ title: 'Success', description: `Role changed to ${newRole?.name}` });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Staff member removed' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      role_id: staffMember.role?.id || ''
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Email-Based Role Assignment
            </CardTitle>
            <CardDescription>
              Assign roles to staff by email. When they log in, they're automatically recognized.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingStaff(null);
                setFormData({ name: '', email: '', role_id: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      disabled={!!editingStaff}
                    />
                    <p className="text-xs text-muted-foreground">
                      Role will be auto-assigned when this email logs in
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={formData.role_id} 
                      onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Saving...' : editingStaff ? 'Update' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No staff members assigned yet
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={member.role?.id || ''} 
                      onValueChange={(value) => handleChangeRole(member.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{getStatusBadge(member.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveStaff(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
