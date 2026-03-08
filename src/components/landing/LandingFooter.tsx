import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-xs text-neutral-500">
        <div className="flex gap-6">
          <Link href="/privacy" className="transition-colors hover:text-neutral-300">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-neutral-300">
            Terms of Service
          </Link>
        </div>
        <div>&copy; {new Date().getFullYear()} CryptoSentry</div>
      </div>
    </footer>
  );
}
