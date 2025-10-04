import { PRICING_TIERS } from '@/lib/config/pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Phone, MessageSquare, Mail } from 'lucide-react';

export function PricingTiers() {
  return (
    <section className="mx-auto mb-16 max-w-6xl">
      <div className="mb-12 text-center">
        <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">Choose Your Plan</h2>
        <p className="text-xl text-muted-foreground">
          Get instant Telegram voice alerts when crypto influencers mention your tokens
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {Object.entries(PRICING_TIERS).map(([tierKey, tier]) => (
          <Card
            key={tierKey}
            className={`relative ${tierKey === 'pro' ? 'border-primary shadow-lg' : ''}`}
          >
            {tierKey === 'pro' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-muted-foreground">/{tier.period}</span>
              </div>
              <CardDescription className="mt-2">{tier.features.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{tier.features.accounts} Twitter accounts</span>
                </div>

                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>
                    {tier.features.keywords === -1 ? 'Unlimited' : tier.features.keywords} keywords
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="font-medium">Telegram Voice Alerts</span>
                  </div>

                  {tier.features.alerts.includes('sms') && (
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <span>SMS Alerts</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <span>Email Alerts</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                variant={tierKey === 'pro' ? 'default' : 'outline'}
                size="lg"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          All plans include real-time monitoring and instant Telegram voice alerts
        </p>
      </div>
    </section>
  );
}
