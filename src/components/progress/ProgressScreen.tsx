'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { calculateStreak } from '@/lib/domain/streak';
import { rankForXp, nextRank } from '@/lib/domain/score';
import { getPersonalRecords, getCompletedSessionDates, getTotalXp, type PersonalRecord } from '@/lib/supabase/records';
import {
  getUserSessions,
  getSessionDetails,
  backfillPoints,
  type SessionHistoryEntry,
  type SessionDetails,
} from '@/lib/supabase/sessions';
import { StreakInfoModal } from '@/components/streak/StreakInfoModal';
import { InfoModal } from '@/components/ui/InfoModal';
import { HistoryRow } from '@/components/history/HistoryRow';
import { isBestInDimension } from '@/components/history/historyUtils';

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

function pointsRecordKey(session: SessionHistoryEntry): string | null {
  if (session.points === null || session.status !== 'completed') return null;
  if (session.gameMode === 'classic' || session.gameMode === 'perfect_deck') {
    return `${session.gameMode}|${session.cardCount ?? session.totalCards}`;
  }
  if (session.gameMode === 'sprint') {
    if (session.sprintMinutes == null) return null;
    return `sprint|${session.sprintMinutes}`;
  }
  if (session.gameMode === 'court' || session.gameMode === 'survive' || session.gameMode === 'daily') {
    return session.gameMode;
  }
  return `${session.gameMode}|${session.cardCount ?? session.totalCards}`;
}

function pointsRecordDimensionLabel(
  session: SessionHistoryEntry,
  t: ReturnType<typeof useTranslations>
): string {
  if (session.gameMode === 'classic' || session.gameMode === 'perfect_deck') {
    return t('progress.cardsLine', { count: session.cardCount ?? session.totalCards });
  }
  if (session.gameMode === 'sprint' && session.sprintMinutes != null) {
    return t('progress.sprintDim', { minutes: session.sprintMinutes });
  }
  switch (session.gameMode) {
    case 'court':
      return '🏀';
    case 'survive':
      return '💀';
    case 'daily':
      return '📅';
    default:
      return session.gameMode;
  }
}

function aggregatePointsRecords(sessions: SessionHistoryEntry[]): SessionHistoryEntry[] {
  const bestByKey = new Map<string, SessionHistoryEntry>();
  for (const session of sessions) {
    const key = pointsRecordKey(session);
    if (!key) continue;
    const existing = bestByKey.get(key);
    if (!existing || (session.points ?? 0) > (existing.points ?? 0)) {
      bestByKey.set(key, session);
    }
  }
  return Array.from(bestByKey.values());
}

export function ProgressScreen({ userId, onBack }: ProgressScreenProps) {
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [streak, setStreak] = useState({ days: 0, freezesLeftThisWeek: 2 });
  const [xp, setXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [showXpInfo, setShowXpInfo] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsMap, setDetailsMap] = useState<Record<string, SessionDetails>>({});

  useEffect(() => {
    async function load() {
      try {
        let sessionRows = await getUserSessions(userId);
        const needsBackfill = sessionRows.filter(
          (s) => s.status === 'completed' && s.points === null
        );
        if (needsBackfill.length > 0) {
          await Promise.all(needsBackfill.map((s) => backfillPoints(s.id, s.gameMode)));
          sessionRows = await getUserSessions(userId);
        }

        const [recordRows, dates, totalXp] = await Promise.all([
          getPersonalRecords(userId),
          getCompletedSessionDates(userId),
          getTotalXp(userId),
        ]);

        setSessions(sessionRows);
        setRecords(recordRows);
        setStreak(calculateStreak(dates, new Date()));
        setXp(totalXp);
      } catch (err) {
        console.error('Failed to load progress data', err);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [userId]);

  const pointsRecords = useMemo(() => aggregatePointsRecords(sessions), [sessions]);
  const rank = rankForXp(xp);
  const next = nextRank(xp);

  const handleExpand = useCallback(
    async (sessionId: string) => {
      if (expandedId === sessionId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(sessionId);
      if (!detailsMap[sessionId]) {
        try {
          const details = await getSessionDetails(sessionId);
          setDetailsMap((prev) => ({ ...prev, [sessionId]: details }));
        } catch (err) {
          console.error('Failed to load session details', err);
        }
      }
    },
    [expandedId, detailsMap]
  );

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
          <button
            type="button"
            onClick={() => setShowStreakInfo(true)}
            className="bg-surface rounded-2xl p-4 flex items-center gap-3 mb-5 text-left w-full"
          >
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-2xl font-black leading-none">
                {t('progress.streak', { days: streak.days })}
              </p>
              <p className="text-xs text-muted font-semibold mt-1">
                {t('progress.streakCaption', { freezes: '🃏'.repeat(streak.freezesLeftThisWeek) || '0' })}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowXpInfo(true)}
            className="bg-surface rounded-2xl p-4 flex items-center gap-3 mb-5 text-left w-full"
          >
            <span className="text-4xl leading-none">{rank.symbol}</span>
            <div>
              <p className="text-2xl font-black leading-none">
                {xp} {t('xp.label')}
              </p>
              {next && (
                <p className="text-xs text-muted font-semibold mt-1 tabular-nums">
                  {xp} / {next.threshold}
                </p>
              )}
            </div>
          </button>

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

          {pointsRecords.length > 0 && (
            <>
              <p className="text-xs font-extrabold text-muted tracking-widest uppercase mb-2">
                {t('progress.pointsRecordsTitle')}
              </p>
              <div className="flex flex-col gap-2 mb-5">
                {pointsRecords.map((session) => (
                  <div
                    key={pointsRecordKey(session)!}
                    className="bg-surface rounded-xl px-3.5 py-3 flex justify-between items-center"
                  >
                    <p className="text-sm font-bold">
                      {pointsRecordDimensionLabel(session, t)} · {session.difficultyName}
                    </p>
                    <p className="text-sm font-black text-accent tabular-nums">{session.points}</p>
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
                <HistoryRow
                  key={session.id}
                  session={session}
                  details={expandedId === session.id ? detailsMap[session.id] ?? null : null}
                  expanded={expandedId === session.id}
                  isBest={isBestInDimension(session, sessions)}
                  onExpand={handleExpand}
                />
              ))}
            </div>
          )}

          {showStreakInfo && (
            <StreakInfoModal
              days={streak.days}
              freezesLeftThisWeek={streak.freezesLeftThisWeek}
              onClose={() => setShowStreakInfo(false)}
            />
          )}
          {showXpInfo && (
            <InfoModal
              title={t('xp.rankTitle')}
              closeLabel={t('common.close')}
              onClose={() => setShowXpInfo(false)}
            >
              {t('xp.explanation')}
            </InfoModal>
          )}
        </>
      )}
    </div>
  );
}
