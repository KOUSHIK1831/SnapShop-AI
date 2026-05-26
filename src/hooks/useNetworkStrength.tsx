import { useTranslation } from 'react-i18next';
import SpeedTest from '@cloudflare/speedtest';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import i18n from '@/i18n';

export type NetworkStatus = 'fast' | 'medium' | 'slow' | 'offline' | 'unknown';

export interface NetworkInfo {
  status: NetworkStatus;
  downloadMbps: number | null;
  connected: boolean;
  isOnline: boolean;
  lastUpdatedAt: number | null;
}

const FAST_MBPS = 20;
const MEDIUM_MBPS = 5;

const POLL_MS = import.meta.env.DEV ? 7_000 : 15_000;
const SPEED_TEST_TIMEOUT_MS = 10_000;

type SpeedTestInstance = InstanceType<typeof SpeedTest>;
type SpeedTestConfig = NonNullable<ConstructorParameters<typeof SpeedTest>[0]>;

const SPEED_TEST_CONFIG: SpeedTestConfig = {
  autoStart: false,
  measurements: [
    { type: 'download', bytes: 100_000, count: 1, bypassMinDuration: true },
  ],

  measureDownloadLoadedLatency: false,
  measureUploadLoadedLatency: false,
};

function isBrowserOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function classifyMbps(mbps: number | null): NetworkStatus {
  if (mbps == null) return 'unknown';
  if (mbps > FAST_MBPS) return 'fast';
  if (mbps > MEDIUM_MBPS) return 'medium';
  return 'slow';
}

function toMbps(v: number | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v / 1_000_000 : null;
}

function readMbps(test: SpeedTestInstance): number | null {
  const s = test.results.getSummary();
  return toMbps(s.download) ?? toMbps(test.results.getDownloadBandwidth());
}

const makeOffline = (): NetworkInfo => ({
  status: 'offline',
  downloadMbps: null,
  connected: false,
  isOnline: false,
  lastUpdatedAt: null,
});

const makeUnknown = (): NetworkInfo => ({
  status: 'unknown',
  downloadMbps: null,
  connected: false,
  isOnline: isBrowserOnline(),
  lastUpdatedAt: null,
});

const makeFromMbps = (mbps: number | null): NetworkInfo => ({
  status: classifyMbps(mbps),
  downloadMbps: mbps,
  connected: mbps != null,
  isOnline: true,
  lastUpdatedAt: Date.now(),
});

const NetworkContext = createContext<NetworkInfo>(makeUnknown());

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<NetworkInfo>(() =>
    isBrowserOnline() ? makeUnknown() : makeOffline(),
  );

  const mountedRef = useRef(true);
  const activeTestRef = useRef<SpeedTestInstance | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const apply = (next: NetworkInfo) => {
      if (mountedRef.current) setInfo(next);
    };

    const abortTest = () => {
      activeTestRef.current?.pause();
      activeTestRef.current = null;
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const runSpeedTest = () => {
      if (!isBrowserOnline()) {
        apply(makeOffline());
        return;
      }
      abortTest();

      const test = new SpeedTest(SPEED_TEST_CONFIG);
      activeTestRef.current = test;
      let settled = false;

      const settle = (next: NetworkInfo) => {
        if (settled) return;
        settled = true;
        if (timeoutRef.current != null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        apply(next);
      };

      timeoutRef.current = window.setTimeout(() => {
        if (!settled) {
          test.pause();
          settle(makeUnknown());
        }
      }, SPEED_TEST_TIMEOUT_MS);

      test.onResultsChange = () => {
        if (settled || !mountedRef.current) return;
        const mbps = readMbps(test);
        if (mbps != null) apply(makeFromMbps(mbps));
      };

      test.onFinish = () => settle(makeFromMbps(readMbps(test)));

      test.onError = () => settle(makeUnknown());

      try {
        test.play();
      } catch (err) {
        console.error('Speed test failed:', err);
        settle(makeUnknown());
      }
    };

    const handleOnline = () => runSpeedTest();
    const handleOffline = () => {
      abortTest();
      apply(makeOffline());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    runSpeedTest();
    intervalRef.current = window.setInterval(runSpeedTest, POLL_MS);

    return () => {
      mountedRef.current = false;
      abortTest();
      if (intervalRef.current != null)
        window.clearInterval(intervalRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={info}>{children}</NetworkContext.Provider>
  );
}

export function useNetworkStrength() {
  return useContext(NetworkContext);
}
