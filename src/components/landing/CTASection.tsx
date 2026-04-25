import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal direction="up">
          <div className="relative bg-card border border-border rounded-3xl p-12 sm:p-16 lg:p-20 text-center overflow-hidden">
            {/* Gradient glow effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
            </div>
            
            {/* Grid line background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
              backgroundImage: `
                linear-gradient(var(--border) 1px, transparent 1px),
                linear-gradient(90deg, var(--border) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(circle at center, transparent 30%, black 80%)'
            }} />
            
            <div className="relative">
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
                Start trading with<br />
                <span className="bg-gradient-to-r from-primary to-yellow-500 bg-clip-text text-transparent">real clarity</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto font-light">
                Join over 100 traders who use YUNIX to track their edge, stay disciplined, and grow their accounts.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")} 
                  className="group w-full sm:w-auto px-8 h-14 text-base font-semibold bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                >
                  Create Free Account →
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/auth")} 
                  className="group w-full sm:w-auto px-8 h-14 text-base font-semibold bg-card border-border hover:bg-card/80 transition-all duration-300 rounded-xl"
                >
                  View Pricing
                </Button>
              </div>
              
              <p className="mt-5 text-sm text-muted-foreground">
                No credit card required · Free plan available · Cancel anytime
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
