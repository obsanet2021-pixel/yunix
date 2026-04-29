import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Starting daily-checkin-ai function...");

serve(async (req) => {
  console.log("Request received:", req.method, req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { mood, confidence_level, stress_level, sleep_quality } = await req.json();
    
    const message = `Daily check-in received! Mood: ${mood}, Confidence: ${confidence_level}, Stress: ${stress_level}, Sleep: ${sleep_quality}`;
    
    return new Response(JSON.stringify({ message }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
