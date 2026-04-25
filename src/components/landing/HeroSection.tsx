import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Play, ChevronDown } from 'lucide-react';
import FloatingElement from './FloatingElement';
import ScrollReveal from './ScrollReveal';
import AnimatedCounter from './AnimatedCounter';
import PlatformPreviewSlideshow from '@/components/PlatformPreviewSlideshow';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  userCount: number;
}

export default function HeroSection({ userCount }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen pt-32 lg:pt-40 pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Elements - Parallax Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orb */}
        <div 
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl animate-pulse"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)' }}
        />
        {/* Secondary gradient orb */}
        <div 
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ 
            background: 'radial-gradient(circle, hsl(217 91% 60% / 0.3) 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite 1s'
          }}
        />
        {/* Floating geometric shapes */}
        <FloatingElement intensity={10} className="absolute top-1/4 left-[10%]">
          <div className="w-20 h-20 border border-primary/20 rounded-2xl rotate-12 backdrop-blur-sm" />
        </FloatingElement>
        <FloatingElement intensity={15} className="absolute top-1/3 right-[15%]">
          <div className="w-16 h-16 border border-accent/30 rounded-full backdrop-blur-sm" />
        </FloatingElement>
        <FloatingElement intensity={8} className="absolute bottom-1/3 left-[20%]">
          <div className="w-12 h-12 bg-primary/5 rounded-lg rotate-45 backdrop-blur-sm" />
        </FloatingElement>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Main Content */}
        <div className="text-center max-w-4xl mx-auto">
          <ScrollReveal direction="fade" delay={0}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              Trusted by <AnimatedCounter target={userCount} suffix="+" duration={1500} /> Traders
            </Badge>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Success in Trading{" "}
              <span className="gradient-text relative">
                Begins Today
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path 
                    d="M2 10C50 4 100 2 150 6C200 10 250 4 298 8" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="animate-draw"
                    style={{ strokeDasharray: 300, strokeDashoffset: 0 }}
                  />
                </svg>
              </span>
            </h1>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={200}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Join hundreds of disciplined traders who trust YUNIX to track, analyze, and master 
              their trading journey with AI-powered insights.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="group w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Get Started Free
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/auth")} 
                className="group w-full sm:w-auto px-8 h-12 text-base font-semibold hover:bg-primary/5 transition-all duration-300"
              >
                <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>
          </ScrollReveal>

          {/* Animated Stats */}
          <ScrollReveal direction="scale" delay={400}>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
              <StatCard value={userCount} suffix="+" label="Active Traders" delay={0} />
              <StatCard value={95} suffix="%" label="Success Rate" delay={100} />
              <StatCard value={50} suffix="+" label="Expert Courses" delay={200} />
            </div>
          </ScrollReveal>
        </div>

        {/* Product Screenshot */}
        <ScrollReveal direction="up" delay={500} className="mt-16 lg:mt-24">
          <div className="relative max-w-5xl mx-auto">
            <div className="glow-card rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="/hero-screenshot-1.png" 
                alt="YUNIX Trading Platform Dashboard"
                className="w-full h-auto"
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

function StatCard({ value, suffix, label, delay }: StatCardProps) {
  return (
    <div 
      className="text-center p-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
        <AnimatedCounter target={value} suffix={suffix} duration={2000} />
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}
