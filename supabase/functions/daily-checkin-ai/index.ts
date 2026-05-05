import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface CheckinData {
  mood: string;
  confidence_level: number;
  stress_level: number;
  sleep_quality: string;
  trading_plan?: string;
  planned_pairs?: string[];
  daily_risk_limit?: number;
  max_trades?: number;
}

// Helper function to generate personalized trading advice
function generatePersonalizedMessage(data: CheckinData): string {
  const { mood, confidence_level, stress_level, sleep_quality, trading_plan, planned_pairs, daily_risk_limit, max_trades } = data;

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

  const moodLower = (mood || "neutral").toLowerCase();
  const sleepLower = (sleep_quality || "fair").toLowerCase();

  // Mood-specific insights and advice
  const moodInsights: Record<string, { emoji: string; insight: string; tip: string }> = {
    calm: {
      emoji: "😌",
      insight: "A calm mindset is your trading superpower. You're in the zone for clear, rational decisions.",
      tip: "Use this clarity to wait for A+ setups—patience will pay off today."
    },
    confident: {
      emoji: "💪",
      insight: "Confidence is flowing! That self-belief will help you execute without hesitation.",
      tip: "Stay humble—confidence is great, but stick to your rules. Don't let it become overconfidence."
    },
    excited: {
      emoji: "🔥",
      insight: "I love the energy! Excitement can fuel great performance when channeled right.",
      tip: "Channel that fire into discipline. Take a breath before each trade to stay grounded."
    },
    anxious: {
      emoji: "😰",
      insight: "I see you're feeling anxious. That's completely normal—trading is demanding.",
      tip: "Focus on your process, not the outcome. Small, conservative trades today. You've got this."
    },
    frustrated: {
      emoji: "😤",
      insight: "Frustration happens to every trader. Acknowledge it, but don't let it drive your decisions.",
      tip: "Today is a fresh start. Lower your risk slightly and focus on execution, not results."
    },
    neutral: {
      emoji: "😐",
      insight: "A neutral state is steady ground. You're balanced and ready to follow your system.",
      tip: "Use this even-keeled mindset to stick to your plan mechanically."
    }
  };

  const moodData = moodInsights[moodLower] || moodInsights.neutral;

  // Sleep quality adjustments
  const sleepAdvice: Record<string, string> = {
    excellent: "Your excellent sleep is a massive edge—your brain is primed for pattern recognition. 🧠",
    good: "Good rest sets you up well. You're ready to trade with a clear head. 👍",
    fair: "Fair sleep means be extra mindful. Take regular breaks and stay hydrated. 💧",
    poor: "Poor sleep can impair judgment. Reduce your risk, take breaks, and consider fewer trades today. ⚠️"
  };
  const sleepMsg = sleepAdvice[sleepLower] || sleepAdvice.fair;

  // Confidence & Stress balance
  let mentalStateMsg = "";
  if (confidence_level >= 8 && stress_level <= 3) {
    mentalStateMsg = "Your confidence is high and stress is low—ideal conditions! Just watch for complacency.";
  } else if (confidence_level >= 7 && stress_level <= 5) {
    mentalStateMsg = "You're in a solid mental state. Trust your preparation and execute.";
  } else if (confidence_level <= 5 && stress_level >= 7) {
    mentalStateMsg = "Low confidence + high stress = trade smaller. Protect capital first, confidence will follow.";
  } else if (stress_level >= 7) {
    mentalStateMsg = `Stress at ${stress_level}/10 is significant. Step away if you feel overwhelmed. Your well-being comes first.`;
  } else if (confidence_level <= 4) {
    mentalStateMsg = `Confidence at ${confidence_level}/10 suggests caution. Review your plan—preparation builds confidence.`;
  }

  // Risk parameters
  const pairs = planned_pairs && planned_pairs.length > 0
    ? planned_pairs.slice(0, 2).join(" and ")
    : "your favorite pairs";
  const risk = daily_risk_limit || 2;
  const trades = max_trades || 3;

  // Build the personalized message
  let message = `${greeting}! ${emoji}\n\n`;
  message += `${moodData.emoji} **${moodLower.charAt(0).toUpperCase() + moodLower.slice(1)} Mood:** ${moodData.insight}\n\n`;
  message += `${sleepMsg}\n\n`;

  if (mentalStateMsg) {
    message += `💭 **Mental Check:** ${mentalStateMsg}\n\n`;
  }

  message += `🎯 **Your Plan:** ${moodData.tip}\n\n`;
  message += `📊 **Today's Focus:** ${pairs} with ${risk}% risk limit, max ${trades} trades. Stick to it!\n\n`;

  // Motivational closing based on overall state
  const closings = [
    "Remember: one good trade is better than ten rushed ones. 🎯",
    "Your discipline today defines your success tomorrow. 💪",
    "Trade the plan, not your emotions. You've prepared for this! 🚀",
    "Every professional was once a beginner who never gave up. Keep going! ⭐"
  ];

  // Pick closing based on mood/stress combination
  let closingIndex = 0;
  if (moodLower === "calm" || moodLower === "confident") closingIndex = 1;
  else if (moodLower === "anxious" || moodLower === "frustrated") closingIndex = 2;
  else if (stress_level >= 6) closingIndex = 3;

  message += closings[closingIndex];

  return message;
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
