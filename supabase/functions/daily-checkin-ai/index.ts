import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface CheckinData {
  mood: string;
  confidence_level: number;
  stress_level: number;
  sleep_quality: string;
  planned_pairs?: string[];
  daily_risk_limit?: number;
  max_trades?: number;
}

// Helper function to generate personalized trading advice
function generatePersonalizedMessage(data: CheckinData): string {
  const { mood, sleep_quality, planned_pairs, daily_risk_limit, max_trades } = data;
  
  // Get time-based greeting
  const hour = new Date().getHours();
  let greeting = "Good morning";
  let emoji = "☀️";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
    emoji = "🌤️";
  } else if (hour >= 17) {
    greeting = "Good evening";
    emoji = "🌙";
  }
  
  // Capitalize mood and sleep
  const moodText = mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : "focused";
  const sleepText = sleep_quality ? sleep_quality.toLowerCase() : "rested";
  
  // Build encouraging opening
  let opening = `${greeting}! ${emoji} ${moodText} and ${sleepText} sleep are excellent foundations.`;
  
  // Add trading advice
  const pairs = planned_pairs && planned_pairs.length > 0 
    ? planned_pairs.slice(0, 2).join(" or ") 
    : "XAUUSD or EURJPY";
  const risk = daily_risk_limit || 2;
  const trades = max_trades || 3;
  
  const advice = `Let's build on that by solidifying your plan. Focus on your highest probability setups on ${pairs}, sticking to your ${risk}% risk and ${trades} trade limit.`;
  
  // Motivational closing
  const closings = [
    "You got this! 💪",
    "Stay disciplined! 🎯",
    "Trust your process! 🚀",
    "Make it count! ⭐"
  ];
  const closing = closings[Math.floor(Math.random() * closings.length)];
  
  return `${opening} ${advice} ${closing}`;
}

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
    const data: CheckinData = await req.json();
    
    // Generate personalized, encouraging message
    const message = generatePersonalizedMessage(data);
    
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
