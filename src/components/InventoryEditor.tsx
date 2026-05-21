import { useState, useCallback } from 'react';
import { Product } from '@/hooks/useSeller';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { Save, Loader2, Search, IndianRupee, Package, Trash2 } from 'lucide-react';

interface InventoryEditorProps {
  products: Product[];
  onUpdate: (id: string, updates: Partial<Product>) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
}

export default function InventoryEditor({ products, onUpdate, onDelete }: InventoryEditorProps) {
  const [edits, setEdits] = useState<Record<string, { stock: string; low_stock_threshold: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const { t } = useLanguage();

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getEdit = (product: Product) => {
    return edits[product.id] || {
      stock: String(product.stock ?? 0),
      low_stock_threshold: String(product.low_stock_threshold ?? 5),
    };
  };

  const setField = (id: string, field: 'stock' | 'low_stock_threshold', value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || getEdit(products.find((p) => p.id === id)!)), [field]: value },
    }));
  };

  const handleSave = useCallback(async (product: Product) => {
    const edit = edits[product.id];
    if (!edit) return;

    const stock = parseInt(edit.stock, 10);
    const low_stock_threshold = parseInt(edit.low_stock_threshold, 10);

    if (isNaN(stock) || stock < 0) {
      toast({ title: 'Invalid stock value', variant: 'destructive' });
      return;
    }
    if (isNaN(low_stock_threshold) || low_stock_threshold < 0) {
      toast({ title: 'Invalid threshold value', variant: 'destructive' });
      return;
    }

    setSaving((prev) => ({ ...prev, [product.id]: true }));
    await onUpdate(product.id, { stock, low_stock_threshold });
    setSaving((prev) => ({ ...prev, [product.id]: false }));
    toast({ title: 'Stock updated', description: `${product.title} stock set to ${stock}` });
  }, [edits, onUpdate, toast]);

  const handleDelete = useCallback(async (product: Product) => {
    if (!onDelete) return;
    if (!confirm(t('product.deleteConfirm'))) return;

    setDeleting((prev) => ({ ...prev, [product.id]: true }));
    try {
      await onDelete(product.id);
      toast({ title: 'Product removed', description: `${product.title} has been removed from your catalog.` });
    } catch (error) {
      toast({ title: 'Error removing product', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setDeleting((prev) => ({ ...prev, [product.id]: false }));
    }
  }, [onDelete, t, toast]);

  const handleSaveAll = useCallback(async () => {
    const productsToUpdate = products.flatMap((product) => {
      const edit = edits[product.id];
      if (!edit) return [];
      const stock = parseInt(edit.stock, 10);
      const low_stock_threshold = parseInt(edit.low_stock_threshold, 10);
      if (!isNaN(stock) && !isNaN(low_stock_threshold) && stock >= 0 && low_stock_threshold >= 0) {
        return [{ id: product.id, stock, low_stock_threshold }];
      }
      return [];
    });

    if (productsToUpdate.length === 0) return;

    await Promise.all(productsToUpdate.map(async (p) => {
      setSaving((prev) => ({ ...prev, [p.id]: true }));
      await onUpdate(p.id, { stock: p.stock, low_stock_threshold: p.low_stock_threshold });
      setSaving((prev) => ({ ...prev, [p.id]: false }));
    }));

    toast({ title: 'All changes saved' });
  }, [products, edits, onUpdate, toast]);

  if (products.length === 0) {
    return (
      <div className="border border-dashed border-border/50 rounded-xl p-16 text-center">
        <div className="size-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No products yet</h3>
        <p className="text-sm text-muted-foreground">Upload products first to manage inventory.</p>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>
        {hasEdits && (
          <Button onClick={handleSaveAll} size="sm">
            <Save className="size-4 mr-1.5" /> Save All Changes
          </Button>
        )}
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Low Stock Threshold</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((product) => {
                const edit = getEdit(product);
                return (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
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
                      <span className="text-xs text-muted-foreground">{product.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium tabular-nums">₹{product.price}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={edit.stock}
                          onChange={(e) => setField(product.id, 'stock', e.target.value)}
                          className="w-20 h-9 text-sm"
                          min="0"
                        />
                        {parseInt(edit.stock) === 0 && (
                          <span className="text-[10px] font-semibold text-red-500 uppercase">Out</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={edit.low_stock_threshold}
                        onChange={(e) => setField(product.id, 'low_stock_threshold', e.target.value)}
                        className="w-20 h-9 text-sm"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSave(product)}
                          disabled={saving[product.id]}
                          title="Save changes"
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {products.length} products
      </p>
    </div>
  );
}

