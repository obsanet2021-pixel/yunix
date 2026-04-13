import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink, BarChart3, Clock, TrendingUp } from "lucide-react";
export default function Backtesting() {
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Backtesting</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Test your trading strategies with historical data
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="glow-card border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-2xl bg-primary/10 border border-primary/20 w-fit mb-4">
            <BarChart3 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Strategy Backtesting</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Use Traders Casa's powerful backtesting tool to validate your trading strategies 
            against historical market data before risking real capital.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-400" />
              <h3 className="font-semibold mb-1">Historical Data</h3>
              <p className="text-sm text-muted-foreground">
                Access years of historical price data across multiple markets
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <h3 className="font-semibold mb-1">Performance Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Get detailed analytics on win rate, drawdown, and profitability
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <h3 className="font-semibold mb-1">Visual Reports</h3>
              <p className="text-sm text-muted-foreground">
                Interactive charts and equity curves to analyze your results
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button asChild size="sm" className="gap-2 px-4 sm:px-6 w-full sm:w-auto text-sm">
                <a target="_blank" rel="noopener noreferrer" href="https://traderscasa.com">
                  <ExternalLink className="h-4 w-4" />
                  Traders Casa
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2 px-4 sm:px-6 w-full sm:w-auto text-sm">
                <a target="_blank" rel="noopener noreferrer" href="https://www.fxreplay.com">
                  <ExternalLink className="h-4 w-4" />
                  FX Replay
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              External backtesting tools - Opens in a new tab
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="text-lg">Backtesting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use at least 6-12 months of historical data for reliable results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Include commission and spread costs in your calculations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Test across different market conditions (trending, ranging, volatile)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Be aware of survivorship bias and curve fitting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Forward test on demo before going live</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>;
}