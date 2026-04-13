import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import FloatingElement from './FloatingElement';

export default function CTASection() {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonTransform, setButtonTransform] = useState({ x: 0, y: 0 });

  // Magnetic button effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setButtonTransform({ x: x * 0.2, y: y * 0.2 });
  };

  const handleMouseLeave = () => {
    setButtonTransform({ x: 0, y: 0 });
  };

  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal direction="scale">
          <Card className="relative overflow-hidden border-primary/20">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            
            {/* Floating orbs */}
            <FloatingElement intensity={10} className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            <FloatingElement intensity={15} className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-accent/10 blur-3xl" />
            
            <CardContent className="relative p-8 sm:p-12 lg:p-16 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-6">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Ready to Transform{" "}
                <span className="gradient-text">Your Trading?</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of successful traders who use YUNIX to track, analyze, 
                and improve their trading performance every day.
              </p>
              
              <div 
                className="inline-block"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <Button 
                  ref={buttonRef}
                  size="lg" 
                  onClick={() => navigate("/auth")} 
                  className="group px-8 h-14 text-base font-semibold shadow-lg hover:shadow-2xl transition-all duration-300"
                  style={{ 
                    transform: `translate(${buttonTransform.x}px, ${buttonTransform.y}px)`,
                    transition: 'transform 0.2s ease-out, box-shadow 0.3s'
                  }}
                >
                  Start Trading Smarter Today
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              
              <p className="mt-6 text-sm text-muted-foreground">
                No credit card required • Free forever plan available
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}
