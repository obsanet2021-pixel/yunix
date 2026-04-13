import { useRef, useEffect, useState, RefObject } from 'react';

interface TiltState {
  rotateX: number;
  rotateY: number;
  scale: number;
}

interface UseTiltOptions {
  maxTilt?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  perspective?: number;
}

export function useTilt<T extends HTMLElement>(
  options: UseTiltOptions = {}
): [RefObject<T>, TiltState] {
  const {
    maxTilt = 15,
    scale = 1.02,
    speed = 300,
    perspective = 1000,
  } = options;

  const elementRef = useRef<T>(null);
  const [tiltState, setTiltState] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let animationFrame: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrame) cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        setTiltState({
          rotateX,
          rotateY,
          scale,
        });
      });
    };

    const handleMouseLeave = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      
      setTiltState({
        rotateX: 0,
        rotateY: 0,
        scale: 1,
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    // Apply initial styles
    element.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
    element.style.transformStyle = 'preserve-3d';

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [maxTilt, scale, speed]);

  // Apply transform to element
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.style.transform = `
      perspective(${perspective}px)
      rotateX(${tiltState.rotateX}deg)
      rotateY(${tiltState.rotateY}deg)
      scale(${tiltState.scale})
    `;
  }, [tiltState, perspective]);

  return [elementRef, tiltState];
}

// Hook for creating tilt on multiple elements
export function useTiltEffect() {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxTilt = 12;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const getTiltStyle = (): React.CSSProperties => ({
    transform: isHovered
      ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
      : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition: 'transform 0.3s cubic-bezier(0.03, 0.98, 0.52, 0.99)',
    transformStyle: 'preserve-3d',
  });

  const tiltHandlers = {
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  return { getTiltStyle, tiltHandlers, isHovered };
}
