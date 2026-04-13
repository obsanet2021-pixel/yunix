import React, { ReactNode } from 'react';
import { useParallax } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number; // 0.3 = slow (background), 0.7 = mid, 1.2 = fast (foreground)
  className?: string;
  direction?: 'vertical' | 'horizontal';
}

export default function ParallaxLayer({
  children,
  speed = 0.5,
  className,
  direction = 'vertical',
}: ParallaxLayerProps) {
  const offset = useParallax(speed);

  const transform = direction === 'vertical' 
    ? `translateY(${-offset}px)` 
    : `translateX(${-offset}px)`;

  return (
    <div
      className={cn('will-change-transform', className)}
      style={{ transform }}
    >
      {children}
    </div>
  );
}
