import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient, getScopedUserId } from "../services/supabase.js";
import { toolResult, fmtMoney, fmtPct } from "../services/format.js";
import { ResponseFormat, Trade } from "../types.js";

const AnalyticsSummaryInput = z
  .object({
    since: z
      .string()
      .optional()
      .describe("ISO date (e.g. '2026-06-01'). Only include trades on/after this date."),
    prop_firm_id: z.string().uuid().optional().describe("Scope stats to one prop firm account"),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
  })
  .strict();

export function registerAnalyticsTools(server: McpServer): void {
  server.registerTool(
    "yunix_get_analytics_summary",
    {
      title: "Get Yunix Analytics Summary",
      description: `Computes aggregate trading performance stats (win rate, total P&L, best/worst trade, total trade count) across all trades.

This does NOT fetch individual trades — use yunix_list_trades for that. Use this for questions like "how am I doing" or "what's my win rate."

Args:
  - since (ISO date string, optional): only include trades on/after this date
  - prop_firm_id (uuid, optional): scope stats to a single prop firm account
  - response_format ('markdown'|'json'): default 'markdown'

Returns:
  {
    "total_trades": number,
    "win_rate": number,        // 0-1
    "total_pnl": number,
    "best_trade_pnl": number | null,
    "worst_trade_pnl": number | null
  }

Examples:
  - "What's my win rate this month?" -> since="2026-07-01"
  - "How's my FTMO account doing?" -> prop_firm_id=<that account's id>`,
      inputSchema: AnalyticsSummaryInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof AnalyticsSummaryInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      let query = supabase.from("trades").select("*").eq("user_id", userId);
      if (params.since) query = query.gte("trade_date", params.since);
      if (params.prop_firm_id) query = query.eq("prop_firm_id", params.prop_firm_id);

      const { data, error } = await query;
      if (error) throw new Error(`Yunix query failed (analytics_summary): ${error.message}`);

      const trades = (data ?? []) as Trade[];
      const profits = trades.map((t) => t.profit);
      const wins = profits.filter((p) => p > 0);

      const summary = {
        total_trades: trades.length,
        win_rate: trades.length ? wins.length / trades.length : 0,
        total_pnl: profits.reduce((a, b) => a + b, 0),
        best_trade_pnl: profits.length ? Math.max(...profits) : null,
        worst_trade_pnl: profits.length ? Math.min(...profits) : null
      };

      const markdown = [
        `**Yunix Performance Summary**${params.since ? ` (since ${params.since})` : ""}`,
        `Total trades: ${summary.total_trades}`,
        `Win rate: ${fmtPct(summary.win_rate)}`,
        `Total P&L: ${fmtMoney(summary.total_pnl)}`,
        `Best trade: ${fmtMoney(summary.best_trade_pnl)}  Worst trade: ${fmtMoney(summary.worst_trade_pnl)}`
      ].join("\n");

      return toolResult(params.response_format, markdown, summary as unknown as Record<string, unknown>);
    }
  );
}
