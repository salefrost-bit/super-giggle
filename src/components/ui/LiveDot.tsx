interface LiveDotProps {
  paused: boolean;
  color?: string;
}

// s5: bounce + ripple dok je sesija u toku; pauza zamrzava animaciju
// (animation-play-state), ne gasi je — "screen holds its breath".
export function LiveDot({ paused, color = 'var(--color-accent)' }: LiveDotProps) {
  const playState = paused ? 'paused' : 'running';

  return (
    <span
      data-paused={paused}
      className="relative inline-block w-[10px] h-[10px]"
      style={{ animation: 'bounceDot 1.8s ease-in-out infinite', animationPlayState: playState }}
    >
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: color,
          opacity: 0.5,
          animation: 'rippleK 1.8s ease-out infinite',
          animationPlayState: playState,
        }}
      />
    </span>
  );
}
