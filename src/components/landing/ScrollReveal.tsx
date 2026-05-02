import React, { useRef, ReactNode, cloneElement, isValidElement } from 'react';
import { useInView, useElementScrollProgress } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade' | 'rotate' | 'flip';
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  staggerChildren?: boolean;
  parallaxOffset?: number;
  easing?: 'spring' | 'ease-out' | 'ease-in-out' | 'linear';
}

export default function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 700,
  threshold = 0.2,
  once = true,
  staggerChildren = false,
  parallaxOffset = 0,
  easing = 'ease-out',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { threshold, triggerOnce: once });
  const scrollProgress = parallaxOffset > 0 ? useElementScrollProgress(ref) : 0;

  const getEasingFunction = () => {
    switch (easing) {
      case 'spring': return 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Elastic bounce
      case 'ease-out': return 'cubic-bezier(0.22, 1, 0.36, 1)';
      case 'ease-in-out': return 'cubic-bezier(0.4, 0, 0.2, 1)';
      case 'linear': return 'linear';
      default: return 'cubic-bezier(0.22, 1, 0.36, 1)';
    }
  };

  const getInitialTransform = () => {
    const parallax = parallaxOffset > 0 ? scrollProgress * parallaxOffset : 0;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const translateAmount = isMobile ? 30 : 60;
    switch (direction) {
      case 'up': return `translateY(${translateAmount + parallax}px)`;
      case 'down': return `translateY(${-translateAmount + parallax}px)`;
      case 'left': return `translateX(${translateAmount + parallax}px)`;
      case 'right': return `translateX(${-translateAmount + parallax}px)`;
      case 'scale': return 'scale(0.9)';
      case 'fade': return 'translateY(0)';
      case 'rotate': return 'rotate(-10deg) translateY(20px)';
      case 'flip': return 'rotateX(90deg)';
      default: return `translateY(${translateAmount + parallax}px)`;
    }
  };

  const getFinalTransform = () => {
    const parallax = parallaxOffset > 0 ? scrollProgress * parallaxOffset : 0;
    switch (direction) {
      case 'up': return `translateY(${-parallax}px)`;
      case 'down': return `translateY(${parallax}px)`;
      case 'left': return `translateX(${-parallax}px)`;
      case 'right': return `translateX(${parallax}px)`;
      case 'scale': return 'scale(1)';
      case 'fade': return 'translateY(0)';
      case 'rotate': return 'rotate(0deg) translateY(0)';
      case 'flip': return 'rotateX(0deg)';
      default: return `translateY(${-parallax}px)`;
    }
  };

  // Handle staggered children
  if (staggerChildren && React.Children.count(children) > 0) {
    return (
      <div ref={ref} className={cn('stagger-children', className)}>
        {React.Children.map(children, (child, index) => {
          if (isValidElement(child)) {
            return cloneElement(child as React.ReactElement, {
              style: {
                ...(child.props.style || {}),
                animationDelay: `${index * 100}ms`,
              },
            });
          }
          return child;
        })}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn('transition-all will-change-transform', className)}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? getFinalTransform() : getInitialTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: getEasingFunction(),
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
