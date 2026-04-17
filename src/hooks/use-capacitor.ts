import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';

export const useCapacitor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    // Dynamic import to prevent build failures on web
    const setupCapacitor = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import('@capacitor/app');

        // Handle back button
        const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            // If no more history, maybe minimize the app
            App.exitApp();
          }
        });

        return backButtonListener;
      } catch (e) {
        console.warn('Capacitor not available', e);
        return null;
      }
    };

    const listenerPromise = setupCapacitor();

    return () => {
      listenerPromise.then(l => l?.remove());
    };
  }, []);

  useEffect(() => {
    // Dynamic import to prevent build failures on web
    const updateStatusBar = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');

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

  useEffect(() => {
    const getCapacitorInfo = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        return {
          isNative: Capacitor.isNativePlatform(),
          platform: Capacitor.getPlatform(),
        };
      } catch (e) {
        return {
          isNative: false,
          platform: 'web',
        };
      }
    };

    getCapacitorInfo();
  }, []);

  return {
    isNative: false,
    platform: 'web',
  };
};
