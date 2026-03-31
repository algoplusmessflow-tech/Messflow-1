// src/pages/ModeSelection.tsx
// MODE SELECTION PAGE - Choose between Mess, Restaurant, or Canteen mode

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppMode } from '@/contexts/ModeContext';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, UtensilsCrossed, ShoppingCart, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODES = [
  {
    id: 'mess',
    label: 'Mess / Canteen',
    description: 'Manage meal plans, subscriptions, and member billing',
    icon: Utensils,
    color: 'bg-blue-600 hover:bg-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Table reservations, POS orders, and kitchen management',
    icon: UtensilsCrossed,
    color: 'bg-orange-600 hover:bg-orange-700',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'canteen',
    label: 'Canteen',
    description: 'Token-based quick service and inventory tracking',
    icon: ShoppingCart,
    color: 'bg-green-600 hover:bg-green-700',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
  },
];

export default function ModeSelection() {
  const navigate = useNavigate();
  const { mode, setMode, availableModes, isLoading } = useAppMode();

  const handleSelectMode = (selectedMode: string) => {
    if (availableModes.includes(selectedMode as any)) {
      setMode(selectedMode as any);
      
      // Navigate based on mode
      switch (selectedMode) {
        case 'mess':
          navigate('/dashboard');
          break;
        case 'restaurant':
          navigate('/tables');
          break;
        case 'canteen':
          navigate('/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    }
  };

  // If only one mode available and user already has one selected, redirect
  useEffect(() => {
    if (!isLoading && availableModes.length === 1 && availableModes.includes(mode)) {
      handleSelectMode(mode);
    }
  }, [isLoading, availableModes, mode]);

  if (isLoading) {
    return (
      <AppLayout hideNavigation>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNavigation>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Select Your Operating Mode
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose how you want to manage your food service business
            </p>
          </div>

          {/* Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MODES.map((modeOption) => {
              const isAvailable = availableModes.includes(modeOption.id as any);
              const Icon = modeOption.icon;

              return (
                <Card
                  key={modeOption.id}
                  className={cn(
                    'relative overflow-hidden transition-all duration-300 cursor-pointer',
                    isAvailable
                      ? 'hover:shadow-lg hover:scale-[1.02] hover:border-primary/50'
                      : 'opacity-60 cursor-not-allowed',
                    modeOption.borderColor
                  )}
                  onClick={() => isAvailable && handleSelectMode(modeOption.id)}
                >
                  {/* Background accent */}
                  <div className={cn('absolute inset-0', modeOption.bgColor)} />
                  
                  <CardContent className="relative p-6 text-center">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center',
                        modeOption.bgColor,
                        modeOption.iconColor
                      )}
                    >
                      <Icon className="h-8 w-8" />
                    </div>

                    {/* Label */}
                    <h3 className="text-xl font-bold mb-2">{modeOption.label}</h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-6">
                      {modeOption.description}
                    </p>

                    {/* Button */}
                    {isAvailable ? (
                      <Button className={cn('w-full text-white', modeOption.color)}>
                        Enter Mode
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="w-full">
                        Locked - Upgrade to Unlock
                      </Button>
                    )}

                    {/* Lock overlay for unavailable modes */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-background/50 dark:bg-background/70 flex items-center justify-center">
                        <div className="text-center">
                          <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground/70">Contact Super Admin</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              You can switch between your active modes at any time from the sidebar.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
