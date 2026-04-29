import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    
    if (!telegramBotToken) {
      return new Response(
        JSON.stringify({ success: false, error: "TELEGRAM_BOT_TOKEN not set" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test 1: Get bot info
    console.log("Testing Telegram bot...");
    const meResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`);
    const meData = await meResponse.json();
    console.log("Bot info:", meData);

    if (!meData.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid bot token",
          details: meData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test 2: Try to send a test message
    const chatId = "5543308273"; // Your telegram_chat_id
    const testResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔧 Test message from YUNIX\n\nThis is a test to verify your Telegram bot is working correctly.\nTime: ${new Date().toISOString()}`,
      }),
    });

    const testData = await testResponse.json();
    console.log("Send message result:", testData);

    if (!testData.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to send message",
          details: testData,
          bot_info: meData.result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test message sent successfully!",
        bot_name: meData.result?.username,
        message_id: testData.result?.message_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Test error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
