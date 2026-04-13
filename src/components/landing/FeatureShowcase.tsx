import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, BookOpen, Target, Brain, TrendingUp, GraduationCap } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import { useTiltEffect } from '@/hooks/useTilt';

const features = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Track your performance with real-time insights and comprehensive metrics to optimize your strategy."
  },
  {
    icon: BookOpen,
    title: "Trade Journal",
    description: "Document every trade with notes, emotions, and screenshots for continuous improvement."
  },
  {
    icon: Target,
    title: "Smart Backtesting",
    description: "Test strategies with historical data and replay functionality for risk-free practice."
  },
  {
    icon: Brain,
    title: "AI Trading Assistant",
    description: "Get personalized advice powered by AI trained on market analysis and your data."
  },
  {
    icon: TrendingUp,
    title: "Account Tracking",
    description: "Monitor multiple accounts and track progress toward your funding goals."
  },
  {
    icon: GraduationCap,
    title: "Expert Courses",
    description: "Access premium educational content to accelerate your trading education."
  }
];

function TiltCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { getTiltStyle, tiltHandlers, isHovered } = useTiltEffect();
  
  return (
    <ScrollReveal 
      direction="up" 
      delay={index * 100}
      threshold={0.1}
    >
      <Card 
        className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors duration-300 h-full cursor-pointer"
        style={getTiltStyle()}
        {...tiltHandlers}
      >
        {/* Hover gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Shine effect on hover */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ${isHovered ? 'translate-x-full' : '-translate-x-full'}`}
          style={{ transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)' }}
        />
        
        {/* 3D content layer */}
        <CardContent 
          className="relative p-6 lg:p-8"
          style={{ transform: isHovered ? 'translateZ(30px)' : 'translateZ(0)', transition: 'transform 0.3s ease' }}
        >
          <div 
            className={`h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 transition-all duration-300 ${isHovered ? 'bg-primary/20 scale-110' : ''}`}
            style={{ transform: isHovered ? 'translateZ(40px)' : 'translateZ(0)' }}
          >
            <feature.icon className="h-6 w-6 text-primary" />
          </div>
          <h3 
            className="text-xl font-semibold mb-3"
            style={{ transform: isHovered ? 'translateZ(20px)' : 'translateZ(0)' }}
          >
            {feature.title}
          </h3>
          <p 
            className="text-muted-foreground leading-relaxed"
            style={{ transform: isHovered ? 'translateZ(10px)' : 'translateZ(0)' }}
          >
            {feature.description}
          </p>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}

export default function FeatureShowcase() {
  return (
    <section id="features" className="scroll-snap-section py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to <span className="gradient-text">Succeed</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for serious traders who want to take their performance to the next level.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <TiltCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
