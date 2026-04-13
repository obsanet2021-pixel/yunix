import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, TrendingUp, ExternalLink, Filter, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
  actual?: string;
}

const TRADING_SESSIONS = [
  { id: 'all', label: 'All Sessions', startHour: 0, endHour: 24 },
  { id: 'tokyo', label: 'Tokyo (00:00 - 09:00)', startHour: 0, endHour: 9 },
  { id: 'london', label: 'London (08:00 - 17:00)', startHour: 8, endHour: 17 },
  { id: 'newyork', label: 'New York (13:00 - 22:00)', startHour: 13, endHour: 22 },
  { id: 'sydney', label: 'Sydney (22:00 - 07:00)', startHour: 22, endHour: 7 },
];

const MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

export default function EconomicCalendar() {
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEconomicEvents = async () => {
    try {
      setIsLoading(true);
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
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching economic events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomicEvents();
    
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

  const isEventInSession = (eventTime: string, sessionId: string): boolean => {
    if (sessionId === 'all') return true;
    
    const session = TRADING_SESSIONS.find(s => s.id === sessionId);
    if (!session) return true;

    const hour = parseInt(eventTime.split(':')[0]);
    
    // Handle Sydney session which crosses midnight
    if (session.id === 'sydney') {
      return hour >= 22 || hour < 7;
    }
    
    return hour >= session.startHour && hour < session.endHour;
  };

  const getTimeUntilEvent = (eventTime: string): string => {
    const now = new Date();
    const [hours, minutes] = eventTime.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(hours, minutes, 0, 0);

    if (eventDate < now) {
      return 'Released';
    }

    const diffMs = eventDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${remainingMins}m`;
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const impactMatch = filterImpact === "all" || event.impact === filterImpact;
      const currencyMatch = filterCurrency === "all" || event.currency === filterCurrency;
      const sessionMatch = isEventInSession(event.time, filterSession);
      return impactMatch && currencyMatch && sessionMatch;
    });
  }, [events, filterImpact, filterCurrency, filterSession]);

  const currencies = Array.from(new Set(events.map(e => e.currency)));

  // Count events by impact
  const highImpactCount = filteredEvents.filter(e => e.impact === 'high').length;
  const upcomingHighImpact = filteredEvents.filter(e => {
    const now = new Date();
    const [hours, minutes] = e.time.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(hours, minutes, 0, 0);
    return e.impact === 'high' && eventDate > now;
  });

  return (
    <div className="relative min-h-[600px] w-full max-w-full overflow-x-hidden">
      {/* Coming Soon Overlay - contained within parent */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
        <div className="text-center space-y-4 p-4 sm:p-8">
          <div className="p-3 sm:p-4 rounded-2xl bg-primary/10 border border-primary/20 w-fit mx-auto">
            <Calendar className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
          </div>
          <h2 className="text-xl sm:text-3xl font-bold">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base px-4">
            The Economic Calendar feature is currently under development. 
            Check back soon for real-time economic events tracking!
          </p>
        </div>
      </div>
      
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none filter blur-sm opacity-50 space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Economic Calendar</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track high-impact economic events that affect your trading</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button asChild variant="outline" className="gap-2">
            <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Forex Factory
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {upcomingHighImpact.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {upcomingHighImpact.length} High-Impact Event{upcomingHighImpact.length > 1 ? 's' : ''} Coming Up
                </p>
                <p className="text-sm text-muted-foreground">
                  Next: {upcomingHighImpact[0]?.event} ({upcomingHighImpact[0]?.currency}) at {upcomingHighImpact[0]?.time}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="glow-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={filterImpact} onValueChange={setFilterImpact}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="high">High Impact Only</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="low">Low Impact</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {MAJOR_CURRENCIES.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency} Only
                  </SelectItem>
                ))}
                {currencies.filter(c => !MAJOR_CURRENCIES.includes(c)).map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="w-[200px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trading Session" />
              </SelectTrigger>
              <SelectContent>
                {TRADING_SESSIONS.map(session => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="glow-card bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                High
              </Badge>
              <span className="text-xs text-muted-foreground">Significant market impact expected</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Medium
              </Badge>
              <span className="text-xs text-muted-foreground">Moderate market impact</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Low</Badge>
              <span className="text-xs text-muted-foreground">Minor market impact</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Timeline */}
      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Economic Events ({filteredEvents.length})
            </span>
            {highImpactCount > 0 && (
              <Badge variant="destructive">{highImpactCount} High Impact</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No events match your filters
            </div>
          ) : (
          <div className="space-y-2">
            {filteredEvents.map((event, index) => {
              const timeUntil = getTimeUntilEvent(event.time);
              const isReleased = timeUntil === 'Released';
              
              return (
                <div
                  key={index}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-muted transition-colors border border-border gap-2 sm:gap-4 ${
                    event.impact === 'high' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-xs sm:text-sm font-mono text-muted-foreground font-bold w-12 sm:w-16 shrink-0">
                        {event.time}
                      </div>
                      {!isReleased && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeUntil}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono text-xs font-bold shrink-0">
                      {event.currency}
                    </Badge>
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="text-xs sm:text-sm font-semibold truncate">{event.event}</div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs">
                        {event.forecast && (
                          <span className="text-muted-foreground">
                            <span className="font-medium">Forecast:</span> {event.forecast}
                          </span>
                        )}
                        {event.previous && (
                          <span className="text-muted-foreground">
                            <span className="font-medium">Previous:</span> {event.previous}
                          </span>
                        )}
                        {event.actual && (
                          <span className="text-primary font-medium">
                            <span className="font-medium">Actual:</span> {event.actual}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getImpactColor(event.impact)} className="gap-1 capitalize shrink-0 self-start sm:self-center">
                    {getImpactIcon(event.impact)}
                    {event.impact}
                  </Badge>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="glow-card border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Trading Tips During Economic Events:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>High-impact events can cause extreme volatility - consider avoiding trades or using wider stops</li>
              <li>Wait for the initial spike to settle before entering trades</li>
              <li>Be aware of slippage and spread widening during news releases</li>
              <li>Review historical data to understand typical market reactions</li>
              <li>Always use proper risk management and position sizing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}