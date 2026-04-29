import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Plus, Flame, Calendar, Wallet } from 'lucide-react';

export default function DashboardMockup() {
  return (
    <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary/30 via-blue-500/20 to-transparent opacity-50 pointer-events-none" />
      
      <div className="relative">
        {/* Top bar - Browser chrome */}
        <div className="bg-card/80 border-b border-border px-5 py-3.5 flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 bg-muted/50 rounded-md px-3 py-1.5 text-center">
            <span className="text-xs font-mono text-muted-foreground">app.yunixofficial.com/dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">JD</span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="p-5 space-y-4 bg-background/50">
          
          {/* Welcome Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold mb-0.5">Welcome Back, John</h1>
              <p className="text-xs text-muted-foreground">Your trading performance overview</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Trade</span>
            </button>
          </div>

          {/* Motivational Bar */}
          <div className="bg-gradient-to-r from-orange-500/10 via-primary/10 to-orange-500/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">12-Day Streak!</p>
                <p className="text-xs text-muted-foreground">You're on fire! Keep journaling daily.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Next milestone</p>
              <p className="text-sm font-bold text-primary">15 days</p>
            </div>
          </div>

          {/* Forex Ticker */}
          <div className="bg-card border border-border rounded-xl p-3 overflow-hidden">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">EUR/USD</span>
                <span className="font-mono text-green-500">1.0854 ▲</span>
                <span className="text-[10px] text-muted-foreground">+0.12%</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">USD/JPY</span>
                <span className="font-mono text-red-500">149.72 ▼</span>
                <span className="text-[10px] text-muted-foreground">-0.08%</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">XAU/USD</span>
                <span className="font-mono text-green-500">2,685.80 ▲</span>
                <span className="text-[10px] text-muted-foreground">+0.46%</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">NAS100</span>
                <span className="font-mono text-green-500">19,842 ▲</span>
                <span className="text-[10px] text-muted-foreground">+0.82%</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard 
              title="Total PnL" 
              value="+$4,827.50" 
              change="Funded Balance: $25,000" 
              trend="up" 
              icon={DollarSign}
              color="text-green-500"
            />
            <StatCard 
              title="Best Trade" 
              value="+$1,240.00" 
              change="Mar 15, 2025" 
              trend="up" 
              icon={Award}
            />
            <StatCard 
              title="Win Rate" 
              value="67.4%" 
              change="47/70 wins" 
              trend="up" 
              icon={Target}
            />
          </div>

          {/* Chart + Economic Calendar Row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Performance Chart */}
            <div className="col-span-2 bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Recent Performance</h3>
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              </div>
              <div className="h-32 relative">
                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="mockChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0 80 L50 75 L100 60 L150 65 L200 45 L250 40 L300 35 L350 30 L400 25 L400 100 L0 100 Z" fill="url(#mockChartGrad)"/>
                  <path d="M0 80 L50 75 L100 60 L150 65 L200 45 L250 40 L300 35 L350 30 L400 25" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
                  <circle cx="400" cy="25" r="4" fill="hsl(var(--primary))" />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-2">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                </div>
              </div>
            </div>

            {/* Economic Calendar Widget */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Economic Calendar</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">USD - CPI</p>
                    <p className="text-[10px] text-muted-foreground">High Impact</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Today</p>
                    <p className="font-mono text-orange-500">8:30 AM</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">EUR - ECB Rate</p>
                    <p className="text-[10px] text-muted-foreground">High Impact</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Tomorrow</p>
                    <p className="font-mono">2:15 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prop Firms Overview */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Prop Firms Overview</h3>
              <span className="text-xs text-muted-foreground">3 accounts</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <PropFirmCard 
                name="FTMO" 
                type="Funded"
                balance={15000}
                equity={16240}
                profit={1240}
              />
              <PropFirmCard 
                name="The5ers" 
                type="Challenge"
                balance={10000}
                equity={9850}
                profit={-150}
              />
              <PropFirmCard 
                name="True Forex" 
                type="Funded"
                balance={25000}
                equity={25500}
                profit={500}
              />
            </div>
          </div>

          {/* YUNIX AI Message */}
          <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">Y</span>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">
                  <span className="text-primary">YUNIX</span>
                  <span className="text-muted-foreground font-normal"> says:</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You're tracking 3 accounts with $41,240 funded equity. Your win rate is 67.4% across 70 trades. 
                  Best trade: $1,240 on Mar 15. Keep following your strategy!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({ title, value, change, trend, icon: Icon, color }: { 
  title: string; 
  value: string; 
  change: string; 
  trend: 'up' | 'down';
  icon: React.ElementType;
  color?: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';
  
  return (
    <div className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <div className={`text-lg font-bold ${color || ''}`}>{value}</div>
      <div className="flex items-center gap-1 mt-1">
        <TrendIcon className={`h-3 w-3 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs text-muted-foreground">{change}</span>
      </div>
    </div>
  );
}

function PropFirmCard({ name, type, balance, equity, profit }: {
  name: string;
  type: string;
  balance: number;
  equity: number;
  profit: number;
}) {
  const isProfit = profit >= 0;
  
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 hover:border-primary/30 transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-sm truncate">{name}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          type === 'Funded' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {type}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground block text-[10px]">Balance</span>
          <span className="font-mono font-medium">${balance.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px]">Equity</span>
          <span className="font-mono font-medium text-primary">${equity.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px]">P&L</span>
          <span className={`font-mono font-medium ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
            {isProfit ? '+' : ''}{profit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
