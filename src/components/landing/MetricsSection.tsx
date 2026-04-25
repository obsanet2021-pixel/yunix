import React from 'react';
import ScrollReveal from './ScrollReveal';

const metrics = [
  { value: "100+", label: "Active traders trust YUNIX", color: "text-primary" },
  { value: "10k+", label: "Trades analyzed monthly", color: "text-green-500" },
  { value: "50+", label: "Expert courses available", color: "text-blue-500" },
  { value: "95%", label: "Trader satisfaction rate", color: "text-yellow-500" }
];

export default function MetricsSection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-24 lg:pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-3xl overflow-hidden">
          {metrics.map((metric, index) => (
            <ScrollReveal 
              key={index} 
              direction="up" 
              delay={index * 100}
            >
              <div className="bg-card p-12 lg:p-16 text-center transition-colors hover:bg-card/80">
                <div className={`font-display text-5xl lg:text-6xl font-extrabold leading-none mb-4 ${metric.color}`}>
                  {metric.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {metric.label}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
