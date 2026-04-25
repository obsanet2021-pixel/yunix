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
  const hueShift = scrollProgress * 60; // Enhanced hue rotation (360° over full scroll)

  return (
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden -z-10', className)}>
      {/* Primary animated gradient orb */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 transition-transform duration-300 will-change-transform"
        style={{
          background: `radial-gradient(circle, hsl(${27 + hueShift} 95% 60% / 0.4) 0%, transparent 70%)`,
          top: `${-200 + gradientOffset * 2 + mousePos.y}px`,
          right: `${-200 - gradientOffset + mousePos.x}px`,
          transform: `scale(${1 + scrollProgress * 0.3}) translateZ(0)`,
        }}
      />
      
      {/* Secondary gradient orb - moves opposite direction */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-15 transition-transform duration-300 will-change-transform"
        style={{
          background: `radial-gradient(circle, hsl(${217 - hueShift} 91% 60% / 0.3) 0%, transparent 70%)`,
          bottom: `${-150 - gradientOffset * 1.5 - mousePos.y}px`,
          left: `${-150 + gradientOffset * 0.5 - mousePos.x}px`,
          transform: `scale(${1.2 - scrollProgress * 0.2}) translateZ(0)`,
        }}
      />
      
      {/* Tertiary accent orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-10 transition-transform duration-500 will-change-transform"
        style={{
          background: `radial-gradient(circle, hsl(${262 + hueShift * 0.5} 83% 58% / 0.3) 0%, transparent 70%)`,
          top: `${40 + gradientOffset * 3}%`,
          left: `${30 + Math.sin(scrollProgress * Math.PI) * 10}%`,
          transform: `translateZ(0)`,
        }}
      />

      {/* Fourth orb - teal accent */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[90px] opacity-8 transition-transform duration-400 will-change-transform"
        style={{
          background: `radial-gradient(circle, hsl(${180 + hueShift * 0.3} 70% 50% / 0.25) 0%, transparent 70%)`,
          top: `${60 - gradientOffset * 1.2}%`,
          right: `${20 + Math.cos(scrollProgress * Math.PI * 2) * 15}%`,
          transform: `scale(${0.8 + scrollProgress * 0.4}) translateZ(0)`,
        }}
      />

      {/* Fifth orb - warm accent */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full blur-[70px] opacity-6 transition-transform duration-600 will-change-transform"
        style={{
          background: `radial-gradient(circle, hsl(${35 + hueShift * 0.4} 90% 55% / 0.2) 0%, transparent 70%)`,
          bottom: `${30 + gradientOffset * 0.8}%`,
          right: `${40 - Math.sin(scrollProgress * Math.PI * 1.5) * 12}%`,
          transform: `scale(${1.1 - scrollProgress * 0.3}) translateZ(0)`,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] will-change-transform"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollProgress * -20}px) translateZ(0)`,
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none will-change-transform"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
          transform: `translateZ(0)`,
        }}
      />
    </div>
  );
}
