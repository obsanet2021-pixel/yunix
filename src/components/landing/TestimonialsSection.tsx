import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const testimonials = [
  {
    name: "Michael Chen",
    role: "FTMO Funded Trader · $100K Account",
    initials: "MC",
    quote: "I passed my FTMO challenge after 3 failed attempts. The AI pinpointed my Friday afternoon losses — I stopped trading that session and my win rate jumped 12% overnight.",
    rating: 5,
    gradient: "from-primary to-orange-600"
  },
  {
    name: "Sarah Williams",
    role: "Day Trader · 4 Years Experience",
    initials: "SW",
    quote: "YUNIX is the only journal that actually tells me what to do differently. The backtesting replays blew my mind — I found an edge I didn't even know I had.",
    rating: 5,
    gradient: "from-blue-500 to-purple-500"
  },
  {
    name: "David Rodriguez",
    role: "Swing Trader · Forex + Indices",
    initials: "DR",
    quote: "I came from Tradezella. There's no comparison. The analytics are on another level, the courses are genuinely useful and the UI is beautiful. Worth every penny.",
    rating: 5,
    gradient: "from-green-500 to-emerald-600"
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-5 px-4 py-1.5 text-xs font-medium tracking-wider uppercase">Testimonials</Badge>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Traders who made<br />the switch
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 100}>
              <TestimonialCard testimonial={testimonial} />
            </ScrollReveal>
          ))}
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
    <Card className="group relative overflow-hidden bg-card border-border hover:border-border/80 transition-all duration-300 h-full">
      <CardContent className="relative p-8">
        {/* Stars */}
        <div className="flex gap-1 mb-6 text-yellow-500" style={{ letterSpacing: '2px' }}>
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
        
        <p className="text-foreground leading-relaxed mb-6 font-light">
          "{testimonial.quote}"
        </p>
        
        <div className="flex items-center gap-3">
          <div 
            className={`h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br ${testimonial.gradient}`}
          >
            <span className="text-sm font-bold text-white">
              {testimonial.initials}
            </span>
          </div>
          <div>
            <div className="font-semibold text-sm">{testimonial.name}</div>
            <div className="text-xs text-muted-foreground">{testimonial.role}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
