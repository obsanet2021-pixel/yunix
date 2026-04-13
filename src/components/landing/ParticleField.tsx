import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useScrollProgress, useMouseParallax } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  delay: number;
  duration: number;
}

interface ParticleFieldProps {
  className?: string;
  particleCount?: number;
  interactive?: boolean;
}

export default function ParticleField({ 
  className, 
  particleCount = 40,
  interactive = true 
}: ParticleFieldProps) {
  const scrollProgress = useScrollProgress();
  const mousePos = useMouseParallax(interactive ? 15 : 0);
  
  // Generate particles only once
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 15,
    }));
  }, [particleCount]);

  return (
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden -z-10', className)}>
      {particles.map((particle) => {
        // Calculate position with scroll and mouse influence
        const scrollOffset = scrollProgress * 50 * (particle.id % 3 === 0 ? 1 : -1);
        const mouseInfluence = interactive ? (particle.id % 2 === 0 ? 1 : -0.5) : 0;
        
        return (
          <div
            key={particle.id}
            className="absolute rounded-full bg-primary/30 dark:bg-primary/20"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `calc(${particle.x}% + ${mousePos.x * mouseInfluence * 0.5}px)`,
              top: `calc(${particle.y}% + ${scrollOffset + mousePos.y * mouseInfluence * 0.5}px)`,
              opacity: particle.opacity * (1 - scrollProgress * 0.3),
              animation: `float-particle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              transition: 'left 0.3s ease-out, top 0.1s linear',
            }}
          />
        );
      })}
      
      {/* Larger accent particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`accent-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${6 + i * 2}px`,
            height: `${6 + i * 2}px`,
            background: `radial-gradient(circle, hsl(var(--primary) / ${0.15 - i * 0.01}), transparent)`,
            left: `${10 + i * 12}%`,
            top: `${15 + (i * 10) + scrollProgress * 30 * (i % 2 === 0 ? 1 : -1)}%`,
            filter: 'blur(1px)',
            animation: `float-3d ${12 + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}
