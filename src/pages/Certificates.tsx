import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Award, Printer, Calendar, ExternalLink, Shield, Package, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PlaqueOrderModal } from "@/components/certificates/PlaqueOrderModal";
import { Badge } from "@/components/ui/badge";

interface Certificate {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  issued_date: string | null;
  created_at: string;
  isIssued?: boolean;
  isFinalCertificate?: boolean;
}

export default function Certificates() {
  const navigate = useNavigate();
  const { isEnabled, loading: togglesLoading } = useFeatureToggles();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [isPlaqueModalOpen, setIsPlaqueModalOpen] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    issued_date: ""
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user-uploaded certificates
    const { data: userCerts, error: userError } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (userError) {
      toast({
        title: "Error",
        description: "Failed to load certificates",
        variant: "destructive"
      });
      return;
    }

    // Fetch issued certificates from final_certificates
    const { data: issuedCerts, error: issuedError } = await supabase
      .from("final_certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (issuedError) {
      console.error("Error fetching issued certificates:", issuedError);
    }

    // Transform user certificates
    const transformedUserCerts: Certificate[] = (userCerts || []).map(cert => ({
      ...cert,
      isIssued: false
    }));

    // Transform issued certificates
    const transformedIssuedCerts: Certificate[] = (issuedCerts || []).map(cert => ({
      id: cert.id,
      title: "YUNIX Certificate of Completion",
      description: "Official certificate issued by YUNIX",
      file_url: cert.certificate_url,
      file_type: cert.certificate_url.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      issued_date: cert.issued_at,
      created_at: cert.created_at || cert.issued_at || new Date().toISOString(),
      isIssued: true,
      isFinalCertificate: true
    }));

    // Merge and sort by created_at
    const allCerts = [...transformedIssuedCerts, ...transformedUserCerts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setCertificates(allCerts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive"
        });
        return;
      }
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("certificates").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("certificates").getPublicUrl(fileName);
      const { error } = await supabase.from("certificates").insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        file_url: publicUrl,
        file_type: file.type,
        issued_date: formData.issued_date || null
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Certificate uploaded successfully"
      });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        issued_date: ""
      });
      setFile(null);
      fetchCertificates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload certificate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPlaque = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setIsPlaqueModalOpen(true);
  };

  const handleDeleteCertificate = async () => {
    if (!certificateToDelete) return;
    
    setIsDeleting(true);
    try {
      // Try to delete from storage if we can parse the path
      const fileUrl = certificateToDelete.file_url;
      if (fileUrl && fileUrl.includes('/certificates/')) {
        try {
          // Extract the path from the URL (format: .../storage/v1/object/public/certificates/user_id/filename)
          const pathMatch = fileUrl.match(/\/certificates\/(.+)$/);
          if (pathMatch) {
            const storagePath = pathMatch[1];
            await supabase.storage.from('certificates').remove([storagePath]);
          }
        } catch (storageError) {
          console.warn('Could not delete storage file:', storageError);
          // Continue with DB deletion even if storage fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from("certificates")
        .delete()
        .eq("id", certificateToDelete.id);

      if (error) throw error;

      toast({
        title: "Certificate deleted",
        description: "The certificate has been permanently removed"
      });

      // Close modals and refresh
      setDeleteConfirmOpen(false);
      setCertificateToDelete(null);
      setPreviewCertificate(null);
      fetchCertificates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete certificate",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">Certificates</h1>
          <p className="text-sm text-muted-foreground">Upload and manage your trading certificates</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!togglesLoading && isEnabled('plaque_orders') && (
            <Button variant="outline" className="gap-2 shrink-0" onClick={() => navigate('/app/orders')}>
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">My</span> Orders
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span> Certificate
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>Upload Certificate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Certificate Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., FTMO Funded Trader Certificate"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issued_date">Issue Date</Label>
                <Input
                  id="issued_date"
                  type="date"
                  value={formData.issued_date}
                  onChange={e => setFormData({ ...formData, issued_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">File (Image or PDF) *</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this certificate..."
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Uploading..." : "Upload Certificate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {certificates.length === 0 ? (
        <Card className="glow-card">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Award className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">No Certificates Yet</h3>
            <p className="text-muted-foreground mb-6 text-center text-sm max-w-md">
              Upload your first certificate to showcase your achievements
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Certificate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {certificates.map(cert => (
            <Card key={cert.id} className="glow-card overflow-hidden group w-full">
              {/* Certificate Preview */}
              <div 
                className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => setPreviewCertificate(cert)}
              >
                {cert.file_type.startsWith("image/") || (!cert.file_type.includes('pdf') && cert.file_url && !cert.file_url.endsWith('.pdf')) ? (
                  <img
                    src={cert.file_url}
                    alt={cert.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 w-full h-full hover:bg-muted/80 transition-colors">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                    <span className="text-xs sm:text-sm text-muted-foreground">View PDF</span>
                  </div>
                )}
                {/* Badge */}
                {cert.isIssued ? (
                  <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs">
                    <Shield className="h-3 w-3 mr-1" /> Issued by YUNIX
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-primary text-primary-foreground text-xs">
                    <Award className="h-3 w-3 mr-1" /> Certificate
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-base sm:text-lg line-clamp-1">{cert.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4">
                {cert.issued_date && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Issued:</span>
                    <span className="font-medium truncate">
                      {format(new Date(cert.issued_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {cert.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{cert.description}</p>
                )}

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {cert.isIssued ? "Issued" : "Uploaded"} {format(new Date(cert.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                {isEnabled('plaque_orders') && (
                  <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => handlePrintPlaque(cert)}>
                    <Printer className="h-4 w-4" />
                    ORDER
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plaque Order Modal */}
      {selectedCertificate && (
        <PlaqueOrderModal
          isOpen={isPlaqueModalOpen}
          onClose={() => {
            setIsPlaqueModalOpen(false);
            setSelectedCertificate(null);
          }}
          certificateId={selectedCertificate.id}
          certificateTitle={selectedCertificate.title}
          onOrderCreated={() => {}}
          isFinalCertificate={selectedCertificate.isFinalCertificate}
        />
      )}

      {/* Certificate Preview Modal */}
      <Dialog open={!!previewCertificate} onOpenChange={(open) => !open && setPreviewCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setPreviewCertificate(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {previewCertificate && (
              <>
                {previewCertificate.file_type.startsWith("image/") || 
                 (!previewCertificate.file_type.includes('pdf') && 
                  previewCertificate.file_url && 
                  !previewCertificate.file_url.endsWith('.pdf')) ? (
                  <img
                    src={previewCertificate.file_url}
                    alt={previewCertificate.title}
                    className="w-full h-auto max-h-[85vh] object-contain"
                  />
                ) : (
                  <iframe
                    src={previewCertificate.file_url}
                    className="w-full h-[85vh]"
                    title={previewCertificate.title}
                  />
                )}
              </>
            )}
          </div>
          <div className="p-4 border-t bg-background flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{previewCertificate?.title}</h3>
              {previewCertificate?.issued_date && (
                <p className="text-sm text-muted-foreground">
                  Issued: {format(new Date(previewCertificate.issued_date), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {/* Only show delete button for user-uploaded certificates (not YUNIX-issued) */}
              {previewCertificate && !previewCertificate.isIssued && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    setCertificateToDelete(previewCertificate);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={previewCertificate?.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this certificate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCertificate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
