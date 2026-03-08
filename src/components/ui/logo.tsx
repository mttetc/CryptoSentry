import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: number;
}

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3L5 8.5V15C5 21.5 9.8 27.2 16 29C22.2 27.2 27 21.5 27 15V8.5L16 3Z"
        fill="#22C55E"
        fillOpacity="0.15"
        stroke="#22C55E"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="15" r="2.5" fill="#22C55E" />
      <path
        d="M12.5 11.5C13.4 10.6 14.6 10 16 10C17.4 10 18.6 10.6 19.5 11.5"
        stroke="#22C55E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 9C11.6 7.4 13.7 6.5 16 6.5C18.3 6.5 20.4 7.4 22 9"
        stroke="#22C55E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 20H13L14.5 17L16 22L17.5 19L19 20H22"
        stroke="#22C55E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { LogoMark };

export function Logo({ className = '', size = 20 }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="text-sm font-semibold tracking-tight text-white">CryptoSentry</span>
    </Link>
  );
}
