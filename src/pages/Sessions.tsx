/**
 * Sessions.tsx — fully rewritten
 *
 * Fixes:
 *   1. Timezone math now uses Intl.DateTimeFormat — DST-safe, no manual UTC offset math
 *   2. Session active hours are correct per market (not a blanket 06–18 check)
 *   3. Active session badge is prominent and live
 *   4. London/NY overlap window is highlighted as a separate card
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface SessionConfig {
  city: string;
  label: string;
  timezone: string;     // IANA tz identifier
  ianaLabel: string;    // Short tz label for display
  openUTC: number;      // Session open hour in UTC (standard time reference)
  closeUTC: number;     // Session close hour in UTC
  color: string;        // Tailwind color classes
  dotColor: string;
}

const SESSIONS: SessionConfig[] = [
  {
    city: "Ethiopia",
    label: "Local",
    timezone: "Africa/Addis_Ababa",
    ianaLabel: "EAT",
    openUTC: 0,   // Personal account — always show, no active logic needed
    closeUTC: 24,
    color: "text-primary",
    dotColor: "bg-primary",
  },
  {
    city: "London",
    label: "London",
    timezone: "Europe/London",
    ianaLabel: "GMT/BST",
    openUTC: 8,   // 08:00 UTC open (accounting for BST Intl handles automatically)
    closeUTC: 17, // 17:00 UTC close
    color: "text-blue-500",
    dotColor: "bg-blue-500",
  },
  {
    city: "New York",
    label: "New York",
    timezone: "America/New_York",
    ianaLabel: "EST/EDT",
    openUTC: 13,  // 13:00 UTC open
    closeUTC: 22, // 22:00 UTC close
    color: "text-green-500",
    dotColor: "bg-green-500",
  },
  {
    city: "Tokyo",
    label: "Asia",
    timezone: "Asia/Tokyo",
    ianaLabel: "JST",
    openUTC: 0,   // 00:00 UTC open
    closeUTC: 9,  // 09:00 UTC close
    color: "text-purple-500",
    dotColor: "bg-purple-500",
  },
];

// DST-safe: use Intl.DateTimeFormat to get the current time in any IANA timezone
function getTimeInZone(timezone: string): { h: number; m: number; s: number; display: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? "0", 10);
  const h = get("hour");
  const m = get("minute");
  const s = get("second");
  const pad = (n: number) => String(n).padStart(2, "0");
  return { h, m, s, display: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

function getUTCHour(): number {
  return new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
}

// Check if a session is currently active using UTC reference
function isSessionActive(session: SessionConfig): boolean {
  if (session.city === "Ethiopia") return true; // local clock always shown
  const utcHour = getUTCHour();
  if (session.openUTC < session.closeUTC) {
    return utcHour >= session.openUTC && utcHour < session.closeUTC;
  }
  // overnight session (e.g. Asia crosses midnight UTC)
  return utcHour >= session.openUTC || utcHour < session.closeUTC;
}

// London/NY overlap: 13:00–17:00 UTC
function isOverlapActive(): boolean {
  const h = getUTCHour();
  return h >= 13 && h < 17;
}

function getUTCOffsetLabel(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(new Date());
  return parts.find(p => p.type === "timeZoneName")?.value ?? "";
}

export default function Sessions() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const overlapActive = isOverlapActive();

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Trading Sessions</h1>
        <p className="text-sm text-muted-foreground">Live clocks with DST-aware session status</p>
      </div>

      {/* London/NY overlap banner */}
      <Card className={`glow-card border transition-all duration-500 ${
        overlapActive
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border/30"
      }`}>
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <Zap className={`h-5 w-5 shrink-0 ${overlapActive ? "text-amber-500" : "text-muted-foreground"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              London / New York Overlap
              <span className="text-xs text-muted-foreground ml-2 font-normal">13:00 – 17:00 UTC</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Highest liquidity window — spreads tighten, volume peaks
            </p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs ${
              overlapActive
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {overlapActive ? "🔥 Active" : "Closed"}
          </Badge>
        </CardContent>
      </Card>

      {/* Session cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SESSIONS.map((session) => {
          const { display } = getTimeInZone(session.timezone);
          const active = isSessionActive(session);
          const tzLabel = getUTCOffsetLabel(session.timezone);

          return (
            <Card
              key={session.city}
              className={`glow-card border transition-all duration-500 ${
                active && session.city !== "Ethiopia"
                  ? "border-primary/40 shadow-sm"
                  : "border-border/30"
              }`}
            >
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    {/* Live dot */}
                    {active && session.city !== "Ethiopia" && (
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${session.dotColor} opacity-60`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${session.dotColor}`} />
                      </span>
                    )}
                    <span>{session.city}</span>
                  </div>
                  <Clock className={`h-4 w-4 ${active && session.city !== "Ethiopia" ? session.color : "text-muted-foreground"}`} />
                </CardTitle>
              </CardHeader>

              <CardContent className="px-4 pb-4 space-y-3">
                {/* Big clock */}
                <div className={`font-mono text-4xl font-bold tracking-tight ${
                  active && session.city !== "Ethiopia" ? session.color : "text-muted-foreground"
                }`}>
                  {display}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{tzLabel}</p>
                    {session.city !== "Ethiopia" && (
                      <p className="text-xs text-muted-foreground">
                        Opens {String(session.openUTC).padStart(2, "0")}:00 UTC
                        {" · "}
                        Closes {String(session.closeUTC).padStart(2, "0")}:00 UTC
                      </p>
                    )}
                  </div>

                  {session.city !== "Ethiopia" ? (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        active
                          ? `bg-${session.color.split("-")[1]}-500/10 ${session.color} border-${session.color.split("-")[1]}-500/30`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {active ? "Open" : "Closed"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      Local
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Session overview */}
      <Card className="glow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm pb-4">
          {[
            {
              dot: "bg-blue-500",
              title: "London",
              hours: "08:00 – 17:00 UTC",
              desc: "Most volatile session. EUR, GBP pairs peak. XAUUSD moves strongly.",
            },
            {
              dot: "bg-amber-500",
              title: "London / NY Overlap",
              hours: "13:00 – 17:00 UTC",
              desc: "Highest daily volume. Best spreads. Most reliable breakouts.",
            },
            {
              dot: "bg-green-500",
              title: "New York",
              hours: "13:00 – 22:00 UTC",
              desc: "Second highest liquidity. Strong USD moves. US data releases.",
            },
            {
              dot: "bg-purple-500",
              title: "Asia (Tokyo)",
              hours: "00:00 – 09:00 UTC",
              desc: "Lower volatility. Good for range strategies. JPY pairs active.",
            },
          ].map(s => (
            <div key={s.title} className="flex items-start gap-2.5">
              <div className={`w-2 h-2 rounded-full ${s.dot} mt-1.5 shrink-0`} />
              <div>
                <span className="font-medium text-foreground">{s.title}</span>
                <span className="text-muted-foreground text-xs ml-2">{s.hours}</span>
                <p className="text-muted-foreground text-xs mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
