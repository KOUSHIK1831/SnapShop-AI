import { useTranslation } from 'react-i18next';
import { useNetworkStrength } from '@/hooks/useNetworkStrength';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStrength();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="size-4" />
      {t('auto.you_are_offline_some_features')}
    </div>
  );
}
