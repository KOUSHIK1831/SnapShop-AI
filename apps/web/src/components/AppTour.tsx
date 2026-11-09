import { useEffect } from 'react';
import { useWelcomeTour } from '@/hooks/useWelcomeTour';
import { useAuth } from '@/hooks/useAuth';
import type { Tab } from '@/pages/Dashboard';

interface AppTourProps {
  setActiveTab?: (tab: Tab) => void;
}

export default function AppTour({ setActiveTab }: AppTourProps) {
  const { user } = useAuth();
  const { startTour, isTourCompleted } = useWelcomeTour(setActiveTab);

  useEffect(() => {
    if (!user || user.role === 'admin') return;

    // Automatic trigger after store creation (this component is mounted in Dashboard only when store is ready)
    if (!isTourCompleted()) {
      const timer = setTimeout(() => {
        startTour();
      }, 1500); // Give some time for the dashboard to settle
      return () => clearTimeout(timer);
    }
  }, [user, startTour, isTourCompleted]);

  return null;
}
