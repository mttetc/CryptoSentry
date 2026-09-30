export function DashboardTitleRow() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-primary inline-flex items-center gap-2 font-mono text-xs tracking-[0.12em] uppercase">
        <span className="relative flex h-2 w-2">
          <span className="bg-primary/60 animate-sentry-ping absolute inline-flex h-full w-full rounded-full" />
          <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
        </span>
        Live
      </span>
      <h1 className="font-display text-[32px] leading-none font-semibold tracking-[-0.03em] md:text-[40px]">
        Your alerts
      </h1>
    </div>
  );
}
