import { useTranslation } from "react-i18next";import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ThemeToggle() {const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? t("auto.light") : t("auto.dark"))}
      className="border-border/50"
      aria-label={isDark ? t("auto.switch_to_light_mode") : t("auto.switch_to_dark_mode")}
      title={isDark ? t("auto.switch_to_light_mode") : t("auto.switch_to_dark_mode")}>
      
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>);

}