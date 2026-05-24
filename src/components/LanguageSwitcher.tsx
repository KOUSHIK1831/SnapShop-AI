import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

const languages = [
{ code: 'en', label: 'English', short: 'EN' },
{ code: 'te', label: 'తెలుగు', short: 'తె' },
{ code: 'hi', label: 'हिन्दी', short: 'हि' }];


export default function LanguageSwitcher({ variant = 'default', id }: {variant?: 'default' | 'compact';id?: string;}) {const { t } = useTranslation();
  const { i18n } = useTranslation();

  const current = languages.find((l) => (i18n.language || '').startsWith(l.code)) || languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div id={id || "tour-language"}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:bg-accent/10 ${
            variant === 'compact' ? t("auto.px_2_py_1_text_xs") : t("auto.px_3_py_1_5_text_sm")}`
            }
            aria-label={t("auto.switch_language")}>
            
            <Globe className={variant === 'compact' ? t("auto.size_3") : t("auto.size_3_5")} />
            <span className="font-medium">{current.short}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={t("auto.end")} className="min-w-[140px] z-[100] bg-card border-border/50 shadow-surface-lg animate-in fade-in zoom-in-95 duration-100">
          {languages.map((lang) =>
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer focus:bg-accent/10 focus:text-accent-foreground py-2 px-3 ${
            (i18n.language || '').startsWith(lang.code) ? t("auto.font_semibold_text_primary_bg") : t("auto.text_foreground")}`
            }>
            
              <span className="text-xs font-mono w-5 text-center opacity-70">{lang.short}</span>
              <span>{lang.label}</span>
              {(i18n.language || '').startsWith(lang.code) &&
            <Check className="ml-auto size-3.5 text-primary" />
            }
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>);

}