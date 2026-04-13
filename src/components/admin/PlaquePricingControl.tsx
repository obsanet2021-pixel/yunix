import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  DollarSign, 
  Edit2, 
  Plus, 
  Trash2, 
  Save,
  Package,
  Truck
} from "lucide-react";

interface PlaquePrice {
  id: string;
  size_name: string;
  dimensions: string;
  price: number;
  express_surcharge: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_EXPRESS_SURCHARGE = 20;

export function PlaquePricingControl() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<PlaquePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<PlaquePrice | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form state
  const [formSizeName, setFormSizeName] = useState("");
  const [formDimensions, setFormDimensions] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formExpressSurcharge, setFormExpressSurcharge] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("plaque_prices")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      setPrices(data || []);
    } catch (error) {
      console.error("Error fetching prices:", error);
      toast({
        title: "Error",
        description: "Failed to load plaque prices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (price: PlaquePrice) => {
    setEditingPrice(price);
    setFormSizeName(price.size_name);
    setFormDimensions(price.dimensions);
    setFormPrice(price.price.toString());
    setFormExpressSurcharge((price.express_surcharge ?? DEFAULT_EXPRESS_SURCHARGE).toString());
    setFormIsActive(price.is_active);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormSizeName("");
    setFormDimensions("");
    setFormPrice("");
    setFormExpressSurcharge(DEFAULT_EXPRESS_SURCHARGE.toString());
    setFormIsActive(true);
    setIsAddDialogOpen(true);
  };

  const savePrice = async () => {
    if (!editingPrice) return;

    try {
      const { error } = await supabase
        .from("plaque_prices")
        .update({
          size_name: formSizeName,
          dimensions: formDimensions,
          price: parseFloat(formPrice) || 0,
          express_surcharge: parseFloat(formExpressSurcharge) || DEFAULT_EXPRESS_SURCHARGE,
          is_active: formIsActive,
        })
        .eq("id", editingPrice.id);

      if (error) throw error;

      toast({
        title: "Price Updated",
        description: "Plaque price has been updated successfully. Users will see changes immediately.",
      });

      setIsEditDialogOpen(false);
      setEditingPrice(null);
      fetchPrices();
    } catch (error) {
      console.error("Error updating price:", error);
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive",
      });
    }
  };

  const addPrice = async () => {
    if (!formSizeName || !formDimensions || !formPrice) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("plaque_prices")
        .insert({
          size_name: formSizeName,
          dimensions: formDimensions,
          price: parseFloat(formPrice) || 0,
          express_surcharge: parseFloat(formExpressSurcharge) || DEFAULT_EXPRESS_SURCHARGE,
          is_active: formIsActive,
        });

      if (error) throw error;

      toast({
        title: "Price Added",
        description: "New plaque size has been added. Users will see it immediately.",
      });

      setIsAddDialogOpen(false);
      fetchPrices();
    } catch (error) {
      console.error("Error adding price:", error);
      toast({
        title: "Error",
        description: "Failed to add price",
        variant: "destructive",
      });
    }
  };

  const deletePrice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("plaque_prices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Price Deleted",
        description: "Plaque size has been removed. Users will no longer see this option.",
      });

      fetchPrices();
    } catch (error) {
      console.error("Error deleting price:", error);
      toast({
        title: "Error",
        description: "Failed to delete price",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("plaque_prices")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Size ${!currentActive ? "activated - now visible to users" : "deactivated - hidden from users"}`,
      });

      fetchPrices();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const lastUpdated = prices.length > 0 
    ? format(new Date(Math.max(...prices.map(p => new Date(p.updated_at).getTime()))), "MM/dd/yyyy")
    : "N/A";

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Plaque Pricing Control
              </CardTitle>
              <CardDescription>
                Set plaque prices for all sizes. Changes reflect instantly for users. Last updated: {lastUpdated}
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add New Size
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prices.map((price) => (
              <Card 
                key={price.id} 
                className={`bg-background/50 border-border/50 ${!price.is_active ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{price.size_name}</h4>
                      <Badge 
                        variant={price.is_active ? "default" : "secondary"} 
                        className="mt-1"
                      >
                        {price.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(price)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deletePrice(price.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">{price.dimensions}</p>
                  <p className="text-2xl font-bold text-primary">${price.price.toFixed(2)}</p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Truck className="h-3 w-3" />
                    Express: +${(price.express_surcharge ?? DEFAULT_EXPRESS_SURCHARGE).toFixed(2)}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Visible to users</span>
                    <Switch
                      checked={price.is_active}
                      onCheckedChange={() => toggleActive(price.id, price.is_active)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {prices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No plaque sizes configured yet</p>
              <Button onClick={openAddDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Size
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plaque Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Size Name</Label>
              <Input
                value={formSizeName}
                onChange={(e) => setFormSizeName(e.target.value)}
                placeholder="e.g., Small"
              />
            </div>
            <div>
              <Label>Dimensions Display</Label>
              <Input
                value={formDimensions}
                onChange={(e) => setFormDimensions(e.target.value)}
                placeholder="e.g., 20x30 cm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Express Surcharge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formExpressSurcharge}
                  onChange={(e) => setFormExpressSurcharge(e.target.value)}
                  placeholder="20.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Visible to Users</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePrice}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Price Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Plaque Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Size Name</Label>
              <Input
                value={formSizeName}
                onChange={(e) => setFormSizeName(e.target.value)}
                placeholder="e.g., Large"
              />
            </div>
            <div>
              <Label>Dimensions Display</Label>
              <Input
                value={formDimensions}
                onChange={(e) => setFormDimensions(e.target.value)}
                placeholder="e.g., 40x60 cm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Express Surcharge ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formExpressSurcharge}
                  onChange={(e) => setFormExpressSurcharge(e.target.value)}
                  placeholder="20.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Visible to Users</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addPrice}>
              <Plus className="h-4 w-4 mr-2" />
              Add Size
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
