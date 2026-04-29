import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log("Test function received request:", req.method);
  return new Response(JSON.stringify({ 
    message: "Test function works!",
    method: req.method,
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
