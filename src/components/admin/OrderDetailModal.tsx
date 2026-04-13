import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  Download, 
  User, 
  MapPin, 
  Package, 
  Clock, 
  DollarSign,
  FileText,
  Calendar,
  Truck,
  History,
  CreditCard,
  ArrowRight,
  Loader2
} from "lucide-react";

interface StatusHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  status_type: string;
  changed_by_type: string;
  notes: string | null;
  created_at: string;
}

interface OrderDetailModalProps {
  order: {
    id: string;
    full_name: string;
    size: string;
    delivery_method: string;
    quantity: number;
    status: string;
    invoice_id?: string | null;
    price: number | null;
    created_at: string;
    updated_at?: string;
    shipping_address: string;
    phone: string;
    notes: string | null;
    certificate_id: string;
    user_id: string;
    certificate: {
      id?: string;
      title: string;
      file_url: string;
    } | null;
    profile: {
      name: string;
      email: string;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewCertificate: (url: string) => void;
}

export function OrderDetailModal({ order, open, onOpenChange, onViewCertificate }: OrderDetailModalProps) {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && order) {
      loadStatusHistory();
    }
  }, [open, order?.id]);

  const loadStatusHistory = async () => {
    if (!order) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error loading status history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    
    setDownloadingInvoice(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { orderId: order.id }
      });

      if (error) throw error;

      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({
        title: 'Invoice Generated',
        description: 'Your invoice is ready. Use browser print dialog to save as PDF.',
      });
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate invoice. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (!order) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "Awaiting Approval":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Awaiting Approval</Badge>;
      case "Delivered":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Delivered</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      case "Processing":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-3 w-3" />;
      case 'delivery':
        return <Truck className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const getStatusTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">Payment</Badge>;
      case 'delivery':
        return <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/30">Delivery</Badge>;
      default:
        return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">Order</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Order Details
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
            >
              {downloadingInvoice ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Invoice
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Certificate Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Certificate (For Plaque Printing)
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              {order.certificate?.file_url ? (
                <div className="space-y-4">
                  {/* Certificate Preview */}
                  <div className="relative aspect-video bg-background/50 rounded-lg overflow-hidden border border-border/50 flex items-center justify-center">
                    {order.certificate.file_url.endsWith('.pdf') ? (
                      <div className="text-center p-8">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">PDF Certificate</p>
                      </div>
                    ) : (
                      <img 
                        src={order.certificate.file_url} 
                        alt="Certificate" 
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                  
                  {/* Certificate Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => onViewCertificate(order.certificate!.file_url)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      asChild
                    >
                      <a href={order.certificate.file_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download for Print
                      </a>
                    </Button>
                  </div>
                  
                  {/* Certificate Info */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Course</p>
                      <p className="font-medium">{order.certificate.title}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Certificate #</p>
                      <p className="font-medium">{order.certificate_id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Issued</p>
                      <p className="font-medium">{format(new Date(order.created_at), "MM/dd/yyyy")}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No certificate attached</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="font-medium text-lg">{order.full_name}</p>
              <p className="text-muted-foreground">{order.profile?.email || "N/A"}</p>
              {order.phone && (
                <p className="text-muted-foreground mt-1">{order.phone}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Info Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Info
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Size</p>
                <p className="font-medium">{order.size}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Quantity</p>
                <p className="font-medium">{order.quantity}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Delivery</p>
                <p className="font-medium capitalize">{order.delivery_method}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Price</p>
                <p className="font-medium text-primary">${order.price?.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Invoice ID</p>
                <p className="font-mono text-xs">{order.invoice_id || order.id.slice(0, 8)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Address Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="font-medium">{order.shipping_address}</p>
            </div>
          </div>

          {order.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Notes</h3>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <p className="text-sm">{order.notes}</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Status Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Order Status
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                {getStatusBadge(order.status)}
                <span className="text-muted-foreground capitalize">{order.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(order.created_at), "MM/dd/yyyy, h:mm:ss a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">
                    {order.updated_at 
                      ? format(new Date(order.updated_at), "MM/dd/yyyy, h:mm:ss a")
                      : format(new Date(order.created_at), "MM/dd/yyyy, h:mm:ss a")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Change History */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              Status Change History
            </h3>
            <div className="bg-muted/30 rounded-lg border border-border/50">
              {loadingHistory ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading history...
                </div>
              ) : statusHistory.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No status changes recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
                  {statusHistory.map((entry) => (
                    <div key={entry.id} className="p-3 flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0 mt-0.5">
                        {getStatusTypeIcon(entry.status_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusTypeBadge(entry.status_type)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="text-muted-foreground">
                            {entry.previous_status || 'Created'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {entry.new_status}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}