import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

type SessionTime = {
  city: string;
  timezone: string;
  offset: number;
  session: string;
};

const sessions: SessionTime[] = [
  { city: "Ethiopia", timezone: "EAT", offset: 3, session: "Local" },
  { city: "London", timezone: "GMT", offset: 0, session: "London" },
  { city: "New York", timezone: "EST", offset: -5, session: "NY" },
  { city: "Tokyo", timezone: "JST", offset: 9, session: "Asia" },
];

export default function Sessions() {
  const [times, setTimes] = useState<{ [key: string]: Date }>({});

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const newTimes: { [key: string]: Date } = {};
      
      sessions.forEach((session) => {
        const localTime = new Date(now.getTime() + session.offset * 3600000);
        newTimes[session.city] = localTime;
      });
      
      setTimes(newTimes);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    if (!date) return "--:--:--";
    return date.toISOString().substr(11, 8);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Trading Sessions</h1>
        <p className="text-muted-foreground">Monitor market sessions across different timezones</p>
      </div>

      {/* Session Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {sessions.map((session) => {
          const currentTime = times[session.city];
          const hour = currentTime ? currentTime.getUTCHours() : 0;
          const isActive = hour >= 6 && hour < 18; // Simple market hours check

          return (
            <Card key={session.city} className={`glow-card ${isActive ? 'border-primary/50' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{session.city}</span>
                  <Clock className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="font-mono text-4xl font-bold text-primary">
                    {formatTime(currentTime)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{session.timezone} (UTC{session.offset >= 0 ? '+' : ''}{session.offset})</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.session} Session
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Session Info */}
      <Card className="glow-card">
        <CardHeader>
          <CardTitle>Session Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">London Session:</span> Typically the most volatile with highest liquidity
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary mt-1.5" />
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">NY Session:</span> Overlaps with London for maximum trading opportunities
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-3 mt-1.5" />
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">Asia Session:</span> Lower volatility, good for ranging strategies
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
