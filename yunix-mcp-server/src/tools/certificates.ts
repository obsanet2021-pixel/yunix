import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabaseClient, getScopedUserId } from "../services/supabase.js";
import { toolResult } from "../services/format.js";
import { Certificate, ResponseFormat } from "../types.js";

const ListCertificatesInput = z
  .object({
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
  })
  .strict();

export function registerCertificateTools(server: McpServer): void {
  server.registerTool(
    "yunix_list_certificates",
    {
      title: "List Yunix Certificates",
      description: `Lists earned achievement certificates (e.g. passed challenge, consistency milestone).

Args:
  - response_format ('markdown'|'json'): default 'markdown'

Returns: list of certificates with title, description, file URL, file type, prop firm link, and issue date.

Examples:
  - "What certificates have I earned?" -> no filters needed`,
      inputSchema: ListCertificatesInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async (params: z.infer<typeof ListCertificatesInput>) => {
      const supabase = getSupabaseClient();
      const userId = getScopedUserId();

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .order("issued_date", { ascending: false });

      if (error) throw new Error(`Yunix query failed (list_certificates): ${error.message}`);
      const certs = (data ?? []) as Certificate[];

      if (!certs.length) {
        return { content: [{ type: "text" as const, text: "No certificates earned yet." }] };
      }

      const markdown = certs
        .map((c) => `- **${c.title}** (${c.file_type}) — issued ${c.issued_date}${c.description ? ` | ${c.description}` : ""}${c.prop_firm_id ? ` | linked to prop firm \`${c.prop_firm_id}\`` : ""}`)
        .join("\n");

      return toolResult(params.response_format, markdown, { count: certs.length, certificates: certs });
    }
  );
}
