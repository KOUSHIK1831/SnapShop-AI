import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Image as ImageIcon, Edit3 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface AIProduct {
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  size?: string;
  discount_percent?: number;
  digitization_failed?: boolean;
  confidence?: {
    title: number;
    description: number;
    price: number;
    category: number;
    tags: number;
  };
}

interface ReviewCardProps {
  product: AIProduct;
  imageUrl: string;
  index: number;
  onApprove: (product: AIProduct) => void;
  onReject: () => void;
}

const CONFIDENCE_THRESHOLD = 0.7;

export default function ReviewCard({ product, imageUrl, index, onApprove, onReject }: ReviewCardProps) {
  const [editing, setEditing] = useState(product.digitization_failed || false);
  const [edited, setEdited] = useState<AIProduct>({ ...product });
  const { t } = useLanguage();

  const handleSave = () => {
    onApprove(edited);
    setEditing(false);
  };

  const isLowConfidence = (field: keyof NonNullable<AIProduct['confidence']>) => {
    return product.digitization_failed || (product.confidence && (product.confidence[field] < CONFIDENCE_THRESHOLD));
  };

  return (
    <div className={`border rounded-xl overflow-hidden bg-card shadow-surface animate-fade-in ${product.digitization_failed ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-border/50'}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b border-border/50 ${product.digitization_failed ? 'bg-amber-500/10' : 'bg-muted/30'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Product {index + 1}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {product.title}
          </span>
        </div>
        {product.digitization_failed && (
          <Badge className="bg-amber-500 text-white text-[9px] uppercase hover:bg-amber-600">AI Digitization Failed</Badge>
        )}
      </div>
      
      {product.digitization_failed && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200/50 dark:border-amber-500/20 flex items-center gap-2">
          <Edit3 className="size-3.5 text-amber-600" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            AI couldn't extract details from this image. Please manually enter the title, price, and description.
          </p>
        </div>
      )}

      <div className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-secondary shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={product.title} className="size-full object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          {editing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`title-${product.id}`} className="text-xs font-medium text-muted-foreground">Title</label>
                  <Input
                    id={`title-${product.id}`}
                    value={edited.title}
                    onChange={(e) => setEdited(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Title"
                    className={isLowConfidence('title') ? "border-amber-300 bg-amber-50/30" : ""}
                  />
                </div>
                <div>
                  <label htmlFor={`price-${product.id}`} className="text-xs font-medium text-muted-foreground">Price (₹)</label>
                  <Input
                    id={`price-${product.id}`}
                    type="number"
                    value={edited.price}
                    onChange={(e) => setEdited(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="Price"
                    className={isLowConfidence('price') ? "border-amber-300 bg-amber-50/30" : ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Discount %</label>
                  <Input
                    type="number"
                    value={edited.discount_percent ?? ''}
                    onChange={(e) => setEdited(prev => ({ ...prev, discount_percent: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g. 10"
                    min="0" max="100"
                  />
                  {(edited.discount_percent ?? 0) > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Final: ₹{Math.round(edited.price * (1 - (edited.discount_percent ?? 0) / 100))}
                      <span className="text-muted-foreground ml-1">(save ₹{Math.round(edited.price * (edited.discount_percent ?? 0) / 100)})</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Size / Variant</label>
                  <Input
                    value={edited.size ?? ''}
                    onChange={(e) => setEdited(prev => ({ ...prev, size: e.target.value }))}
                    placeholder="e.g. S, M, L, XL or 500g"
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`category-${product.id}`} className="text-xs font-medium text-muted-foreground">Category</label>
                <Input
                  id={`category-${product.id}`}
                  value={edited.category}
                  onChange={(e) => setEdited(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Category"
                  className={isLowConfidence('category') ? "border-amber-300 bg-amber-50/30" : ""}
                />
              </div>
              <div>
                <label htmlFor={`description-${product.id}`} className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  id={`description-${product.id}`}
                  value={edited.description}
                  onChange={(e) => setEdited(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  rows={2}
                  className={isLowConfidence('description') ? "border-amber-300 bg-amber-50/30" : ""}
                />
              </div>
              <div>
                <label htmlFor={`tags-${product.id}`} className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
                <Input
                  id={`tags-${product.id}`}
                  value={edited.tags.join(", ")}
                  onChange={(e) => setEdited(prev => ({ ...prev, tags: e.target.value.split(",").flatMap((t) => { const trimmed = t.trim(); return trimmed ? [trimmed] : []; }) }))}
                  placeholder="tag1, tag2, tag3"
                  className={isLowConfidence('tags') ? "border-amber-300 bg-amber-50/30" : ""}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-semibold text-foreground leading-tight ${isLowConfidence('title') ? "bg-amber-100/50 rounded px-1 -mx-1" : ""}`}>
                  {product.title}
                </h4>
                <div className="text-right shrink-0">
                  {(product.discount_percent ?? 0) > 0 ? (
                    <>
                      <span className="font-bold text-primary tabular-nums">
                        ₹{Math.round(product.price * (1 - (product.discount_percent ?? 0) / 100))}
                      </span>
                      <span className="text-xs text-muted-foreground line-through ml-1">₹{product.price}</span>
                      <span className="text-xs text-green-600 ml-1">{product.discount_percent}% off</span>
                    </>
                  ) : (
                    <span className={`font-bold text-primary tabular-nums ${isLowConfidence('price') ? "bg-amber-100/50 rounded px-1 -mx-1" : ""}`}>
                      ₹{product.price}
                    </span>
                  )}
                </div>
              </div>
              {product.size && (
                <p className="text-xs text-muted-foreground">Size: <span className="font-medium text-foreground">{product.size}</span></p>
              )}
              <p className={`text-sm text-muted-foreground line-clamp-2 ${isLowConfidence('description') ? "bg-amber-50/50 rounded px-1 -mx-1 border border-amber-100/50" : ""}`}>
                {product.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={isLowConfidence('category') ? "outline" : "secondary"} className={`text-[10px] ${isLowConfidence('category') ? "border-amber-500 text-amber-600 bg-amber-50" : ""}`}>
                  {product.category}
                </Badge>
              </div>
              {product.tags.length > 0 && (
                <div className={`flex flex-wrap gap-1 p-1 -m-1 rounded ${isLowConfidence('tags') ? "bg-amber-50/30 border border-amber-100/50" : ""}`}>
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] border-border/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2 pt-2">
            {editing ? (
              <>
                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                  <CheckCircle2 className="size-3.5 mr-1.5" /> Save & Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEdited({ ...product }); setEditing(false); }}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" className="bg-gradient-brand hover:opacity-90 transition-opacity" onClick={() => onApprove(product)}>
                  <CheckCircle2 className="size-3.5 mr-1.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="border-border/50" onClick={() => setEditing(true)}>
                  <Edit3 className="size-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onReject}>
                  <XCircle className="size-3.5 mr-1.5" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
