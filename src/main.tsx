import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initSentry } from './lib/sentry.ts';
import { initAnalytics } from './lib/analytics.ts';
import './index.css';
import './i18n';

initSentry();
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
