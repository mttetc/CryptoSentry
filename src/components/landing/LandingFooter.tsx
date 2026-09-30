import NextLink from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.08]">
      <div className="text-ink-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-[13px] sm:flex-row lg:px-10">
        <span>&copy; {new Date().getFullYear()} CryptoSentry</span>
        <div className="flex gap-6">
          <NextLink href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </NextLink>
          <NextLink href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </NextLink>
        </div>
      </div>
    </footer>
  );
}
