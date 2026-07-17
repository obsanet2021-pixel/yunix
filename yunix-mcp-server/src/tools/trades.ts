import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient, getScopedUserId, runQuery } from "../services/supabase.js";
import { toolResult, fmtMoney } from "../services/format.js";
import { ResponseFormat, Trade } from "../types.js";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

const ListTradesInput = z
  .object({
    pair: z.string().optional().describe("Filter by instrument pair, e.g. 'XAUUSD' or 'EURUSD'"),
    prop_firm_id: z.string().uuid().optional().describe("Filter to trades under a specific prop firm account"),
    cycle_id: z.string().uuid().optional().describe("Filter to trades under a specific account cycle"),
    session: z.string().optional().describe("Filter by trading session"),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE).describe("Max trades to return"),
    offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
  })
  .strict();

const GetTradeInput = z
  .object({
    trade_id: z.string().uuid().describe("The trade's UUID"),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
  })
  .strict();

const LogTradeInput = z
  .object({
    pair: z.string().min(1).describe("Instrument pair, e.g. 'XAUUSD'"),
    profit: z.number().describe("Profit/loss amount"),
    trade_date: z.string().describe("Trade date (ISO format)"),
    session: z.string().optional(),
    emotion: z.string().optional(),
    notes: z.string().max(2000).optional(),
    prop_firm_id: z.string().uuid().optional().describe("Attach this trade to a prop firm account"),
    cycle_id: z.string().uuid().optional().describe("Attach this trade to an account cycle")
  })
  .strict();

const UpdateTradeInput = z
  .object({
    trade_id: z.string().uuid(),
    profit: z.number().optional(),
    notes: z.string().max(2000).optional(),
    emotion_tag: z.string().optional(),
    rule_broken: z.boolean().optional(),
    mistake_tags: z.array(z.string()).optional()
  })
  .strict();

function tradeToMarkdownRow(t: Trade): string {
  return `- **${t.pair}** | profit ${fmtMoney(t.profit)} | ${t.session ?? "—"} | ${t.emotion ?? "—"} | ${t.trade_date} | id \`${t.id}\``;
}

export function registerTradeTools(server: McpServer): void {
  server.registerTool(
    "yunix_list_trades",
    {
      title: "List Yunix Trades",
      description: `Lists trades from the trade journal, most recent first. Supports filtering by pair, prop firm account, account cycle, and session, plus pagination.

Does NOT create or modify trades — read-only.

Args:
  - pair (string, optional): Filter by instrument, e.g. 'XAUUSD'
  - prop_firm_id (uuid, optional): Filter to trades under one prop firm account
  - cycle_id (uuid, optional): Filter to trades under one account cycle
  - session (string, optional): Filter by trading session
  - limit (number 1-100): Max results (default: 20)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns: list of trades with pair, profit, session, emotion, trade date, and id.

Examples:
  - "What are my gold trades?" -> pair="XAUUSD"
  - "Show my last 10 trades" -> limit=10
  - Don't use when: you need aggregate stats (use yunix_get_analytics_summary instead)`,
      inputSchema: ListTradesInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof ListTradesInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      let query = supabase
        .from("trades")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("trade_date", { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

      if (params.pair) query = query.ilike("pair", params.pair);
      if (params.prop_firm_id) query = query.eq("prop_firm_id", params.prop_firm_id);
      if (params.cycle_id) query = query.eq("cycle_id", params.cycle_id);
      if (params.session) query = query.eq("session", params.session);

      const { data, error, count } = await query;
      if (error) throw new Error(`Yunix query failed (list_trades): ${error.message}`);
      const trades = (data ?? []) as Trade[];

      if (!trades.length) {
        return { content: [{ type: "text" as const, text: "No trades found matching those filters." }] };
      }

      const total = count ?? trades.length;
      const markdown = [
        `Found ${total} trade(s), showing ${trades.length} (offset ${params.offset}):`,
        ...trades.map(tradeToMarkdownRow)
      ].join("\n");

      return toolResult(params.response_format, markdown, {
        total,
        count: trades.length,
        offset: params.offset,
        has_more: total > params.offset + trades.length,
        trades
      });
    }
  );

  server.registerTool(
    "yunix_get_trade",
    {
      title: "Get Yunix Trade Detail",
      description: `Fetches full detail for a single trade by id, including notes and emotion tracking.

Args:
  - trade_id (uuid): The trade's id, from yunix_list_trades
  - response_format ('markdown'|'json'): default 'markdown'

Returns: the full trade record, or an error if not found.

Error Handling:
  - Returns "Trade not found" if the id doesn't exist or doesn't belong to this account`,
      inputSchema: GetTradeInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof GetTradeInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .eq("id", params.trade_id)
        .maybeSingle();

      if (error) throw new Error(`Yunix query failed (get_trade): ${error.message}`);
      if (!data) {
        return { content: [{ type: "text" as const, text: `Trade not found: ${params.trade_id}` }] };
      }

      const t = data as Trade;
      const markdown = [
        `**${t.pair}** | profit ${fmtMoney(t.profit)}`,
        `Session: ${t.session ?? "—"}  Emotion: ${t.emotion ?? "—"}`,
        `Trade date: ${t.trade_date}`,
        t.notes ? `Notes: ${t.notes}` : null,
        t.emotion_tag ? `Emotion tag: ${t.emotion_tag}` : null,
        t.rule_broken !== null ? `Rule broken: ${t.rule_broken}` : null,
        t.mistake_tags && t.mistake_tags.length ? `Mistakes: ${t.mistake_tags.join(", ")}` : null
      ]
        .filter(Boolean)
        .join("\n");

      return toolResult(params.response_format, markdown, { trade: t });
    }
  );

  server.registerTool(
    "yunix_log_trade",
    {
      title: "Log New Yunix Trade",
      description: `Creates a new trade entry in the trade journal.

Args:
  - pair (string): Instrument, e.g. 'XAUUSD'
  - profit (number): Profit/loss amount
  - trade_date (string): Trade date (ISO format)
  - session (string, optional): Trading session
  - emotion (string, optional): Trading emotion
  - notes (string, optional, max 2000 chars)
  - prop_firm_id / cycle_id (uuid, optional): link to an existing prop firm account or cycle

Returns: the created trade record with its new id.

Note: This creates a completed trade entry, not an open position.`,
      inputSchema: LogTradeInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async (params: z.infer<typeof LogTradeInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      const trade = await runQuery<Trade>("log_trade", () =>
        supabase
          .from("trades")
          .insert({
            user_id: userId,
            pair: params.pair,
            profit: params.profit,
            trade_date: params.trade_date,
            session: params.session ?? null,
            emotion: params.emotion ?? null,
            notes: params.notes ?? null,
            prop_firm_id: params.prop_firm_id ?? null,
            cycle_id: params.cycle_id ?? null
          })
          .select("*")
          .single()
      );

      return toolResult(
        ResponseFormat.MARKDOWN,
        `Logged new trade: ${tradeToMarkdownRow(trade)}`,
        { trade }
      );
    }
  );

  server.registerTool(
    "yunix_update_trade",
    {
      title: "Update Yunix Trade",
      description: `Updates an existing trade's profit, notes, emotion tracking, or mistake tags.

Args:
  - trade_id (uuid): Must reference an existing trade
  - profit (number, optional): Update profit/loss amount
  - notes (string, optional): Update notes
  - emotion_tag (string, optional): Update structured emotion tag
  - rule_broken (boolean, optional): Update whether rules were broken
  - mistake_tags (array of strings, optional): Update mistake tags

Returns: the updated trade record.

Error Handling:
  - Returns "Trade not found" if the id is invalid`,
      inputSchema: UpdateTradeInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof UpdateTradeInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      const { data: existing, error: fetchErr } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .eq("id", params.trade_id)
        .maybeSingle();

      if (fetchErr) throw new Error(`Yunix query failed (update_trade lookup): ${fetchErr.message}`);
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: `Trade not found: ${params.trade_id}` }]
        };
      }

      const updateData: Partial<Trade> = {};
      if (params.profit !== undefined) updateData.profit = params.profit;
      if (params.notes !== undefined) updateData.notes = params.notes;
      if (params.emotion_tag !== undefined) updateData.emotion_tag = params.emotion_tag;
      if (params.rule_broken !== undefined) updateData.rule_broken = params.rule_broken;
      if (params.mistake_tags !== undefined) updateData.mistake_tags = params.mistake_tags;

      const trade = await runQuery<Trade>("update_trade", () =>
        supabase
          .from("trades")
          .update(updateData)
          .eq("id", params.trade_id)
          .select("*")
          .single()
      );

      return toolResult(
        ResponseFormat.MARKDOWN,
        `Updated trade: ${tradeToMarkdownRow(trade)}`,
        { trade }
      );
    }
  );
}
