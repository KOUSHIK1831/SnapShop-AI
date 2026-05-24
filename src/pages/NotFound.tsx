import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      pathname,
    );
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-semibold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          {t('auto.oops_page_not_found')}
        </p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t('auto.return_to_home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
