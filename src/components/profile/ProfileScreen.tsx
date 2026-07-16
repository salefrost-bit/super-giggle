'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocaleSetting } from '@/i18n/LocaleProvider';
import { LOCALES } from '@/i18n/locales';
import { StatTile } from '@/components/ui/StatTile';
import { XP_RANKS, nextRank, rankForXp } from '@/lib/domain/score';
import { calculateStreak } from '@/lib/domain/streak';
import {
  getCompletedSessionDates,
  getProfileStats,
  getTotalXp,
  type ProfileStats,
} from '@/lib/supabase/records';
import type { Suit } from '@/lib/domain/types';

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
};

const FREEZES_PER_WEEK = 2;

interface ProfileScreenProps {
  userId: string | null;
  onBack: () => void;
  onShowHistory: () => void;
  onSignOut: () => void;
}

function formatHoursAtTable(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function formatNumber(n: number, locale: string): string {
  return n.toLocaleString(locale === 'sr' ? 'sr-RS' : 'en-US');
}

export function ProfileScreen({ userId, onBack, onShowHistory, onSignOut }: ProfileScreenProps) {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleSetting();
  const isGuest = userId == null;

  const [xp, setXp] = useState(0);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [freezesLeft, setFreezesLeft] = useState(FREEZES_PER_WEEK);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(!isGuest);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Loading starts true for logged-in mounts; only clear it in the async callback
    // (avoid sync setState-in-effect lint).
    Promise.all([
      getTotalXp(userId),
      getProfileStats(userId),
      getCompletedSessionDates(userId),
    ])
      .then(([totalXp, profileStats, dates]) => {
        if (cancelled) return;
        setXp(totalXp);
        setStats(profileStats);
        const streak = calculateStreak(dates, new Date());
        setFreezesLeft(streak.freezesLeftThisWeek);
        setStreakDays(streak.days);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStats(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const rank = rankForXp(isGuest ? 0 : xp);
  const next = nextRank(isGuest ? 0 : xp);
  const rankIndex = XP_RANKS.findIndex((r) => r.symbol === rank.symbol);
  const bandStart = rank.threshold;
  const bandEnd = next?.threshold ?? rank.threshold;
  const intoBand = Math.max(0, (isGuest ? 0 : xp) - bandStart);
  const bandSize = Math.max(1, bandEnd - bandStart);
  const progressPct = next ? Math.min(100, (intoBand / bandSize) * 100) : 100;
  const xpToNext = next ? bandEnd - (isGuest ? 0 : xp) : 0;

  return (
    <div className="min-h-screen flex flex-col px-[22px] pt-7 pb-8 gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('common.back')}
            className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-[#3f3f46] bg-[#232327] text-base font-black text-foreground"
          >
            ←
          </button>
          <h1 className="text-2xl font-black text-foreground">{t('profile.title')}</h1>
        </div>
        {!isGuest && streakDays > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
            style={{ background: '#232327', border: '1px solid rgba(255,179,64,.35)' }}
          >
            <span className="text-xs">🔥</span>
            <span className="text-[13px] font-extrabold" style={{ color: '#ffcf87' }}>
              {t('landing.streakDays', { days: streakDays })}
            </span>
          </div>
        )}
      </div>

      <div
        className="relative flex items-center gap-[18px] overflow-hidden rounded-[22px] border p-[18px]"
        style={{
          background: 'linear-gradient(160deg,#26262b,#1d1d20)',
          borderColor: 'rgba(204,255,0,.3)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(204,255,0,.14),transparent 70%)' }}
        />
        <div
          data-testid="rank-symbol"
          className="flex h-[90px] w-16 flex-none flex-col items-center justify-center rounded-[10px] border"
          style={{
            background: 'linear-gradient(160deg,#31313a,#232327)',
            borderColor: 'rgba(204,255,0,.5)',
            boxShadow: '0 0 24px rgba(204,255,0,.18)',
          }}
        >
          <span className="text-[26px] font-black leading-none text-accent">{rank.symbol}</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="text-[11px] font-extrabold tracking-[0.18em] text-muted">{t('profile.rank')}</div>
          <div className="text-[22px] font-black leading-[1.15] text-foreground">{t(rank.nameKey)}</div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-extrabold text-[#71717a]">
              {t('profile.rankProgress', { current: rankIndex, total: XP_RANKS.length - 1 })}
            </span>
            <span className="text-[11px] font-extrabold tabular-nums text-accent">
              {t('profile.xpProgress', {
                xp: formatNumber(intoBand, locale),
                threshold: formatNumber(bandSize, locale),
              })}
            </span>
          </div>
          <div className="mt-1.5 h-[7px] overflow-hidden rounded bg-[#2c2c31]">
            <div
              className="h-full rounded"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg,#8fb300,#ccff00)',
                boxShadow: '0 0 10px rgba(204,255,0,.5)',
              }}
            />
          </div>
          {next && (
            <div className="mt-1 text-[10px] font-bold text-[#52525b]">
              {t('profile.xpToNext', {
                xp: formatNumber(xpToNext, locale),
                name: `${t(next.nameKey)} ${next.symbol}`,
              })}
            </div>
          )}
        </div>
      </div>

      {isGuest ? (
        <div className="rounded-2xl border border-accent/30 bg-surface p-5 text-center">
          <p className="mb-3.5 text-sm font-semibold leading-snug text-muted">{t('profile.guestCta')}</p>
          <Link
            href="/signup"
            className="block w-full rounded-2xl bg-accent p-4 text-[15px] font-extrabold text-background"
          >
            {t('results.createAccount')}
          </Link>
        </div>
      ) : loading || !stats ? (
        <p className="text-center text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="flex gap-2.5">
            <StatTile
              value={
                <span className="text-accent">
                  {stats.bestPoints != null ? formatNumber(stats.bestPoints, locale) : '—'}
                </span>
              }
              label={t('profile.bestScore')}
            />
            <StatTile value={formatNumber(stats.decksCleared, locale)} label={t('profile.decksCleared')} />
            <StatTile value={formatNumber(stats.longestStreak, locale)} label={t('profile.longestStreak')} />
          </div>
          <div className="flex gap-2.5">
            <StatTile value={formatHoursAtTable(stats.totalSeconds)} label={t('profile.hoursAtTable')} />
            <StatTile value={formatNumber(stats.totalReps, locale)} label={t('profile.totalReps')} />
            <StatTile
              value={stats.favoriteSuit ? SUIT_SYMBOL[stats.favoriteSuit] : '—'}
              label={t('profile.favoriteSuit')}
            />
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-[#303036] bg-[#212124] px-4 py-3.5">
            <div className="relative h-[50px] w-14 flex-none">
              <div
                className="absolute left-0 top-0.5 flex h-[46px] w-[34px] items-center justify-center rounded-lg text-sm opacity-70"
                style={{
                  background: 'linear-gradient(160deg,#2b2b36,#222228)',
                  border: '1px solid rgba(185,168,255,.35)',
                  transform: 'rotate(-8deg)',
                }}
              >
                🃏
              </div>
              <div
                className="absolute left-[18px] top-0 flex h-[46px] w-[34px] items-center justify-center rounded-lg text-[15px] motion-safe:animate-[swayK_6s_ease-in-out_infinite]"
                style={{
                  background: 'linear-gradient(160deg,#31313e,#242429)',
                  border: '1px solid rgba(185,168,255,.55)',
                  boxShadow: '0 0 16px rgba(185,168,255,.3)',
                  transform: 'rotate(7deg)',
                }}
              >
                🃏
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-extrabold tracking-[0.1em] text-foreground">
                  {t('profile.jokersTitle')}
                </span>
                <span
                  data-testid="jokers-count"
                  className="text-xs font-black tabular-nums"
                  style={{ color: 'var(--color-joker)' }}
                >
                  {freezesLeft}/{FREEZES_PER_WEEK}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-bold leading-snug text-[#71717a]">
                {t('profile.jokersDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onShowHistory}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-accent/40 bg-transparent py-[15px] text-[13px] font-black tracking-[0.14em] text-accent"
          >
            {t('profile.sessionHistory')} <span className="text-base">→</span>
          </button>
        </>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-[#2c2c31] pt-4">
        <p className="text-[11px] font-extrabold tracking-[0.14em] text-muted uppercase">
          {t('profile.settings')}
        </p>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">{t('language.label')}</span>
          <select
            aria-label={t('language.label')}
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'sr')}
            className="rounded-xl border border-[#3a3a40] bg-[#232327] px-3 py-2 text-sm font-extrabold text-foreground"
          >
            {LOCALES.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] font-semibold text-[#52525b]">{t('settings.languageHint')}</p>
        {!isGuest && (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-1 w-full rounded-2xl border border-white/15 py-3.5 text-sm font-bold text-muted"
          >
            {t('landing.signOut')}
          </button>
        )}
      </div>
    </div>
  );
}
