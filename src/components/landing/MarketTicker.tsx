import React from 'react';

interface TickerItem {
  symbol: string;
  value: string;
  change: string;
  isPositive: boolean;
}

const tickerItems: TickerItem[] = [
  { symbol: 'EURUSD', value: '1.0842', change: '+0.12%', isPositive: true },
  { symbol: 'GBPUSD', value: '1.2674', change: '+0.08%', isPositive: true },
  { symbol: 'NAS100', value: '17,923', change: '+1.24%', isPositive: true },
  { symbol: 'SPX500', value: '5,102', change: '-0.31%', isPositive: false },
  { symbol: 'XAUUSD', value: '2,341', change: '+0.54%', isPositive: true },
  { symbol: 'USDJPY', value: '153.20', change: '-0.17%', isPositive: false },
  { symbol: 'BTCUSD', value: '67,420', change: '+2.11%', isPositive: true },
  { symbol: 'GBPJPY', value: '191.44', change: '+0.26%', isPositive: true },
];

export default function MarketTicker() {
  return (
    <div className="border-t border-b border-border bg-card py-3.5 overflow-hidden relative my-16">
      {/* Fade gradients */}
      <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
      
      {/* Scrolling track */}
      <div className="flex gap-12 animate-scroll hover:pause-scroll">
        {/* First set */}
        {tickerItems.map((item, index) => (
          <TickerItem key={`first-${index}`} {...item} />
        ))}
        {/* Duplicate for seamless loop */}
        {tickerItems.map((item, index) => (
          <TickerItem key={`second-${index}`} {...item} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ symbol, value, change, isPositive }: TickerItem) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm whitespace-nowrap">
      <span className="font-semibold text-foreground">{symbol}</span>
      <span className="text-muted-foreground">{value}</span>
      <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {change}
      </span>
    </div>
  );
}
