import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import StatsBar from '@/components/landing/StatsBar';
import HowItWorks from '@/components/landing/HowItWorks';
import FeatureShowcase from '@/components/landing/FeatureShowcase';
import PricingSection from '@/components/landing/PricingSection';
import BottomCTA from '@/components/landing/BottomCTA';
import LandingFooter from '@/components/landing/LandingFooter';
import { LazyMotionProvider } from '@/components/landing/lazy-motion-provider';

export const metadata: Metadata = {
  title: 'CryptoSentry - Stop refreshing Twitter',
  description:
    'CryptoSentry watches crypto influencers 24/7 and pings your Telegram the second they mention a token.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white">
      <LandingHeader />
      <main>
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
