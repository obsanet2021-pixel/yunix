import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
}

export default function EconomicCalendarWidget() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time economic events
  const fetchEconomicEvents = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/economic-calendar`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching economic events:", error);
    }
  };

  useEffect(() => {
    fetchEconomicEvents();
    
    // Refresh every 30 minutes
    const refreshInterval = setInterval(() => {
      fetchEconomicEvents();
    }, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high": return <AlertCircle className="h-3 w-3" />;
      case "medium": return <TrendingUp className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Today's Economic Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading economic events...</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {events.slice(0, 5).map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm font-mono text-muted-foreground w-12">
                      {event.time}
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {event.currency}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{event.event}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Forecast: {event.forecast} | Prev: {event.previous}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getImpactColor(event.impact)} className="gap-1 capitalize">
                    {getImpactIcon(event.impact)}
                    {event.impact}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              High-impact events can cause significant market volatility
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
