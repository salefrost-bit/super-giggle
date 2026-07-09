interface StopwatchDisplayProps {
  elapsedSeconds: number;
}

export function StopwatchDisplay({ elapsedSeconds }: StopwatchDisplayProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  return <p className="text-2xl font-mono">{formatted}</p>;
}
