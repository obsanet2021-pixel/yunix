import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, BookOpen, Target, Brain, TrendingUp, GraduationCap, ArrowRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const features = [
  {
    icon: '📊',
    title: "Advanced Analytics Engine",
    description: "Deep-dive into your statistics — win rate by session, P&L by pair, performance by day-of-week. Know exactly when and why you win.",
    tag: "→ Real-time data",
    color: 'accent'
  },
  {
    icon: '🔁',
    title: "Smart Backtesting",
    description: "Replay historical price action against your actual strategy rules. Find edge before risking real capital. Includes automatic playback and annotation.",
    tag: "→ Strategy validation",
    color: 'blue'
  },
  {
    icon: '📓',
    title: "Trade Journal + Screenshots",
    description: "Log every trade with notes, emotional state, market conditions and chart screenshots. Build the evidence base that separates pros from gamblers.",
    tag: "→ Pattern memory",
    color: 'green'
  },
  {
    icon: '🎯',
    title: "Account & Challenge Tracker",
    description: "Monitor daily loss limits, drawdown thresholds and challenge targets across multiple prop accounts. Never blow a funded account again.",
    tag: "→ Risk management",
    color: 'gold'
  }
];

function FeatureCard({ feature, index, isWide = false }: { feature: typeof features[0]; index: number; isWide?: boolean }) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const colorClasses = {
    accent: 'bg-primary/10 border-primary/20 text-primary',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    green: 'bg-green-500/10 border-green-500/20 text-green-500',
    gold: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
  };

  const tagColorClasses = {
    accent: 'text-primary',
    blue: 'text-blue-500',
    green: 'text-green-500',
    gold: 'text-yellow-500'
  };

  return (
    <ScrollReveal direction="up" delay={index * 100} threshold={0.1}>
      <Card 
        className={`group relative overflow-hidden bg-card border-border hover:border-border/80 transition-all duration-300 cursor-pointer ${isWide ? 'col-span-2' : ''}`}
        onMouseMove={handleMouseMove}
        style={{
          '--mx': `${mousePos.x}%`,
          '--my': `${mousePos.y}%`
        } as React.CSSProperties}
      >
        {/* Mouse-tracking glow effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
          style={{
            background: `radial-gradient(circle at var(--mx) var(--my), hsl(var(--primary) / 0.08) 0%, transparent 50%)`
          }}
        />
        
        <CardContent className="relative p-8 lg:p-10">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 text-2xl ${colorClasses[feature.color]}`}>
            {feature.icon}
          </div>
          <h3 className="font-display text-xl font-bold mb-3">{feature.title}</h3>
          <p className="text-muted-foreground leading-relaxed mb-6">{feature.description}</p>
          <span className={`inline-flex items-center gap-2 text-sm font-mono ${tagColorClasses[feature.color]}`}>
            {feature.tag}
            <ArrowRight className="h-3 w-3" />
          </span>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}

export default function FeatureShowcase() {
  return (
    <section id="features" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-5 px-4 py-1.5 text-xs font-medium tracking-wider uppercase">Platform</Badge>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Built for serious<br />traders. Period.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto font-light">
              Every feature exists for one reason — to make you more profitable and disciplined.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
          
          {/* Wide AI Card */}
          <ScrollReveal direction="up" delay={400} threshold={0.1}>
            <Card className="group relative overflow-hidden bg-card border-border hover:border-border/80 transition-all duration-300 cursor-pointer col-span-2">
              <CardContent className="relative p-8 lg:p-10 grid md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 text-2xl text-primary">
                    🤖
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3">AI Trading Assistant</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Your personal mentor, available 24/7. Ask about your trading patterns, get pre-session briefings, post-trade debriefs and actionable coaching — all powered by your own data.
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-mono text-primary">
                    → Personalized to your journal
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                
                {/* AI Chat Visual */}
                <div className="bg-card/50 border border-border rounded-xl p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground font-mono mb-2">YUNIX AI</div>
                      <div className="bg-card border border-border rounded-lg p-3 text-sm">
                        Looking at your April data — you're 40% less profitable on Fridays. Your avg loss nearly doubles during London close. Want me to flag future Friday trades?
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-mono mb-2">You</div>
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm inline-block text-left">
                        Yes, and what's my best session historically?
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-mono mb-2">YUNIX AI</div>
                      <div className="bg-card border border-border rounded-lg p-3 text-sm">
                        London open — 8–10 AM GMT. 71% win rate, avg R:R of 2.3. Your edge is clearest on EURUSD and GBP pairs during that window.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
