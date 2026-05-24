import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useToast } from '@/hooks/use-toast';

export function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    let lastBackPress = 0;

    const setupListener = async () => {
      const listener = await CapacitorApp.addListener(
        'backButton',
        async () => {
          // 1. If not on home page, go back in history
          if (
            location.pathname !== '/' &&
            location.pathname !== '/dashboard' &&
            location.pathname !== '/buyer'
          ) {
            navigate(-1);
            return;
          }

          // 2. If on a main page, handle double-tap to exit
          const now = Date.now();
          if (now - lastBackPress < 2000) {
            await CapacitorApp.exitApp();
          } else {
            lastBackPress = now;
            toast({
              description: 'Press back again to exit',
              duration: 2000,
            });
          }
        },
      );

      return listener;
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [location, navigate, toast]);

  return null;
}
