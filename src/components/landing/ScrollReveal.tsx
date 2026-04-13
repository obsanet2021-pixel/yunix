import React, { useRef, ReactNode } from 'react';
import { useInView } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

export default function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 700,
  threshold = 0.2,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { threshold, triggerOnce: once });

  const getInitialTransform = () => {
    switch (direction) {
      case 'up': return 'translateY(60px)';
      case 'down': return 'translateY(-60px)';
      case 'left': return 'translateX(60px)';
      case 'right': return 'translateX(-60px)';
      case 'scale': return 'scale(0.9)';
      case 'fade': return 'translateY(0)';
      default: return 'translateY(60px)';
    }
  };

  return (
    <div
      ref={ref}
      className={cn('transition-all', className)}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0) translateX(0) scale(1)' : getInitialTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
