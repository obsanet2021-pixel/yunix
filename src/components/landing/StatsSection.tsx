import React from 'react';
import ScrollReveal from './ScrollReveal';
import AnimatedCounter from './AnimatedCounter';
import ParallaxLayer from './ParallaxLayer';
import { Users, Award, BookOpen, TrendingUp } from 'lucide-react';

interface StatsSectionProps {
  userCount: number;
}

const stats = [
  { icon: Users, label: "Active Traders", value: 100, suffix: "+", dynamic: true },
  { icon: Award, label: "Success Rate", value: 95, suffix: "%", dynamic: false },
  { icon: BookOpen, label: "Expert Courses", value: 50, suffix: "+", dynamic: false },
  { icon: TrendingUp, label: "Trades Analyzed", value: 10000, suffix: "+", dynamic: false },
];

export default function StatsSection({ userCount }: StatsSectionProps) {
  return (
    <section className="relative py-20 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Parallax background */}
      <ParallaxLayer speed={0.1} className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-30"
          style={{ 
            background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)' 
          }}
        />
      </ParallaxLayer>

      <div className="max-w-6xl mx-auto relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted by Traders <span className="gradient-text">Worldwide</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Join a growing community of successful traders
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <ScrollReveal key={index} direction="scale" delay={index * 100}>
              <div className="group relative p-6 lg:p-8 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm text-center hover:bg-card hover:border-primary/30 transition-all duration-300 hover:-translate-y-2">
                {/* Icon */}
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                
                {/* Counter */}
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-2">
                  <AnimatedCounter 
                    target={stat.dynamic ? userCount : stat.value} 
                    suffix={stat.suffix} 
                    duration={2500} 
                  />
                </div>
                
                {/* Label */}
                <div className="text-sm sm:text-base text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
