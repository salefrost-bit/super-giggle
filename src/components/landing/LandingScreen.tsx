'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { User } from '@supabase/supabase-js';
import { calculateStreak } from '@/lib/domain/streak';
import { getCompletedSessionDates } from '@/lib/supabase/records';
import { StreakInfoModal } from '@/components/streak/StreakInfoModal';

interface LandingScreenProps {
  user: User | null;
  rankSymbol: string;
  dailyDone?: boolean;
  onStartDaily?: () => void;
  onStartWorkout: () => void;
  onRepeatLast?: () => void;
  repeatContext?: string;
  onShowProfile: () => void;
  onShowHowToPlay: () => void;
}

// s21: čipovi + glow CTA. Jezik-selektor i Sign out su na Profile (E5.3 / P4).
export function LandingScreen({
  user,
  rankSymbol,
  dailyDone = false,
  onStartDaily,
  onStartWorkout,
  onRepeatLast,
  repeatContext,
  onShowProfile,
  onShowHowToPlay,
}: LandingScreenProps) {
  const t = useTranslations();
  const [streak, setStreak] = useState<{ days: number; freezesLeftThisWeek: number } | null>(null);
  const [showStreakInfo, setShowStreakInfo] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCompletedSessionDates(user.id)
      .then((dates) => setStreak(calculateStreak(dates, new Date())))
      .catch(() => setStreak(null));
  }, [user]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between px-7 pt-10 pb-9">
      <div className="flex items-center justify-between">
        <button
          onClick={onShowProfile}
          className="flex items-center gap-2 bg-surface border border-white/15 rounded-full pl-1.5 pr-3.5 py-1.5 transition-transform active:scale-95"
        >
          <span
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-black text-accent"
            style={{
              background: 'linear-gradient(160deg, var(--color-surface), var(--color-background))',
              border: '1px solid rgba(204,255,0,.5)',
            }}
          >
            {rankSymbol}
          </span>
          <span className="text-[11px] font-extrabold text-muted">{t('profile.rank')}</span>
        </button>
        <button
          onClick={onShowHowToPlay}
          aria-label={t('landing.howToPlay')}
          className="w-[34px] h-[34px] rounded-full border border-white/15 bg-surface text-muted font-black text-sm transition-transform active:scale-90"
        >
          ?
        </button>
      </div>

      <div className="flex flex-col items-center gap-3.5 text-center">
        <h1 className="text-[42px] font-black tracking-[0.28em] leading-none">{t('landing.appName')}</h1>
        <div className="flex gap-2">
          {user && streak !== null && streak.days > 0 && (
            <button
              onClick={() => setShowStreakInfo(true)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 font-extrabold text-xs bg-surface"
              style={{ border: '1px solid rgba(255,179,64,.35)', color: '#ffcf87' }}
            >
              🔥 {t('landing.streakDays', { days: streak.days })}
            </button>
          )}
          {onStartDaily && (
            <button
              onClick={onStartDaily}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 font-extrabold text-xs bg-surface"
              style={{
                border: `1px solid ${dailyDone ? 'rgba(185,168,255,.35)' : 'rgba(255,255,255,.1)'}`,
                color: dailyDone ? 'var(--color-joker)' : 'var(--color-muted)',
              }}
            >
              {dailyDone ? t('landing.dailyDone') : t('landing.dailyPending')}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          onClick={onStartWorkout}
          className="w-full font-extrabold text-[15px] tracking-wide py-[17px] rounded-2xl bg-accent text-background transition-transform active:scale-[.97]"
          style={{ boxShadow: '0 0 30px rgba(204,255,0,.22)' }}
        >
          {t('landing.dealMeIn')}
        </button>
        {onRepeatLast && (
          <button
            onClick={onRepeatLast}
            className="w-full flex items-center justify-center gap-2 font-bold text-xs py-3.5 rounded-2xl border border-white/15 text-muted transition-transform active:scale-[.97]"
          >
            <span>↻</span>{' '}
            {repeatContext ? t('landing.runItBackContext', { context: repeatContext }) : t('landing.repeatLast')}
          </button>
        )}
        {user ? (
          <p className="text-center text-[11px] text-muted font-semibold">{t('landing.loggedIn')}</p>
        ) : (
          <p className="text-center text-[11px] text-muted font-semibold">
            {t('landing.playingAsGuest')} ·{' '}
            <Link href="/login" className="text-accent font-bold">
              {t('landing.signIn')}
            </Link>
          </p>
        )}
      </div>
      {showStreakInfo && streak !== null && (
        <StreakInfoModal
          days={streak.days}
          freezesLeftThisWeek={streak.freezesLeftThisWeek}
          onClose={() => setShowStreakInfo(false)}
        />
      )}
    </div>
  );
}
