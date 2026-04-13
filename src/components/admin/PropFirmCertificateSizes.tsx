import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Edit2, 
  Plus, 
  Trash2, 
  Save,
  FileText,
  Award
} from "lucide-react";

interface CertificateSize {
  id: string;
  prop_firm_name: string;
  certificate_type: string;
  size: string;
  created_at: string;
  updated_at: string;
}

interface GroupedFirm {
  name: string;
  certificates: CertificateSize[];
}

const CERTIFICATE_TYPES = [
  "Funded Certificate",
  "Payout Certificate",
  "Lifetime Certificate",
  "Phase Passing Certificate"
];

const SIZE_OPTIONS = ["A2", "A3", "A4", "Custom"];

export function PropFirmCertificateSizes() {
  const { toast } = useToast();
  const [sizes, setSizes] = useState<CertificateSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFirmDialogOpen, setIsAddFirmDialogOpen] = useState(false);
  const [isAddCertDialogOpen, setIsAddCertDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<CertificateSize | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'firm' | 'cert'; id?: string; firmName?: string } | null>(null);
  
  // Form state
  const [formFirmName, setFormFirmName] = useState("");
  const [formCertType, setFormCertType] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formCustomSize, setFormCustomSize] = useState("");
  const [selectedFirmForCert, setSelectedFirmForCert] = useState("");

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from("prop_firm_certificate_sizes")
        .select("*")
        .order("prop_firm_name", { ascending: true });

      if (error) throw error;
      setSizes(data || []);
    } catch (error) {
      console.error("Error fetching certificate sizes:", error);
      toast({
        title: "Error",
        description: "Failed to load certificate sizes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group sizes by prop firm
  const groupedFirms: GroupedFirm[] = sizes.reduce((acc, size) => {
    const existing = acc.find(f => f.name === size.prop_firm_name);
    if (existing) {
      existing.certificates.push(size);
    } else {
      acc.push({ name: size.prop_firm_name, certificates: [size] });
    }
    return acc;
  }, [] as GroupedFirm[]);

  const openAddFirmDialog = () => {
    setFormFirmName("");
    setFormCertType("");
    setFormSize("");
    setFormCustomSize("");
    setIsAddFirmDialogOpen(true);
  };

  const openAddCertDialog = (firmName: string) => {
    setSelectedFirmForCert(firmName);
    setFormCertType("");
    setFormSize("");
    setFormCustomSize("");
    setIsAddCertDialogOpen(true);
  };

  const openEditDialog = (cert: CertificateSize) => {
    setEditingCert(cert);
    setFormCertType(cert.certificate_type);
    const isStandardSize = SIZE_OPTIONS.slice(0, -1).includes(cert.size);
    setFormSize(isStandardSize ? cert.size : "Custom");
    setFormCustomSize(isStandardSize ? "" : cert.size);
    setIsEditDialogOpen(true);
  };

  const addFirmWithCert = async () => {
    if (!formFirmName.trim() || !formCertType || !formSize) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const finalSize = formSize === "Custom" ? formCustomSize : formSize;
    if (!finalSize.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom size",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("prop_firm_certificate_sizes")
        .insert({
          prop_firm_name: formFirmName.trim(),
          certificate_type: formCertType,
          size: finalSize,
        });

      if (error) throw error;

      toast({
        title: "Prop Firm Added",
        description: "New prop firm with certificate size has been added.",
      });

      setIsAddFirmDialogOpen(false);
      fetchSizes();
    } catch (error) {
      console.error("Error adding prop firm:", error);
      toast({
        title: "Error",
        description: "Failed to add prop firm",
        variant: "destructive",
      });
    }
  };

  const addCertToFirm = async () => {
    if (!formCertType || !formSize) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const finalSize = formSize === "Custom" ? formCustomSize : formSize;
    if (!finalSize.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom size",
        variant: "destructive",
      });
      return;
    }

    // Check if certificate type already exists for this firm
    const exists = sizes.some(
      s => s.prop_firm_name === selectedFirmForCert && s.certificate_type === formCertType
    );
    if (exists) {
      toast({
        title: "Error",
        description: "This certificate type already exists for this prop firm",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("prop_firm_certificate_sizes")
        .insert({
          prop_firm_name: selectedFirmForCert,
          certificate_type: formCertType,
          size: finalSize,
        });

      if (error) throw error;

      toast({
        title: "Certificate Added",
        description: "New certificate type has been added to the prop firm.",
      });

      setIsAddCertDialogOpen(false);
      fetchSizes();
    } catch (error) {
      console.error("Error adding certificate:", error);
      toast({
        title: "Error",
        description: "Failed to add certificate",
        variant: "destructive",
      });
    }
  };

  const updateCert = async () => {
    if (!editingCert || !formCertType || !formSize) return;

    const finalSize = formSize === "Custom" ? formCustomSize : formSize;
    if (!finalSize.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom size",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("prop_firm_certificate_sizes")
        .update({
          certificate_type: formCertType,
          size: finalSize,
        })
        .eq("id", editingCert.id);

      if (error) throw error;

      toast({
        title: "Certificate Updated",
        description: "Certificate size has been updated.",
      });

      setIsEditDialogOpen(false);
      setEditingCert(null);
      fetchSizes();
    } catch (error) {
      console.error("Error updating certificate:", error);
      toast({
        title: "Error",
        description: "Failed to update certificate",
        variant: "destructive",
      });
    }
  };

  const deleteCert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("prop_firm_certificate_sizes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Certificate Deleted",
        description: "Certificate type has been removed.",
      });

      fetchSizes();
    } catch (error) {
      console.error("Error deleting certificate:", error);
      toast({
        title: "Error",
        description: "Failed to delete certificate",
        variant: "destructive",
      });
    }
  };

  const deleteFirm = async (firmName: string) => {
    try {
      const { error } = await supabase
        .from("prop_firm_certificate_sizes")
        .delete()
        .eq("prop_firm_name", firmName);

      if (error) throw error;

      toast({
        title: "Prop Firm Deleted",
        description: "Prop firm and all its certificates have been removed.",
      });

      fetchSizes();
    } catch (error) {
      console.error("Error deleting prop firm:", error);
      toast({
        title: "Error",
        description: "Failed to delete prop firm",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'firm' && deleteConfirm.firmName) {
      deleteFirm(deleteConfirm.firmName);
    } else if (deleteConfirm.type === 'cert' && deleteConfirm.id) {
      deleteCert(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

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
                <Award className="h-5 w-5 text-primary" />
                Prop Firm Certificate Sizes
              </CardTitle>
              <CardDescription>
                Define certificate sizes for each prop firm. Users see this in the Help Center.
              </CardDescription>
            </div>
            <Button onClick={openAddFirmDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Prop Firm
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedFirms.map((firm) => (
              <Card key={firm.name} className="bg-background/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-lg">{firm.name}</h4>
                      <Badge variant="secondary">{firm.certificates.length} types</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddCertDialog(firm.name)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Type
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm({ type: 'firm', firmName: firm.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    {firm.certificates.map((cert) => (
                      <div 
                        key={cert.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cert.certificate_type}</span>
                          <Badge variant="outline" className="ml-2">{cert.size}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(cert)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'cert', id: cert.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {groupedFirms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No prop firms configured yet</p>
              <Button onClick={openAddFirmDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Prop Firm
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Prop Firm Dialog */}
      <Dialog open={isAddFirmDialogOpen} onOpenChange={setIsAddFirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Prop Firm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prop Firm Name</Label>
              <Input
                value={formFirmName}
                onChange={(e) => setFormFirmName(e.target.value)}
                placeholder="e.g., FTMO"
              />
            </div>
            <div>
              <Label>Certificate Type</Label>
              <Select value={formCertType} onValueChange={setFormCertType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certificate type" />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size</Label>
              <Select value={formSize} onValueChange={setFormSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formSize === "Custom" && (
              <div>
                <Label>Custom Size</Label>
                <Input
                  value={formCustomSize}
                  onChange={(e) => setFormCustomSize(e.target.value)}
                  placeholder="e.g., A5"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addFirmWithCert}>
              <Plus className="h-4 w-4 mr-2" />
              Add Prop Firm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Certificate to Firm Dialog */}
      <Dialog open={isAddCertDialogOpen} onOpenChange={setIsAddCertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Certificate Type to {selectedFirmForCert}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Certificate Type</Label>
              <Select value={formCertType} onValueChange={setFormCertType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certificate type" />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size</Label>
              <Select value={formSize} onValueChange={setFormSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formSize === "Custom" && (
              <div>
                <Label>Custom Size</Label>
                <Input
                  value={formCustomSize}
                  onChange={(e) => setFormCustomSize(e.target.value)}
                  placeholder="e.g., A5"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCertToFirm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Certificate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Certificate Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Certificate Type</Label>
              <Select value={formCertType} onValueChange={setFormCertType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certificate type" />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size</Label>
              <Select value={formSize} onValueChange={setFormSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formSize === "Custom" && (
              <div>
                <Label>Custom Size</Label>
                <Input
                  value={formCustomSize}
                  onChange={(e) => setFormCustomSize(e.target.value)}
                  placeholder="e.g., A5"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateCert}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === 'firm' ? 'Delete Prop Firm?' : 'Delete Certificate Type?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'firm' 
                ? `This will delete "${deleteConfirm.firmName}" and all its certificate types. This action cannot be undone.`
                : 'This will delete this certificate type. This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
