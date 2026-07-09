interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <p className="text-sm text-gray-500">
      Karta {current}/{total}
    </p>
  );
}
