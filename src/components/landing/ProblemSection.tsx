import React from 'react';
import { Badge } from '@/components/ui/badge';
import ScrollReveal from './ScrollReveal';

const problems = [
  {
    number: "01",
    title: "Zero visibility",
    description: "Spreadsheets tell you nothing. You need real-time pattern recognition, not manual tallies that age out by Monday."
  },
  {
    number: "02",
    title: "Emotion destroys discipline",
    description: "Every funded trader knows the feeling — revenge trades, moving stop-losses, doubling down. Without a journal you can't break the cycle."
  },
  {
    number: "03",
    title: "No feedback loop",
    description: "Data without insight is noise. You need AI that spots your weaknesses before they cost you the account."
  }
];

export default function ProblemSection() {
  return (
    <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-5 px-4 py-1.5 text-xs font-medium tracking-wider uppercase">The Problem</Badge>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Most traders fail <span className="text-destructive">not</span><br />from bad trades
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto font-light">
              They fail from lack of clarity. No system. No feedback. No pattern recognition. That's what YUNIX fixes.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-px bg-border border border-border rounded-3xl overflow-hidden">
          {problems.map((problem, index) => (
            <ScrollReveal 
              key={index} 
              direction="up" 
              delay={index * 100}
            >
              <div className="bg-card p-12 lg:p-16 transition-colors hover:bg-card/80 relative group">
                <div className="font-display text-6xl lg:text-7xl font-extrabold text-border opacity-50 mb-6 transition-colors group-hover:text-destructive/15">
                  {problem.number}
                </div>
                <h3 className="font-display text-xl font-bold mb-4">{problem.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-destructive to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
