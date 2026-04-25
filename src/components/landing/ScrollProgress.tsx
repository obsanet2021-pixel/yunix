import React from 'react';
import { useScrollProgress } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollProgressProps {
  className?: string;
  showPercentage?: boolean;
  enable3D?: boolean;
}

export default function ScrollProgress({ className, showPercentage = false, enable3D = false }: ScrollProgressProps) {
  const progress = useScrollProgress();

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-[100] h-1', className)}>
      <div
        className={cn(
          'h-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-100 ease-out',
          enable3D && 'shadow-lg'
        )}
        style={{
          width: `${progress * 100}%`,
          ...(enable3D && {
            transform: 'perspective(100px) rotateX(2deg)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }),
        }}
      />
      {showPercentage && (
        <div className="absolute right-4 top-4 text-xs font-mono text-muted-foreground">
          {Math.round(progress * 100)}%
        </div>
      )}
    </div>
  );
}
