'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { HistoryRow } from '@/components/history/HistoryRow';
import {
  isBestInDimension,
  last14DaysPoints,
  localDayKey,
  monthKey,
} from '@/components/history/historyUtils';
import {
  backfillPoints,
  getSessionDetails,
  getUserSessions,
  type SessionDetails,
  type SessionHistoryEntry,
} from '@/lib/supabase/sessions';

interface HistoryScreenProps {
  userId: string;
  onBack: () => void;
}

function formatMonthLabel(yearMonth: string, locale: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'sr' ? 'sr-RS' : 'en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, 1));
}

export function HistoryScreen({ userId, onBack }: HistoryScreenProps) {
  const t = useTranslations();
  const { locale } = useLocaleSetting();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthIndex, setMonthIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsMap, setDetailsMap] = useState<Record<string, SessionDetails>>({});
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
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
        if (!cancelled) setSessions(sessionRows);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const months = useMemo(() => {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const s of sessions) {
      if (s.status !== 'completed') continue;
      const key = monthKey(new Date(s.completedAt ?? s.startedAt));
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
    // Newest first
    keys.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    if (keys.length === 0) keys.push(monthKey(now));
    return keys;
  }, [sessions, now]);

  const safeMonthIndex = Math.min(monthIndex, months.length - 1);
  const activeMonth = months[safeMonthIndex];
  const monthSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.status === 'completed' && monthKey(new Date(s.completedAt ?? s.startedAt)) === activeMonth
      ),
    [sessions, activeMonth]
  );

  const bars = useMemo(() => last14DaysPoints(sessions, now), [sessions, now]);
  const maxBar = Math.max(1, ...bars);

  const trainedDays = useMemo(() => {
    const days = new Set<number>();
    for (const s of monthSessions) {
      const d = new Date(s.completedAt ?? s.startedAt);
      days.add(d.getDate());
    }
    return days;
  }, [monthSessions]);

  const [year, month] = activeMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday-first offset (0 = Mon … 6 = Sun)
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const todayKey = localDayKey(now);
  const todayInMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;

  const weekdays = useMemo(() => {
    const base = new Date(2026, 0, 5); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'narrow' }).format(
        d
      );
    });
  }, [locale]);

  const chartStartLabel = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
    return new Intl.DateTimeFormat(locale === 'sr' ? 'sr-RS' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  }, [now, locale]);

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
    <div className="min-h-screen flex flex-col gap-[18px] px-[22px] pt-7 pb-8">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-[#3f3f46] bg-[#232327] text-base font-black text-foreground"
        >
          ←
        </button>
        <h1 className="text-2xl font-black text-foreground">{t('historyScreen.title')}</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div data-testid="last-14-days">
            <div className="mb-2.5 text-[11px] font-extrabold tracking-[0.16em] text-[#71717a]">
              {t('historyScreen.last14Days')}
            </div>
            <div className="flex h-14 items-end gap-1">
              {bars.map((points, i) => {
                const isToday = i === 13;
                const h = points === 0 ? 4 : Math.max(8, Math.round((points / maxBar) * 56));
                return (
                  <div
                    key={i}
                    data-testid={`hist-bar-${i}`}
                    data-points={points}
                    className="flex-1 rounded-[3px_3px_2px_2px]"
                    style={{
                      height: h,
                      background: points === 0 ? '#242428' : isToday ? '#ccff00' : 'rgba(204,255,0,.45)',
                      boxShadow: isToday && points > 0 ? '0 0 12px rgba(204,255,0,.5)' : 'none',
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[10px] font-bold text-[#52525b]">{chartStartLabel}</span>
              <span className="text-[10px] font-bold text-[#52525b]">{t('historyScreen.today')}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#71717a]">
                {t('historyScreen.sessions')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="previous month"
                  disabled={safeMonthIndex >= months.length - 1}
                  onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-[#3a3a40] bg-[#232327] text-xs font-black text-muted disabled:opacity-30"
                >
                  ‹
                </button>
                <div
                  data-testid="month-label"
                  className="min-w-[74px] text-center text-xs font-extrabold text-foreground"
                >
                  {formatMonthLabel(activeMonth, locale)}
                </div>
                <button
                  type="button"
                  aria-label="next month"
                  disabled={safeMonthIndex <= 0}
                  onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-[#3a3a40] bg-[#232327] text-xs font-black text-muted disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="mt-1 text-right text-[10px] font-bold text-[#52525b]">
              {t('historyScreen.monthSessions', { count: monthSessions.length })}
            </div>
            <div className="mt-2 flex max-h-[430px] flex-col gap-2 overflow-y-auto pb-6">
              {monthSessions.map((session) => (
                <HistoryRow
                  key={session.id}
                  session={session}
                  details={expandedId === session.id ? (detailsMap[session.id] ?? null) : null}
                  expanded={expandedId === session.id}
                  isBest={isBestInDimension(session, sessions)}
                  onExpand={handleExpand}
                />
              ))}
            </div>
          </div>

          <div data-testid="history-calendar">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#71717a]">
                {t('historyScreen.calendar')}
              </div>
              <div className="text-xs font-extrabold text-muted">
                {formatMonthLabel(activeMonth, locale)}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-[5px]">
              {weekdays.map((d, i) => (
                <div
                  key={i}
                  className="py-0.5 text-center text-[9px] font-extrabold tracking-[0.1em] text-[#52525b]"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const trained = trainedDays.has(day);
                const isToday = day === todayInMonth;
                const dayDate = new Date(year, month - 1, day);
                const future = localDayKey(dayDate) > todayKey;
                return (
                  <div
                    key={day}
                    data-testid={`cal-day-${day}`}
                    data-trained={trained || undefined}
                    data-today={isToday || undefined}
                    className="flex aspect-square items-center justify-center rounded-[9px] text-[11px] font-extrabold"
                    style={{
                      background: trained
                        ? isToday
                          ? '#ccff00'
                          : 'rgba(204,255,0,.16)'
                        : '#1f1f22',
                      border: `1px solid ${
                        isToday ? '#ccff00' : trained ? 'rgba(204,255,0,.3)' : '#2a2a2e'
                      }`,
                      color: isToday
                        ? '#18181b'
                        : trained
                          ? '#ccff00'
                          : future
                            ? '#3f3f46'
                            : '#71717a',
                      boxShadow: isToday ? '0 0 14px rgba(204,255,0,.4)' : 'none',
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 flex justify-center gap-3.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a]">
                <span className="inline-block h-[9px] w-[9px] rounded-[3px] bg-accent" />
                {t('historyScreen.deckClearedLegend')}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#71717a]">
                <span
                  className="inline-block h-[9px] w-[9px] rounded-[3px] box-border"
                  style={{ background: '#232327', border: '1px solid #ccff00' }}
                />
                {t('historyScreen.today')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
