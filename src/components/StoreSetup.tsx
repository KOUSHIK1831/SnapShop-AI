import { useTranslation } from 'react-i18next';
import { useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'@/components/ui/card';
import {
  Store,
  ArrowRight,
  Upload,
  FileText,
  Check,
  Loader2,
  AlertCircle } from
'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface StoreSetupProps {
  onComplete: (data: {
    store_name: string;
    store_slug: string;
    location: string;
    full_name: string;
    store_description: string;
    contact_number: string;
    store_number: string;
    gstin: string;
    registered_business_name: string;
    verification_documents: string[];
  }) => void;
}

type State = {
  storeName: string;
  location: string;
  fullName: string;
  storeDescription: string;
  contactNumber: string;
  storeNumber: string;
  gstin: string;
  registeredBusinessName: string;
};

type Action = {type: 'SET_FIELD';field: keyof State;value: string;};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}

export default function StoreSetup({ onComplete }: StoreSetupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(reducer, {
    storeName: '',
    location: '',
    fullName: '',
    storeDescription: '',
    contactNumber: '',
    storeNumber: '',
    gstin: '',
    registeredBusinessName: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();

  const slug = `${state.storeName} ${state.location}`.
  toLowerCase().
  replace(/[^a-z0-9]+/g, '-').
  replace(/(^-|-$)/g, '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast({
        title: 'Error',
        description: 'Please upload at least one verification document.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    const documentUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.
        from('seller-proofs').
        upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl }
        } = supabase.storage.from('seller-proofs').getPublicUrl(fileName);

        documentUrls.push(publicUrl);
      }

      onComplete({
        store_name: state.storeName,
        store_slug: slug,
        location: state.location,
        full_name: state.fullName,
        store_description: state.storeDescription,
        contact_number: state.contactNumber,
        store_number: state.storeNumber,
        gstin: state.gstin,
        registered_business_name: state.registeredBusinessName,
        verification_documents: documentUrls
      });
    } catch (error) {
      toast({
        title: t('auto.upload_failed'),
        description:
          error instanceof Error
            ? error.message
            : t('auto.error_uploading_documents'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleChange =
  (field: keyof State) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    if (field === 'contactNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    dispatch({ type: 'SET_FIELD', field, value });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center animate-fade-in py-10">
      <Card className="w-full max-w-lg shadow-surface-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto size-12 bg-gradient-brand rounded-xl flex items-center justify-center mb-4">
            <Store className="size-6 text-white" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t('setup.title')}
          </CardTitle>
          <CardDescription>{t('setup.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                <Store className="size-4" />
                {t('settings.storeInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="text-sm font-medium text-foreground">
                    
                    {t('setup.yourName')}
                  </label>
                  <Input
                    id="fullName"
                    value={state.fullName}
                    onChange={handleChange('fullName')}
                    placeholder={t('auto.ravi_kumar')}
                    required />
                  
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="contactNumber"
                    className="text-sm font-medium text-foreground">
                    
                    {t('setup.contactNumber')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                      +91
                    </div>
                    <Input
                      id="contactNumber"
                      value={state.contactNumber}
                      onChange={handleChange('contactNumber')}
                      placeholder={t('auto.9876543210')}
                      type="tel"
                      className="pl-10" />
                    
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="storeName"
                  className="text-sm font-medium text-foreground">
                  
                  {t('setup.storeName')}
                </label>
                <Input
                  id="storeName"
                  value={state.storeName}
                  onChange={handleChange('storeName')}
                  placeholder={t('auto.ravi_s_boutique')}
                  required />
                
                {slug &&
                <p className="text-xs text-muted-foreground">
                    {t('setup.storeUrl')}{' '}
                    <span className="font-medium text-primary">
                      {t('auto.apnabazar_store')}
                      {slug}
                    </span>
                  </p>
                }
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="storeDescription"
                  className="text-sm font-medium text-foreground">
                  
                  {t('setup.storeDescription')}
                </label>
                <textarea
                  id="storeDescription"
                  value={state.storeDescription}
                  onChange={handleChange('storeDescription')}
                  placeholder={t('setup.storeDescPlaceholder')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
                
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="location"
                    className="text-sm font-medium text-foreground">
                    
                    {t('setup.location')}
                  </label>
                  <Input
                    id="location"
                    value={state.location}
                    onChange={handleChange('location')}
                    placeholder={t('auto.mumbai_india')}
                    required />
                  
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="storeNumber"
                    className="text-sm font-medium text-foreground">
                    
                    {t('setup.shopNumber')}
                  </label>
                  <Input
                    id="storeNumber"
                    value={state.storeNumber}
                    onChange={handleChange('storeNumber')}
                    placeholder={t('auto.shop_12')} />
                  
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                <FileText className="size-4" />
                {t('auto.business_verification')}
              </h3>
              <p className="text-[10px] text-muted-foreground italic -mt-2">
                {t('auto.this_information_is_private_an')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="gstin"
                    className="text-sm font-medium text-foreground">
                    
                    {t('auto.gstin_optional')}
                  </label>
                  <Input
                    id="gstin"
                    value={state.gstin}
                    onChange={handleChange('gstin')}
                    placeholder={t('auto.22aaaaa0000a1z5')} />
                  
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="registeredBusinessName"
                    className="text-sm font-medium text-foreground">
                    
                    {t('auto.legal_business_name')}
                  </label>
                  <Input
                    id="registeredBusinessName"
                    value={state.registeredBusinessName}
                    onChange={handleChange('registeredBusinessName')}
                    placeholder={t('auto.ravi_retail_pvt_ltd')}
                    required />
                  
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="verification-docs"
                  className="text-sm font-medium text-foreground">
                  
                  {t('auto.verification_documents_shop_ph')}
                </label>
                <div className="relative">
                  <input
                    id="verification-docs"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.jpg,.jpeg,.png" />
                  

                  <div className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      {t('auto.click_or_drag_to_upload')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('auto.upload_id_proof_gst_certificat')}
                    </p>
                  </div>
                </div>
                {files.length > 0 &&
                <div className="mt-3 space-y-2">
                    {files.map((file, i) =>
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10 text-xs">
                    
                        <FileText className="size-3.5 text-primary" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <Check className="size-3.5 text-green-500" />
                      </div>
                  )}
                  </div>
                }
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 flex gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>{t('auto.verification_policy')}</strong>
                {t('auto.your_store_will_be_submitted_f')}
              </p>
            </div>

            <Button
              type="submit"
              disabled={uploading}
              className="w-full h-11 bg-gradient-brand hover:opacity-90 transition-opacity">
              
              {uploading ?
              <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {t('auto.uploading')}
                </> :

              <>
                  {t('setup.createStore')}{' '}
                  <ArrowRight className="size-4 ml-2" />
                </>
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>);

}