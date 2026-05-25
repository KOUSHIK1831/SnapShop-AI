import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Zap,
  Store,
  Upload,
  Sparkles,
  Shield,
  Globe,
  User,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Supabase may redirect to the root URL with recovery tokens or errors in the hash
    // when the /reset-password path isn't in the allowlist. Catch it here and redirect.
    const hash = window.location.hash.substring(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const type = params.get('type');
      const errorCode = params.get('error_code');
      const accessToken = params.get('access_token');
      if (type === 'recovery' && accessToken) {
        navigate('/reset-password' + window.location.hash, { replace: true });
        return;
      }
      if (errorCode) {
        navigate('/reset-password' + window.location.hash, { replace: true });
        return;
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'seller') navigate('/dashboard');
      else if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'buyer') navigate('/buyer');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-gradient-brand rounded-lg flex items-center justify-center">
              <Store className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              {t('common.appName')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
              className="border-border/50"
            >
              {t('auth.signIn')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[75vh] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1590736704728-f4730bb30770?auto=format&fit=crop&q=80&w=2000"
            alt={t('auto.indian_market')}
            className="size-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-24 relative z-10 text-center sm:text-left flex flex-col items-center sm:items-start">
          <div className="max-w-2xl animate-slide-up flex flex-col items-center sm:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary-foreground dark:text-primary rounded-full text-xs font-semibold mb-6 backdrop-blur-md border border-white/10">
              <Sparkles className="size-3.5 text-primary" />
              {t('auto.ai_powered_seller_platform')}
            </div>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.05] mb-6">
              {t('landing.hero.title')} <br className="hidden md:block" />
              <span className="text-gradient">
                {t('landing.hero.titleHighlight')}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-lg mx-auto sm:mx-0">
              {t('landing.hero.subtitle')}
            </p>

            {/* Massive Circular Upload Button (Action) centered as per UX principle */}
            <div className="flex flex-col items-center justify-center gap-4 mb-8">
              <button
                onClick={() => navigate('/auth')}
                className="group relative size-32 sm:size-40 bg-gradient-brand rounded-full flex flex-col items-center justify-center text-white shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping group-hover:animate-none" />
                <Upload className="size-8 sm:size-10 mb-2" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {t('landing.hero.cta')}
                </span>
              </button>
              <p className="text-xs text-muted-foreground animate-pulse">
                {t('auto.start_your_journey_today')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-foreground mb-3">
              {t('landing.features.title')}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t('auto.from_uploading_photos_to_a_liv')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Upload,
                title: t('landing.features.upload.title'),
                description: t('landing.features.upload.desc'),
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: Zap,
                title: t('landing.features.ai.title'),
                description: t('landing.features.ai.desc'),
                color: 'text-amber-500',
                bg: 'bg-amber-500/10',
              },
              {
                icon: Globe,
                title: t('landing.features.store.title'),
                description: t('landing.features.store.desc'),
                color: 'text-green-500',
                bg: 'bg-green-500/10',
              },
            ].map(feature => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border/50 bg-card hover:shadow-surface-lg hover:border-border transition-all duration-300"
              >
                <div
                  className={`size-11 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`size-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            {[
              { icon: Shield, label: t('auto.secure_private') },
              { icon: Zap, label: t('auto.setup_in_2_minutes') },
              { icon: Globe, label: t('auto.share_anywhere') },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <item.icon className="size-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-gradient-brand rounded-md flex items-center justify-center">
              <Store className="size-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {t('common.appName')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 {t('common.appName')}. {t('landing.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
