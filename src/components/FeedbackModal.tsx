import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useReducer } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSeller } from '@/hooks/useSeller';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquarePlus,
  Bug,
  History,
  MessageSquare,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface FeedbackItem {
  id: string;
  content: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

type FeedbackState = {
  content: string;
  isSubmitting: boolean;
  isOpen: boolean;
  myFeedback: FeedbackItem[];
  loadingHistory: boolean;
};

type FeedbackAction =
  | { type: 'SET_CONTENT'; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_OPEN'; value: boolean }
  | { type: 'SET_HISTORY'; value: FeedbackItem[] }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'RESET' };

function feedbackReducer(
  state: FeedbackState,
  action: FeedbackAction,
): FeedbackState {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.value };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };
    case 'SET_OPEN':
      return { ...state, isOpen: action.value };
    case 'SET_HISTORY':
      return { ...state, myFeedback: action.value };
    case 'SET_LOADING':
      return { ...state, loadingHistory: action.value };
    case 'RESET':
      return { ...state, content: '', isSubmitting: false };
    default:
      return state;
  }
}

interface FeedbackModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function FeedbackModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: FeedbackModalProps = {}) {
  const { user } = useAuth();
  const { seller } = useSeller();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(feedbackReducer, {
    content: '',
    isSubmitting: false,
    isOpen: false,
    myFeedback: [],
    loadingHistory: false,
  });

  const isOpen = externalOpen !== undefined ? externalOpen : state.isOpen;
  const handleOpenChange = (open: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(open);
    else dispatch({ type: 'SET_OPEN', value: open });
  };

  useEffect(() => {
    let channel: any = null;
    if (isOpen && user) {
      const fetchMyFeedback = async () => {
        dispatch({ type: 'SET_LOADING', value: true });
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (!error) {
          dispatch({ type: 'SET_HISTORY', value: data || [] });
        }
        dispatch({ type: 'SET_LOADING', value: false });
      };

      fetchMyFeedback();

      channel = supabase
        .channel('my-feedback-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchMyFeedback();
          },
        )
        .subscribe();
    }
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [state.isOpen, user]);

  const handleSubmit = async () => {
    if (!state.content.trim()) return;

    dispatch({ type: 'SET_SUBMITTING', value: true });
    try {
      const feedbackData: {
        user_id: string | undefined;
        content: string;
        status: string;
        seller_id?: string;
      } = {
        user_id: user?.id,
        content: state.content.trim(),
        status: 'open',
      };

      // Include seller_id if the user is a seller
      if (seller?.id) {
        feedbackData.seller_id = seller.id;
      }

      const { error } = await supabase.from('feedback').insert(feedbackData);

      if (error) {
        console.error('Feedback: Insert error:', error);
        throw error;
      }

      toast({
        title: t('feedback.success'),
        variant: 'default',
      });
      dispatch({ type: 'RESET' });
    } catch (err: unknown) {
      console.error('Feedback: Detailed error:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : t('auto.could_not_submit_feedback_plea');
      toast({
        title: t('feedback.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  };

  const { content, isSubmitting, myFeedback, loadingHistory } = state;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary gap-2"
            title={t('feedback.title')}
            id="tour-feedback"
          >
            <Bug className="size-4" />
            <span className="hidden sm:inline text-xs font-medium">
              {t('admin.feedback')}
            </span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <Tabs defaultValue={t('auto.send')} className="size-full flex flex-col">
          <div className="p-6 pb-2">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquarePlus className="size-5 text-primary" />
                {t('feedback.title')}
              </DialogTitle>
              <DialogDescription>{t('feedback.placeholder')}</DialogDescription>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
              <TabsTrigger value={t('auto.send')} className="text-xs">
                <MessageSquare className="size-3.5 mr-2" /> {t('feedback.send')}
              </TabsTrigger>
              <TabsTrigger value={t('auto.history')} className="text-xs">
                <History className="size-3.5 mr-2" /> {t('feedback.history')} (
                {myFeedback.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value={t('auto.send')}
            className="flex-1 flex flex-col p-6 pt-2"
          >
            <div className="flex-1 py-4">
              <Textarea
                value={content}
                onChange={e =>
                  dispatch({ type: 'SET_CONTENT', value: e.target.value })
                }
                placeholder={t('feedback.placeholder')}
                className="h-full min-h-[250px] resize-none border-border/50 focus-visible:ring-primary/20 bg-background text-foreground"
              />
            </div>
            <DialogFooter className="pt-4 border-t border-border/10">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="w-full"
              >
                {isSubmitting ? t('common.saving') : t('feedback.submit')}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value={t('auto.history')}
            className="flex-1 overflow-y-auto p-6 pt-2 space-y-4"
          >
            {loadingHistory && myFeedback.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground">
                  {t('feedback.loadingHistory')}
                </p>
              </div>
            ) : myFeedback.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed border-border/50">
                <History className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('feedback.noFeedback')}
                </p>
              </div>
            ) : (
              myFeedback.map(item => (
                <FeedbackCard key={item.id} item={item} t={t} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackCard({ item, t }: { item: any; t: any }) {
  const [formattedDate, setFormattedDate] = React.useState('');

  React.useEffect(() => {
    setFormattedDate(new Date(item.created_at).toLocaleDateString());
  }, [item.created_at]);

  return (
    <Card className="p-4 border-border/50 shadow-surface space-y-3 bg-card text-card-foreground">
      <div className="flex items-center justify-between">
        <Badge
          variant={
            item.status === 'open'
              ? t('auto.destructive')
              : item.status === 'resolved'
                ? t('auto.default')
                : t('auto.secondary')
          }
          className="text-[10px] uppercase"
        >
          {item.status.replace('_', ' ')}
        </Badge>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" /> <span>{formattedDate}</span>
        </span>
      </div>
      <p className="text-sm text-foreground italic leading-relaxed">
        "{item.content}"
      </p>

      {item.admin_response && (
        <div className="mt-3 pt-3 border-t border-border/30 bg-primary/5 -mx-4 -mb-4 p-4">
          <p className="text-[10px] font-bold text-primary flex items-center gap-1 mb-1 uppercase tracking-wider">
            <ShieldCheck className="size-3" /> {t('feedback.adminResponse')}
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {item.admin_response}
          </p>
        </div>
      )}
    </Card>
  );
}
