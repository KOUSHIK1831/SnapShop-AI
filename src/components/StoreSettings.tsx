import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Seller } from '@/hooks/useSeller';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  MapPin,
  Phone,
  Hash,
  Store,
  FileText,
  Loader2,
  Image as ImageIcon } from
'lucide-react';

const THEME_COLORS = [
'#8B5CF6',
'#3B82F6',
'#10B981',
'#F59E0B',
'#EF4444',
'#EC4899',
'#6366F1',
'#14B8A6',
'#84CC16',
'#F97316',
'#06B6D4',
'#A855F7'];


interface StoreSettingsProps {
  seller: Seller;
  onUpdate: (
  updates: Partial<Seller>)
  => Promise<{error: unknown;} | undefined>;
}

export default function StoreSettings({
  seller,
  onUpdate
}: StoreSettingsProps) {
  const [formData, setFormData] = useState({
    storeName: seller.store_name || '',
    storeDescription: seller.store_description || '',
    location: seller.location || '',
    contactNumber: seller.contact_number || seller.phone || '',
    storeNumber: seller.store_number || '',
    mapsUrl: seller.maps_url || '',
    bannerUrl: seller.banner_url || '',
    themeColor: seller.theme_color || '#8B5CF6',
    gstin: seller.gstin || '',
    registeredBusinessName: seller.registered_business_name || ''
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `banners/${seller.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.
      from('uploads').
      upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.
      from('uploads').
      getPublicUrl(path);
      setFormData((prev) => ({ ...prev, bannerUrl: urlData.publicUrl }));
      toast({ title: 'Banner uploaded' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: String(err),
        variant: 'destructive'
      });
    }
    setUploadingBanner(false);
  };

  const generatedSlug = `${formData.storeName} ${formData.location}`.
  toLowerCase().
  replace(/[^a-z0-9]+/g, '-').
  replace(/(^-|-$)/g, '');

  const handleSave = async () => {
    setSaving(true);
    const result = await onUpdate({
      store_name: formData.storeName,
      store_slug: generatedSlug,
      store_description: formData.storeDescription,
      location: formData.location,
      contact_number: formData.contactNumber,
      store_number: formData.storeNumber,
      maps_url: formData.mapsUrl,
      banner_url: formData.bannerUrl,
      theme_color: formData.themeColor,
      gstin: formData.gstin,
      registered_business_name: formData.registeredBusinessName
    });
    setSaving(false);
    if (result?.error) {
      toast({
        title: t('common.error'),
        description: t('settings.saveError'),
        variant: 'destructive'
      });
    } else {
      toast({
        title: t('common.saved'),
        description: t('settings.saveSuccess')
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Store Info */}
      <Card className="shadow-surface border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Store className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t('settings.storeInfo')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('settings.storeInfoDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="storeName"
              className="text-sm font-medium text-foreground">
              
              {t('settings.storeName')}
            </label>
            <Input
              id="storeName"
              value={formData.storeName}
              onChange={(e) =>
              setFormData((prev) => ({ ...prev, storeName: e.target.value }))
              }
              placeholder={t('auto.my_boutique')} />
            
          </div>
          <div className="space-y-2">
            <label
              htmlFor="storeDescription"
              className="text-sm font-medium text-foreground">
              
              {t('settings.storeDescription')}
            </label>
            <textarea
              id="storeDescription"
              value={formData.storeDescription}
              onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                storeDescription: e.target.value
              }))
              }
              placeholder={t('settings.storeDescPlaceholder')}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
            
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('settings.storeUrlLabel')}
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">
                {t('auto.apnabazar_store')}
              </span>
              <span className="text-sm font-medium text-foreground">
                {generatedSlug || seller.store_slug}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.shareLink')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location & Maps */}
      <Card className="shadow-surface border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <MapPin className="size-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t('settings.locationMaps')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('settings.locationMapsDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="location"
              className="text-sm font-medium text-foreground">
              
              {t('settings.storeAddress')}
            </label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder={t('auto.123_main_street_mumbai_india')} />
            
          </div>
          <div className="space-y-2">
            <label
              htmlFor="mapsUrl"
              className="text-sm font-medium text-foreground">
              
              {t('settings.mapsUrl')}
            </label>
            <Input
              id="mapsUrl"
              value={formData.mapsUrl}
              onChange={(e) => {
                let val = e.target.value;
                if (val.includes('<iframe') && val.includes('src="')) {
                  const match = val.match(/src="([^"]+)"/);
                  if (match && match[1]) {
                    val = match[1];
                  }
                }
                setFormData((prev) => ({ ...prev, mapsUrl: val }));
              }}
              placeholder={t('auto.https_www_google_com_maps_embe')} />
            

            <p className="text-xs text-muted-foreground">
              {t('settings.mapsHelp')}
            </p>
            {formData.mapsUrl &&
            !formData.mapsUrl.includes('google.com/maps/embed') &&
            <p className="text-xs text-destructive mt-1">
                  {t('settings.mapsWarning')}
                </p>
            }
          </div>
          {formData.mapsUrl &&
          <div className="rounded-lg overflow-hidden border border-border">
              <iframe
              src={formData.mapsUrl}
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={t('auto.store_location')} />
            
            </div>
          }
        </CardContent>
      </Card>

      {/* Banner & Theme */}
      <Card className="shadow-surface border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="size-4 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t('auto.store_banner_theme')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('auto.customize_your_public_storefro')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="banner-upload"
              className="text-sm font-medium text-foreground">
              
              {t('auto.banner_image')}
            </label>
            {formData.bannerUrl &&
            <div className="relative rounded-lg overflow-hidden border border-border mb-3">
                <img
                src={formData.bannerUrl}
                alt={t('auto.store_banner')}
                className="w-full h-32 object-cover" />
              
                <button
                onClick={() =>
                setFormData((prev) => ({ ...prev, bannerUrl: '' }))
                }
                className="absolute top-2 right-2 size-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70">
                
                  {t('auto.x')}
                </button>
              </div>
            }
            <label
              htmlFor="banner-upload"
              className="flex items-center gap-2 cursor-pointer">
              
              <div className="flex items-center gap-2 px-4 py-2 border border-border/50 rounded-lg text-sm hover:bg-muted/50 transition-colors">
                {uploadingBanner ?
                <Loader2 className="size-4 animate-spin" /> :

                <ImageIcon className="size-4" />
                }
                {uploadingBanner ?
                t('auto.uploading') :
                formData.bannerUrl ?
                t('auto.change_banner') :
                t('auto.upload_banner')}
              </div>
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden" />
              
            </label>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="theme-color-input"
              className="text-sm font-medium text-foreground">
              
              {t('auto.theme_color')}
            </label>
            <div className="flex flex-wrap gap-2">
              {' '}
              {THEME_COLORS.map((color) =>
              <button
                key={color}
                onClick={() =>
                setFormData((prev) => ({ ...prev, themeColor: color }))
                }
                className={`size-8 rounded-full transition-all duration-200 ${formData.themeColor === color ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`}
                style={{ backgroundColor: color }}
                title={color} />

              )}{' '}
            </div>{' '}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {t('auto.custom')}
              </span>
              <input
                id="theme-color-input"
                type="color"
                value={formData.themeColor}
                onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  themeColor: e.target.value
                }))
                }
                className="size-8 rounded cursor-pointer border border-border" />
              

              <span className="text-xs font-mono text-muted-foreground">
                {formData.themeColor}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card className="shadow-surface border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Phone className="size-4 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t('settings.contactDetails')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('settings.contactDetailsDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="contactNumber"
                className="text-sm font-medium text-foreground flex items-center gap-1.5">
                
                <Phone className="size-3.5" /> {t('settings.contactNumber')}
              </label>
              <Input
                id="contactNumber"
                value={formData.contactNumber}
                onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  contactNumber: e.target.value
                }))
                }
                placeholder={t('auto.91_9876543210')}
                type="tel" />
              
            </div>
            <div className="space-y-2">
              <label
                htmlFor="storeNumber"
                className="text-sm font-medium text-foreground flex items-center gap-1.5">
                
                <Hash className="size-3.5" /> {t('settings.shopNumber')}
              </label>
              <Input
                id="storeNumber"
                value={formData.storeNumber}
                onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  storeNumber: e.target.value
                }))
                }
                placeholder={t('auto.shop_12_block_a')} />
              
            </div>
            <div className="space-y-2">
              <label
                htmlFor="gstin"
                className="text-sm font-medium text-foreground flex items-center gap-1.5">
                
                <Hash className="size-3.5" />
                {t('auto.gstin_384')}
              </label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) =>
                setFormData((prev) => ({ ...prev, gstin: e.target.value }))
                }
                placeholder={t('auto.22aaaaa0000a1z5')}
                disabled={seller.verification_status === 'approved'} />
              
            </div>
            <div className="space-y-2">
              <label
                htmlFor="registeredBusinessName"
                className="text-sm font-medium text-foreground flex items-center gap-1.5">
                
                <FileText className="size-3.5" />
                {t('auto.legal_business_name')}
              </label>
              <Input
                id="registeredBusinessName"
                value={formData.registeredBusinessName}
                onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  registeredBusinessName: e.target.value
                }))
                }
                placeholder={t('auto.ravi_retail_pvt_ltd')}
                disabled={seller.verification_status === 'approved'} />
              
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ?
          <>
              <Loader2 className="size-4 mr-2 animate-spin" />{' '}
              {t('common.saving')}
            </> :

          <>
              <Save className="size-4 mr-2" /> {t('common.save')}
            </>
          }
        </Button>
      </div>
    </div>);

}