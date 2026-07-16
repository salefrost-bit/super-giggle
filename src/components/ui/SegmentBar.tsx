interface SegmentBarProps {
  total: number;
  current: number;
}

// Listovi špila (s6/s12): jedan segment po karti. Cleared = volt + glow,
// current = "raised" (najviši), ostali dim.
export function SegmentBar({ total, current }: SegmentBarProps) {
  return (
    <div
      className="flex gap-[3px] items-end h-[18px]"
      role="img"
      aria-label={`${current}/${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i < current ? 'cleared' : i === current ? 'current' : 'pending';
        return (
          <div
            key={i}
            data-testid="segment"
            data-state={state}
            className="flex-1 rounded-[2px] transition-[background,height] duration-200"
            style={{
              height: state === 'current' ? '18px' : state === 'cleared' ? '13px' : '7px',
              background:
                state === 'cleared'
                  ? 'var(--color-accent)'
                  : state === 'current'
                    ? 'var(--color-foreground)'
                    : '#2c2c31',
              boxShadow: state === 'cleared' ? '0 0 6px var(--color-accent)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
