import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("Starting portfolio snapshot capture...");

    // Get all prop firms with recent sync data
    const { data: propFirms, error: propFirmsError } = await supabase
      .from("prop_firms")
      .select("id, user_id, balance, equity, current_profit")
      .not("balance", "is", null)
      .not("equity", "is", null);

    if (propFirmsError) {
      throw propFirmsError;
    }

    if (!propFirms || propFirms.length === 0) {
      console.log("No prop firms with balance/equity data found");
      return new Response(
        JSON.stringify({ success: true, snapshots_created: 0, message: "No accounts to snapshot" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${propFirms.length} accounts to snapshot`);

    let snapshotsCreated = 0;

    for (const propFirm of propFirms) {
      // Get open positions count for this account
      const { count: positionsCount } = await supabase
        .from("open_positions")
        .select("*", { count: "exact", head: true })
        .eq("prop_firm_id", propFirm.id);

      // Calculate margin info if we have open positions
      let margin = 0;
      let freeMargin = propFirm.equity || 0;
      let marginLevel = 0;

      if (positionsCount && positionsCount > 0) {
        // Estimate margin based on positions (rough calculation)
        const { data: positions } = await supabase
          .from("open_positions")
          .select("volume, unrealized_pnl")
          .eq("prop_firm_id", propFirm.id);

        if (positions) {
          // Rough margin estimate: volume * 1000 (assuming 1:100 leverage on standard lots)
          margin = positions.reduce((sum, pos) => sum + (pos.volume * 1000), 0);
          freeMargin = (propFirm.equity || 0) - margin;
          marginLevel = margin > 0 ? ((propFirm.equity || 0) / margin) * 100 : 0;
        }
      }

      // Insert snapshot
      const { error: insertError } = await supabase
        .from("portfolio_snapshots")
        .insert({
          user_id: propFirm.user_id,
          prop_firm_id: propFirm.id,
          balance: propFirm.balance || 0,
          equity: propFirm.equity || 0,
          margin,
          free_margin: freeMargin,
          margin_level: marginLevel,
          profit: propFirm.current_profit || 0,
          open_positions_count: positionsCount || 0,
          snapshot_type: "scheduled"
        });

      if (insertError) {
        console.error(`Failed to create snapshot for ${propFirm.id}:`, insertError);
      } else {
        snapshotsCreated++;
      }
    }

    console.log(`Portfolio snapshot complete: ${snapshotsCreated} snapshots created`);

    return new Response(
      JSON.stringify({
        success: true,
        snapshots_created: snapshotsCreated,
        total_accounts: propFirms.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Portfolio snapshot error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
