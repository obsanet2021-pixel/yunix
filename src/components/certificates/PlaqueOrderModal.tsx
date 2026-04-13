import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Gift, Sparkles, MapPin } from "lucide-react";
import { PaymentModal } from "@/components/plaque/PaymentModal";

interface PlaquePrice {
  id: string;
  size_name: string;
  dimensions: string;
  price: number;
  express_surcharge: number | null;
  is_active: boolean;
}

interface DeliveryPricing {
  id: string;
  city_name: string;
  delivery_fee: number;
  is_free: boolean;
  is_active: boolean;
  is_fallback: boolean;
}

interface LoyaltyProgress {
  completed_orders: number;
  discount_status: string;
}

interface DiscountRule {
  key: string;
  value: { value: number | boolean };
}

interface PlaqueOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateId: string;
  certificateTitle: string;
  onOrderCreated: () => void;
  isFinalCertificate?: boolean;
}

const EXPRESS_DEFAULT_SURCHARGE = 20;

export function PlaqueOrderModal({ 
  isOpen, 
  onClose, 
  certificateId, 
  certificateTitle,
  onOrderCreated,
  isFinalCertificate = false
}: PlaqueOrderModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [plaquePrices, setPlaquePrices] = useState<PlaquePrice[]>([]);
  const [deliveryPricing, setDeliveryPricing] = useState<DeliveryPricing[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loyaltyProgress, setLoyaltyProgress] = useState<LoyaltyProgress | null>(null);
  const [discountRules, setDiscountRules] = useState<Record<string, number | boolean>>({});
  const [createdOrder, setCreatedOrder] = useState<{
    id: string;
    amount: number;
    invoiceId: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    shippingAddress: "",
    phone: "",
    pricingId: "",
    deliveryCity: "",
    deliveryMethod: "Standard",
    quantity: 1,
    notes: "",
  });

  // Count of approved paid orders for tiered discounts
  const [approvedOrdersCount, setApprovedOrdersCount] = useState(0);

  // Fetch active plaque prices, delivery pricing, and loyalty data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingPrices(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Fetch prices
        const { data: pricesData, error: pricesError } = await supabase
          .from("plaque_prices")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (pricesError) throw pricesError;
        setPlaquePrices(pricesData || []);

        // Fetch delivery pricing
        const { data: deliveryData, error: deliveryError } = await supabase
          .from("delivery_pricing")
          .select("*")
          .eq("is_active", true)
          .order("is_fallback", { ascending: true })
          .order("city_name", { ascending: true });

        if (deliveryError) throw deliveryError;
        setDeliveryPricing(deliveryData || []);

        // Fetch loyalty progress for current user
        if (user) {
          const { data: loyaltyData } = await supabase
            .from("loyalty_progress")
            .select("completed_orders, discount_status")
            .eq("user_id", user.id)
            .single();

          if (loyaltyData) {
            setLoyaltyProgress(loyaltyData);
          }

          // Count approved and paid orders for tiered discounts
          const { count } = await supabase
            .from("plaque_orders")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "Approved")
            .eq("payment_status", "confirmed");

          setApprovedOrdersCount(count || 0);
        }

        // Fetch discount rules
        const { data: rulesData } = await supabase
          .from("discount_rules")
          .select("key, value");

        if (rulesData) {
          const rulesMap: Record<string, number | boolean> = {};
          (rulesData as DiscountRule[]).forEach((rule) => {
            rulesMap[rule.key] = rule.value.value;
          });
          setDiscountRules(rulesMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load plaque sizes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPrices(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, toast]);

  // Get selected price details
  const selectedPrice = useMemo(() => {
    return plaquePrices.find(p => p.id === formData.pricingId);
  }, [plaquePrices, formData.pricingId]);

  // Get selected delivery pricing
  const selectedDeliveryPricing = useMemo(() => {
    if (!formData.deliveryCity) return null;
    const found = deliveryPricing.find(d => d.city_name === formData.deliveryCity);
    if (found) return found;
    // Use fallback if not found
    return deliveryPricing.find(d => d.is_fallback);
  }, [deliveryPricing, formData.deliveryCity]);

  // Check tiered discounts (1st order 50%, 5th order 50%, 6th order free)
  const tieredDiscount = useMemo(() => {
    const nextOrderNumber = approvedOrdersCount + 1;
    const firstOrderEnabled = discountRules.first_order_discount_enabled as boolean;
    const firstOrderPercent = (discountRules.first_order_discount_percentage as number) || 50;
    const sixthOrderFree = discountRules.sixth_order_free as boolean;
    const sixthOrderThreshold = (discountRules.sixth_order_threshold as number) || 6;
    const loyaltyThreshold = (discountRules.loyalty_threshold as number) || 5;
    const loyaltyPercent = (discountRules.loyalty_percentage as number) || 50;

    // 6th order is free
    if (sixthOrderFree && nextOrderNumber === sixthOrderThreshold) {
      return { type: 'free', percent: 100, label: `🎉 Order #${sixthOrderThreshold} is FREE!` };
    }

    // 5th order (loyalty) gets 50% discount
    if (nextOrderNumber === loyaltyThreshold) {
      return { type: 'loyalty', percent: loyaltyPercent, label: `🎊 Order #${loyaltyThreshold} - ${loyaltyPercent}% Loyalty Discount!` };
    }

    // 1st order gets 50% discount
    if (firstOrderEnabled && nextOrderNumber === 1) {
      return { type: 'first', percent: firstOrderPercent, label: `🎁 First Order - ${firstOrderPercent}% Discount!` };
    }

    return null;
  }, [approvedOrdersCount, discountRules]);

  const loyaltyDiscountPercent = (discountRules.loyalty_percentage as number) || 50;
  const loyaltyDiscountCap = (discountRules.loyalty_cap as number) || 25;

  // Calculate total price in real-time
  const calculatedPrice = useMemo(() => {
    if (!selectedPrice) return { original: 0, discounted: 0, savings: 0, deliveryFee: 0, discountType: null };
    
    const basePrice = selectedPrice.price * formData.quantity;
    const expressSurcharge = formData.deliveryMethod === "Express" 
      ? (selectedPrice.express_surcharge ?? EXPRESS_DEFAULT_SURCHARGE) * formData.quantity
      : 0;
    
    // Delivery fee (0 if free)
    const deliveryFee = selectedDeliveryPricing?.is_free ? 0 : (selectedDeliveryPricing?.delivery_fee || 0);
    
    const originalTotal = basePrice + expressSurcharge + deliveryFee;
    
    // Apply tiered discount first if applicable
    if (tieredDiscount) {
      if (tieredDiscount.type === 'free') {
        return {
          original: originalTotal,
          discounted: 0,
          savings: originalTotal,
          deliveryFee,
          discountType: tieredDiscount
        };
      }
      const discountAmount = originalTotal * (tieredDiscount.percent / 100);
      return {
        original: originalTotal,
        discounted: originalTotal - discountAmount,
        savings: discountAmount,
        deliveryFee,
        discountType: tieredDiscount
      };
    }
    
    return { original: originalTotal, discounted: originalTotal, savings: 0, deliveryFee, discountType: null };
  }, [selectedPrice, formData.quantity, formData.deliveryMethod, selectedDeliveryPricing, tieredDiscount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.shippingAddress || !formData.phone || !formData.pricingId || !formData.deliveryMethod || !formData.deliveryCity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including delivery city",
        variant: "destructive",
      });
      return;
    }

    if (calculatedPrice.discounted <= 0) {
      toast({
        title: "Error",
        description: "Invalid price calculation. Please select a valid plaque size.",
        variant: "destructive",
      });
      return;
    }

    if (formData.quantity < 1) {
      toast({
        title: "Error",
        description: "Quantity must be at least 1",
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

      const invoiceId = `INV-${Date.now()}`;

      // Use certificate_id for regular certificates, final_certificate_id for YUNIX-issued certificates
      const orderPayload = {
        user_id: user.id,
        certificate_id: isFinalCertificate ? null : certificateId,
        final_certificate_id: isFinalCertificate ? certificateId : null,
        full_name: formData.fullName,
        shipping_address: formData.shippingAddress,
        phone: formData.phone,
        pricing_id: formData.pricingId,
        size: selectedPrice?.size_name || "",
        delivery_method: formData.deliveryMethod,
        delivery_city: formData.deliveryCity,
        delivery_fee: calculatedPrice.deliveryFee,
        delivery_type: selectedDeliveryPricing?.is_free ? 'Free' : 'Paid',
        quantity: formData.quantity,
        price: calculatedPrice.discounted,
        notes: formData.notes || null,
        invoice_id: invoiceId,
      };

      const { data: orderData, error } = await supabase.from("plaque_orders")
        .insert(orderPayload)
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Order Created!",
        description: "Please complete payment to finalize your order.",
      });

      // Store order details for payment modal
      setCreatedOrder({
        id: orderData.id,
        amount: calculatedPrice.discounted,
        invoiceId: invoiceId,
      });

      // Reset form
      setFormData({
        fullName: "",
        shippingAddress: "",
        phone: "",
        pricingId: "",
        deliveryCity: "",
        deliveryMethod: "Standard",
        quantity: 1,
        notes: "",
      });

      // Show payment modal
      setShowPaymentModal(true);
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setCreatedOrder(null);
    onOrderCreated();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showPaymentModal} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Plaque Order</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Order a plaque for: <span className="font-medium text-foreground">{certificateTitle}</span>
            </p>
          </DialogHeader>
          
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

            <div className="space-y-2">
              <Label htmlFor="shippingAddress">Shipping Address *</Label>
              <Textarea
                id="shippingAddress"
                value={formData.shippingAddress}
                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                placeholder="Enter your complete shipping address"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                required
              />
            </div>

            {/* Delivery City Selection */}
            <div className="space-y-2">
              <Label htmlFor="deliveryCity">Delivery City *</Label>
              {isLoadingPrices ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={formData.deliveryCity}
                  onValueChange={(value) => setFormData({ ...formData, deliveryCity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryPricing.map((dp) => (
                      <SelectItem key={dp.id} value={dp.city_name}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {dp.city_name}
                          {dp.is_free ? (
                            <span className="text-green-500 text-xs ml-1">(Free)</span>
                          ) : (
                            <span className="text-muted-foreground text-xs ml-1">(${dp.delivery_fee.toFixed(2)})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedDeliveryPricing && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Delivery Fee: {selectedDeliveryPricing.is_free ? (
                    <span className="text-green-500 font-medium">Free</span>
                  ) : (
                    <span className="font-medium">${selectedDeliveryPricing.delivery_fee.toFixed(2)}</span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Plaque Size *</Label>
                {isLoadingPrices ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : plaquePrices.length === 0 ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                    No sizes available
                  </div>
                ) : (
                  <Select
                    value={formData.pricingId}
                    onValueChange={(value) => setFormData({ ...formData, pricingId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {plaquePrices.map((price) => (
                        <SelectItem key={price.id} value={price.id}>
                          {price.size_name} — {price.dimensions} — ${price.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryMethod">Delivery Speed *</Label>
                <Select
                  value={formData.deliveryMethod}
                  onValueChange={(value) => setFormData({ ...formData, deliveryMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard (7-14 days)</SelectItem>
                    <SelectItem value="Express">Express (3-5 days) +${selectedPrice?.express_surcharge ?? EXPRESS_DEFAULT_SURCHARGE}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Total Price</Label>
                <div className="flex flex-col h-auto p-3 border rounded-md bg-muted/50">
                  {calculatedPrice.savings > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">${calculatedPrice.original.toFixed(2)}</span>
                        <span className="font-semibold text-primary">
                          {calculatedPrice.discounted === 0 ? 'FREE' : `$${calculatedPrice.discounted.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Sparkles className="h-3 w-3" />
                        You save ${calculatedPrice.savings.toFixed(2)}!
                      </div>
                    </>
                  ) : (
                    <span className="font-semibold text-primary">
                      {calculatedPrice.discounted > 0 ? `$${calculatedPrice.discounted.toFixed(2)}` : "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>


            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isLoadingPrices || plaquePrices.length === 0 || !formData.pricingId || !formData.deliveryCity}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Submitting..." : `Continue to Payment${calculatedPrice.discounted > 0 ? ` — $${calculatedPrice.discounted.toFixed(2)}` : ""}`}
              </Button>
            </DialogFooter>

            {/* Tiered Discount Banner */}
            {calculatedPrice.discountType && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 mt-4">
                <Gift className="h-5 w-5 text-green-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-600 dark:text-green-400">
                    {calculatedPrice.discountType.label}
                  </p>
                  <p className="text-muted-foreground">
                    This is your order #{approvedOrdersCount + 1}
                  </p>
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {createdOrder && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          orderId={createdOrder.id}
          orderAmount={createdOrder.amount}
          invoiceId={createdOrder.invoiceId}
        />
      )}
    </>
  );
}