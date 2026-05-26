import { useTranslation } from 'react-i18next';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <NextThemesProvider
      attribute={t('auto.class')}
      defaultTheme={t('auto.light')}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
