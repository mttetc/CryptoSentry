import Footer from '@/components/shared/layout/Footer';
import Header from '@/components/shared/layout/Header';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bell, LineChart, X } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function AppHero() {
  return (
    <section className="mx-auto mb-16 max-w-4xl text-center">
      <h1 className="mb-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl md:leading-[1.1]">
        Monitor Crypto Influencers <br className="hidden md:inline" />& Get Instant Alerts
      </h1>
      <p className="mb-8 text-xl text-muted-foreground">
        Stay ahead with X monitoring and Telegram alerts. Get instant notifications when influencers
        mention your tokens.
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container mx-auto flex-grow px-4 py-12">
        <AppHero />

        <section className="mx-auto mb-16 grid max-w-5xl gap-8 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <X className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-3 font-display text-xl font-semibold tracking-tight">
                X Account Monitoring
              </h3>
              <p className="text-muted-foreground">
                Track posts from key crypto influencers and project accounts. Create powerful alerts
                by combining social signals with keywords.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <LineChart className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-3 font-display text-xl font-semibold tracking-tight">
                Keyword Alerts
              </h3>
              <p className="text-muted-foreground">
                Set custom keywords for any cryptocurrency. Get alerts when influencers mention your
                tokens.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Bell className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-3 font-display text-xl font-semibold tracking-tight">
                Instant Notifications
              </h3>
              <p className="text-muted-foreground">
                Receive instant Telegram alerts. Get notified immediately when influencers mention
                your tokens.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto mb-16 max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Start monitoring crypto influencers in minutes
            </p>
          </div>

          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-6">
              <h3 className="mb-4 font-display text-2xl font-semibold tracking-tight">
                X Account Monitoring
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Select Accounts</h4>
                    <p className="text-muted-foreground">
                      Add any X accounts you want to monitor. Track multiple accounts
                      simultaneously.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Set Keywords</h4>
                    <p className="text-muted-foreground">
                      Define token names or topics you&apos;re interested in. Get alerts when these
                      are mentioned.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Instant Alerts</h4>
                    <p className="text-muted-foreground">
                      Receive immediate notifications when monitored accounts post about your
                      keywords.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="mb-4 font-display text-2xl font-semibold tracking-tight">
                Telegram Setup
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Create Bot</h4>
                    <p className="text-muted-foreground">
                      Create a Telegram bot using BotFather and get your bot token.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Get Chat ID</h4>
                    <p className="text-muted-foreground">
                      Start a conversation with your bot and get your chat ID.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Receive Alerts</h4>
                    <p className="text-muted-foreground">
                      Get instant notifications when your keywords are mentioned.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
