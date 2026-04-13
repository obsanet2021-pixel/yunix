import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradePayload {
  mt5_ticket: number;
  symbol: string;
  trade_type: "buy" | "sell";
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission?: number;
  swap?: number;
  stop_loss?: number;
  take_profit?: number;
}

interface SyncRequest {
  prop_firm_id: string;
  trades: TradePayload[];
  account_info?: {
    balance?: number;
    equity?: number;
    profit?: number;
    margin?: number;
    free_margin?: number;
    margin_level?: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SyncRequest = await req.json();
    const { prop_firm_id, trades, account_info } = body;

    console.log(`Direct sync request from user ${user.id} for prop_firm ${prop_firm_id}`);
    console.log(`Trades to sync: ${trades?.length || 0}`);

    if (!prop_firm_id) {
      return new Response(
        JSON.stringify({ error: "prop_firm_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!trades || !Array.isArray(trades)) {
      return new Response(
        JSON.stringify({ error: "trades array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this prop firm
    const { data: propFirm, error: propError } = await supabase
      .from("prop_firms")
      .select("id, user_id, name")
      .eq("id", prop_firm_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (propError || !propFirm) {
      console.error("Prop firm lookup error:", propError);
      return new Response(
        JSON.stringify({ error: "Prop firm not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active cycle for this prop firm
    const { data: activeCycle } = await supabase
      .from("account_cycles")
      .select("id")
      .eq("prop_firm_id", prop_firm_id)
      .eq("status", "active")
      .maybeSingle();

    const cycleId = activeCycle?.id || null;

    // Process trades - check for existing ones and insert new
    let tradesInserted = 0;
    let tradesSkipped = 0;
    const errors: string[] = [];

    for (const trade of trades) {
      // Check if trade already exists by mt5_ticket
      const { data: existing } = await supabase
        .from("trades")
        .select("id")
        .eq("mt5_ticket", trade.mt5_ticket)
        .eq("prop_firm_id", prop_firm_id)
        .maybeSingle();

      if (existing) {
        tradesSkipped++;
        continue;
      }

      // Insert new trade - FIXED: use close_price instead of exit_price
      const { error: insertError } = await supabase
        .from("trades")
        .insert({
          user_id: user.id,
          prop_firm_id: prop_firm_id,
          cycle_id: cycleId,
          mt5_ticket: trade.mt5_ticket,
          pair: trade.symbol,
          trade_type: trade.trade_type,
          volume: trade.volume,
          entry_price: trade.open_price,
          close_price: trade.close_price, // FIXED: was exit_price
          open_time: trade.open_time,
          close_time: trade.close_time,
          trade_date: trade.close_time,
          profit: trade.profit,
          commission: trade.commission || 0,
          swap: trade.swap || 0,
          stop_loss: trade.stop_loss,
          take_profit: trade.take_profit,
          is_synced: true,
          synced_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`Failed to insert trade ${trade.mt5_ticket}:`, insertError);
        errors.push(`Trade ${trade.mt5_ticket}: ${insertError.message}`);
      } else {
        tradesInserted++;
      }
    }

    // Insert account snapshot if account_info provided
    if (account_info && (account_info.balance !== undefined || account_info.equity !== undefined)) {
      const { error: snapshotError } = await supabase
        .from("mt5_account_snapshots")
        .insert({
          user_id: user.id,
          prop_firm_id: prop_firm_id,
          balance: account_info.balance || 0,
          equity: account_info.equity || 0,
          margin: account_info.margin || 0,
          free_margin: account_info.free_margin || 0,
          margin_level: account_info.margin_level || 0,
          profit: account_info.profit || 0,
          recorded_at: new Date().toISOString()
        });

      if (snapshotError) {
        console.error("Failed to insert account snapshot:", snapshotError);
        errors.push(`Snapshot: ${snapshotError.message}`);
      } else {
        console.log("Account snapshot recorded");
      }
    }

    // Update prop_firms with latest sync info
    const updateData: Record<string, unknown> = {
      last_sync_at: new Date().toISOString(),
      sync_status: "success"
    };

    if (account_info) {
      if (account_info.balance !== undefined) updateData.balance = account_info.balance;
      if (account_info.equity !== undefined) updateData.equity = account_info.equity;
      if (account_info.profit !== undefined) updateData.current_profit = account_info.profit;
    }

    await supabase
      .from("prop_firms")
      .update(updateData)
      .eq("id", prop_firm_id);

    // Log the sync activity
    await supabase.from("bridge_activity_logs").insert({
      user_id: user.id,
      prop_firm_id: prop_firm_id,
      action_type: "direct_sync",
      status: errors.length > 0 ? "partial" : "success",
      request_payload: { trades_count: trades.length, has_account_info: !!account_info },
      response_payload: { inserted: tradesInserted, skipped: tradesSkipped, errors: errors.length }
    });

    console.log(`Direct sync completed for ${propFirm.name}: ${tradesInserted} inserted, ${tradesSkipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        trades_inserted: tradesInserted,
        trades_skipped: tradesSkipped,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synced ${tradesInserted} new trades (${tradesSkipped} already existed)`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Direct trade sync error:", errorMessage);

    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
