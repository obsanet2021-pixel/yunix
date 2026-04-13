import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, TrendingDown } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import ParallaxLayer from './ParallaxLayer';

const problems = [
  {
    icon: TrendingDown,
    title: "Inconsistent Results",
    description: "Without proper tracking, patterns repeat. You keep making the same mistakes without realizing it.",
    color: "text-destructive"
  },
  {
    icon: Clock,
    title: "Time Wasted on Manual Logging",
    description: "Spreadsheets are tedious. Hours spent organizing data that should be automatic.",
    color: "text-amber-500"
  },
  {
    icon: AlertCircle,
    title: "No Clear Direction",
    description: "Data without insights is just noise. You need actionable feedback to improve.",
    color: "text-orange-500"
  }
];

export default function ProblemSection() {
  return (
    <section className="relative py-20 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Parallax background pattern */}
      <ParallaxLayer speed={0.2} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
      </ParallaxLayer>

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive">
              The Problem
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Trading Without <span className="text-destructive">Clarity</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Most traders struggle not because of skill, but because they lack the right tools.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {problems.map((problem, index) => (
            <ScrollReveal 
              key={index} 
              direction={index === 0 ? 'left' : index === 2 ? 'right' : 'up'} 
              delay={index * 150}
            >
              <Card className="group relative overflow-hidden bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card hover:border-destructive/30 transition-all duration-500 h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="relative p-6 lg:p-8">
                  <div className={`h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${problem.color}`}>
                    <problem.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{problem.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Transition arrow */}
        <ScrollReveal direction="up" delay={500}>
          <div className="flex justify-center mt-12">
            <div className="w-px h-20 bg-gradient-to-b from-destructive/50 to-primary/50" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
