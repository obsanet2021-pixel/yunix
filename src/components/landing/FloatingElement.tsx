import React, { ReactNode } from 'react';
import { useMouseParallax } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface FloatingElementProps {
  children?: ReactNode;
  className?: string;
  intensity?: number;
  rotateIntensity?: number;
  floatAnimation?: boolean;
}

export default function FloatingElement({
  children,
  className,
  intensity = 15,
  rotateIntensity = 5,
  floatAnimation = true,
}: FloatingElementProps) {
  const mousePos = useMouseParallax(intensity);

  return (
    <div
      className={cn(
        'will-change-transform transition-transform duration-200 ease-out',
        floatAnimation && 'animate-float',
        className
      )}
      style={{
        transform: `translate(${mousePos.x}px, ${mousePos.y}px) rotateX(${-mousePos.y * 0.1 * rotateIntensity}deg) rotateY(${mousePos.x * 0.1 * rotateIntensity}deg)`,
      }}
    >
      {children}
    </div>
  );
}
