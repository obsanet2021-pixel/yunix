import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Palette,
  Mail,
  Download,
  Shield,
  FileText,
  ArrowLeft,
  Upload,
  Save,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SystemSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCEO, loading: permLoading } = useStaffPermissions();
  
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently performing maintenance. Please check back soon.');
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [branding, setBranding] = useState({
    siteName: 'Young Wolves',
    primaryColor: '#f59e0b',
    logo: ''
  });
  const [emailTemplates, setEmailTemplates] = useState({
    invitation: 'Welcome to Young Wolves. You have been invited as a {roleName}. Please log in using your email.'
  });

  // Load all settings
  useEffect(() => {
    const loadSettings = async () => {
      // Load maintenance_mode
      const { data: maintenanceData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      
      if (maintenanceData?.value) {
        const value = maintenanceData.value as { enabled: boolean; message: string };
        setMaintenanceMode(value.enabled || false);
        setMaintenanceMessage(value.message || 'We are currently performing maintenance. Please check back soon.');
      }

      // Load branding
      const { data: brandingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'branding')
        .single();
      
      if (brandingData?.value) {
        const value = brandingData.value as { siteName: string; primaryColor: string; logo: string };
        setBranding({
          siteName: value.siteName || 'Young Wolves',
          primaryColor: value.primaryColor || '#f59e0b',
          logo: value.logo || ''
        });
      }

      // Load email_templates
      const { data: emailData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'email_templates')
        .single();
      
      if (emailData?.value) {
        const value = emailData.value as { invitation: string };
        setEmailTemplates({
          invitation: value.invitation || 'Welcome to Young Wolves. You have been invited as a {roleName}. Please log in using your email.'
        });
      }
    };
    loadSettings();
  }, []);

  const handleToggleMaintenance = async (enabled: boolean) => {
    setSavingMaintenance(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: { enabled, message: maintenanceMessage },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'maintenance_mode');

      if (error) throw error;

      setMaintenanceMode(enabled);
      toast({
        title: enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
        description: enabled 
          ? 'Only CEO can now access the system' 
          : 'All users can now access the system'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleSaveMaintenanceMessage = async () => {
    setSavingMaintenance(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: { enabled: maintenanceMode, message: maintenanceMessage },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'maintenance_mode');

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Maintenance message updated'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingMaintenance(false);
    }
  };

  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCEO) {
    navigate('/app/dashboard');
    return null;
  }

  const handleExportStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          name,
          email,
          status,
          invited_at,
          role:admin_roles(name)
        `);

      if (error) throw error;

      const csvContent = [
        ['Name', 'Email', 'Role', 'Status', 'Invited At'].join(','),
        ...(data || []).map(s => [
          s.name,
          s.email,
          Array.isArray(s.role) ? s.role[0]?.name : s.role?.name || 'No role',
          s.status,
          new Date(s.invited_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast({
        title: 'Success',
        description: 'Staff list exported successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSaveBranding = async () => {
    try {
      // Check if key exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'branding')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: branding, updated_at: new Date().toISOString() })
          .eq('key', 'branding');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: 'branding', value: branding });
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Branding settings saved'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSaveEmailTemplates = async () => {
    try {
      // Check if key exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'email_templates')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: emailTemplates, updated_at: new Date().toISOString() })
          .eq('key', 'email_templates');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: 'email_templates', value: emailTemplates });
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Email templates saved'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/admin/ceo')} className="self-start">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">System Settings</h1>
            <p className="text-muted-foreground text-sm">Configure system-wide settings</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full bg-card/50">
          <TabsTrigger value="branding" className="flex-1 min-w-[70px] gap-1 text-xs sm:text-sm py-2 px-2 sm:px-3">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Branding</span>
            <span className="xs:hidden">Brand</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1 min-w-[70px] gap-1 text-xs sm:text-sm py-2 px-2 sm:px-3">
            <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Email Templates</span>
            <span className="sm:hidden">Email</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-1 min-w-[70px] gap-1 text-xs sm:text-sm py-2 px-2 sm:px-3">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Data Export</span>
            <span className="sm:hidden">Export</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex-1 min-w-[70px] gap-1 text-xs sm:text-sm py-2 px-2 sm:px-3">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>System</span>
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
              <CardDescription>Customize the look and feel of your platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Site Name</Label>
                <Input
                  value={branding.siteName}
                  onChange={(e) => setBranding({ ...branding, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    placeholder="#f59e0b"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input type="file" accept="image/*" className="flex-1" />
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
              <Button onClick={handleSaveBranding}>
                <Save className="h-4 w-4 mr-2" />
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Customize email notifications sent to staff</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Staff Invitation Email</Label>
                <Textarea
                  value={emailTemplates.invitation}
                  onChange={(e) => setEmailTemplates({ ...emailTemplates, invitation: e.target.value })}
                  rows={5}
                  placeholder="Use {roleName} for dynamic role insertion"
                />
                <p className="text-sm text-muted-foreground">
                  Available variables: {'{roleName}'}, {'{staffName}'}, {'{email}'}
                </p>
              </div>
              <Button onClick={handleSaveEmailTemplates}>
                <Save className="h-4 w-4 mr-2" />
                Save Templates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Export Tab */}
        <TabsContent value="data">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Export your data for backup or analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Staff List</p>
                    <p className="text-sm text-muted-foreground">Export all staff members as CSV</p>
                  </div>
                </div>
                <Button onClick={handleExportStaff} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>System Controls</CardTitle>
              <CardDescription>Manage system-wide settings and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-4 rounded-lg ${maintenanceMode ? 'bg-destructive/10 border border-destructive/30' : 'bg-background/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      Maintenance Mode
                      {maintenanceMode && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                          ACTIVE
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      When enabled, only CEO can access the system
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingMaintenance && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={maintenanceMode}
                      onCheckedChange={handleToggleMaintenance}
                      disabled={savingMaintenance}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  rows={3}
                  placeholder="Message to display during maintenance"
                />
                <Button 
                  onClick={handleSaveMaintenanceMessage} 
                  disabled={savingMaintenance}
                  variant="outline"
                  size="sm"
                >
                  {savingMaintenance && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Message
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-background/50">
                <p className="font-medium mb-2">System Logs</p>
                <div className="bg-background rounded-lg p-4 font-mono text-sm text-muted-foreground h-40 overflow-y-auto">
                  <p>[{new Date().toISOString()}] System initialized</p>
                  <p>[{new Date().toISOString()}] CEO dashboard accessed</p>
                  <p>[{new Date().toISOString()}] Settings page opened</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
