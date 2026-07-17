import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerTradeTools } from "./tools/trades.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerPropFirmTools } from "./tools/prop-firms.js";
import { registerAccountCycleTools } from "./tools/account-cycles.js";
import { registerCertificateTools } from "./tools/certificates.js";

function buildServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerTradeTools(server);
  registerAnalyticsTools(server);
  registerPropFirmTools(server);
  registerAccountCycleTools(server);
  registerCertificateTools(server);

  return server;
}

async function runStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} running on stdio`);
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
  });

  // Stateless: a fresh transport per request avoids cross-request id collisions
  // and keeps the server horizontally scalable (no session affinity needed).
  app.post("/mcp", async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(`${SERVER_NAME} running on http://localhost:${port}/mcp`);
  });
}

const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
