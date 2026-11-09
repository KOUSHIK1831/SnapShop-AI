import {
  MessageCircle,
  AlertTriangle,
  FlaskConical,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppAgentSetupProps {
  seller: any;
  t: (key: string) => string;
}

export default function WhatsAppAgentSetup({
  seller,
  t,
}: WhatsAppAgentSetupProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 rounded-2xl p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">
              {t('auto.whatsapp_agent_coming_soon_title') ||
                'Coming Soon — Future Work'}
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
              {t('auto.whatsapp_agent_coming_soon_desc') ||
                "The WhatsApp AI Agent is currently in active development and is NOT ready for production use. The feature below is a preview of what's being built."}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border/50 rounded-2xl p-6 bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <MessageCircle className="size-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t('auto.whatsapp_agent') || 'WhatsApp AI Agent'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('auto.whatsapp_agent_status') ||
                'Status: Alpha — In Development'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <FeatureCard
            icon={FlaskConical}
            title={t('auto.whatsapp_agent_ai') || 'AI-Powered Sales'}
            description={
              t('auto.whatsapp_agent_ai_desc') ||
              'Claude-powered agent handles product discovery, orders, and payments via WhatsApp'
            }
          />
          <FeatureCard
            icon={MessageCircle}
            title={t('auto.whatsapp_agent_multi') || 'Multi-Language'}
            description={
              t('auto.whatsapp_agent_multi_desc') ||
              'Auto-detects and replies in Hindi, English, Tamil, Telugu, Bengali'
            }
          />
          <FeatureCard
            icon={ExternalLink}
            title={t('auto.whatsapp_agent_upi') || 'UPI Payments'}
            description={
              t('auto.whatsapp_agent_upi_desc') ||
              'Generates UPI payment links after order confirmation'
            }
          />
          <FeatureCard
            icon={MessageCircle}
            title={t('auto.whatsapp_agent_memory') || 'Conversation Memory'}
            description={
              t('auto.whatsapp_agent_memory_desc') ||
              'Remembers context across messages for smooth conversations'
            }
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-xl">
          <p className="text-sm font-medium text-foreground mb-2">
            {t('auto.whatsapp_agent_store') || 'Your Store'}:
          </p>
          <p className="text-sm text-muted-foreground">
            {seller?.store_name || '—'} —{' '}
            {t('auto.whatsapp_agent_slug') || 'Slug'}:{' '}
            {seller?.store_slug || '—'}
          </p>
          <div className="mt-4 flex gap-3">
            <Button size="sm" disabled className="opacity-60">
              {t('auto.whatsapp_agent_activate') || 'Activate Agent'}
            </Button>
            <Button size="sm" variant="outline" disabled className="opacity-60">
              {t('auto.whatsapp_agent_preview') || 'Preview'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            {t('auto.whatsapp_agent_disabled') ||
              'Buttons disabled — agent is in development and not ready for production.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border/50 rounded-xl p-4 bg-card hover:shadow-sm transition-shadow">
      <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
        <Icon className="size-4 text-purple-500" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
