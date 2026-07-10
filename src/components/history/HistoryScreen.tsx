'use client';

import { useEffect, useState } from 'react';
import { getUserSessions, type SessionHistoryEntry } from '@/lib/supabase/sessions';

interface HistoryScreenProps {
  userId: string;
  onBack?: () => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function HistoryScreen({ userId, onBack }: HistoryScreenProps) {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserSessions(userId)
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Nazad"
            className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold"
          >
            ←
          </button>
        )}
        <h1 className="text-2xl font-extrabold">Istorija treninga</h1>
      </div>

      {isLoading ? (
        <p className="text-muted">Učitavanje istorije...</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-muted text-[15px] font-semibold mt-[60px] leading-relaxed">
          Još nema treninga.
          <br />
          Završi jedan da se pojavi ovde.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-surface rounded-2xl p-[18px]">
              <div className="flex justify-between items-center mb-2.5">
                <p className="text-[15px] font-extrabold">
                  {new Date(session.startedAt).toLocaleDateString('sr-RS')}
                </p>
                <span className="bg-background text-accent text-xs font-extrabold px-2.5 py-[5px] rounded-lg">
                  {session.difficultyName}
                </span>
              </div>
              <div className="flex gap-5 text-[13px] font-semibold text-muted">
                <p>{formatDuration(session.totalDurationSeconds)} trajanje</p>
                <p>{session.totalCards} karata</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
