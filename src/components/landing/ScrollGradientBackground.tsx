import React, { useEffect, useState, useRef } from 'react';
import { useScrollProgress, useMouseParallax } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollGradientBackgroundProps {
  className?: string;
}

export default function ScrollGradientBackground({ className }: ScrollGradientBackgroundProps) {
  const scrollProgress = useScrollProgress();
  const mousePos = useMouseParallax(30);
  
  // Calculate gradient positions based on scroll
  const gradientOffset = scrollProgress * 100;
  const hueShift = scrollProgress * 30; // Subtle hue rotation

  return (
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden -z-10', className)}>
      {/* Primary animated gradient orb */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 transition-transform duration-300"
        style={{
          background: `radial-gradient(circle, hsl(${27 + hueShift} 95% 60% / 0.4) 0%, transparent 70%)`,
          top: `${-200 + gradientOffset * 2 + mousePos.y}px`,
          right: `${-200 - gradientOffset + mousePos.x}px`,
          transform: `scale(${1 + scrollProgress * 0.3})`,
        }}
      />
      
      {/* Secondary gradient orb - moves opposite direction */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-15 transition-transform duration-300"
        style={{
          background: `radial-gradient(circle, hsl(${217 - hueShift} 91% 60% / 0.3) 0%, transparent 70%)`,
          bottom: `${-150 - gradientOffset * 1.5 - mousePos.y}px`,
          left: `${-150 + gradientOffset * 0.5 - mousePos.x}px`,
          transform: `scale(${1.2 - scrollProgress * 0.2})`,
        }}
      />
      
      {/* Tertiary accent orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-10 transition-transform duration-500"
        style={{
          background: `radial-gradient(circle, hsl(${262 + hueShift * 0.5} 83% 58% / 0.3) 0%, transparent 70%)`,
          top: `${40 + gradientOffset * 3}%`,
          left: `${30 + Math.sin(scrollProgress * Math.PI) * 10}%`,
        }}
      />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollProgress * -20}px)`,
        }}
      />
    </div>
  );
}
