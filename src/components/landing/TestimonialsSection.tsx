import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quote } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import ParallaxLayer from './ParallaxLayer';

const testimonials = [
  {
    name: "Michael Chen",
    role: "Funded Trader",
    initials: "MC",
    quote: "YUNIX transformed how I track my trades. The analytics helped me identify patterns I never noticed before."
  },
  {
    name: "Sarah Williams",
    role: "Day Trader",
    initials: "SW",
    quote: "The AI assistant is like having a mentor available 24/7. It's improved my decision-making significantly."
  },
  {
    name: "David Rodriguez",
    role: "Swing Trader",
    initials: "DR",
    quote: "Finally, a platform that understands what serious traders need. Clean, powerful, and incredibly useful."
  }
];

export default function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="testimonials" className="relative py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-muted/30 overflow-hidden">
      {/* Parallax background pattern */}
      <ParallaxLayer speed={0.15} className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </ParallaxLayer>

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              What Traders <span className="gradient-text">Say</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our community of successful traders has to say about YUNIX.
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 150}>
              <TestimonialCard testimonial={testimonial} />
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="md:hidden">
          <ScrollReveal direction="up">
            <TestimonialCard testimonial={testimonials[activeIndex]} />
          </ScrollReveal>
          
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface TestimonialCardProps {
  testimonial: typeof testimonials[0];
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-500 h-full">
      {/* Quote icon background */}
      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Quote className="h-16 w-16 text-primary" />
      </div>
      
      <CardContent className="relative p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <span className="text-sm font-bold text-primary">
              {testimonial.initials}
            </span>
          </div>
          <div>
            <div className="font-semibold">{testimonial.name}</div>
            <div className="text-sm text-muted-foreground">{testimonial.role}</div>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed italic">
          "{testimonial.quote}"
        </p>
      </CardContent>
    </Card>
  );
}
