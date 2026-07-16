import type { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

// s19: Blitz trajanje-pilule (3/5/10 min) i slične inline izborne pilule.
export function Pill({ children, active = false, onClick }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="flex-1 text-center font-black text-xs rounded-full py-1.5 transition-transform active:scale-95"
      style={{
        color: active ? 'var(--color-outer)' : 'var(--color-foreground)',
        background: active ? 'var(--color-accent)' : '#212124',
        border: `1px solid ${active ? 'var(--color-accent)' : '#3a3a40'}`,
      }}
    >
      {children}
    </button>
  );
}
