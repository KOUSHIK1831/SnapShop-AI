import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Store,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const { user, updateRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<'seller' | 'buyer'>(
    'seller',
  );
  const [submitting, setSubmitting] = useState(false);

  // If already onboarded, send them to their dashboard
  if (user?.onboarded) {
    if (user.role === 'seller') navigate('/dashboard');
    else if (user.role === 'buyer') navigate('/buyer');
    else if (user.role === 'admin') navigate('/admin');
  }

  const handleContinue = async () => {
    setSubmitting(true);
    const { error, user: updatedUser } = await updateRole(selectedRole);
    setSubmitting(false);

    if (error) {
      toast({
        title: 'Selection failed',
        description:
          error.message || 'Could not update your role. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Welcome to SnapShop AI!',
      description:
        selectedRole === 'seller'
          ? 'Let us set up your digital store.'
          : 'Explore local clothing stores.',
    });

    if (selectedRole === 'seller') {
      navigate('/dashboard');
    } else {
      navigate('/buyer');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 py-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            <span>One last quick step</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How will you use SnapShop AI?
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Choose your account type to personalize your experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            onClick={() => setSelectedRole('seller')}
            className={`cursor-pointer transition-all duration-200 hover:border-primary relative overflow-hidden ${
              selectedRole === 'seller'
                ? 'border-primary ring-2 ring-primary/20 shadow-md bg-primary/5'
                : 'border-border'
            }`}
          >
            {selectedRole === 'seller' && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="w-5 h-5 fill-primary text-primary-foreground" />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Store className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Store Owner</CardTitle>
              <CardDescription>
                I want to sell clothing products and digitize inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Snap photos to auto-create listings</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Get a shareable public storefront</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Live orders & inventory tracking</span>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedRole('buyer')}
            className={`cursor-pointer transition-all duration-200 hover:border-primary relative overflow-hidden ${
              selectedRole === 'buyer'
                ? 'border-primary ring-2 ring-primary/20 shadow-md bg-primary/5'
                : 'border-border'
            }`}
          >
            {selectedRole === 'buyer' && (
              <div className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="w-5 h-5 fill-primary text-primary-foreground" />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Shopper</CardTitle>
              <CardDescription>
                I want to explore local stores and buy clothing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Browse nearby clothing catalogs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Place direct orders via COD or UPI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Live order delivery tracking</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={handleContinue}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
