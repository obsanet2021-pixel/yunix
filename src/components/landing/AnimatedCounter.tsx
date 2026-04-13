import React, { useRef } from 'react';
import { useCountUp } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export default function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 2000,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useCountUp(target, duration, ref);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
