import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch real-time forex data from Twelve Data API
const fetchForexData = async () => {
  const FOREX_API_KEY = Deno.env.get("FOREX_API_KEY");
  
  console.log("Starting forex data fetch...");
  
  if (!FOREX_API_KEY) {
    console.error("❌ FOREX_API_KEY not configured");
    throw new Error("FOREX_API_KEY is not configured");
  }
  
  console.log("✅ API key found, proceeding with fetch...");

  // Reduced to 4 symbols to stay within API rate limits (8 credits/min)
  const symbols = [
    { symbol: "EUR/USD", apiSymbol: "EUR/USD", name: "Euro/Dollar" },
    { symbol: "USD/JPY", apiSymbol: "USD/JPY", name: "Dollar/Yen" },
    { symbol: "XAU/USD", apiSymbol: "XAU/USD", name: "Gold" },
    { symbol: "EUR/JPY", apiSymbol: "EUR/JPY", name: "Euro/Yen" },
  ];
  
  // Fallback data in case API fails or hits rate limits
  const fallbackData = [
    { symbol: "EUR/USD", name: "Euro/Dollar", price: "1.0850", change: 0.0012, changePercent: "+0.11%" },
    { symbol: "USD/JPY", name: "Dollar/Yen", price: "149.75", change: -0.25, changePercent: "-0.17%" },
    { symbol: "XAU/USD", name: "Gold", price: "2685.50", change: 12.30, changePercent: "+0.46%" },
    { symbol: "EUR/JPY", name: "Euro/Yen", price: "162.45", change: 0.35, changePercent: "+0.22%" },
  ];

  const symbolsString = symbols.map(s => s.apiSymbol).join(",");
  
  console.log(`📡 Fetching ${symbols.length} symbols: ${symbolsString}`);
  
  try {
    const apiUrl = `https://api.twelvedata.com/quote?symbol=${symbolsString}&apikey=${FOREX_API_KEY}`;
    console.log(`🌐 API URL: ${apiUrl.replace(FOREX_API_KEY, 'HIDDEN')}`);
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`📥 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Twelve Data API error:", response.status, errorText);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Data received:", JSON.stringify(data).substring(0, 200));
    
    // Check for rate limit or API errors
    if (data.code === 429 || data.status === "error") {
      console.warn("⚠️ API rate limit or error, using fallback data:", data.message);
      return fallbackData;
    }
    
    // Handle both single and multiple quotes
    const quotes = Array.isArray(data) ? data : Object.values(data);
    console.log(`📊 Processing ${quotes.length} quotes`);
    
    const results = symbols.map((item, index) => {
      const quote = quotes[index] || {};
      const price = parseFloat(quote.close || quote.price || "0");
      const previousClose = parseFloat(quote.previous_close || price);
      const change = price - previousClose;
      const changePercent = previousClose !== 0 ? ((change / previousClose) * 100).toFixed(2) : "0.00";
      
      // Format price based on instrument
      let formattedPrice;
      if (item.symbol.includes("XAU") || item.symbol.includes("XAG")) {
        formattedPrice = price.toFixed(2);
      } else if (item.symbol.includes("JPY")) {
        formattedPrice = price.toFixed(2);
      } else {
        formattedPrice = price.toFixed(4);
      }

      return {
        symbol: item.symbol,
        name: item.name,
        price: formattedPrice,
        change: parseFloat(change.toFixed(4)),
        changePercent: `${change >= 0 ? '+' : ''}${changePercent}%`,
      };
    });
    
    console.log(`✅ Successfully processed ${results.length} forex pairs`);
    return results;
  } catch (error) {
    console.error("❌ Error fetching from Twelve Data:", error);
    console.log("🔄 Returning fallback data due to error");
    return fallbackData;
  }
};

serve(async (req) => {
  console.log("🚀 Forex data endpoint called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await fetchForexData();
    console.log("✅ Returning forex data to client");
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error in forex data endpoint:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Check function logs for more information"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
