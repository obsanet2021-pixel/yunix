import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Ticket,
  RefreshCw,
  Loader2,
  Copy,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  min_order_value: number | null;
  max_discount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export function DiscountCodesControl() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DiscountCode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as string,
    discount_value: 10,
    max_uses: '',
    min_order_value: '',
    max_discount: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      max_uses: '',
      min_order_value: '',
      max_discount: '',
      valid_from: '',
      valid_until: '',
      is_active: true
    });
    setShowDialog(true);
  };

  const openEditDialog = (item: DiscountCode) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      description: item.description || '',
      discount_type: item.discount_type,
      discount_value: item.discount_value,
      max_uses: item.max_uses?.toString() || '',
      min_order_value: item.min_order_value?.toString() || '',
      max_discount: item.max_discount?.toString() || '',
      valid_from: item.valid_from ? item.valid_from.split('T')[0] : '',
      valid_until: item.valid_until ? item.valid_until.split('T')[0] : '',
      is_active: item.is_active
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast({ title: 'Error', description: 'Code is required', variant: 'destructive' });
      return;
    }

    if (formData.discount_value <= 0) {
      toast({ title: 'Error', description: 'Discount value must be greater than 0', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : null,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active
      };

      if (editingItem) {
        const { error } = await supabase
          .from('discount_codes')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Discount code updated' });
      } else {
        const { error } = await supabase
          .from('discount_codes')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Success', description: 'Discount code created' });
      }

      setShowDialog(false);
      loadCodes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: DiscountCode) => {
    if (!confirm(`Delete discount code "${item.code}"?`)) return;

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Discount code removed' });
      loadCodes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (item: DiscountCode) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      loadCodes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Discount Codes</h2>
            <p className="text-sm text-muted-foreground">Create and manage promo codes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCodes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Code
          </Button>
        </div>
      </div>

      {/* Codes Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Active Codes ({codes.filter(c => c.is_active).length})</CardTitle>
          <CardDescription>Manage promotional discount codes for customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No discount codes created yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold">{item.code}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyCode(item.code, item.id)}
                        >
                          {copiedId === item.id ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.discount_type === 'percentage' 
                          ? `${item.discount_value}%` 
                          : `$${item.discount_value}`}
                      </Badge>
                      {item.max_discount && (
                        <span className="text-xs text-muted-foreground block mt-1">
                          Max: ${item.max_discount}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {item.current_uses}{item.max_uses ? `/${item.max_uses}` : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.valid_from || item.valid_until ? (
                        <div className="text-xs">
                          {item.valid_from && <div>From: {format(new Date(item.valid_from), 'MMM d, yyyy')}</div>}
                          {item.valid_until && <div>Until: {format(new Date(item.valid_until), 'MMM d, yyyy')}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleActive(item)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={generateCode}>
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summer sale discount"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min={0}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_uses">Max Uses (optional)</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min={1}
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_discount">Max Discount $</Label>
                <Input
                  id="max_discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active (usable by customers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingItem ? 'Update' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}