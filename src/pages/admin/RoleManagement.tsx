import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions, StaffPermissions, permissionLabels, permissionGroups } from '@/hooks/useStaffPermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2,
  ArrowLeft
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: StaffPermissions;
  created_at: string;
}

const defaultPermissions: StaffPermissions = {
  // Dashboard
  view_dashboard: false,
  edit_own_dashboard: false,
  manage_dashboard: false,
  
  // Users
  view_users: false,
  edit_users: false,
  manage_users: false,
  
  // Roles
  view_roles: false,
  manage_roles: false,
  
  // Finance
  view_finance: false,
  edit_invoices: false,
  approve_payments: false,
  manage_finance: false,
  
  // Courses
  view_courses: false,
  edit_courses: false,
  publish_courses: false,
  manage_courses: false,
  
  // Analytics
  view_analytics: false,
  create_reports: false,
  edit_reports: false,
  manage_analytics: false,
  
  // Support
  view_support: false,
  reply_tickets: false,
  close_tickets: false,
  manage_support: false,
  
  // Orders
  view_orders: false,
  update_orders: false,
  approve_orders: false,
  manage_plaque_orders: false,
  
  // Settings
  view_settings: false,
  edit_settings: false,
  manage_settings: false,
  
  // Social Media
  view_social_media: false,
  edit_social_media: false,
  manage_social_media: false,
};

export default function RoleManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCEO, hasPermission, loading: permLoading } = useStaffPermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: { ...defaultPermissions }
  });

  const canAccess = isCEO || hasPermission('manage_roles');

  useEffect(() => {
    if (!permLoading && !canAccess) {
      navigate('/app/dashboard');
    }
  }, [canAccess, permLoading, navigate]);

  useEffect(() => {
    if (canAccess) {
      loadRoles();
    }
  }, [canAccess]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const formattedRoles = (data || []).map(role => ({
        ...role,
        permissions: role.permissions as unknown as StaffPermissions
      }));
      setRoles(formattedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name) {
      toast({
        title: 'Error',
        description: 'Role name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.from('admin_roles').insert({
        name: newRole.name,
        description: newRole.description || null,
        permissions: newRole.permissions as unknown as Record<string, boolean>
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role created successfully'
      });

      setIsAddDialogOpen(false);
      setNewRole({ name: '', description: '', permissions: { ...defaultPermissions } });
      loadRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const { error } = await supabase
        .from('admin_roles')
        .update({
          name: selectedRole.name,
          description: selectedRole.description,
          permissions: selectedRole.permissions as unknown as Record<string, boolean>
        })
        .eq('id', selectedRole.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role updated successfully'
      });

      setIsEditDialogOpen(false);
      setSelectedRole(null);
      loadRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (roleName === 'CEO') {
      toast({
        title: 'Error',
        description: 'Cannot delete the CEO role',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const { error } = await supabase
        .from('admin_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role deleted'
      });

      loadRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const PermissionsEditor = ({ 
    permissions, 
    onChange,
    disabled = false
  }: { 
    permissions: StaffPermissions; 
    onChange: (permissions: StaffPermissions) => void;
    disabled?: boolean;
  }) => (
    <div className="grid grid-cols-2 gap-4">
      {(Object.keys(permissionLabels) as Array<keyof StaffPermissions>).map((key) => (
        <div key={key} className="flex items-center justify-between py-2">
          <Label className="text-sm">{permissionLabels[key]}</Label>
          <Switch
            checked={permissions[key]}
            onCheckedChange={(checked) => onChange({ ...permissions, [key]: checked })}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );

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
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Role Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage roles and permissions</p>
            </div>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 sm:h-9 px-2 sm:px-3 shrink-0">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Role</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., Manager, Support Agent"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Brief description of this role"
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <PermissionsEditor
                      permissions={newRole.permissions}
                      onChange={(permissions) => setNewRole({ ...newRole, permissions })}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddRole}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Table - Mobile Cards / Desktop Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {Object.values(role.permissions).filter(Boolean).length} / {Object.keys(role.permissions).length}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedRole(role); setIsEditDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {role.name !== 'CEO' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRole(role.id, role.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{role.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{role.description || 'No description'}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {Object.values(role.permissions).filter(Boolean).length}/{Object.keys(role.permissions).length}
                  </Badge>
                </div>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedRole(role); setIsEditDialogOpen(true); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  {role.name !== 'CEO' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRole(role.id, role.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={selectedRole.name}
                  onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                  disabled={selectedRole.name === 'CEO'}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={selectedRole.description || ''}
                  onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <PermissionsEditor
                      permissions={selectedRole.permissions}
                      onChange={(permissions) => setSelectedRole({ ...selectedRole, permissions })}
                      disabled={selectedRole.name === 'CEO'}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
