import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import FloatingElement from './FloatingElement';
import YunixLogo from '@/components/YunixLogo';

export default function SolutionSection() {
  return (
    <section className="relative py-20 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-muted/30">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <ScrollReveal direction="scale">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="h-3 w-3 mr-1" />
            The Solution
          </Badge>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={100}>
          <div className="mb-8">
            <FloatingElement intensity={5} floatAnimation={false}>
              <div className="inline-flex items-center justify-center p-6 rounded-3xl bg-card border border-border shadow-2xl">
                <YunixLogo />
              </div>
            </FloatingElement>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={200}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            This is Where{" "}
            <span className="gradient-text">Everything Changes</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={300}>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            YUNIX combines intelligent tracking, AI-powered insights, and comprehensive analytics 
            into one seamless platform — giving you the clarity to trade with confidence.
          </p>
        </ScrollReveal>

        {/* Feature highlights */}
        <ScrollReveal direction="up" delay={400}>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['AI-Powered', 'Real-time Analytics', 'Smart Journaling', 'Backtesting'].map((feature, i) => (
              <span 
                key={feature}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {feature}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
