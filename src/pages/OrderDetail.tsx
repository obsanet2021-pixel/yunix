import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PaymentModal } from '@/components/plaque/PaymentModal';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  ArrowLeft,
  PackageCheck,
  CreditCard,
  MapPin,
  Phone,
  User,
  Calendar,
  FileText,
  Check,
  AlertCircle,
  Ban
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrderDetail {
  id: string;
  full_name: string;
  shipping_address: string;
  phone: string;
  size: string;
  delivery_method: string;
  delivery_city: string | null;
  delivery_fee: number | null;
  delivery_type: string | null;
  quantity: number;
  status: string;
  delivery_status: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  customer_confirmed_at: string | null;
  payment_status: string | null;
  invoice_id: string | null;
  certificate: {
    title: string;
    file_url: string;
  } | null;
}

interface PaymentAttempt {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  proof_image_url: string | null;
  created_at: string;
  received_at: string | null;
}

// Order lifecycle steps (separate from payment)
const ORDER_LIFECYCLE_STEPS = [
  { key: 'order_submitted', label: 'Order Submitted', icon: FileText },
  { key: 'order_confirmed', label: 'Order Confirmed', icon: CheckCircle },
  { key: 'preparing_shipment', label: 'Preparing Shipment', icon: Package },
  { key: 'in_delivery', label: 'In Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
  { key: 'customer_confirmed', label: 'Confirmed by You', icon: PackageCheck },
];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentAttempt[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
      loadPaymentHistory();
    }
  }, [id]);

  const loadPaymentHistory = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('plaque_payments')
        .select('id, amount, payment_method, status, proof_image_url, created_at, received_at')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  // Realtime subscription for order updates
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plaque_orders',
          filter: `id=eq.${id}`
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('plaque_orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast({ title: 'Order not found', variant: 'destructive' });
        navigate('/app/orders');
        return;
      }

      // Fetch certificate
      const { data: cert } = await supabase
        .from('certificates')
        .select('title, file_url')
        .eq('id', data.certificate_id)
        .maybeSingle();

      setOrder({ ...data, certificate: cert });
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!order) return;
    
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('plaque_orders')
        .update({ 
          customer_confirmed_at: new Date().toISOString(),
          status: 'Customer Confirmed Receipt'
        })
        .eq('id', order.id);

      if (error) throw error;

      // Send Telegram notification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('send-payment-notification', {
          body: {
            type: 'customer_confirmed',
            customerName: order.full_name,
            customerEmail: user.email,
            orderId: order.id,
            invoiceId: order.invoice_id,
            date: new Date().toLocaleDateString()
          }
        });
      }

      toast({ title: 'Thank you!', description: 'Your receipt has been confirmed.' });
      loadOrder();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('plaque_orders')
        .update({ 
          status: 'Cancelled',
          payment_status: 'cancelled'
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({ 
        title: 'Order Cancelled', 
        description: 'Your order has been cancelled successfully.' 
      });
      navigate('/app/orders');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  // Check if order can be cancelled
  const canCancelOrder = () => {
    if (!order) return false;
    // Can only cancel if payment hasn't been submitted
    return order.payment_status === 'unpaid' && order.status === 'Pending';
  };

  // Get order lifecycle step (independent of payment)
  const getOrderLifecycleStep = () => {
    if (!order) return 0;
    
    // Order submitted is always step 0 (complete once order exists)
    if (order.customer_confirmed_at) return 5;
    if (order.delivery_status === 'Delivered' || order.status === 'Delivered') return 4;
    if (order.delivery_status === 'In Delivery') return 3;
    if (order.delivery_status === 'Preparing Shipment') return 2;
    // Order confirmed = payment approved
    if (order.payment_status === 'approved' || order.payment_status === 'confirmed' || order.status === 'Processing') return 1;
    if (order.status === 'Rejected') return -1;
    
    // Order submitted but waiting for payment
    return 0;
  };

  // Get payment status info
  const getPaymentStatusInfo = () => {
    if (!order) return null;
    
    const paymentStatus = order.payment_status || 'unpaid';
    
    switch (paymentStatus) {
      case 'unpaid':
        return {
          status: 'unpaid',
          icon: XCircle,
          title: 'Payment Not Submitted',
          message: 'Your order has been created. Please submit your payment to proceed.',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-l-red-500',
          showButton: true
        };
      case 'pending':
        return {
          status: 'pending',
          icon: Clock,
          title: 'Payment Submitted',
          message: 'Your payment is being reviewed. We\'ll notify you once it\'s approved.',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-l-yellow-500',
          showButton: false
        };
      case 'approved':
      case 'confirmed':
        return {
          status: 'approved',
          icon: CheckCircle,
          title: 'Payment Approved',
          message: 'Your payment has been verified. Your order is now being processed.',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-l-green-500',
          showButton: false
        };
      default:
        return {
          status: 'unknown',
          icon: AlertCircle,
          title: 'Payment Status Unknown',
          message: 'Please contact support if you have any questions.',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-l-muted',
          showButton: true
        };
    }
  };

  const getDeliveryStatusMessage = () => {
    if (!order) return null;
    
    const currentStep = getOrderLifecycleStep();
    
    if (order.status === 'Rejected') {
      return {
        icon: XCircle,
        title: 'Order Rejected',
        message: 'Unfortunately, your order was rejected. Please contact support for more information.',
        color: 'text-red-500'
      };
    }
    
    switch (currentStep) {
      case 2:
        return {
          icon: Package,
          title: 'Preparing Shipment',
          message: 'Your order is being prepared for delivery. We\'ll notify you when it ships!',
          color: 'text-purple-500'
        };
      case 3:
        return {
          icon: Truck,
          title: 'In Delivery',
          message: 'Your order is on the way! Expect delivery soon.',
          color: 'text-blue-500'
        };
      case 4:
        return {
          icon: CheckCircle,
          title: 'Delivered',
          message: 'Your order has been marked as delivered. Please confirm once you receive it.',
          color: 'text-green-500'
        };
      case 5:
        return {
          icon: PackageCheck,
          title: 'Receipt Confirmed',
          message: 'Thank you for confirming receipt of your order!',
          color: 'text-emerald-500'
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const currentStep = getOrderLifecycleStep();
  const paymentInfo = getPaymentStatusInfo();
  const deliveryStatus = getDeliveryStatusMessage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/app/certificates" className="text-muted-foreground hover:text-foreground transition-colors">
          Certificates
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link to="/app/orders" className="text-muted-foreground hover:text-foreground transition-colors">
          Orders
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">Details</span>
      </nav>

      {/* Order Summary Card */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Order Details</CardTitle>
              <CardDescription className="font-mono">#{order.id}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canCancelOrder() && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Cancel Order
                </Button>
              )}
              <Badge variant="outline" className="text-sm">
                {order.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Product</h4>
              <p className="font-semibold">{order.certificate?.title || 'Certificate Plaque'}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Size</h4>
              <p className="font-semibold">{order.size}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Quantity</h4>
              <p className="font-semibold">{order.quantity}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Delivery Location</h4>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{order.delivery_city || 'Not specified'}</p>
                {order.delivery_type === 'Free' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">Free</Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Delivery Fee</h4>
              {order.delivery_type === 'Free' ? (
                <p className="font-semibold text-green-500">Free</p>
              ) : (
                <p className="font-semibold">${(order.delivery_fee || 0).toFixed(2)}</p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Total</h4>
              <p className="font-semibold text-primary">${order.price?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{order.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Shipping Address</p>
                <p className="font-medium">{order.shipping_address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Delivery Method</p>
                <p className="font-medium">{order.delivery_method}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Card - Separate from Order Lifecycle */}
      {paymentInfo && (
        <Card className={`bg-card/50 backdrop-blur-xl border-border/50 border-l-4 ${paymentInfo.borderColor}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${paymentInfo.bgColor} ${paymentInfo.color}`}>
                <paymentInfo.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${paymentInfo.color}`}>
                  {paymentInfo.title}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {paymentInfo.message}
                </p>
                {paymentInfo.showButton && (
                  <Button 
                    className="mt-4 gap-2" 
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <CreditCard className="h-4 w-4" />
                    Submit Payment
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Lifecycle Timeline */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
          <CardDescription>Track your order progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline */}
            <div className="space-y-0">
              {ORDER_LIFECYCLE_STEPS.map((step, index) => {
                const isCompleted = currentStep >= index;
                const isCurrent = currentStep === index;
                const isRejected = order.status === 'Rejected';
                
                // Skip showing steps after rejection
                if (isRejected && index > 0) return null;
                
                return (
                  <div key={step.key} className="flex items-start gap-4 pb-8 last:pb-0">
                    {/* Step indicator */}
                    <div className="relative flex flex-col items-center">
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                        ${isCompleted 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : isCurrent 
                            ? 'border-primary text-primary bg-primary/10' 
                            : 'border-muted-foreground/30 text-muted-foreground bg-muted/20'}
                      `}>
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      {/* Connecting line */}
                      {index < ORDER_LIFECYCLE_STEPS.length - 1 && (
                        <div className={`
                          w-0.5 h-8 mt-2
                          ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'}
                        `} />
                      )}
                    </div>
                    
                    {/* Step content */}
                    <div className="pt-2">
                      <p className={`font-medium ${isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      {isCurrent && !isRejected && (
                        <p className="text-sm text-primary mt-1">Current status</p>
                      )}
                      {step.key === 'order_submitted' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      )}
                      {step.key === 'delivered' && order.delivered_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.delivered_at).toLocaleString()}
                        </p>
                      )}
                      {step.key === 'customer_confirmed' && order.customer_confirmed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.customer_confirmed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Status Box - Only show when order is in fulfillment */}
      {deliveryStatus && currentStep >= 2 && (
        <Card className={`bg-card/50 backdrop-blur-xl border-border/50 border-l-4 ${
          deliveryStatus.color === 'text-red-500' ? 'border-l-red-500' :
          deliveryStatus.color === 'text-green-500' ? 'border-l-green-500' :
          deliveryStatus.color === 'text-emerald-500' ? 'border-l-emerald-500' :
          deliveryStatus.color === 'text-blue-500' ? 'border-l-blue-500' :
          deliveryStatus.color === 'text-purple-500' ? 'border-l-purple-500' :
          'border-l-yellow-500'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full bg-muted/50 ${deliveryStatus.color}`}>
                <deliveryStatus.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${deliveryStatus.color}`}>
                  {deliveryStatus.title}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {deliveryStatus.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Confirmation Button */}
      {currentStep === 4 && !order.customer_confirmed_at && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Received Your Order?</h3>
                <p className="text-muted-foreground">
                  Please confirm once you have received your plaque.
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={handleConfirmReceipt}
                disabled={confirming}
                className="gap-2 min-w-[200px]"
              >
                <PackageCheck className="h-5 w-5" />
                {confirming ? 'Confirming...' : 'I Have Received My Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentHistory.map((payment, index) => (
                <div 
                  key={payment.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    payment.status === 'approved' ? 'bg-green-500/5 border-green-500/20' :
                    payment.status === 'pending' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    payment.status === 'rejected' ? 'bg-red-500/5 border-red-500/20' :
                    'bg-muted/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      payment.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                      payment.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                      payment.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {payment.status === 'approved' ? <CheckCircle className="h-4 w-4" /> :
                       payment.status === 'pending' ? <Clock className="h-4 w-4" /> :
                       payment.status === 'rejected' ? <XCircle className="h-4 w-4" /> :
                       <CreditCard className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                        <Badge variant="outline" className={`text-xs capitalize ${
                          payment.status === 'approved' ? 'border-green-500/30 text-green-500' :
                          payment.status === 'pending' ? 'border-yellow-500/30 text-yellow-500' :
                          payment.status === 'rejected' ? 'border-red-500/30 text-red-500' :
                          ''
                        }`}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_method} • {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {payment.received_at ? (
                      <span className="text-green-500">
                        Confirmed {new Date(payment.received_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>Attempt #{paymentHistory.length - index}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {order.notes && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          loadPaymentHistory();
        }}
        orderId={order.id}
        orderAmount={order.price || 0}
        invoiceId={order.invoice_id || order.id.slice(0, 8)}
      />

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
              Your order will be permanently cancelled and you'll need to create a new order if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
