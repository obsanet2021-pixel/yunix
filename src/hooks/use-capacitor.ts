import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '@/components/ThemeProvider';

export const useCapacitor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Handle back button
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // If no more history, maybe minimize the app
        App.exitApp();
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Update StatusBar style based on theme
    const updateStatusBar = async () => {
      try {
        await StatusBar.setStyle({
          style: theme === 'dark' ? Style.Dark : Style.Light,
        });
        // You can also set background color if needed
        // await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#171717' : '#f5f5f5' });
      } catch (e) {
        console.warn('StatusBar not available', e);
      }
    };

    updateStatusBar();
  }, [theme]);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
};
