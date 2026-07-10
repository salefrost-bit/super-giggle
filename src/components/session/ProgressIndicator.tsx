interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-muted">
      Karta {current}/{total}
    </p>
  );
}
