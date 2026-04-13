import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating invoice for order:', orderId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('plaque_orders')
      .select(`
        *,
        plaque_prices (size_name, dimensions, price),
        certificates (title)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', order.user_id)
      .single();

    // Calculate price breakdown
    const plaquePrice = order.plaque_prices?.price || 0;
    const quantity = order.quantity || 1;
    const basePrice = plaquePrice * quantity;
    const expressSurcharge = order.delivery_method === 'Express' ? 20 * quantity : 0;
    const deliveryFee = order.delivery_fee || 0;
    const discountAmount = order.discount_amount || 0;
    const totalPrice = order.price || 0;

    // Format date
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate HTML invoice
    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica Neue', Arial, sans-serif; 
      font-size: 12px; 
      color: #333;
      line-height: 1.6;
    }
    .invoice-container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #1a1a2e; padding-bottom: 20px; }
    .logo { font-size: 32px; font-weight: bold; color: #1a1a2e; letter-spacing: 2px; }
    .logo-sub { font-size: 10px; color: #666; margin-top: 4px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 5px; }
    .invoice-number { font-size: 14px; color: #666; }
    .invoice-date { font-size: 12px; color: #888; }
    
    .details-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .bill-to, .order-info { width: 48%; }
    .section-title { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 10px; letter-spacing: 1px; }
    .section-content { background: #f8f9fa; padding: 15px; border-radius: 8px; }
    .section-content p { margin-bottom: 5px; }
    .section-content strong { color: #1a1a2e; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { 
      background: #1a1a2e; 
      color: white; 
      padding: 12px 15px; 
      text-align: left; 
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .items-table td { padding: 15px; border-bottom: 1px solid #eee; }
    .items-table tr:hover { background: #fafafa; }
    
    .totals-section { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .total-row.highlight { font-size: 16px; font-weight: bold; border-bottom: 2px solid #1a1a2e; background: #f8f9fa; padding: 12px; margin-top: 10px; border-radius: 4px; }
    .total-row.discount { color: #22c55e; }
    
    .delivery-section { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #0ea5e9; }
    .delivery-section h3 { color: #0369a1; margin-bottom: 10px; font-size: 14px; }
    
    .footer { margin-top: 50px; text-align: center; color: #888; font-size: 11px; border-top: 1px solid #eee; padding-top: 20px; }
    .footer p { margin-bottom: 5px; }
    
    .status-badge { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-confirmed { background: #d1fae5; color: #065f46; }
    .status-approved { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        <div class="logo">YUNIX</div>
        <div class="logo-sub">Trading Excellence Platform</div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">${order.invoice_id || 'INV-' + order.id.slice(0, 8).toUpperCase()}</div>
        <div class="invoice-date">Date: ${orderDate}</div>
      </div>
    </div>
    
    <div class="details-section">
      <div class="bill-to">
        <div class="section-title">Bill To</div>
        <div class="section-content">
          <p><strong>${order.full_name}</strong></p>
          <p>${profile?.email || 'N/A'}</p>
          <p>${order.phone}</p>
        </div>
      </div>
      <div class="order-info">
        <div class="section-title">Order Information</div>
        <div class="section-content">
          <p><strong>Order ID:</strong> ${order.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${order.payment_status || 'pending'}">${order.payment_status || 'Pending'}</span></p>
          <p><strong>Payment Status:</strong> ${order.payment_status || 'Unpaid'}</p>
        </div>
      </div>
    </div>
    
    <div class="delivery-section">
      <h3>📍 Delivery Information</h3>
      <p><strong>Delivery City:</strong> ${order.delivery_city || 'Not specified'}</p>
      <p><strong>Shipping Address:</strong> ${order.shipping_address}</p>
      <p><strong>Delivery Method:</strong> ${order.delivery_method} ${order.delivery_method === 'Express' ? '(3-5 days)' : '(7-14 days)'}</p>
      <p><strong>Delivery Type:</strong> ${order.delivery_type === 'Free' ? '🎉 Free Delivery' : 'Paid Delivery'}</p>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Size</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Certificate Plaque</strong><br>
            <span style="color: #666; font-size: 11px;">${order.certificates?.title || 'Custom Certificate'}</span>
          </td>
          <td>${order.size} ${order.plaque_prices?.dimensions ? `(${order.plaque_prices.dimensions})` : ''}</td>
          <td>${quantity}</td>
          <td>$${plaquePrice.toFixed(2)}</td>
          <td>$${basePrice.toFixed(2)}</td>
        </tr>
        ${expressSurcharge > 0 ? `
        <tr>
          <td colspan="4">Express Delivery Surcharge (${quantity} × $20.00)</td>
          <td>$${expressSurcharge.toFixed(2)}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>
    
    <div class="totals-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${basePrice.toFixed(2)}</span>
      </div>
      ${expressSurcharge > 0 ? `
      <div class="total-row">
        <span>Express Surcharge:</span>
        <span>$${expressSurcharge.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row">
        <span>Delivery Fee ${order.delivery_city ? `(${order.delivery_city})` : ''}:</span>
        <span>${order.delivery_type === 'Free' ? '<span style="color: #22c55e;">FREE</span>' : '$' + deliveryFee.toFixed(2)}</span>
      </div>
      ${discountAmount > 0 ? `
      <div class="total-row discount">
        <span>Discount Applied:</span>
        <span>-$${discountAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row highlight">
        <span>Total Amount:</span>
        <span>$${totalPrice.toFixed(2)}</span>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Thank you for your order!</strong></p>
          <p>YUNIX Trading Platform • www.yunix.co</p>
          <p>For support, contact us at support@yunix.co</p>
    </div>
  </div>
</body>
</html>`;

    console.log('Invoice HTML generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        html: invoiceHtml,
        order: {
          id: order.id,
          invoice_id: order.invoice_id,
          total: totalPrice
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error generating invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoice';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
