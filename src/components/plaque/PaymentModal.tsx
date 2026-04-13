import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CreditCard, Smartphone, Bitcoin, Building2, AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderAmount: number;
  invoiceId: string;
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

const PAYMENT_METHODS = [
  { value: "telebirr", label: "Telebirr", icon: Smartphone, description: "Mobile payment" },
  { value: "crypto", label: "Crypto", icon: Bitcoin, description: "BTC, ETH, USDT" },
  { value: "bank", label: "Bank Transfer", icon: Building2, description: "Direct bank transfer" },
];

export function PaymentModal({ isOpen, onClose, orderId, orderAmount, invoiceId }: PaymentModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentMethodDetails | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    paymentMethod: "",
  });

  // Fetch payment method details from system_settings
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "payment_method_details")
        .single();
      
      if (data?.value && typeof data.value === 'object') {
        setPaymentDetails(data.value as unknown as PaymentMethodDetails);
      }
    };
    
    if (isOpen) {
      fetchPaymentDetails();
    }
  }, [isOpen]);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`payment_draft_${orderId}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed.formData || formData);
        if (parsed.proofPreview) {
          setProofPreview(parsed.proofPreview);
        }
      } catch (e) {
        console.error("Error loading payment draft:", e);
      }
    }
  }, [orderId]);

  // Save draft to localStorage when form changes
  useEffect(() => {
    if (isOpen && (formData.fullName || formData.phone || formData.email || formData.paymentMethod || proofPreview)) {
      localStorage.setItem(`payment_draft_${orderId}`, JSON.stringify({
        formData,
        proofPreview,
      }));
    }
  }, [formData, proofPreview, orderId, isOpen]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: "Payment details copied to clipboard",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.phone || !formData.email || !formData.paymentMethod) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!proofFile && !proofPreview) {
      toast({
        title: "Error",
        description: "Please upload payment proof screenshot",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      let proofImageUrl = proofPreview;

      // Upload proof image if new file
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        // Put user_id first to match RLS policy: auth.uid()::text = (storage.foldername(name))[1]
        const fileName = `${user.id}/payments/${orderId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("certificates")
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("certificates")
          .getPublicUrl(fileName);

        proofImageUrl = publicUrl;
      }

      // Create payment record
      const { error: paymentError } = await supabase.from("plaque_payments").insert({
        order_id: orderId,
        user_id: user.id,
        amount: orderAmount,
        payment_method: formData.paymentMethod,
        proof_image_url: proofImageUrl,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        status: "pending",
      });

      if (paymentError) throw paymentError;

      // Update order payment status
      const { error: orderError } = await supabase
        .from("plaque_orders")
        .update({ payment_status: "pending" })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Fetch order details for the notification
      const { data: orderData } = await supabase
        .from("plaque_orders")
        .select("size, quantity, delivery_method, shipping_address, full_name, phone")
        .eq("id", orderId)
        .single();

      // Send Telegram notification for payment submitted
      try {
        await supabase.functions.invoke("send-payment-notification", {
          body: {
            type: "payment_submitted",
            customerName: formData.fullName,
            customerEmail: formData.email,
            orderId: orderId,
            invoiceId: invoiceId,
            amount: orderAmount,
            paymentMethod: formData.paymentMethod,
            date: new Date().toLocaleDateString(),
            orderDetails: orderData ? {
              size: orderData.size,
              quantity: orderData.quantity,
              deliveryMethod: orderData.delivery_method,
              shippingAddress: orderData.shipping_address,
              fullName: orderData.full_name,
              phone: orderData.phone,
            } : undefined,
          },
        });
      } catch (notifError) {
        console.error("Error sending payment notification:", notifError);
        // Don't fail the submission if notification fails
      }

      // Clear draft
      localStorage.removeItem(`payment_draft_${orderId}`);

      toast({
        title: "Payment Submitted!",
        description: "Your payment proof has been submitted. We'll verify it shortly.",
      });

      onClose();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Error",
        description: "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        {/* Order Summary */}
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{invoiceId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold text-primary">${orderAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 9XX XXX XXX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.paymentMethod === method.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <method.icon className={`h-5 w-5 ${formData.paymentMethod === method.value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Instructions - shows when method is selected */}
          {formData.paymentMethod && paymentDetails && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Payment Instructions
                </h4>
                
                {formData.paymentMethod === 'telebirr' && paymentDetails.telebirr && (
                  <div className="space-y-2 text-sm">
                    {paymentDetails.telebirr.phone && (
                      <div className="flex items-center justify-between p-2 rounded bg-background/50">
                        <div>
                          <p className="text-muted-foreground text-xs">Phone Number</p>
                          <p className="font-mono font-medium">{paymentDetails.telebirr.phone}</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(paymentDetails.telebirr.phone, 'telebirr-phone')}
                        >
                          {copiedField === 'telebirr-phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                    {paymentDetails.telebirr.name && (
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground text-xs">Account Name</p>
                        <p className="font-medium">{paymentDetails.telebirr.name}</p>
                      </div>
                    )}
                  </div>
                )}

                {formData.paymentMethod === 'crypto' && paymentDetails.crypto && paymentDetails.crypto.length > 0 && (
                  <div className="space-y-3 text-sm">
                    <p className="text-xs text-muted-foreground">Select a wallet to send payment:</p>
                    {paymentDetails.crypto.map((wallet) => (
                      <div key={wallet.id} className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-primary">{wallet.label}</p>
                          <Badge variant="outline" className="text-xs">{wallet.network}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-xs truncate max-w-[200px]">{wallet.wallet}</p>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            className="shrink-0"
                            onClick={() => copyToClipboard(wallet.wallet, `crypto-${wallet.id}`)}
                          >
                            {copiedField === `crypto-${wallet.id}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.paymentMethod === 'crypto' && (!paymentDetails.crypto || paymentDetails.crypto.length === 0) && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      No crypto wallets configured. Please contact support.
                    </p>
                  </div>
                )}

                {formData.paymentMethod === 'bank' && paymentDetails.bank && (
                  <div className="space-y-2 text-sm">
                    {paymentDetails.bank.bankName && (
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground text-xs">Bank Name</p>
                        <p className="font-medium">{paymentDetails.bank.bankName}</p>
                      </div>
                    )}
                    {paymentDetails.bank.accountNumber && (
                      <div className="flex items-center justify-between p-2 rounded bg-background/50">
                        <div>
                          <p className="text-muted-foreground text-xs">Account Number</p>
                          <p className="font-mono font-medium">{paymentDetails.bank.accountNumber}</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(paymentDetails.bank.accountNumber, 'bank-account')}
                        >
                          {copiedField === 'bank-account' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                    {paymentDetails.bank.accountName && (
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground text-xs">Account Name</p>
                        <p className="font-medium">{paymentDetails.bank.accountName}</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Send the exact amount and upload a screenshot as proof.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Show message if payment details not configured */}
          {formData.paymentMethod && !paymentDetails && (
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Payment details not configured. Please contact support for payment instructions.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="proof">Payment Proof Screenshot *</Label>
            <div className="relative">
              {proofPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={proofPreview} alt="Payment proof" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button type="button" variant="secondary" size="sm">
                        Change Image
                      </Button>
                    </label>
                  </div>
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload screenshot</span>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Your progress is auto-saved if you leave
            </p>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}