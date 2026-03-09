import LandingFooter from '@/components/landing/LandingFooter';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background relative flex min-h-screen flex-col">
      {/* Top glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2">
        <div className="bg-primary/5 h-[600px] w-[800px] rounded-full blur-[120px]" />
      </div>
      <div className="relative mx-auto w-full max-w-5xl flex-1 px-6 pt-20 pb-16">{children}</div>
      <LandingFooter />
    </main>
  );
}
