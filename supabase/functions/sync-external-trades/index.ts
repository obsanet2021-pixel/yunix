import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExternalTrade {
  id: string;
  prop_firm_id: string;
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission: number;
  swap: number;
  stop_loss: number | null;
  take_profit: number | null;
  magic: number | null;
  comment: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Lovable Cloud Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-external-trades] User ${user.id} initiated sync`);

    // Initialize external Supabase client
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    
    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: "External Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Fetch all trades from external mt5_trade_events
    console.log("[sync-external-trades] Fetching trades from external database...");
    const { data: externalTrades, error: fetchError } = await externalSupabase
      .from("mt5_trade_events")
      .select("*")
      .order("close_time", { ascending: false });

    if (fetchError) {
      console.error("[sync-external-trades] Error fetching external trades:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch external trades", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-external-trades] Found ${externalTrades?.length || 0} trades in external database`);

    if (!externalTrades || externalTrades.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No trades found in external database", synced: 0, skipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DEBUG: Log the first trade structure to see actual column names
    console.log("[sync-external-trades] Sample trade columns:", Object.keys(externalTrades[0]));
    console.log("[sync-external-trades] Sample trade data:", JSON.stringify(externalTrades[0]));

    // Get all prop firms from Lovable Cloud to map by mt5_login
    const { data: propFirms, error: propFirmsError } = await supabase
      .from("prop_firms")
      .select("id, mt5_login, user_id")
      .eq("user_id", user.id);

    if (propFirmsError) {
      console.error("[sync-external-trades] Error fetching prop firms:", propFirmsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch prop firms", details: propFirmsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a map of mt5_login to prop_firm_id in Lovable Cloud
    const propFirmMap = new Map<string, { id: string; user_id: string }>();
    for (const pf of propFirms || []) {
      if (pf.mt5_login) {
        propFirmMap.set(pf.mt5_login, { id: pf.id, user_id: pf.user_id });
      }
    }

    console.log(`[sync-external-trades] Found ${propFirmMap.size} prop firms with MT5 login`);

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const extTrade of externalTrades) {
      const trade = extTrade as any;
      
      // Flexible column mapping for account login (try multiple possible names)
      const accountLogin = (
        trade.account_login || 
        trade.login || 
        trade.mt5_login || 
        trade.account || 
        trade.account_id
      )?.toString();
      
      // Flexible column mapping for ticket number
      const ticketNumber = trade.ticket || trade.ticket_id || trade.order_id || trade.position_id || trade.id;
      
      if (!accountLogin) {
        console.log(`[sync-external-trades] No account_login found for trade ticket: ${ticketNumber}`);
        skipped++;
        continue;
      }

      // Find matching prop firm in Lovable Cloud by mt5_login
      const localPropFirm = propFirmMap.get(accountLogin);
      if (!localPropFirm) {
        console.log(`[sync-external-trades] No local prop firm found for account_login: ${accountLogin}`);
        skipped++;
        continue;
      }

      // Check if trade already exists by mt5_ticket
      const { data: existingTrade } = await supabase
        .from("trades")
        .select("id")
        .eq("mt5_ticket", ticketNumber)
        .eq("prop_firm_id", localPropFirm.id)
        .single();

      if (existingTrade) {
        console.log(`[sync-external-trades] Trade with ticket ${ticketNumber} already exists, skipping`);
        skipped++;
        continue;
      }

      // Get active cycle for this prop firm
      const { data: activeCycle } = await supabase
        .from("account_cycles")
        .select("id")
        .eq("prop_firm_id", localPropFirm.id)
        .eq("status", "active")
        .single();

      // Map trade type (flexible column names)
      const tradeTypeRaw = trade.type || trade.trade_type || trade.deal_type || trade.order_type;
      let tradeType = "buy";
      if (tradeTypeRaw) {
        const typeStr = tradeTypeRaw.toString().toLowerCase();
        if (typeStr.includes("sell") || typeStr === "1") {
          tradeType = "sell";
        }
      }

      // Flexible column mapping for all trade fields
      const symbol = trade.symbol || trade.pair || trade.instrument;
      const volume = trade.volume || trade.lots || trade.size;
      const openPrice = trade.open_price || trade.price_open || trade.entry_price;
      const closePrice = trade.close_price || trade.price_close || trade.exit_price;
      const openTime = trade.open_time || trade.time_open || trade.entry_time;
      const closeTime = trade.close_time || trade.time_close || trade.exit_time;
      const profit = trade.profit || trade.pnl || 0;
      const commission = trade.commission || 0;
      const swap = trade.swap || 0;
      const stopLoss = trade.stop_loss || trade.sl;
      const takeProfit = trade.take_profit || trade.tp;
      const comment = trade.comment || trade.notes;

      // Insert trade into Lovable Cloud
      const { error: insertError } = await supabase.from("trades").insert({
        user_id: localPropFirm.user_id,
        prop_firm_id: localPropFirm.id,
        cycle_id: activeCycle?.id || null,
        mt5_ticket: ticketNumber,
        pair: symbol,
        trade_type: tradeType,
        volume: volume,
        entry_price: openPrice,
        close_price: closePrice,
        open_time: openTime,
        close_time: closeTime,
        profit: profit + commission + swap,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        trade_date: closeTime ? closeTime.split("T")[0] : new Date().toISOString().split("T")[0],
        is_synced: true,
        notes: comment,
      });

      if (insertError) {
        console.error(`[sync-external-trades] Error inserting trade ${ticketNumber}:`, insertError);
        errors.push(`Ticket ${ticketNumber}: ${insertError.message}`);
      } else {
        synced++;
        console.log(`[sync-external-trades] Synced trade ticket ${ticketNumber}`);
      }
    }

    console.log(`[sync-external-trades] Sync complete: ${synced} synced, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synced ${synced} trades, skipped ${skipped}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-external-trades] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
