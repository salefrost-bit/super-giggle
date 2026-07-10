'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { calculateStreak } from '@/lib/domain/streak';
import { getPersonalRecords, getCompletedSessionDates, type PersonalRecord } from '@/lib/supabase/records';
import { getUserSessions, type SessionHistoryEntry } from '@/lib/supabase/sessions';

interface ProgressScreenProps {
  userId: string;
  onBack?: () => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ProgressScreen({ userId, onBack }: ProgressScreenProps) {
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [streak, setStreak] = useState({ days: 0, freezesLeftThisWeek: 2 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUserSessions(userId), getPersonalRecords(userId), getCompletedSessionDates(userId)])
      .then(([sessionRows, recordRows, dates]) => {
        setSessions(sessionRows);
        setRecords(recordRows);
        setStreak(calculateStreak(dates, new Date()));
      })
      .catch((err) => console.error('Failed to load progress data', err))
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            aria-label={t('common.back')}
            className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold"
          >
            ←
          </button>
        )}
        <h1 className="text-2xl font-extrabold">{t('progress.title')}</h1>
      </div>

      {isLoading ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="bg-surface rounded-2xl p-4 flex items-center gap-3 mb-5">
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-2xl font-black leading-none">
                {t('progress.streak', { days: streak.days })}
              </p>
              <p className="text-xs text-muted font-semibold mt-1">
                {t('progress.streakCaption', { freezes: '❄️'.repeat(streak.freezesLeftThisWeek) || '0' })}
              </p>
            </div>
          </div>

          {records.length > 0 && (
            <>
              <p className="text-xs font-extrabold text-muted tracking-widest uppercase mb-2">
                {t('progress.recordsTitle')}
              </p>
              <div className="flex flex-col gap-2 mb-5">
                {records.map((record) => (
                  <div
                    key={`${record.difficultyName}-${record.totalCards}`}
                    className="bg-surface rounded-xl px-3.5 py-3 flex justify-between items-center"
                  >
                    <p className="text-sm font-bold">
                      {t('progress.cardsLine', { count: record.totalCards })} · {record.difficultyName}
                    </p>
                    <div className="text-right">
                      <p className="text-sm font-black text-accent">{formatDuration(record.bestDurationSeconds)}</p>
                      {record.bestScore !== null && (
                        <p className="text-[10px] text-muted font-bold">
                          {t('progress.bestScore', {
                            score: record.bestScore,
                            total: record.scoreTotal ?? record.totalCards,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-extrabold text-muted tracking-widest uppercase mb-2">
            {t('progress.historyTitle')}
          </p>
          {sessions.length === 0 ? (
            <p className="text-center text-muted text-[15px] font-semibold mt-10 leading-relaxed whitespace-pre-line">
              {t('progress.empty')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-surface rounded-xl px-3.5 py-3 flex justify-between items-center text-sm font-bold"
                >
                  <span>{new Date(session.startedAt).toLocaleDateString()}</span>
                  <span className={session.gameMode === 'perfect_deck' ? 'text-accent' : 'text-muted'}>
                    {session.gameMode === 'perfect_deck' && session.score !== null
                      ? `⚡ ${session.score}/${session.totalCards}`
                      : t('progress.classicTag')}
                  </span>
                  <span className="text-muted">{formatDuration(session.totalDurationSeconds)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
