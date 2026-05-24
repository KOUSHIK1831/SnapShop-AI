import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, CheckCircle2, XCircle, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/i18n/LanguageContext';
import { compressImage } from '@/lib/utils';
import ReviewCard from './ReviewCard';

interface AIProduct {
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  size?: string;
  discount_percent?: number;
  digitization_failed?: boolean;
}

interface PendingReview {
  product: AIProduct;
  imageUrl: string;
  fileId: string;
}

interface UploadZoneProps {
  sellerId: string;
  onComplete: () => void;
  usageToday: number;
  dailyLimit: number;
}

type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'review' | 'complete' | 'error';

interface UploadState {
  step: ProcessingStep;
  dragOver: boolean;
  fileCount: number;
  processedCount: number;
  currentFileName: string;
  overridePrice: string;
  pendingReviews: PendingReview[];
  approvedCount: number;
}

type UploadAction = 
  | { type: 'SET_STEP'; payload: ProcessingStep }
  | { type: 'SET_DRAG_OVER'; payload: boolean }
  | { type: 'START_UPLOAD'; payload: number }
  | { type: 'UPDATE_PROGRESS'; payload: { processed: number, currentFile: string } }
  | { type: 'SET_REVIEWS'; payload: PendingReview[] }
  | { type: 'APPROVE_REVIEW'; payload: string }
  | { type: 'REJECT_REVIEW'; payload: string }
  | { type: 'SET_OVERRIDE_PRICE'; payload: string }
  | { type: 'RESET' };

const initialUploadState: UploadState = {
  step: 'idle',
  dragOver: false,
  fileCount: 0,
  processedCount: 0,
  currentFileName: '',
  overridePrice: '',
  pendingReviews: [],
  approvedCount: 0,
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.payload };
    case 'SET_DRAG_OVER': return { ...state, dragOver: action.payload };
    case 'START_UPLOAD': return { ...state, step: 'uploading', fileCount: action.payload, processedCount: 0, pendingReviews: [], approvedCount: 0 };
    case 'UPDATE_PROGRESS': return { ...state, processedCount: action.payload.processed, currentFileName: action.payload.currentFile };
    case 'SET_REVIEWS': return { ...state, step: 'review', pendingReviews: action.payload };
    case 'APPROVE_REVIEW': return { ...state, approvedCount: state.approvedCount + 1, pendingReviews: state.pendingReviews.filter(r => r.fileId !== action.payload) };
    case 'REJECT_REVIEW': return { ...state, pendingReviews: state.pendingReviews.filter(r => r.fileId !== action.payload) };
    case 'SET_OVERRIDE_PRICE': return { ...state, overridePrice: action.payload };
    case 'RESET': return { ...initialUploadState, overridePrice: state.overridePrice };
    default: return state;
  }
}

export default function UploadZone({ sellerId, onComplete, usageToday, dailyLimit }: UploadZoneProps) {
  const [state, dispatch] = useReducer(uploadReducer, initialUploadState);
  const { step, dragOver, fileCount, processedCount, currentFileName, overridePrice, pendingReviews, approvedCount } = state;
  const { toast } = useToast();
  const { t } = useLanguage();

  const remaining = Math.max(0, dailyLimit - usageToday);

  const handleApproveReview = useCallback(async (product: AIProduct, imageUrl: string, fileId: string) => {
    const { error } = await supabase.from('products').insert({
      seller_id: sellerId,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      tags: product.tags || [],
      image_url: imageUrl,
      size: product.size || null,
      discount_percent: product.discount_percent || 0,
    });
    if (error) {
      toast({ title: 'Error', description: `Failed to save product: ${error.message}`, variant: 'destructive' });
    } else {
      dispatch({ type: 'APPROVE_REVIEW', payload: fileId });
      if (pendingReviews.length === 1) {
        dispatch({ type: 'SET_STEP', payload: 'complete' });
        onComplete();
        toast({ title: 'Digitization complete', description: `${approvedCount + 1} files processed.` });
      }

    }
  }, [sellerId, toast, pendingReviews.length, onComplete, approvedCount]);


  const handleRejectReview = useCallback((fileId: string) => {
    supabase.from('files').update({ status: 'rejected' }).eq('id', fileId);
    dispatch({ type: 'REJECT_REVIEW', payload: fileId });
    if (pendingReviews.length === 1 && approvedCount > 0) {
      dispatch({ type: 'SET_STEP', payload: 'complete' });
      onComplete();
    }
  }, [pendingReviews.length, approvedCount, onComplete]);

  // Remove the problematic useEffect

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (files.length > remaining) {
      toast({ 
        title: 'Limit reached', 
        description: `You only have ${remaining} AI digitization credits left for today. Please upload fewer files or contact admin.`, 
        variant: 'destructive' 
      });
      return;
    }

    // File size check
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${file.name} is larger than 5MB`, variant: 'destructive' });
        return;
      }
    }

    dispatch({ type: 'START_UPLOAD', payload: files.length });


    try {
      const uploadedFiles = await Promise.all(files.map(async (file) => {
        let fileToUpload: File | Blob = file;
        if (file.type.startsWith('image/') && file.size > 150 * 1024) {
          try { fileToUpload = await compressImage(file); } catch (e) { console.error(e); }
        }
        const ext = file.name.split('.').pop();
        const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(path, fileToUpload);
        if (uploadError) return null;
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
        const { data: fileRecord, error: insertError } = await supabase.from('files').insert({ seller_id: sellerId, file_url: urlData.publicUrl, file_type: file.type, status: 'pending' }).select().single();
        if (insertError) return null;
        return { fileUrl: urlData.publicUrl, fileId: fileRecord.id, fileName: file.name };
      }));

      const validUploads = uploadedFiles.filter((f): f is any => f !== null);
      if (validUploads.length === 0) { dispatch({ type: 'SET_STEP', payload: 'error' }); return; }

      dispatch({ type: 'SET_STEP', payload: 'processing' });
      const priceOverride = overridePrice ? parseFloat(overridePrice) : null;
      const reviews = await Promise.all(validUploads.map(async (fileInfo, i) => {

        try {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { processed: i, currentFile: fileInfo.fileName } });
          const { data, error: invokeError } = await supabase.functions.invoke('digitize', { body: { imageUrl: fileInfo.fileUrl, sellerId } });
          
          if (invokeError) {
            console.error('Edge Function Error:', invokeError);
            if (invokeError.message?.includes('limit-exceeded') || String(invokeError).includes('limit-exceeded')) {
              toast({ title: 'Limit Reached', description: 'Your daily AI digitization limit has been reached.', variant: 'destructive' });
              dispatch({ type: 'SET_STEP', payload: 'error' });
              return null;
            }
          }

          if (invokeError || !data?.product) {
            console.warn('AI Digitization failed for:', fileInfo.fileName, invokeError);
            return {
              product: {
                title: fileInfo.fileName.split('.')[0],
                description: '',
                price: priceOverride ?? 0,
                category: 'Uncategorized',
                tags: [],
                digitization_failed: true,
              },
              imageUrl: fileInfo.fileUrl,
              fileId: fileInfo.fileId,
            };
          }

          return {
            product: { ...data.product, price: priceOverride ?? data.product.price ?? 0 },
            imageUrl: fileInfo.fileUrl,
            fileId: fileInfo.fileId,
          };
        } catch (err) { 
          console.error('Digitization error:', err);
          return {
            product: {
              title: fileInfo.fileName.split('.')[0],
              description: '',
              price: priceOverride ?? 0,
              category: 'Uncategorized',
              tags: [],
              digitization_failed: true,
            },
            imageUrl: fileInfo.fileUrl,
            fileId: fileInfo.fileId,
          };
        }
      }));

      const validReviews = reviews.filter((r): r is PendingReview => r !== null);

      if (validReviews.length === 0) dispatch({ type: 'SET_STEP', payload: 'error' });
      else dispatch({ type: 'SET_REVIEWS', payload: validReviews });
    } catch (err) { dispatch({ type: 'SET_STEP', payload: 'error' }); }
  }, [sellerId, overridePrice]);

  if (step === 'complete') return <UploadComplete onReset={() => dispatch({ type: 'RESET' })} fileCount={fileCount} t={t} />;
  if (step === 'uploading' || step === 'processing') return <UploadProcessing step={step} currentFile={currentFileName} processed={processedCount} total={fileCount} t={t} />;
  if (step === 'review') return <UploadReview reviews={pendingReviews} approvedCount={approvedCount} onApprove={handleApproveReview} onReject={handleRejectReview} />;
  if (step === 'error') return <UploadError onRetry={() => dispatch({ type: 'SET_STEP', payload: 'idle' })} />;

  return (
    <div className="space-y-4">
      <UsageIndicator used={usageToday} limit={dailyLimit} />
      <PriceOverride value={overridePrice} onChange={(v) => dispatch({ type: 'SET_OVERRIDE_PRICE', payload: v })} t={t} />
      <DropZone 
        dragOver={dragOver} 
        onDragOver={(v) => dispatch({ type: 'SET_DRAG_OVER', payload: v })} 
        onFiles={processFiles} 
        t={t} 
        disabled={remaining <= 0}
      />
    </div>
  );
}

function UsageIndicator({ used, limit }: { used: number, limit: number }) {
  const percent = Math.min(100, (used / limit) * 100);
  const remaining = Math.max(0, limit - used);
  
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-surface animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <CheckCircle2 className={`size-4 ${remaining > 0 ? 'text-primary' : 'text-destructive'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Digitization Credits</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Daily Allowance</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground tabular-nums">{remaining} / {limit}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Credits Left Today</p>
        </div>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${percent > 90 ? 'bg-destructive' : percent > 70 ? 'bg-amber-500' : 'bg-primary'}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

function UploadComplete({ onReset, fileCount, t }: any) {
  return (
    <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center bg-card shadow-surface animate-fade-in">
      <div className="size-14 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="size-7 text-green-600" /></div>
      <h3 className="font-semibold text-foreground mb-1">{t('upload.complete')}</h3>

      <p className="text-sm text-muted-foreground mb-6">{fileCount} files processed successfully</p>
      <Button variant="outline" onClick={onReset} className="border-border/50">Upload More</Button>
    </div>
  );
}

function UploadProcessing({ step, currentFile, processed, total, t }: any) {
  return (
    <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center bg-card shadow-surface">
      <Loader2 className="size-8 text-primary animate-spin mb-4" />
      <h3 className="font-semibold text-foreground mb-1">{step === 'uploading' ? t('upload.processing') : 'AI is digitizing your catalog...'}</h3>
      <p className="text-sm text-muted-foreground mb-1">{currentFile}</p>
      <p className="text-xs text-muted-foreground">{processed + 1} / {total} files</p>
      <div className="mt-4 w-full max-w-xs bg-secondary rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-brand rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (processed / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function UploadReview({ reviews, approvedCount, onApprove, onReject }: any) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Review Products</h3>
        <p className="text-sm text-muted-foreground">{reviews.length} pending · {approvedCount} approved</p>
      </div>
      <p className="text-sm text-muted-foreground">Review the AI-extracted product details. Approve to publish, edit to correct, or reject to discard.</p>
      <div className="space-y-4">
        {reviews.map((review: any) => (
          <ReviewCard key={review.fileId} product={review.product} imageUrl={review.imageUrl} index={0} onApprove={(p: any) => onApprove(p, review.imageUrl, review.fileId)} onReject={() => onReject(review.fileId)} />
        ))}
      </div>
    </div>
  );
}

function UploadError({ onRetry }: any) {
  return (
    <div className="border border-destructive/30 rounded-xl p-12 flex flex-col items-center bg-card shadow-surface animate-fade-in">
      <XCircle className="size-8 text-destructive mb-4" /><h3 className="font-semibold text-foreground mb-1">Processing Failed</h3>
      <p className="text-sm text-muted-foreground mb-6">Some files could not be processed</p>
      <Button variant="outline" onClick={onRetry} className="border-border/50">Try Again</Button>
    </div>
  );
}

function PriceOverride({ value, onChange, t }: any) {
  return (
    <div className="border border-border/50 rounded-xl p-5 bg-card shadow-surface">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-8 bg-amber-500/10 rounded-lg flex items-center justify-center"><IndianRupee className="size-4 text-amber-500" /></div>
        <div><h3 className="text-sm font-semibold text-foreground">{t('upload.price')}</h3><p className="text-xs text-muted-foreground">Optional: override AI-estimated price for all uploads in this batch</p></div>
      </div>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. 999 (leave empty for AI estimate)" className="max-w-xs" min="0" step="1" />
    </div>
  );
}

function DropZone({ dragOver, onDragOver, onFiles, t, disabled }: any) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) onDragOver(true); }}
      onDragLeave={() => onDragOver(false)}
      onDrop={(e) => { e.preventDefault(); onDragOver(false); if (e.dataTransfer.files && !disabled) onFiles(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center bg-card shadow-surface transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed border-border/50 bg-muted/30' : 'cursor-pointer'} ${ dragOver && !disabled ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/50 hover:border-border' }`}
    >
      <div className={`size-14 rounded-full flex items-center justify-center mb-4 ${disabled ? 'bg-muted' : 'bg-primary/10'}`}>
        <Upload className={`size-6 ${disabled ? 'text-muted-foreground' : 'text-primary'}`} />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{disabled ? 'Daily Limit Reached' : t('upload.dragDrop')}</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
        {disabled ? 'Please come back tomorrow or contact support to increase your limit.' : t('upload.supported').replace('—', ':')}
      </p>
      <label htmlFor="file-upload" className={disabled ? 'pointer-events-none' : 'cursor-pointer'}>
        <input id="file-upload" type="file" multiple accept="image/*" onChange={(e) => { if (e.target.files && !disabled) onFiles(e.target.files); }} className="hidden" />
        <div className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${disabled ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 bg-gradient-brand hover:opacity-90 transition-opacity'}`}>
          {disabled ? 'Blocked' : t('upload.orClick')}
        </div>
      </label>
    </div>
  );
}
