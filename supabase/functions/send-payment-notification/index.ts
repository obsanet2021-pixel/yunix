import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

interface NotificationRequest {
  type: 'payment_approved' | 'payment_rejected' | 'order_placed' | 'payment_submitted' | 'shipment_preparing' | 'order_shipped' | 'order_delivered' | 'customer_confirmed';
  customerName: string;
  customerEmail: string;
  paymentId?: string;
  orderId?: string;
  invoiceId?: string;
  amount?: number;
  paymentMethod?: string;
  reason?: string;
  date: string;
  orderDetails?: {
    size?: string;
    quantity?: number;
    deliveryMethod?: string;
    shippingAddress?: string;
    fullName?: string;
    phone?: string;
  };
}

// Legacy support
interface LegacyPaymentRequest {
  customerName: string;
  customerEmail: string;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  status: 'approved' | 'rejected';
  reason?: string;
  date: string;
}

const emailHeader = `
  <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
    <div style="display: inline-block; margin-bottom: 16px;">
      <span style="font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #F59E0B, #D97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">🐺 YUNIX</span>
    </div>
`;

const emailFooter = `
  <div style="text-align: center; padding: 24px; border-top: 1px solid #27272a;">
    <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a;">© ${new Date().getFullYear()} YUNIX Trading Platform</p>
    <p style="margin: 0; font-size: 12px; color: #71717a;">Trade Smart. Live Bold.</p>
  </div>
`;

const generatePaymentApprovedHtml = (data: NotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        ${emailHeader}
          <h1 style="color: #22c55e; margin: 0; font-size: 24px;">✓ Payment Approved</h1>
        </div>
        
        <div style="background-color: #18181b; padding: 32px; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px; color: #fafafa; margin: 0 0 16px 0;">Dear <strong style="color: #F59E0B;">${data.customerName}</strong>,</p>
          <p style="font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0;">Great news! Your payment has been successfully approved and confirmed.</p>
          
          <div style="background: linear-gradient(135deg, #14532d 0%, #166534 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #22c55e;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #86efac; font-size: 14px;">Payment ID:</td>
                <td style="text-align: right; font-family: monospace; color: #fafafa; font-size: 14px;">${data.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #86efac; font-size: 14px;">Amount:</td>
                <td style="text-align: right; color: #22c55e; font-weight: bold; font-size: 18px;">$${(data.amount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #86efac; font-size: 14px;">Method:</td>
                <td style="text-align: right; text-transform: capitalize; color: #fafafa; font-size: 14px;">${data.paymentMethod || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #86efac; font-size: 14px;">Date:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #86efac; font-size: 14px;">Status:</td>
                <td style="text-align: right;">
                  <span style="background-color: #22c55e; color: #052e16; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold;">APPROVED</span>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #a1a1aa; margin: 24px 0 0 0;">Your plaque order is now being processed and will be shipped soon.</p>
          
          ${emailFooter}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

const generatePaymentRejectedHtml = (data: NotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        ${emailHeader}
          <h1 style="color: #ef4444; margin: 0; font-size: 24px;">⚠️ Payment Update Required</h1>
        </div>
        
        <div style="background-color: #18181b; padding: 32px; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px; color: #fafafa; margin: 0 0 16px 0;">Dear <strong style="color: #F59E0B;">${data.customerName}</strong>,</p>
          <p style="font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0;">We were unable to approve your payment. Please review the details below.</p>
          
          <div style="background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #ef4444;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #fca5a5; font-size: 14px;">Payment ID:</td>
                <td style="text-align: right; font-family: monospace; color: #fafafa; font-size: 14px;">${data.paymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fca5a5; font-size: 14px;">Amount:</td>
                <td style="text-align: right; color: #fafafa; font-weight: bold; font-size: 18px;">$${(data.amount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fca5a5; font-size: 14px;">Method:</td>
                <td style="text-align: right; text-transform: capitalize; color: #fafafa; font-size: 14px;">${data.paymentMethod || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fca5a5; font-size: 14px;">Date:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fca5a5; font-size: 14px;">Status:</td>
                <td style="text-align: right;">
                  <span style="background-color: #ef4444; color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold;">REJECTED</span>
                </td>
              </tr>
            </table>
          </div>
          
          ${data.reason ? `
          <div style="background-color: #422006; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #F59E0B;">
            <p style="margin: 0; font-size: 14px; color: #fcd34d;">
              <strong>Reason:</strong> ${data.reason}
            </p>
          </div>
          ` : ''}
          
          <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #fafafa; font-weight: bold;">What to do next:</p>
            <ol style="margin: 0; padding-left: 20px; color: #a1a1aa; font-size: 14px;">
              <li style="margin-bottom: 8px;">Verify your payment details are correct</li>
              <li style="margin-bottom: 8px;">Ensure the payment screenshot is clear and readable</li>
              <li>Submit a new payment through the platform</li>
            </ol>
          </div>
          
          <p style="font-size: 14px; color: #a1a1aa; margin: 24px 0 0 0;">If you have any questions, please contact our support team.</p>
          
          ${emailFooter}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

const generateOrderPlacedHtml = (data: NotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        ${emailHeader}
          <h1 style="color: #F59E0B; margin: 0; font-size: 24px;">🎉 Order Confirmed!</h1>
        </div>
        
        <div style="background-color: #18181b; padding: 32px; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px; color: #fafafa; margin: 0 0 16px 0;">Dear <strong style="color: #F59E0B;">${data.customerName}</strong>,</p>
          <p style="font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0;">Thank you for your plaque order! We've received your order and it's being processed.</p>
          
          <div style="background: linear-gradient(135deg, #422006 0%, #78350f 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #F59E0B;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Order ID:</td>
                <td style="text-align: right; font-family: monospace; color: #fafafa; font-size: 14px;">${data.orderId}</td>
              </tr>
              ${data.orderDetails ? `
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Plaque Size:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.size}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Quantity:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.quantity}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Delivery:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.deliveryMethod}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Total Amount:</td>
                <td style="text-align: right; color: #F59E0B; font-weight: bold; font-size: 18px;">$${(data.amount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Date:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #fcd34d; font-size: 14px;">Status:</td>
                <td style="text-align: right;">
                  <span style="background-color: #F59E0B; color: #000; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold;">PENDING PAYMENT</span>
                </td>
              </tr>
            </table>
          </div>
          
          ${data.orderDetails?.shippingAddress ? `
          <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #fafafa; font-weight: bold;">📦 Shipping Address:</p>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa;">${data.orderDetails.shippingAddress}</p>
          </div>
          ` : ''}
          
          <div style="background-color: #1e3a5f; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #3b82f6;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #93c5fd; font-weight: bold;">📋 Next Steps:</p>
            <ol style="margin: 0; padding-left: 20px; color: #bfdbfe; font-size: 14px;">
              <li style="margin-bottom: 8px;">Complete payment through the platform</li>
              <li style="margin-bottom: 8px;">Upload your payment proof/screenshot</li>
              <li>Wait for payment confirmation & shipping</li>
            </ol>
          </div>
          
          <p style="font-size: 14px; color: #a1a1aa; margin: 24px 0 0 0;">Questions? Contact our support team anytime!</p>
          
          ${emailFooter}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

const generatePaymentSubmittedHtml = (data: NotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        ${emailHeader}
          <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">💳 Payment Submitted</h1>
        </div>
        
        <div style="background-color: #18181b; padding: 32px; border-radius: 0 0 16px 16px;">
          <p style="font-size: 16px; color: #fafafa; margin: 0 0 16px 0;">Dear <strong style="color: #F59E0B;">${data.customerName}</strong>,</p>
          <p style="font-size: 16px; color: #a1a1aa; margin: 0 0 24px 0;">Your payment proof has been submitted and is awaiting approval.</p>
          
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #3b82f6;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #93c5fd; font-size: 14px;">Invoice ID:</td>
                <td style="text-align: right; font-family: monospace; color: #fafafa; font-size: 14px;">${data.invoiceId || data.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd; font-size: 14px;">Amount:</td>
                <td style="text-align: right; color: #3b82f6; font-weight: bold; font-size: 18px;">$${(data.amount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd; font-size: 14px;">Method:</td>
                <td style="text-align: right; text-transform: capitalize; color: #fafafa; font-size: 14px;">${data.paymentMethod || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd; font-size: 14px;">Date:</td>
                <td style="text-align: right; color: #fafafa; font-size: 14px;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd; font-size: 14px;">Status:</td>
                <td style="text-align: right;">
                  <span style="background-color: #3b82f6; color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold;">AWAITING APPROVAL</span>
                </td>
              </tr>
            </table>
          </div>
          
          ${data.orderDetails ? `
          <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #fafafa; font-weight: bold;">📦 Order Details:</p>
            <table style="width: 100%;">
              ${data.orderDetails.fullName ? `<tr><td style="padding: 4px 0; color: #71717a; font-size: 14px;">Name:</td><td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.fullName}</td></tr>` : ''}
              ${data.orderDetails.phone ? `<tr><td style="padding: 4px 0; color: #71717a; font-size: 14px;">Phone:</td><td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.phone}</td></tr>` : ''}
              ${data.orderDetails.size ? `<tr><td style="padding: 4px 0; color: #71717a; font-size: 14px;">Size:</td><td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.size}</td></tr>` : ''}
              ${data.orderDetails.quantity ? `<tr><td style="padding: 4px 0; color: #71717a; font-size: 14px;">Quantity:</td><td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.quantity}</td></tr>` : ''}
              ${data.orderDetails.deliveryMethod ? `<tr><td style="padding: 4px 0; color: #71717a; font-size: 14px;">Delivery:</td><td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.deliveryMethod}</td></tr>` : ''}
              ${data.orderDetails.shippingAddress ? `<tr><td style="padding: 4px 0; color: #71717a; font-size: 14px;">Address:</td><td style="text-align: right; color: #fafafa; font-size: 14px;">${data.orderDetails.shippingAddress}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}
          
          <p style="font-size: 14px; color: #a1a1aa; margin: 24px 0 0 0;">We'll notify you once your payment has been verified. This usually takes 1-24 hours.</p>
          
          ${emailFooter}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Send Telegram notification
const sendTelegramNotification = async (chatId: number, type: string, data: any) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        internal_notification: true,
        chatId,
        type,
        data
      }),
    });
    
    const result = await response.json();
    console.log('Telegram notification result:', result);
    return result;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    console.log("Received notification request:", rawData);

    // Handle both legacy and new format
    let data: NotificationRequest;
    
    if ('status' in rawData && !('type' in rawData)) {
      // Legacy format - convert to new format
      const legacyData = rawData as LegacyPaymentRequest;
      data = {
        type: legacyData.status === 'approved' ? 'payment_approved' : 'payment_rejected',
        customerName: legacyData.customerName,
        customerEmail: legacyData.customerEmail,
        paymentId: legacyData.paymentId,
        amount: legacyData.amount,
        paymentMethod: legacyData.paymentMethod,
        reason: legacyData.reason,
        date: legacyData.date
      };
    } else {
      data = rawData as NotificationRequest;
    }

    let subject: string;
    let html: string;

    switch (data.type) {
      case 'payment_approved':
        subject = "✓ Payment Approved – YUNIX";
        html = generatePaymentApprovedHtml(data);
        break;
      case 'payment_rejected':
        subject = "⚠️ Payment Update Required – YUNIX";
        html = generatePaymentRejectedHtml(data);
        break;
      case 'order_placed':
        subject = "🎉 Order Confirmed – YUNIX";
        html = generateOrderPlacedHtml(data);
        break;
      case 'payment_submitted':
        subject = "💳 Payment Submitted – YUNIX";
        html = generatePaymentSubmittedHtml(data);
        break;
      case 'shipment_preparing':
        subject = "📦 Preparing Your Order – YUNIX";
        html = `<p>Dear ${data.customerName}, your order #${data.orderId} is being prepared for shipment!</p>`;
        break;
      case 'order_shipped':
        subject = "🚚 Your Order Is On The Way – YUNIX";
        html = `<p>Dear ${data.customerName}, your order #${data.orderId} has been shipped!</p>`;
        break;
      case 'order_delivered':
        subject = "✅ Order Delivered – YUNIX";
        html = `<p>Dear ${data.customerName}, your order #${data.orderId} has been delivered! Please confirm receipt in the app.</p>`;
        break;
      case 'customer_confirmed':
        subject = "🎉 Thank You! – YUNIX";
        html = `<p>Dear ${data.customerName}, thank you for confirming receipt of order #${data.orderId}!</p>`;
        break;
      default:
        throw new Error(`Unknown notification type: ${data.type}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "YUNIX <onboarding@resend.dev>",
      to: [data.customerEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Also send Telegram notification if user has linked their account
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('email', data.customerEmail)
      .single();

    if (profile?.telegram_chat_id) {
      console.log(`User has Telegram linked, sending notification to chat ${profile.telegram_chat_id}`);
      
      const telegramData = {
        paymentId: data.paymentId || data.orderId || 'N/A',
        amount: data.amount,
        paymentMethod: data.paymentMethod || 'N/A',
        date: data.date,
        reason: data.reason,
        orderId: data.orderId,
        invoiceId: data.invoiceId || data.orderId,
        size: data.orderDetails?.size,
        quantity: data.orderDetails?.quantity,
        deliveryMethod: data.orderDetails?.deliveryMethod,
        fullName: data.orderDetails?.fullName || data.customerName,
        phone: data.orderDetails?.phone || 'N/A',
        shippingAddress: data.orderDetails?.shippingAddress || 'N/A',
      };
      
      await sendTelegramNotification(profile.telegram_chat_id, data.type, telegramData);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }), 
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
