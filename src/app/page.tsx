import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import StatsBar from '@/components/landing/StatsBar';
import HowItWorks from '@/components/landing/HowItWorks';
import FeatureShowcase from '@/components/landing/FeatureShowcase';
import BottomCTA from '@/components/landing/BottomCTA';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'CryptoSentry - Stop refreshing Twitter',
  description:
    'CryptoSentry watches crypto influencers 24/7 and pings your Telegram the second they mention a token.',
};

export default function LandingPage() {
  return (
    <div className="landing-dark min-h-screen bg-[#0C0C0C] text-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <FeatureShowcase />
        <BottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
