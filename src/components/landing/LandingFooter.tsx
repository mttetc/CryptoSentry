import NextLink from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="border-t px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-xs text-muted-foreground">
        <div className="flex gap-6">
          <NextLink href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </NextLink>
          <NextLink href="/terms" className="hover:text-foreground">
            Terms of Service
          </NextLink>
        </div>
        <div>&copy; {new Date().getFullYear()} CryptoSentry</div>
      </div>
    </footer>
  );
}
