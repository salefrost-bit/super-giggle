interface CardDisplayProps {
  exerciseName: string;
  reps: number;
}

export function CardDisplay({ exerciseName, reps }: CardDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center border rounded-lg p-10 gap-2">
      <p className="text-lg uppercase tracking-wide text-gray-500">{exerciseName}</p>
      <p className="text-6xl font-bold">{reps}</p>
      <p className="text-sm text-gray-500">ponavljanja</p>
    </div>
  );
}
