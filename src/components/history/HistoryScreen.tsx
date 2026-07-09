'use client';

import { useEffect, useState } from 'react';
import { getUserSessions, type SessionHistoryEntry } from '@/lib/supabase/sessions';

interface HistoryScreenProps {
  userId: string;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function HistoryScreen({ userId }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserSessions(userId)
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) return <p>Učitavanje istorije...</p>;
  if (sessions.length === 0) return <p>Još nema odrađenih treninga.</p>;

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Istorija treninga</h1>
      {sessions.map((session) => (
        <div key={session.id} className="flex justify-between border-b py-2">
          <span>{new Date(session.startedAt).toLocaleDateString('sr-RS')}</span>
          <span>{session.difficultyName}</span>
          <span>{formatDuration(session.totalDurationSeconds)}</span>
          <span>{session.totalCards} karata</span>
        </div>
      ))}
    </div>
  );
}
