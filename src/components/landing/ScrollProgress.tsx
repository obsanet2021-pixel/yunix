import React from 'react';
import { useScrollProgress } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollProgressProps {
  className?: string;
  showPercentage?: boolean;
}

export default function ScrollProgress({ className, showPercentage = false }: ScrollProgressProps) {
  const progress = useScrollProgress();

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-[100] h-1', className)}>
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-100 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
      {showPercentage && (
        <div className="absolute right-4 top-4 text-xs font-mono text-muted-foreground">
          {Math.round(progress * 100)}%
        </div>
      )}
    </div>
  );
}
