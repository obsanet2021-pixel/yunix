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
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  MapPin, 
  Truck,
  Gift,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface DeliveryPricing {
  id: string;
  city_name: string;
  delivery_fee: number;
  is_free: boolean;
  is_active: boolean;
  is_fallback: boolean;
  created_at: string;
  updated_at: string;
}

export function DeliveryPricingControl() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<DeliveryPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryPricing | null>(null);
  const [formData, setFormData] = useState({
    city_name: '',
    delivery_fee: 0,
    is_free: false,
    is_active: true
  });

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_pricing')
        .select('*')
        .order('is_fallback', { ascending: true })
        .order('city_name', { ascending: true });

      if (error) throw error;
      setPricing(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({
      city_name: '',
      delivery_fee: 0,
      is_free: false,
      is_active: true
    });
    setShowDialog(true);
  };

  const openEditDialog = (item: DeliveryPricing) => {
    setEditingItem(item);
    setFormData({
      city_name: item.city_name,
      delivery_fee: item.delivery_fee,
      is_free: item.is_free,
      is_active: item.is_active
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.city_name.trim()) {
      toast({ title: 'Error', description: 'City name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('delivery_pricing')
          .update({
            city_name: formData.city_name,
            delivery_fee: formData.is_free ? 0 : formData.delivery_fee,
            is_free: formData.is_free,
            is_active: formData.is_active
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Delivery pricing updated' });
      } else {
        const { error } = await supabase
          .from('delivery_pricing')
          .insert({
            city_name: formData.city_name,
            delivery_fee: formData.is_free ? 0 : formData.delivery_fee,
            is_free: formData.is_free,
            is_active: formData.is_active,
            is_fallback: false
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'New city added' });
      }

      setShowDialog(false);
      loadPricing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: DeliveryPricing) => {
    if (item.is_fallback) {
      toast({ title: 'Cannot Delete', description: 'The fallback price cannot be deleted', variant: 'destructive' });
      return;
    }

    if (!confirm(`Delete pricing for "${item.city_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('delivery_pricing')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'City pricing removed' });
      loadPricing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (item: DeliveryPricing) => {
    try {
      const { error } = await supabase
        .from('delivery_pricing')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      loadPricing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
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
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Delivery Pricing</h2>
            <p className="text-sm text-muted-foreground">Manage delivery fees by city</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPricing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add City
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500">Ethiopian Delivery Zones</p>
              <p className="text-muted-foreground">
                Adama/Nazrit has free delivery. Other cities use Ethiopian Post Office rates which you can adjust here.
                The "Other Cities" option is the fallback for any unlisted city.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">City Delivery Fees</CardTitle>
          <CardDescription>Configure delivery fees for each city or zone</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City / Zone</TableHead>
                <TableHead>Fee ($)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.city_name}</span>
                      {item.is_fallback && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.is_free ? (
                      <span className="text-green-500 font-medium">Free</span>
                    ) : (
                      <span>${item.delivery_fee.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.is_free ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <Gift className="h-3 w-3 mr-1" />
                        Free
                      </Badge>
                    ) : (
                      <Badge variant="outline">Paid</Badge>
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
                      {!item.is_fallback && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit City Pricing' : 'Add New City'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="city_name">City Name *</Label>
              <Input
                id="city_name"
                value={formData.city_name}
                onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                placeholder="Enter city name"
                disabled={editingItem?.is_fallback}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_free}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
                />
                <Label>Free Delivery</Label>
              </div>
            </div>

            {!formData.is_free && (
              <div className="space-y-2">
                <Label htmlFor="delivery_fee">Delivery Fee ($) *</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter delivery fee in USD"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active (visible to customers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingItem ? 'Update' : 'Add City'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
