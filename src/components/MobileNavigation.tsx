import React, { useState, useEffect } from 'react';
import { X, Menu, Home, BookOpen, MessageSquare, Info, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleNavigate = (path: string) => {
    handleClose();
    setTimeout(() => navigate(path), 300);
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: BookOpen, label: 'Courses', path: '#courses' },
    { icon: MessageSquare, label: 'Testimonials', path: '#testimonials' },
    { icon: Info, label: 'About', path: '/about' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Haptic feedback on touch devices
  const handleTouch = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-80 bg-background border-l border-border z-50 transform transition-transform duration-300 ease-out md:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          isClosing && 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-10 w-10 min-h-[44px] min-w-[44px]"
              aria-label="Close menu"
              onTouchStart={handleTouch}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile navigation">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    onTouchStart={handleTouch}
                    className={cn(
                      'w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200',
                      'hover:bg-accent hover:text-accent-foreground',
                      'active:scale-95',
                      'min-h-[44px]'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-base font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border space-y-3">
            <Button
              onClick={() => handleNavigate('/auth')}
              onTouchStart={handleTouch}
              className="w-full h-12 min-h-[48px] font-semibold"
              size="lg"
            >
              Sign In
            </Button>
            <Button
              onClick={() => handleNavigate('/auth')}
              onTouchStart={handleTouch}
              className="w-full h-12 min-h-[48px] font-semibold"
              size="lg"
              variant="outline"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
