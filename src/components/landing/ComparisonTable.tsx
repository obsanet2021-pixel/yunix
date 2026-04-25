import React from 'react';
import { Check, X } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  { name: 'AI-powered coaching', yunix: 'Full', tradezella: false, tradersync: 'Basic', tradebook: false },
  { name: 'Backtesting engine', yunix: 'Advanced', tradezella: 'Limited', tradersync: false, tradebook: false },
  { name: 'Prop challenge tracker', yunix: true, tradezella: true, tradersync: false, tradebook: false },
  { name: 'Expert education courses', yunix: '50+ courses', tradezella: false, tradersync: false, tradebook: false },
  { name: 'Emotional state tracking', yunix: true, tradezella: true, tradersync: 'Limited', tradebook: false },
  { name: 'Session-based analytics', yunix: 'London/NY/Asia', tradezella: false, tradersync: true, tradebook: false },
  { name: 'Free plan available', yunix: true, tradezella: 'Trial only', tradersync: 'Trial only', tradebook: true },
];

export default function ComparisonTable() {
  const navigate = useNavigate();

  return (
    <section id="compare" className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-32">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-xs font-medium tracking-wider uppercase mb-5">
              Comparison
            </div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              How YUNIX stacks up
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto font-light">
              We built everything that was missing from every other platform.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={200}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 border-b border-border">
              <div className="p-5 border-r border-border">
                <div className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">Feature</div>
              </div>
              <div className="p-5 border-r border-border bg-primary/5">
                <div className="text-sm font-display font-bold text-primary">YUNIX</div>
              </div>
              <div className="p-5 border-r border-border">
                <div className="text-sm font-display font-bold text-muted-foreground">Tradezella</div>
              </div>
              <div className="p-5 border-r border-border">
                <div className="text-sm font-display font-bold text-muted-foreground">Tradersync</div>
              </div>
              <div className="p-5">
                <div className="text-sm font-display font-bold text-muted-foreground">TradeBook</div>
              </div>
            </div>

            {/* Rows */}
            {features.map((feature, index) => (
              <div key={index} className="grid grid-cols-5 border-b border-border last:border-b-0">
                <div className="p-5 border-r border-border">
                  <div className="text-sm font-medium text-foreground">{feature.name}</div>
                </div>
                <div className="p-5 border-r border-border bg-primary/5">
                  {typeof feature.yunix === 'boolean' ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="text-sm font-medium text-foreground">{feature.yunix}</span>
                  )}
                </div>
                <div className="p-5 border-r border-border">
                  {typeof feature.tradezella === 'boolean' ? (
                    feature.tradezella ? (
                      <Check className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground opacity-50" />
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">{feature.tradezella}</span>
                  )}
                </div>
                <div className="p-5 border-r border-border">
                  {typeof feature.tradersync === 'boolean' ? (
                    feature.tradersync ? (
                      <Check className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground opacity-50" />
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">{feature.tradersync}</span>
                  )}
                </div>
                <div className="p-5">
                  {typeof feature.tradebook === 'boolean' ? (
                    feature.tradebook ? (
                      <Check className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground opacity-50" />
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">{feature.tradebook}</span>
                  )}
                </div>
              </div>
            ))}

            {/* CTA Row */}
            <div className="grid grid-cols-5 border-t border-border">
              <div className="p-5 border-r border-border" />
              <div className="p-5 border-r border-border bg-primary/5">
                <Button 
                  onClick={() => navigate("/auth")}
                  className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-lg shadow-primary/25"
                >
                  Start Free Trial
                </Button>
              </div>
              <div className="p-5 border-r border-border" />
              <div className="p-5 border-r border-border" />
              <div className="p-5" />
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
