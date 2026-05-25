import { useTranslation } from 'react-i18next';
import React, { useState, useCallback } from 'react';
import { Product, SizeVariant } from '@/hooks/useSeller';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Loader2,
  Search,
  IndianRupee,
  Package,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';

interface InventoryEditorProps {
  products: Product[];
  onUpdate: (id: string, updates: Partial<Product>) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
}

export default function InventoryEditor({
  products,
  onUpdate,
  onDelete,
}: InventoryEditorProps) {
  const { t } = useTranslation();
  const [edits, setEdits] = useState<
    Record<string, { stock: string; size_variants: SizeVariant[] }>
  >({});
  const [expanding, setExpanding] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const filtered = products.filter(
    p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()),
  );

  const getEdit = (product: Product) => {
    return (
      edits[product.id] || {
        stock: String(product.stock ?? 0),
        size_variants: product.size_variants ? [...product.size_variants] : [],
      }
    );
  };

  const setField = (id: string, field: 'stock', value: string) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || getEdit(products.find(p => p.id === id)!)),
        [field]: value,
      },
    }));
  };

  const setSizeVariantField = (
    id: string,
    index: number,
    field: 'size' | 'stock',
    value: string,
  ) => {
    const edit = { ...getEdit(products.find(p => p.id === id)!) };
    const variants = [...edit.size_variants];
    if (field === 'size') {
      variants[index] = { ...variants[index], size: value };
    } else {
      variants[index] = { ...variants[index], stock: parseInt(value) || 0 };
    }
    edit.size_variants = variants;
    setEdits(prev => ({ ...prev, [id]: edit }));
  };

  const addSizeVariant = (id: string) => {
    const edit = { ...getEdit(products.find(p => p.id === id)!) };
    edit.size_variants = [...edit.size_variants, { size: '', stock: 0 }];
    setEdits(prev => ({ ...prev, [id]: edit }));
  };

  const removeSizeVariant = (id: string, index: number) => {
    const edit = { ...getEdit(products.find(p => p.id === id)!) };
    edit.size_variants = edit.size_variants.filter((_, i) => i !== index);
    setEdits(prev => ({ ...prev, [id]: edit }));
  };

  const handleSave = useCallback(
    async (product: Product) => {
      const edit = edits[product.id];
      if (!edit) return;

      const stock = parseInt(edit.stock, 10);
      const updates: Partial<Product> = {};

      if (edit.size_variants.length > 0) {
        updates.size_variants = edit.size_variants;
        // Also update total stock for compatibility
        updates.stock = edit.size_variants.reduce((acc, v) => acc + v.stock, 0);
      } else {
        if (isNaN(stock) || stock < 0) {
          toast({ title: 'Invalid stock value', variant: 'destructive' });
          return;
        }
        updates.stock = stock;
        updates.size_variants = [];
      }

      setSaving(prev => ({ ...prev, [product.id]: true }));
      await onUpdate(product.id, updates);
      setSaving(prev => ({ ...prev, [product.id]: false }));
      toast({
        title: 'Inventory updated',
        description: `${product.title} updated successfully.`,
      });
    },
    [edits, onUpdate, toast],
  );

  const handleDelete = useCallback(
    async (product: Product) => {
      if (!onDelete) return;
      if (!confirm(t('product.deleteConfirm'))) return;

      setDeleting(prev => ({ ...prev, [product.id]: true }));
      try {
        await onDelete(product.id);
        toast({
          title: 'Product removed',
          description: `${product.title} has been removed from your catalog.`,
        });
      } catch (error) {
        toast({
          title: 'Error removing product',
          description: 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setDeleting(prev => ({ ...prev, [product.id]: false }));
      }
    },
    [onDelete, t, toast],
  );

  const handleSaveAll = useCallback(async () => {
    const productsToUpdate = products.flatMap(product => {
      const edit = edits[product.id];
      if (!edit) return [];

      const updates: Partial<Product> = {};
      if (edit.size_variants.length > 0) {
        updates.size_variants = edit.size_variants;
        updates.stock = edit.size_variants.reduce((acc, v) => acc + v.stock, 0);
      } else {
        const stock = parseInt(edit.stock, 10);
        if (!isNaN(stock) && stock >= 0) {
          updates.stock = stock;
          updates.size_variants = [];
        }
      }

      if (Object.keys(updates).length > 0) {
        return [{ id: product.id, ...updates }];
      }
      return [];
    });

    if (productsToUpdate.length === 0) return;

    await Promise.all(
      productsToUpdate.map(async p => {
        const { id, ...updates } = p;
        setSaving(prev => ({ ...prev, [id]: true }));
        await onUpdate(id, updates);
        setSaving(prev => ({ ...prev, [id]: false }));
      }),
    );

    toast({ title: 'All changes saved' });
  }, [products, edits, onUpdate, toast]);

  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border/50 rounded-xl p-16 text-center">
        <div className="size-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">
          {t('dashboard.noProducts')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('auto.upload_products_first_to_manag')}
        </p>
      </div>
    );
  }

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('auto.search_products')}
            className="pl-9"
          />
        </div>
        {hasEdits && (
          <Button onClick={handleSaveAll} size="sm">
            <Save className="size-4 mr-1.5" />
            {t('auto.save_all_changes')}
          </Button>
        )}
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('orders.product')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('product.category')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('product.price')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('auto.stock_type')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('auto.stock_info')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(product => {
                const edit = getEdit(product);
                const isExpanded = expanding[product.id];
                const hasVariants =
                  (product.size_variants && product.size_variants.length > 0) ||
                  edit.size_variants.length > 0;

                return (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="size-10 rounded-lg object-cover bg-secondary"
                            />
                          )}
                          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {product.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {product.category || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium tabular-nums">
                          ₹{product.price}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            hasVariants
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {hasVariants
                            ? t('auto.size_based')
                            : t('auto.single')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {hasVariants ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpanding(prev => ({
                                ...prev,
                                [product.id]: !prev[product.id],
                              }))
                            }
                            className="h-8 text-xs gap-2"
                          >
                            {edit.size_variants.length}
                            {t('auto.sizes')}
                            {isExpanded ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={edit.stock}
                              onChange={e =>
                                setField(product.id, 'stock', e.target.value)
                              }
                              className="w-20 h-9 text-sm"
                              min="0"
                            />

                            {parseInt(edit.stock) === 0 && (
                              <span className="text-[10px] font-semibold text-red-500 uppercase">
                                {t('auto.out')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(product)}
                            disabled={saving[product.id]}
                            title={t('auto.save_changes')}
                          >
                            {saving[product.id] ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                          </Button>
                          {onDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(product)}
                              disabled={deleting[product.id]}
                              className="text-muted-foreground hover:text-destructive"
                              title={t('product.delete')}
                            >
                              {deleting[product.id] ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/20">
                        <td colSpan={5} className="px-8 py-4">
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {t('auto.size_variants')}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px]"
                                onClick={() => addSizeVariant(product.id)}
                              >
                                <Plus className="size-3 mr-1" />
                                {t('auto.add_size')}
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {edit.size_variants.map((v, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border/50"
                                >
                                  <Input
                                    placeholder={t('auto.size')}
                                    value={v.size}
                                    onChange={e =>
                                      setSizeVariantField(
                                        product.id,
                                        i,
                                        'size',
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs flex-1"
                                  />

                                  <Input
                                    type="number"
                                    placeholder={t('auto.stock')}
                                    value={v.stock}
                                    onChange={e =>
                                      setSizeVariantField(
                                        product.id,
                                        i,
                                        'stock',
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs w-20"
                                    min="0"
                                  />

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      removeSizeVariant(product.id, i)
                                    }
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('auto.showing')}
        {filtered.length}
        {t('auto.of')}
        {products.length}
        {t('auto.products')}
      </p>
    </div>
  );
}
