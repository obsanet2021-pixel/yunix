import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  price: string;
  change: number;
  changePercent: string;
}

export default function ForexTicker() {
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time forex data
  const fetchForexData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forex-data`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTickerData(data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching forex data:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchForexData();
  }, []);

  // Auto-refresh every 90 seconds to respect API rate limits
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchForexData();
    }, 90000);

    return () => clearInterval(refreshInterval);
  }, []);

  if (isLoading || tickerData.length === 0) {
    return (
      <Card className="glow-card bg-muted/30 overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading live market data...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glow-card bg-muted/30 overflow-hidden">
      <div className="p-2 sm:p-3">
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-3 sm:gap-6 animate-scroll">
            {[...tickerData, ...tickerData].map((item, index) => (
              <div
                key={`${item.symbol}-${index}`}
                className="flex items-center gap-2 sm:gap-3 min-w-[160px] sm:min-w-[200px] shrink-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm font-bold text-foreground truncate">{item.symbol}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:inline">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                    <span className="text-xs sm:text-sm font-mono font-semibold text-foreground">
                      {item.price}
                    </span>
                    <div className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium ${
                      item.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {item.change >= 0 ? (
                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                      )}
                      <span className="whitespace-nowrap">{item.changePercent}</span>
                    </div>
                  </div>
                </div>
                {index < tickerData.length * 2 - 1 && (
                  <div className="h-6 sm:h-8 w-px bg-border shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
