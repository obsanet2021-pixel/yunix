import { useState, useEffect, useRef, RefObject, useCallback } from 'react';

// Returns scroll progress through the entire page (0 to 1)
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY;
      setProgress(scrollHeight > 0 ? scrollTop / scrollHeight : 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

// Returns if element is in viewport with threshold option
export function useInView(
  ref: RefObject<Element>,
  options: { threshold?: number; rootMargin?: string; triggerOnce?: boolean } = {}
): boolean {
  const [isInView, setIsInView] = useState(false);
  const { threshold = 0.2, rootMargin = '0px', triggerOnce = true } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin, triggerOnce]);

  return isInView;
}

// Returns transform value for parallax effect based on scroll
export function useParallax(speed: number = 0.5): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return offset;
}

// Animated count up when element is in view
export function useCountUp(
  target: number,
  duration: number = 2000,
  triggerRef: RefObject<Element>,
  options?: {
    decimals?: number;
    direction?: 'up' | 'down';
    prefix?: string;
    suffix?: string;
    easing?: 'linear' | 'ease-out' | 'ease-in-out' | 'exponential';
  }
): number {
  const [count, setCount] = useState(0);
  const isInView = useInView(triggerRef, { threshold: 0.3, triggerOnce: true });
  const hasAnimated = useRef(false);
  const { decimals = 0, direction = 'up', prefix = '', suffix = '', easing = 'ease-out' } = options || {};

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const startValue = direction === 'down' ? target : 0;
    const endValue = direction === 'down' ? 0 : target;

    const getEasedProgress = (progress: number) => {
      switch (easing) {
        case 'linear':
          return progress;
        case 'ease-out':
          return 1 - Math.pow(1 - progress, 3);
        case 'ease-in-out':
          return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        case 'exponential':
          return progress === 0 ? 0 : 1 - Math.pow(2, -10 * progress);
        default:
          return 1 - Math.pow(1 - progress, 3);
      }
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = getEasedProgress(progress);
      
      const currentCount = startValue + (endValue - startValue) * eased;
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration, direction, decimals, prefix, suffix, easing]);

  return count;
}

// Mouse parallax effect for 2.5D
export function useMouseParallax(intensity: number = 20): { x: number; y: number } {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setPosition({ x: x * intensity, y: y * intensity });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [intensity]);

  return position;
}

// Custom hook for element-specific scroll progress
export function useElementScrollProgress(ref: RefObject<Element>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Progress from 0 (element just entering) to 1 (element just leaving)
      const elementTop = rect.top;
      const elementHeight = rect.height;
      
      // When element top is at bottom of viewport, progress = 0
      // When element bottom is at top of viewport, progress = 1
      const start = windowHeight;
      const end = -elementHeight;
      const current = elementTop;
      
      const prog = (start - current) / (start - end);
      setProgress(Math.max(0, Math.min(1, prog)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ref]);

  return progress;
}
