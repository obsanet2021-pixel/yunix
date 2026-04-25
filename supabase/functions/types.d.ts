// Type definitions for Deno environment
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare const Deno: typeof Deno;

// Web API types for Deno
declare const fetch: typeof globalThis.fetch;
declare const Response: typeof globalThis.Response;
declare const Request: typeof globalThis.Request;
declare const console: typeof globalThis.console;