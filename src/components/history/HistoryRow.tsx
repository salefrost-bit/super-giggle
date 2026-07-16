'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MODES } from '@/lib/modes/registry';
import { avgSecondsPerCard } from '@/components/history/historyUtils';
import type { SessionHistoryEntry, SessionDetails } from '@/lib/supabase/sessions';
import type { GameMode, Suit } from '@/lib/domain/types';

const SUIT_ORDER: Suit[] = ['hearts', 'clubs', 'spades', 'diamonds'];
const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  clubs: '♣',
  spades: '♠',
  diamonds: '♦',
};
const SUIT_COLOR: Record<Suit, string> = {
  hearts: 'var(--color-suit-hearts)',
  clubs: 'var(--color-suit-clubs)',
  spades: 'var(--color-suit-spades)',
  diamonds: 'var(--color-suit-diamonds)',
};

const MODE_RGB: Record<string, string> = {
  classic: '204,255,0',
  daily: '185,168,255',
  perfect_deck: '204,255,0',
  sprint: '255,179,64',
  court: '255,215,94',
  survive: '255,81,71',
};

interface HistoryRowProps {
  session: SessionHistoryEntry;
  details: SessionDetails | null;
  isBest: boolean;
  expanded: boolean;
  onExpand: (sessionId: string) => void;
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function modeIconFromTitle(title: string, gameMode: string): string {
  if (gameMode === 'classic') return '🃏';
  const [icon] = title.split(' ');
  return icon || '🃏';
}

export function HistoryRow({ session, details, isBest, expanded, onExpand }: HistoryRowProps) {
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Spec v0.4.6 §4: lista živi u kutiji sa unutrašnjim skrolom (max-h) — red
  // raširen pri dnu otvara detalje ispod ivice kutije. Doskroluj red u vidno
  // polje kad se raširi i kad detalji stignu (menjaju visinu). jsdom nema
  // scrollIntoView, otuda opcioni poziv.
  useEffect(() => {
    if (!expanded) return;
    rootRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [expanded, details]);
  const dateLabel = new Date(session.startedAt).toLocaleDateString();
  const rgb = MODE_RGB[session.gameMode] ?? MODE_RGB.classic;
  const modeDef = MODES.find((m) => m.id === (session.gameMode as GameMode));
  const rawTitle = modeDef
    ? t(modeDef.titleKey)
    : session.entry === 'custom'
      ? t('landing.entryCustom')
      : session.entry === 'quick'
        ? t('landing.entryQuick')
        : session.gameMode;
  const icon = modeIconFromTitle(rawTitle, session.gameMode);
  const title = rawTitle.replace(/^\S+\s+/, '') || rawTitle;
  // card_count je uvek deckSize (52) i za Blitz/Preživi — tamo važi broj odrađenih karata
  const cards =
    session.gameMode === 'sprint'
      ? (session.cardsCompleted ?? session.totalCards)
      : session.gameMode === 'survive'
        ? (session.survivedCards ?? session.totalCards)
        : (session.cardCount ?? session.totalCards);
  const avg = avgSecondsPerCard(session);
  const scoreColor = isBest ? 'var(--color-accent)' : 'var(--color-foreground)';

  return (
    <div
      ref={rootRef}
      data-testid={`history-row-${session.id}`}
      className="rounded-[14px] overflow-hidden transition-[border-color] duration-250"
      style={{
        background: '#212124',
        border: `1px solid ${expanded ? 'rgba(204,255,0,.35)' : '#303036'}`,
      }}
    >
      <button
        type="button"
        onClick={() => onExpand(session.id)}
        className="flex w-full items-center gap-3 px-3.5 py-[9px] text-left"
      >
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-base font-black"
          style={{
            background: `radial-gradient(circle at 50% 34%, rgba(${rgb},.22), rgba(0,0,0,.15) 78%), #1d1d20`,
            border: `1px solid rgba(${rgb},.4)`,
            boxShadow: `0 0 14px rgba(${rgb},.25)`,
            color: `rgb(${rgb})`,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-extrabold text-foreground">{title}</span>
            {isBest && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-black tracking-[0.1em] text-background">
                {t('historyScreen.best')}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-[#71717a]">
            {dateLabel} · {t('progress.cardsLine', { count: cards })} · ⏱{' '}
            {formatDuration(session.totalDurationSeconds)}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-base font-black tabular-nums" style={{ color: scoreColor }}>
            {session.points != null ? session.points.toLocaleString() : '—'}
          </div>
          <div className="text-[8px] font-extrabold tracking-[0.14em] text-[#52525b]">
            {t('historyScreen.points')}
          </div>
        </div>
        <div
          className="flex-none text-xs font-black text-[#71717a] transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-0.5">
          <div className="h-px bg-[#2e2e33]" />
          <div className="flex gap-2">
            <div className="flex-1 rounded-[10px] bg-[#1b1b1e] p-2 text-center">
              <div className="text-[15px] font-black tabular-nums text-accent">
                {session.points != null ? `+${session.points}` : '—'}
              </div>
              <div className="mt-0.5 text-[8px] font-extrabold tracking-[0.12em] text-[#52525b]">
                {t('historyScreen.xp')}
              </div>
            </div>
            <div className="flex-1 rounded-[10px] bg-[#1b1b1e] p-2 text-center">
              <div className="text-[15px] font-black tabular-nums text-foreground">
                {formatDuration(session.totalPauseSeconds ?? 0)}
              </div>
              <div className="mt-0.5 text-[8px] font-extrabold tracking-[0.12em] text-[#52525b]">
                {t('historyScreen.paused')}
              </div>
            </div>
            <div className="flex-1 rounded-[10px] bg-[#1b1b1e] p-2 text-center">
              <div className="text-[15px] font-black tabular-nums text-foreground">
                {avg != null ? `${avg.toFixed(1)}s` : '—'}
              </div>
              <div className="mt-0.5 text-[8px] font-extrabold tracking-[0.12em] text-[#52525b]">
                {t('historyScreen.avgPerCard')}
              </div>
            </div>
          </div>
          {details && (
            <div className="flex gap-2" data-testid="reps-by-suit">
              {SUIT_ORDER.map((suit) => (
                <div
                  key={suit}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#1b1b1e] px-2 py-2"
                >
                  <span className="text-[13px]" style={{ color: SUIT_COLOR[suit] }}>
                    {SUIT_SYMBOL[suit]}
                  </span>
                  <span className="text-xs font-extrabold tabular-nums text-muted">
                    {details.repsBySuit[suit]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
