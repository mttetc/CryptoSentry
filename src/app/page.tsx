import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import StatsBar from '@/components/landing/StatsBar';
import HowItWorks from '@/components/landing/HowItWorks';
import FeatureShowcase from '@/components/landing/FeatureShowcase';
import PricingSection from '@/components/landing/PricingSection';
import BottomCTA from '@/components/landing/BottomCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import { Backdrop } from '@/components/landing/Backdrop';
import { LazyMotionProvider } from '@/components/landing/lazy-motion-provider';

export const metadata: Metadata = {
  title: 'CryptoSentry - Get the tweet before the candle',
  description:
    'CryptoSentry streams every matching post from the X accounts you watch to your Telegram in seconds, with an AI read on the sentiment.',
};

export default function LandingPage() {
  return (
    <div className="text-foreground relative min-h-screen">
      <Backdrop />
      <LandingHeader />
      <main className="relative">
        <HeroSection />
        <LazyMotionProvider>
          <StatsBar />
          <HowItWorks />
          <FeatureShowcase />
          <PricingSection />
          <BottomCTA />
        </LazyMotionProvider>
      </main>
      <LandingFooter />
    </div>
  );
}
