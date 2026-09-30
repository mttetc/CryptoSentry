import LandingFooter from '@/components/landing/LandingFooter';
import { Backdrop } from '@/components/landing/Backdrop';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background relative flex min-h-screen flex-col overflow-x-hidden">
      <Backdrop />
      <div className="relative mx-auto w-full max-w-6xl flex-1 px-6 pt-24 pb-16 lg:px-10">
        {children}
      </div>
      <LandingFooter />
    </main>
  );
}
