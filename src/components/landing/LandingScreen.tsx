'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { User } from '@supabase/supabase-js';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { calculateStreak } from '@/lib/domain/streak';
import { getCompletedSessionDates } from '@/lib/supabase/records';
import { StreakInfoModal } from '@/components/streak/StreakInfoModal';
import { LOCALES } from '@/i18n/locales';
import type { AppLocale } from '@/i18n/LocaleProvider';

interface LandingScreenProps {
  user: User | null;
  dailyDone?: boolean;
  onStartDaily?: () => void;
  onStartWorkout: () => void;
  onRepeatLast?: () => void;
  onShowHistory: () => void;
  onSignOut: () => void;
}

export function LandingScreen({
  user,
  dailyDone = false,
  onStartDaily,
  onStartWorkout,
  onRepeatLast,
  onShowHistory,
  onSignOut,
}: LandingScreenProps) {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleSetting();
  const [streak, setStreak] = useState<{ days: number; freezesLeftThisWeek: number } | null>(null);
  const [showStreakInfo, setShowStreakInfo] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCompletedSessionDates(user.id)
      .then((dates) => setStreak(calculateStreak(dates, new Date())))
      .catch(() => setStreak(null));
  }, [user]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between px-7 pt-12 pb-9">
      <div className="absolute top-4 right-5">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as AppLocale)}
          aria-label={t('language.label')}
          className="bg-surface text-foreground text-sm font-bold rounded-xl px-3 py-2 border-2 border-white/15"
        >
          {LOCALES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div />
      <div className="flex flex-col items-center gap-[18px] text-center">
        <div className="w-[88px] h-[88px] rounded-3xl bg-surface border-2 border-accent/50 flex items-center justify-center text-[40px] font-black text-accent">
          ♠
        </div>
        <div>
          <h1 className="text-[38px] font-black leading-[1.05] tracking-tight">{t('landing.appName')}</h1>
          <p className="text-base font-semibold text-muted mt-2 leading-snug whitespace-pre-line">
            {t('landing.tagline')}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {onStartDaily && (
          <button
            onClick={onStartDaily}
            className="text-center text-accent font-extrabold"
          >
            {dailyDone ? t('landing.dailyDone') : t('landing.dailyPending')}
          </button>
        )}
        {user ? (
          <>
            {streak !== null && streak.days > 0 && (
              <button
                onClick={() => setShowStreakInfo(true)}
                className="text-center text-accent font-extrabold"
              >
                🔥 {t('landing.streakDays', { days: streak.days })}
              </button>
            )}
            <p className="text-center text-[13px] text-muted font-semibold">{t('landing.loggedIn')}</p>
            <button
              onClick={onStartWorkout}
              className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg"
            >
              {t('landing.newWorkout')}
            </button>
            {onRepeatLast && (
              <button
                onClick={onRepeatLast}
                className="border-2 border-white/15 text-foreground rounded-[18px] p-5 font-extrabold text-lg"
              >
                {t('landing.repeatLast')}
              </button>
            )}
            <button onClick={onShowHistory} className="text-accent font-bold text-[15px] p-1.5">
              {t('landing.viewProgress')}
            </button>
            <button onClick={onSignOut} className="text-sm text-muted underline">
              {t('landing.signOut')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartWorkout}
              className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg"
            >
              {t('landing.continueGuest')}
            </button>
            {onRepeatLast && (
              <button
                onClick={onRepeatLast}
                className="border-2 border-white/15 text-foreground rounded-[18px] p-5 font-extrabold text-lg"
              >
                {t('landing.repeatLast')}
              </button>
            )}
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 border-2 border-white/15 text-foreground rounded-2xl p-3.5 font-bold text-[15px] text-center"
              >
                {t('landing.login')}
              </Link>
              <Link
                href="/signup"
                className="flex-1 border-2 border-white/15 text-foreground rounded-2xl p-3.5 font-bold text-[15px] text-center"
              >
                {t('landing.signup')}
              </Link>
            </div>
          </>
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
