import React from 'react';

export default function DashboardMockup() {
  return (
    <div className="relative bg-card border border-border rounded-3xl overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary/30 via-blue-500/20 to-transparent opacity-50 pointer-events-none" />
      
      <div className="relative">
        {/* Top bar */}
        <div className="bg-card/80 border-b border-border px-5 py-3.5 flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 bg-muted/50 rounded-md px-3 py-1.5 text-center">
            <span className="text-xs font-mono text-muted-foreground">app.yunix.io/dashboard</span>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-[220px_1fr] min-h-[480px]">
          {/* Sidebar */}
          <div className="bg-card/80 border-r border-border p-5">
            <div className="font-display font-bold text-base text-primary mb-5 px-3 py-2">YUNIX</div>
            
            <div className="space-y-0.5">
              <NavItem active icon="grid">Dashboard</NavItem>
              <NavItem icon="home">Trade Log</NavItem>
              <NavItem icon="trending-up">Analytics</NavItem>
              <NavItem icon="book">Journal</NavItem>
              <NavItem icon="check-circle">Backtesting</NavItem>
              <div className="mt-auto pt-4">
                <NavItem icon="user">Account</NavItem>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="p-6 grid grid-rows-[auto_1fr_auto] gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="font-display text-xl font-bold">Performance Overview</div>
              <div className="bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                Apr 2025
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <MetricCard label="Net P&L" value="+$4,827" change="▲ 18.3% this month" color="text-green-500" />
              <MetricCard label="Win Rate" value="67.4%" change="▲ 3.1% vs last" />
              <MetricCard label="Profit Factor" value="2.14" change="▲ Target: 2.0" />
              <MetricCard label="Max Drawdown" value="−2.8%" change="▼ Limit: −5%" color="text-red-500" />
            </div>

            {/* Chart */}
            <div className="bg-card/80 border border-border rounded-xl p-4 relative overflow-hidden">
              <div className="text-xs text-muted-foreground mb-3">Equity Curve — April 2025</div>
              <svg className="w-full h-32" viewBox="0 0 700 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3a0" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#22d3a0" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0 90 C30 88 50 70 80 68 S130 50 170 48 S240 30 280 28 S340 20 380 22 S440 10 480 8 S560 6 600 4 S660 2 700 4 L700 120 L0 120 Z" fill="url(#chartGradient)"/>
                <path d="M0 90 C30 88 50 70 80 68 S130 50 170 48 S240 30 280 28 S340 20 380 22 S440 10 480 8 S560 6 600 4 S660 2 700 4" fill="none" stroke="#22d3a0" strokeWidth="2"/>
                <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <line x1="0" y1="70" x2="700" y2="70" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              </svg>
            </div>

            {/* Trade table */}
            <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[80px_60px_1fr_80px_80px_70px] px-4 py-2.5 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <span>Symbol</span>
                <span>Side</span>
                <span>Entry</span>
                <span>P&L</span>
                <span>R:R</span>
                <span>Status</span>
              </div>
              <TradeRow symbol="EURUSD" side="LONG" entry="1.08234" pnl="+$320" rr="1:2.4" status="Win" />
              <TradeRow symbol="GBPJPY" side="SHORT" entry="191.440" pnl="−$145" rr="1:1.8" status="Loss" />
              <TradeRow symbol="NAS100" side="LONG" entry="17,842" pnl="+$680" rr="1:3.1" status="Win" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active = false, icon, children }: { active?: boolean; icon: string; children: React.ReactNode }) {
  const icons: Record<string, string> = {
    grid: '▦',
    home: '◢',
    'trending-up': '∕',
    book: '▤',
    'check-circle': '✓',
    user: '○'
  };

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
      active 
        ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-3 pl-5 rounded-r-lg' 
        : 'text-muted-foreground hover:bg-muted/50'
    }`}>
      <span className="text-base">{icons[icon] || '•'}</span>
      {children}
    </div>
  );
}

function MetricCard({ label, value, change, color }: { label: string; value: string; change: string; color?: string }) {
  return (
    <div className="bg-card/80 border border-border rounded-xl p-4 transition-all hover:border-border/80 hover:-translate-y-0.5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className={`font-display text-xl font-bold leading-none mb-1 ${color || ''}`}>{value}</div>
      <div className="text-xs flex items-center gap-1">{change}</div>
    </div>
  );
}

function TradeRow({ symbol, side, entry, pnl, rr, status }: { symbol: string; side: string; entry: string; pnl: string; rr: string; status: string }) {
  const isLong = side === 'LONG';
  const isWin = status === 'Win';
  
  return (
    <div className="grid grid-cols-[80px_60px_1fr_80px_80px_70px] px-4 py-2.5 border-b border-border last:border-b-0 text-xs items-center">
      <span className="font-mono font-semibold">{symbol}</span>
      <span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${isLong ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {side}
        </span>
      </span>
      <span className="text-muted-foreground font-mono text-[11px]">{entry}</span>
      <span className={`font-mono font-semibold ${isWin ? 'text-green-500' : 'text-red-500'}`}>{pnl}</span>
      <span className="text-muted-foreground">{rr}</span>
      <span className={`${isWin ? 'text-green-500' : 'text-red-500'} text-[11px]`}>● {status}</span>
    </div>
  );
}
