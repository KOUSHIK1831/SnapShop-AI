import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Store,
  Upload,
  Zap,
  Globe,
  Shield,
  Users,
  IndianRupee,
  BookOpen,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import ScrollReveal from '@/components/ScrollReveal';
import Tilt3D from '@/components/Tilt3D';
import { useEffect } from 'react';
import { captureError } from '@/lib/sentry.ts';

const products = [
  {
    img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=60&w=400&h=500',
    name: 'Kanjivaram Silk Saree',
    price: '₹3,299',
  },
  {
    img: 'https://images.unsplash.com/photo-1583391733956-6c78276477e0?auto=format&fit=crop&q=60&w=400&h=500',
    name: 'Cotton Kurta Set',
    price: '₹1,299',
  },
  {
    img: 'https://images.unsplash.com/photo-1608236415052-3b79e1634f33?auto=format&fit=crop&q=60&w=400&h=500',
    name: 'Handloom Dupatta',
    price: '₹899',
  },
  {
    img: 'https://images.unsplash.com/photo-1593032452242-3492e56f3f4f?auto=format&fit=crop&q=60&w=400&h=500',
    name: 'Lehenga Choli',
    price: '₹5,499',
  },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
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
    <div className="min-h-[100dvh] bg-background">
      <nav className="border-b border-border/40 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="size-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground tracking-tight">
              {t('common.appName')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/manual')}
              className="size-8"
              title="User Manual"
            >
              <BookOpen className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => captureError(new Error('Production Sentry Test'))}
              className="border-destructive/60 text-destructive text-xs"
            >
              Test Sentry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
              className="border-border/60"
            >
              {t('auth.signIn')}
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden min-h-[90dvh] flex items-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute top-1/2 -right-32 size-96 bg-primary/[0.06] rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 size-80 bg-primary/[0.04] rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 pt-16 md:pt-24 pb-16">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground leading-[1.05] mb-6 animate-fade-in">
                {t('landing.hero.title')}{' '}
                <span className="text-primary">
                  {t('landing.hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-10 animate-slide-up">
                {t('landing.hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4 animate-slide-up">
                <Button
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="h-12 px-8 text-base shadow-lg shadow-primary/20"
                >
                  {t('landing.hero.cta')}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="h-12 px-8 text-base border-border/60"
                >
                  {t('auto.browse_stores')}
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full hidden md:block">
              <Tilt3D intensity={7} glare>
                <div className="relative aspect-[3/4] max-w-md mx-auto rounded-2xl overflow-hidden border border-border/40 shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&q=80&w=800&h=1067"
                    alt={t('auto.fashion_model_wearing_traditio')}
                    className="size-full object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                </div>
              </Tilt3D>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <ScrollReveal>
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl font-semibold text-foreground mb-4 tracking-tight">
                {t('landing.features.title')}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('auto.from_uploading_photos_to_a_liv')}
              </p>
            </div>
          </ScrollReveal>
          <div className="space-y-24">
            <ScrollReveal delay={100}>
              <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-center">
                <div className="flex-1">
                  <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                    <Upload className="size-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground tracking-tight mb-3">
                    {t('landing.features.upload.title')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-md">
                    {t('landing.features.upload.desc')}
                  </p>
                </div>
                <div className="flex-1 w-full">
                  <Tilt3D intensity={5} glare>
                    <div className="aspect-[4/3] rounded-2xl border border-border/40 overflow-hidden bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] shadow-surface-lg">
                      <img
                        src="https://images.unsplash.com/photo-1590736704728-f4730bb30770?auto=format&fit=crop&q=60&w=800&h=600"
                        alt={t('auto.upload_products_with_ai')}
                        className="size-full object-cover"
                      />
                    </div>
                  </Tilt3D>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="flex flex-col md:flex-row-reverse gap-12 md:gap-20 items-center">
                <div className="flex-1">
                  <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                    <Zap className="size-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground tracking-tight mb-3">
                    {t('landing.features.ai.title')}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-md">
                    {t('landing.features.ai.desc')}
                  </p>
                </div>
                <div className="flex-1 w-full">
                  <Tilt3D intensity={5} glare>
                    <div className="aspect-[4/3] rounded-2xl border border-border/40 overflow-hidden bg-gradient-to-br from-primary/[0.06] to-primary/[0.01] shadow-surface-lg">
                      <img
                        src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=60&w=800&h=600"
                        alt={t('auto.ai_powered_digitization')}
                        className="size-full object-cover"
                      />
                    </div>
                  </Tilt3D>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={150}>
            <div className="mt-24 pt-24 border-t border-border/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-8 md:p-12 flex flex-col justify-center min-h-[280px] group hover:shadow-surface-lg transition-all duration-300">
                  <Globe className="size-8 text-primary mb-4" />
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {t('auto.reach_customers_across_india')}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                    {t('auto.your_store_is_accessible_in_mu')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-card p-8 flex flex-col justify-center min-h-[280px] group hover:shadow-surface-lg transition-all duration-300">
                  <IndianRupee className="size-8 text-primary mb-4" />
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {t('auto.zero_setup_fee')}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('auto.start_selling_without_any_upfr')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-card p-8 flex flex-col justify-center min-h-[280px] group hover:shadow-surface-lg transition-all duration-300">
                  <Users className="size-8 text-primary mb-4" />
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {t('auto.direct_to_customer')}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('auto.orders_go_straight_to_your_what')}
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-foreground mb-4 tracking-tight">
                {t('auto.featured_products_in_your_cata')}
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {t('auto.every_product_you_upload_gets')}
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, i) => (
              <ScrollReveal key={i} delay={100 * (i + 1)}>
                <Tilt3D intensity={6} glare>
                  <div className="group rounded-2xl border border-border/40 overflow-hidden bg-card shadow-surface-lg transition-shadow duration-500">
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={product.img}
                        alt={product.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-medium text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {product.price}
                      </p>
                    </div>
                  </div>
                </Tilt3D>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <ScrollReveal>
        <section className="border-t border-border/40">
          <div className="max-w-6xl mx-auto px-6 py-24 text-center">
            <h2 className="text-3xl font-semibold text-foreground mb-4 tracking-tight">
              {t('auto.start_your_digital_store_today')}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
              {t('auto.join_hundreds_of_small_retaile')}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="h-12 px-10 text-base shadow-lg shadow-primary/20"
            >
              {t('auto.get_started')}

              <ArrowRight className="ml-2 size-4" />
            </Button>
            <div className="flex items-center justify-center gap-8 mt-16 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-2">
                <Shield className="size-4" />
                {t('auto.secure_private')}
              </span>
              <span className="flex items-center gap-2">
                <Zap className="size-4" />
                {t('auto.setup_in_2_minutes')}
              </span>
              <span className="flex items-center gap-2">
                <Globe className="size-4" />
                {t('auto.hindi_telugu_english')}
              </span>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <footer className="border-t border-border/40 bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-primary rounded-md flex items-center justify-center">
              <Store className="size-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {t('common.appName')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 {t('common.appName')}. {t('landing.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
