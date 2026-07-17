import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient, getScopedUserId } from "../services/supabase.js";
import { toolResult, fmtMoney } from "../services/format.js";
import { PropFirm, ResponseFormat } from "../types.js";

const ListPropFirmsInput = z
  .object({
    account_type: z.enum(["Personal", "Funded", "Evaluation 1", "Evaluation 2", "all"]).default("all"),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
  })
  .strict();

export function registerPropFirmTools(server: McpServer): void {
  server.registerTool(
    "yunix_list_prop_firms",
    {
      title: "List Prop Firm Accounts",
      description: `Lists prop firm accounts tracked in Yunix (e.g. evaluation challenges, funded accounts) with balance, equity, profit targets, and account type.

Args:
  - account_type ('Personal'|'Funded'|'Evaluation 1'|'Evaluation 2'|'all'): filter by account type (default 'all')
  - response_format ('markdown'|'json'): default 'markdown'

Returns: list of prop firm accounts with name, account number, balance, equity, profit target, current profit, consistency percentage, and account type.

Examples:
  - "Which of my funded accounts are active?" -> account_type="Funded"
  - "Am I close to any profit targets?" -> account_type="Funded", then compare current_profit to profit_target`,
      inputSchema: ListPropFirmsInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof ListPropFirmsInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      let query = supabase.from("prop_firms").select("*").eq("user_id", userId).order("created_at", {
        ascending: false
      });
      if (params.account_type !== "all") query = query.eq("account_type", params.account_type);

      const { data, error } = await query;
      if (error) throw new Error(`Yunix query failed (list_prop_firms): ${error.message}`);
      const firms = (data ?? []) as PropFirm[];

      if (!firms.length) {
        return { content: [{ type: "text" as const, text: "No prop firm accounts found." }] };
      }

      const markdown = firms
        .map(
          (f) =>
            `- **${f.name}** (${f.account_type}) | balance ${fmtMoney(f.balance)} | equity ${fmtMoney(
              f.equity
            )} | current profit ${fmtMoney(f.current_profit)} | target ${fmtMoney(
              f.profit_target
            )} | consistency ${f.consistency_percentage ?? "—"}% | id \`${f.id}\``
        )
        .join("\n");

      return toolResult(params.response_format, markdown, { count: firms.length, prop_firms: firms });
    }
  );
}
