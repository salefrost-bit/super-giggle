interface StopwatchDisplayProps {
  elapsedSeconds: number;
}

export function StopwatchDisplay({ elapsedSeconds }: StopwatchDisplayProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return <p className="text-[32px] font-black tracking-wide tabular-nums">{formatted}</p>;
}
