import { useTranslation } from 'react-i18next';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SnapShop AI Error] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorFallback
        error={this.state.error}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full border border-border/50 rounded-2xl p-8 bg-card shadow-surface text-center animate-fade-in">
        <div className="size-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {t('auto.something_went_wrong')}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t('auto.we_encountered_an_unexpected_e')}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left bg-secondary p-4 rounded-lg overflow-auto max-h-40 text-xs mb-8">
            {error?.toString()}
          </pre>
        )}
        <Button
          onClick={onReset}
          className="w-full bg-gradient-brand hover:opacity-90 transition-opacity"
        >
          <RefreshCcw className="size-4 mr-2" />
          {t('auto.refresh_application')}
        </Button>
      </div>
    </div>
  );
}

export default ErrorBoundary;
