import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { 
  CreditCard, 
  Eye, 
  CheckCircle, 
  Clock, 
  DollarSign,
  RefreshCw,
  Smartphone,
  Bitcoin,
  Building2,
  Image,
  Settings,
  Save,
  XCircle
} from "lucide-react";

interface PlaquePayment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  proof_image_url: string | null;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  received_at: string | null;
  received_by: string | null;
  created_at: string;
}

interface CryptoWallet {
  id: string;
  wallet: string;
  network: string;
  label: string;
}

interface PaymentMethodDetails {
  telebirr: { phone: string; name: string };
  crypto: CryptoWallet[];
  bank: { bankName: string; accountNumber: string; accountName: string };
}

export function PaymentControlPanel() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PlaquePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [isCEO, setIsCEO] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState<PlaquePayment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentMethodDetails>({
    telebirr: { phone: "", name: "" },
    crypto: [],
    bank: { bankName: "", accountNumber: "", accountName: "" }
  });
  const [newWallet, setNewWallet] = useState({ wallet: "", network: "", label: "" });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchPayments();
    checkCEOStatus();
    fetchPaymentSettings();
  }, []);

  const checkCEOStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from("staff")
        .select("role_id, admin_roles(name)")
        .eq("user_id", user.id)
        .single();
      
      setIsCEO(staffData?.admin_roles?.name === "CEO");
    }
  };

  const fetchPaymentSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "payment_method_details")
      .single();
    
    if (data?.value && typeof data.value === 'object') {
      const rawData = data.value as Record<string, any>;
      
      // Handle legacy format: convert crypto object to array if needed
      let cryptoArray: CryptoWallet[] = [];
      if (rawData.crypto) {
        if (Array.isArray(rawData.crypto)) {
          // Already an array - use as is
          cryptoArray = rawData.crypto;
        } else if (typeof rawData.crypto === 'object' && rawData.crypto.wallet) {
          // Legacy single object format - convert to array
          cryptoArray = [{
            id: crypto.randomUUID(),
            wallet: rawData.crypto.wallet || '',
            network: rawData.crypto.network || '',
            label: rawData.crypto.label || 'Legacy Wallet'
          }];
        }
      }
      
      const migratedDetails: PaymentMethodDetails = {
        telebirr: rawData.telebirr || { phone: "", name: "" },
        crypto: cryptoArray,
        bank: rawData.bank || { bankName: "", accountNumber: "", accountName: "" }
      };
      
      setPaymentDetails(migratedDetails);
    }
  };

  const savePaymentSettings = async () => {
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", "payment_method_details")
        .single();

      const jsonValue = paymentDetails as unknown as Json;
      if (existing) {
        await supabase
          .from("system_settings")
          .update({ 
            value: jsonValue,
            updated_by: user?.id 
          })
          .eq("key", "payment_method_details");
      } else {
        await supabase
          .from("system_settings")
          .insert([{ 
            key: "payment_method_details",
            value: jsonValue,
            updated_by: user?.id 
          }]);
      }

      toast({
        title: "Settings Saved",
        description: "Payment method details updated successfully.",
      });
      setShowPaymentSettings(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save payment settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("plaque_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPayments(data || []);

      // Calculate stats
      const pending = data?.filter(p => p.status === "pending").length || 0;
      const received = data?.filter(p => p.status === "received").length || 0;
      const totalRevenue = data?.filter(p => p.status === "received").reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      setStats({
        total: data?.length || 0,
        pending,
        received,
        totalRevenue
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmPaymentReceived = async (payment: PlaquePayment) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch order details first
      const { data: orderData, error: orderFetchError } = await supabase
        .from("plaque_orders")
        .select("*")
        .eq("id", payment.order_id)
        .single();

      if (orderFetchError) {
        console.error("Error fetching order:", orderFetchError);
      }

      // Update payment status
      const { error: paymentError } = await supabase
        .from("plaque_payments")
        .update({ 
          status: "received",
          received_at: new Date().toISOString(),
          received_by: user?.id
        })
        .eq("id", payment.id);

      if (paymentError) throw paymentError;

      // Update order payment status
      const { error: orderError } = await supabase
        .from("plaque_orders")
        .update({ payment_status: "paid", status: "Processing" })
        .eq("id", payment.order_id);

      if (orderError) throw orderError;

      // Send approval notification (Telegram)
      try {
        await supabase.functions.invoke('send-payment-notification', {
          body: {
            type: 'payment_approved',
            customerName: payment.full_name,
            customerEmail: payment.email,
            paymentId: payment.id.slice(0, 8),
            orderId: payment.order_id.slice(0, 8),
            invoiceId: orderData?.invoice_id || payment.order_id.slice(0, 8),
            amount: payment.amount,
            paymentMethod: payment.payment_method,
            date: new Date().toLocaleDateString(),
            orderDetails: {
              size: orderData?.size || 'N/A',
              quantity: orderData?.quantity || 1,
              deliveryMethod: orderData?.delivery_method || 'Standard',
              shippingAddress: orderData?.shipping_address || 'N/A',
              fullName: payment.full_name,
              phone: payment.phone
            }
          }
        });
      } catch (notifyError) {
        console.error("Error sending approval notification:", notifyError);
      }

      toast({
        title: "Payment Confirmed",
        description: "Payment marked as received and customer notified.",
      });

      fetchPayments();
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    }
  };

  const rejectPayment = async () => {
    if (!rejectingPayment || !rejectReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch order details first
      const { data: orderData, error: orderFetchError } = await supabase
        .from("plaque_orders")
        .select("*")
        .eq("id", rejectingPayment.order_id)
        .single();

      if (orderFetchError) {
        console.error("Error fetching order:", orderFetchError);
      }

      // Update payment status to rejected
      const { error: paymentError } = await supabase
        .from("plaque_payments")
        .update({ status: "rejected" })
        .eq("id", rejectingPayment.id);

      if (paymentError) throw paymentError;

      // Update order payment status AND main status to Rejected
      const { error: orderError } = await supabase
        .from("plaque_orders")
        .update({ 
          payment_status: "rejected",
          status: "Rejected"
        })
        .eq("id", rejectingPayment.order_id);

      if (orderError) throw orderError;

      // Send rejection notification (Telegram)
      try {
        await supabase.functions.invoke('send-payment-notification', {
          body: {
            type: 'payment_rejected',
            customerName: rejectingPayment.full_name,
            customerEmail: rejectingPayment.email,
            paymentId: rejectingPayment.id.slice(0, 8),
            orderId: rejectingPayment.order_id.slice(0, 8),
            invoiceId: orderData?.invoice_id || rejectingPayment.order_id.slice(0, 8),
            amount: rejectingPayment.amount,
            paymentMethod: rejectingPayment.payment_method,
            reason: rejectReason,
            date: new Date().toLocaleDateString(),
            orderDetails: {
              size: orderData?.size || 'N/A',
              quantity: orderData?.quantity || 1,
              deliveryMethod: orderData?.delivery_method || 'Standard',
              shippingAddress: orderData?.shipping_address || 'N/A',
              fullName: rejectingPayment.full_name,
              phone: rejectingPayment.phone
            }
          }
        });
      } catch (notifyError) {
        console.error("Error sending rejection notification:", notifyError);
      }

      toast({
        title: "Payment Rejected",
        description: "Payment rejected and customer notified.",
      });

      setShowRejectDialog(false);
      setRejectingPayment(null);
      setRejectReason("");
      fetchPayments();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast({
        title: "Error",
        description: "Failed to reject payment",
        variant: "destructive",
      });
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "telebirr":
        return <Smartphone className="h-4 w-4" />;
      case "crypto":
        return <Bitcoin className="h-4 w-4" />;
      case "bank":
        return <Building2 className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "received":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Received</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold">{stats.received}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            All Payments
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCEO && (
              <Button variant="outline" size="sm" onClick={() => setShowPaymentSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Payment Methods
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchPayments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{payment.full_name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{payment.phone}</p>
                          <p className="text-muted-foreground text-xs">{payment.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">${payment.amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="capitalize">{payment.payment_method}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.proof_image_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedProof(payment.proof_image_url)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">No proof</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                      {payment.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmPaymentReceived(payment)}
                              className="bg-green-500/10 hover:bg-green-500/20 text-green-500"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectingPayment(payment);
                                setShowRejectDialog(true);
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {payment.status === "received" && (
                          <span className="text-xs text-muted-foreground">
                            {payment.received_at && format(new Date(payment.received_at), "MMM d")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proof Preview Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Payment Proof
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedProof && (
              <img 
                src={selectedProof} 
                alt="Payment proof" 
                className="max-h-[500px] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            {selectedProof && (
              <Button asChild>
                <a href={selectedProof} download target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Settings Dialog (CEO Only) */}
      <Dialog open={showPaymentSettings} onOpenChange={setShowPaymentSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Payment Method Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Telebirr */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-green-500" />
                  Telebirr
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+251..."
                    value={paymentDetails.telebirr.phone}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      telebirr: { ...prev.telebirr, phone: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Account holder name"
                    value={paymentDetails.telebirr.name}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      telebirr: { ...prev.telebirr, name: e.target.value }
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Crypto - Multiple Wallets */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bitcoin className="h-4 w-4 text-orange-500" />
                  Cryptocurrency Wallets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Wallets */}
                {paymentDetails.crypto.length > 0 && (
                  <div className="space-y-2">
                    {paymentDetails.crypto.map((wallet) => (
                      <div key={wallet.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{wallet.label || "Unnamed Wallet"}</p>
                          <p className="text-xs text-muted-foreground truncate font-mono">{wallet.wallet}</p>
                          <p className="text-xs text-muted-foreground">{wallet.network}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            setPaymentDetails(prev => ({
                              ...prev,
                              crypto: prev.crypto.filter(w => w.id !== wallet.id)
                            }));
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Wallet Form */}
                <div className="space-y-3 p-3 rounded-lg border border-dashed border-border">
                  <p className="text-sm font-medium">Add New Wallet</p>
                  <div>
                    <Label>Label</Label>
                    <Input
                      placeholder="e.g., USDT TRC20, Bitcoin, Ethereum"
                      value={newWallet.label}
                      onChange={(e) => setNewWallet(prev => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Wallet Address</Label>
                    <Textarea
                      placeholder="0x... or wallet address"
                      value={newWallet.wallet}
                      onChange={(e) => setNewWallet(prev => ({ ...prev, wallet: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>Network / Chain</Label>
                    <Input
                      placeholder="e.g., TRC20, ERC20, Bitcoin"
                      value={newWallet.network}
                      onChange={(e) => setNewWallet(prev => ({ ...prev, network: e.target.value }))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!newWallet.wallet || !newWallet.network}
                    onClick={() => {
                      if (newWallet.wallet && newWallet.network) {
                        setPaymentDetails(prev => ({
                          ...prev,
                          crypto: [...prev.crypto, {
                            id: crypto.randomUUID(),
                            wallet: newWallet.wallet,
                            network: newWallet.network,
                            label: newWallet.label || `Wallet ${prev.crypto.length + 1}`
                          }]
                        }));
                        setNewWallet({ wallet: "", network: "", label: "" });
                      }
                    }}
                  >
                    Add Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>


            {/* Bank */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Bank Transfer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="e.g., Commercial Bank of Ethiopia"
                    value={paymentDetails.bank.bankName}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      bank: { ...prev.bank, bankName: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    placeholder="Bank account number"
                    value={paymentDetails.bank.accountNumber}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      bank: { ...prev.bank, accountNumber: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Account holder name"
                    value={paymentDetails.bank.accountName}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      bank: { ...prev.bank, accountName: e.target.value }
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentSettings(false)}>
              Cancel
            </Button>
            <Button onClick={savePaymentSettings} disabled={savingSettings}>
              {savingSettings ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Reject Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this payment. The customer will be notified via email.
            </p>
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="e.g., Insufficient confirmation on blockchain, Invalid proof, Incorrect amount sent..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectPayment} disabled={!rejectReason.trim()}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
