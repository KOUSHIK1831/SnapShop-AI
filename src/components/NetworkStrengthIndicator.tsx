import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { WifiOff } from 'lucide-react';
import {
  useNetworkStrength,
  type NetworkStatus } from
'@/hooks/useNetworkStrength';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
'@/components/ui/tooltip';

const STATUS_CONFIG: Record<
  NetworkStatus,
  {label: string;color: string;bars: number;}> =
{
  fast: { label: 'Fast', color: 'text-green-500', bars: 4 },
  medium: { label: 'Medium', color: 'text-yellow-500', bars: 3 },
  slow: { label: 'Slow', color: 'text-red-500', bars: 1 },
  offline: { label: 'Offline', color: 'text-gray-400', bars: 0 },
  unknown: { label: 'Checking', color: 'text-gray-400', bars: 0 }
};

const BAR_HEIGHTS = ['h-2', 'h-3', 'h-4', 'h-5'];

function SignalBars({
  activeBars,
  color



}: {activeBars: number;color: string;}) {
  const { t } = useTranslation();
  const bgColor = color.replace('text-', 'bg-');
  return (
    <div className="flex items-end gap-[2px]">
      {BAR_HEIGHTS.map((height, i) =>
      <div
        key={height}
        className={`w-[3px] rounded-sm ${height} transition-colors duration-500 ${i < activeBars ? bgColor : t("auto.bg_gray_300")}`} />

      )}
    </div>);

}

export function NetworkStrengthIndicator() {
  const { t } = useTranslation();
  const { status, downloadMbps, isOnline } = useNetworkStrength();
  const config = STATUS_CONFIG[status];
  const [open, setOpen] = useState(false);

  const mbpsLabel =
  downloadMbps != null ?
  `${downloadMbps < 1 ? downloadMbps.toFixed(2) : downloadMbps.toFixed(1)} Mbps` :
  null;

  const tooltipContent =
  <div className="text-xs space-y-1">
      <p className="font-semibold">{config.label}</p>
      {mbpsLabel &&
    <p>
          {t('auto.speed')}
          {mbpsLabel}
        </p>
    }
      {!isOnline && <p>{t('auto.no_internet_connection')}</p>}
      {status === 'unknown' && isOnline && <p>{t('auto.measuring_speed')}</p>}
    </div>;


  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            className={`flex items-center gap-1.5 p-2 rounded-lg transition-colors duration-500 hover:bg-accent ${config.color}`}
            aria-label={`Network: ${config.label}`}
            onClick={() => setOpen((v) => !v)}>
            
            {status === 'offline' || status === 'unknown' ?
            <WifiOff className="size-5 transition-colors duration-500" /> :

            <SignalBars activeBars={config.bars} color={config.color} />
            }
          </button>
        </TooltipTrigger>
        <TooltipContent side={t("auto.top")}>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>);

}