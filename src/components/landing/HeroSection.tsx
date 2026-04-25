import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Play, ChevronDown, ArrowRight } from 'lucide-react';
import FloatingElement from './FloatingElement';
import ScrollReveal from './ScrollReveal';
import AnimatedCounter from './AnimatedCounter';
import DashboardMockup from './DashboardMockup';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  userCount: number;
}

export default function HeroSection({ userCount }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 lg:pt-32 pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Elements - Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary orange orb */}
        <div 
          className="absolute -top-[100px] -right-[100px] w-[600px] h-[600px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(250,140,56,0.12) 0%, transparent 70%)' }}
        />
        {/* Secondary blue orb */}
        <div 
          className="absolute -bottom-[50px] -left-[100px] w-[500px] h-[500px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(74,158,255,0.08) 0%, transparent 70%)' }}
        />
        {/* Tertiary green orb */}
        <div 
          className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(34,211,160,0.06) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 w-full">
        {/* Main Content */}
        <div className="text-center max-w-4xl mx-auto">
          <ScrollReveal direction="fade" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Live — <AnimatedCounter target={userCount} suffix="+" duration={1500} /> Funded Traders
              </span>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={100}>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight mb-6 leading-[1.05]">
              The Journal That<br />
              <span className="gradient-text">Funded Traders</span><br />
              <span className="text-muted-foreground">Actually Use</span>
            </h1>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={200}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light">
              Track every trade. Decode every pattern. Let AI reveal what's holding you back — before the market does.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="group w-full sm:w-auto px-8 h-14 text-base font-semibold bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
              >
                Start for Free
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/auth")} 
                className="group w-full sm:w-auto px-8 h-14 text-base font-semibold bg-card border-border hover:bg-card/80 transition-all duration-300 rounded-xl"
              >
                <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>
          </ScrollReveal>

          {/* Stats Bar */}
          <ScrollReveal direction="scale" delay={400}>
            <div className="inline-flex items-center bg-card border border-border rounded-2xl overflow-hidden">
              <StatBar value={userCount} suffix="+" label="Active Traders" />
              <div className="w-px h-12 bg-border" />
              <StatBar value={10000} suffix="+" label="Trades Logged" />
              <div className="w-px h-12 bg-border" />
              <StatBar value={95} suffix="%" label="Satisfaction" />
              <div className="w-px h-12 bg-border" />
              <StatBar value={50} suffix="+" label="Expert Courses" />
            </div>
          </ScrollReveal>
        </div>

        {/* Dashboard Mockup */}
        <ScrollReveal direction="up" delay={500} className="mt-20 lg:mt-24">
          <div className="relative max-w-6xl mx-auto">
            <DashboardMockup />
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

interface StatBarProps {
  value: number;
  suffix: string;
  label: string;
}

function StatBar({ value, suffix, label }: StatBarProps) {
  return (
    <div className="px-6 py-4 text-center">
      <div className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none mb-1">
        <span className="text-primary">
          <AnimatedCounter target={value} suffix={suffix} duration={2000} />
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
        {label}
      </div>
    </div>
  );
}
