import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDate } from '@/lib/format';
import { Check, Crown, Zap, Star, AlertTriangle, ExternalLink, Loader2, Gift } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { useState } from 'react';

export default function Pricing() {
  const { profile } = useProfile();
  const { subscriptionStatus, daysUntilExpiry, isExpired, isExpiringSoon, applyPromoCode } = useSubscription();
  const [promoCode, setPromoCode] = useState('');

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    await applyPromoCode.mutateAsync(promoCode.trim());
    setPromoCode('');
  };

  const isTrialActive = subscriptionStatus === 'trial';

  const handleSubscribe = () => {
    if (profile?.payment_link) {
      window.open(profile.payment_link, '_blank');
    } else {
      // Default payment link - Super Admin should set this
      window.open('https://wa.me/971501234567?text=I%20want%20to%20subscribe%20to%20MessFlow', '_blank');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">
            Scale your mess management with the right plan
          </p>
        </div>

        {/* Current Status */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Current Plan: {profile?.plan_type === 'free' ? 'Free' : 'Professional'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    {isTrialActive && `Trial ends in ${daysUntilExpiry} days`}
                    {isExpired && 'Subscription expired'}
                    {subscriptionStatus === 'active' && !isTrialActive && profile?.subscription_expiry &&
                      `Active until ${formatDate(new Date(profile.subscription_expiry))}`
                    }
                    {(isTrialActive || isExpired) && (
                      <Badge variant={isExpired ? 'destructive' : 'secondary'} className="flex items-center gap-1 w-fit">
                        {isExpired ? (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            Expired
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3" />
                            Trial Active
                          </>
                        )}
                      </Badge>
                    )}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-border md:pl-6">
                <form onSubmit={handleApplyPromo} className="space-y-2 max-w-sm">
                  <Label htmlFor="promo" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Have a promo code?</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promo"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter code..."
                      className="h-9 w-full md:w-48 bg-background"
                    />
                    <Button type="submit" size="sm" className="h-9" disabled={applyPromoCode.isPending || !promoCode.trim()}>
                      {applyPromoCode.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="h-4 w-4 mr-1" />
                      )}
                      Claim
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? 'border-primary shadow-lg relative' : ''}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Free' : `AED ${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.limitations && (
                  <ul className="space-y-2 pt-2 border-t border-border">
                    {plan.limitations.map((limitation, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-4 w-4 flex items-center justify-center flex-shrink-0">•</span>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={plan.price > 0 ? handleSubscribe : undefined}
                  disabled={plan.price === 0}
                >
                  {plan.price === 0 ? (
                    'Current Plan'
                  ) : (
                    <>
                      Subscribe Now
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Section */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Need a Custom Plan?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contact us for custom pricing for large organizations or special requirements.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('https://wa.me/971501234567?text=I%20need%20a%20custom%20plan%20for%20MessFlow', '_blank')}
            >
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
