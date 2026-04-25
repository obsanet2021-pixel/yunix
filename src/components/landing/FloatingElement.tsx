import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useMouseParallax } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface FloatingElementProps {
  children?: ReactNode;
  className?: string;
  intensity?: number;
  rotateIntensity?: number;
  floatAnimation?: boolean;
  hoverMagnification?: boolean;
  springSmoothing?: boolean;
}

export default function FloatingElement({
  children,
  className,
  intensity = 15,
  rotateIntensity = 5,
  floatAnimation = true,
  hoverMagnification = false,
  springSmoothing = true,
}: FloatingElementProps) {
  const mousePos = useMouseParallax(intensity);
  const [isHovered, setIsHovered] = useState(false);
  const [currentTransform, setCurrentTransform] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 });
  const animationRef = useRef<number>();
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Spring smoothing for smoother transitions
  useEffect(() => {
    if (!springSmoothing) {
      setCurrentTransform({
        x: mousePos.x,
        y: mousePos.y,
        rotateX: -mousePos.y * 0.1 * rotateIntensity,
        rotateY: mousePos.x * 0.1 * rotateIntensity,
        scale: hoverMagnification && isHovered ? 1.05 : 1,
      });
      return;
    }

    const spring = 0.15; // Spring constant
    const animate = () => {
      const targetX = mousePos.x;
      const targetY = mousePos.y;
      const targetRotateX = -mousePos.y * 0.1 * rotateIntensity;
      const targetRotateY = mousePos.x * 0.1 * rotateIntensity;
      const targetScale = hoverMagnification && isHovered ? 1.05 : 1;

      setCurrentTransform(prev => ({
        x: prev.x + (targetX - prev.x) * spring,
        y: prev.y + (targetY - prev.y) * spring,
        rotateX: prev.rotateX + (targetRotateX - prev.rotateX) * spring,
        rotateY: prev.rotateY + (targetRotateY - prev.rotateY) * spring,
        scale: prev.scale + (targetScale - prev.scale) * spring,
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mousePos, rotateIntensity, hoverMagnification, isHovered, springSmoothing]);

  return (
    <div
      className={cn(
        'will-change-transform transition-transform duration-200 ease-out',
        floatAnimation && 'animate-float',
        hoverMagnification && 'transition-transform duration-300',
        className
      )}
      style={{
        transform: `
          translate3d(${currentTransform.x}px, ${currentTransform.y}px, 0)
          rotateX(${currentTransform.rotateX}deg)
          rotateY(${currentTransform.rotateY}deg)
          rotateZ(0deg)
          scale(${currentTransform.scale})
        `,
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}
