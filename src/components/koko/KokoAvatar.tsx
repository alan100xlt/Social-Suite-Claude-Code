import { cn } from '@/lib/utils';

interface KokoAvatarProps {
  className?: string;
  size?: number;
}

export function KokoAvatar({ className, size = 24 }: KokoAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Koko avatar"
    >
      {/* Left ear */}
      <circle cx="10" cy="18" r="7" fill="currentColor" opacity="0.3" />
      {/* Right ear */}
      <circle cx="38" cy="18" r="7" fill="currentColor" opacity="0.3" />
      {/* Inner left ear */}
      <circle cx="10" cy="18" r="4" fill="currentColor" opacity="0.15" />
      {/* Inner right ear */}
      <circle cx="38" cy="18" r="4" fill="currentColor" opacity="0.15" />
      {/* Face */}
      <circle cx="24" cy="26" r="18" fill="currentColor" opacity="0.2" />
      {/* Face highlight (muzzle area) */}
      <ellipse cx="24" cy="30" rx="10" ry="8" fill="currentColor" opacity="0.1" />
      {/* Left eye */}
      <circle cx="18" cy="23" r="2.5" fill="currentColor" />
      {/* Right eye */}
      <circle cx="30" cy="23" r="2.5" fill="currentColor" />
      {/* Left eye shine */}
      <circle cx="19" cy="22" r="0.8" fill="white" opacity="0.8" />
      {/* Right eye shine */}
      <circle cx="31" cy="22" r="0.8" fill="white" opacity="0.8" />
      {/* Nose */}
      <ellipse cx="24" cy="29" rx="2" ry="1.5" fill="currentColor" opacity="0.5" />
      {/* Smile */}
      <path
        d="M20 32 Q24 36 28 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
