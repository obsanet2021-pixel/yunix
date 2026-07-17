import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient, getScopedUserId } from "../services/supabase.js";
import { toolResult, fmtMoney, fmtPct } from "../services/format.js";
import { AccountCycle, ResponseFormat } from "../types.js";

const ListAccountCyclesInput = z
  .object({
    prop_firm_id: z.string().uuid().describe("Filter to cycles for a specific prop firm account"),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
  })
  .strict();

export function registerAccountCycleTools(server: McpServer): void {
  server.registerTool(
    "yunix_list_account_cycles",
    {
      title: "List Yunix Account Cycles",
      description: `Lists account cycles for funded prop firm accounts, showing cycle progression, balances, and drawdown targets.

Args:
  - prop_firm_id (uuid): Filter to cycles for a specific prop firm account
  - response_format ('markdown'|'json'): default 'markdown'

Returns: list of account cycles with cycle number, starting/ending balance, withdrawn amount, profit target, max drawdown percentage, status, and dates.

Examples:
  - "Show my cycle history for this funded account" -> prop_firm_id=<account id>
  - "What's my current cycle status?" -> prop_firm_id=<account id>, look for status='active'`,
      inputSchema: ListAccountCyclesInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof ListAccountCyclesInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      const { data, error } = await supabase
        .from("account_cycles")
        .select("*")
        .eq("user_id", userId)
        .eq("prop_firm_id", params.prop_firm_id)
        .order("cycle_number", { ascending: false });

      if (error) throw new Error(`Yunix query failed (list_account_cycles): ${error.message}`);
      const cycles = (data ?? []) as AccountCycle[];

      if (!cycles.length) {
        return { content: [{ type: "text" as const, text: "No account cycles found for this prop firm." }] };
      }

      const markdown = cycles
        .map(
          (c) =>
            `- **Cycle ${c.cycle_number}** (${c.status}) | start ${fmtMoney(c.starting_balance)} → end ${c.ending_balance !== null ? fmtMoney(c.ending_balance) : "—"} | withdrawn ${fmtMoney(c.withdrawn_amount)} | target ${fmtMoney(
              c.profit_target ?? 0
            )} | max DD ${c.max_drawdown_percentage ? fmtPct(c.max_drawdown_percentage / 100) : "—"} | ${c.start_date} → ${c.end_date ?? "active"} | id \`${c.id}\``
        )
        .join("\n");

      return toolResult(params.response_format, markdown, { count: cycles.length, account_cycles: cycles });
    }
  );
}
