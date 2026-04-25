import React, { useRef } from 'react';
import { useCountUp } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
  direction?: 'up' | 'down';
  easing?: 'linear' | 'ease-out' | 'ease-in-out' | 'exponential';
}

export default function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 2000,
  className,
  decimals = 0,
  direction = 'up',
  easing = 'ease-out',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useCountUp(target, duration, ref, { decimals, direction, prefix, suffix, easing });

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{count.toFixed(decimals).toLocaleString()}{suffix}
    </span>
  );
}
