'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { XP_RANKS, rankForXp } from '@/lib/domain/score';
import { MODES } from '@/lib/modes/registry';
import { getTotalXp } from '@/lib/supabase/records';

interface HowToPlayScreenProps {
  userId: string | null;
  onBack: () => void;
}

type ModeRow = {
  id: string;
  glyph: string;
  rgb: string;
  name: string;
  short: string;
  long: string;
};

function splitTitle(title: string): { glyph: string; name: string } {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return { glyph: '♠', name: title };
  return { glyph: parts[0], name: parts.slice(1).join(' ') };
}

function AccordionRow({
  open,
  onToggle,
  glyph,
  rgb,
  title,
  short,
  long,
}: {
  open: boolean;
  onToggle: () => void;
  glyph: ReactNode;
  rgb: string;
  title: string;
  short: string;
  long: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 text-left select-none"
        aria-expanded={open}
      >
        <div
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] text-[13px] font-black"
          style={{
            color: `rgb(${rgb})`,
            background: `radial-gradient(circle at 50% 34%, rgba(${rgb},.28), rgba(0,0,0,.15) 78%), #1d1d20`,
            border: `1px solid rgba(${rgb},.45)`,
            boxShadow: `0 0 12px rgba(${rgb},.25)`,
          }}
        >
          {glyph}
        </div>
        <div className="flex-1 text-xs font-bold leading-snug text-muted">
          <span className="font-extrabold text-foreground">{title}</span>
          {' — '}
          {short}
        </div>
        <span
          className="mt-0.5 flex-none text-[11px] font-black text-[#71717a] transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open ? 280 : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div className="mt-2.5 ml-[42px] rounded-[10px] bg-[#1b1b1e] px-3 py-2.5 text-[11px] font-bold leading-relaxed text-muted text-pretty">
          {long}
        </div>
      </div>
    </div>
  );
}

export function HowToPlayScreen({ userId, onBack }: HowToPlayScreenProps) {
  const t = useTranslations();
  const [xp, setXp] = useState(0);
  const [introOpen, setIntroOpen] = useState(false);
  const [openModeId, setOpenModeId] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getTotalXp(userId)
      .then((total) => {
        if (!cancelled) setXp(total);
      })
      .catch(() => {
        if (!cancelled) setXp(0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const currentRank = rankForXp(userId ? xp : 0);
  const currentIndex = XP_RANKS.findIndex((r) => r.symbol === currentRank.symbol);
  const rankSel = selectedRank ?? currentIndex;

  const challengeModes: ModeRow[] = MODES.filter((m) => m.isChallenge).map((m) => {
    const { glyph, name } = splitTitle(t(m.titleKey));
    const rgbById: Record<string, string> = {
      daily: '185,168,255',
      perfect_deck: '204,255,0',
      sprint: '255,179,64',
      court: '255,215,94',
      survive: '255,81,71',
    };
    return {
      id: m.id,
      glyph,
      rgb: rgbById[m.id] ?? '204,255,0',
      name,
      short: t(m.descKey),
      long: t(m.explanationKey),
    };
  });

  const entryModes: ModeRow[] = [
    {
      id: 'quick',
      glyph: '♦',
      rgb: '255,179,64',
      name: t('landing.entryQuick'),
      short: t('howToPlay.quickDeal.short'),
      long: t('howToPlay.quickDeal.long'),
    },
    {
      id: 'custom',
      glyph: '♣',
      rgb: '185,168,255',
      name: t('landing.entryCustom'),
      short: t('howToPlay.stackTheDeck.short'),
      long: t('howToPlay.stackTheDeck.long'),
    },
    {
      id: 'challenge',
      glyph: '♠',
      rgb: '204,255,0',
      name: t('challengeMenu.title'),
      short: t('howToPlay.challenge.short'),
      long: t('howToPlay.challenge.long'),
    },
  ];

  const jokerMode: ModeRow = {
    id: 'joker',
    glyph: '🃏',
    rgb: '185,168,255',
    name: t('howToPlay.jokerMode.name'),
    short: t('howToPlay.jokerMode.short'),
    long: t('howToPlay.jokerMode.long'),
  };

  const modeRows = [...entryModes, ...challengeModes, jokerMode];

  const selRank = XP_RANKS[rankSel] ?? XP_RANKS[0];
  const selDescKey = selRank.nameKey.replace('ranks.', 'ranksDesc.') as
    | 'ranksDesc.r0'
    | 'ranksDesc.r1'
    | 'ranksDesc.r2'
    | 'ranksDesc.r3'
    | 'ranksDesc.r4'
    | 'ranksDesc.r5'
    | 'ranksDesc.r6'
    | 'ranksDesc.r7'
    | 'ranksDesc.r8'
    | 'ranksDesc.r9'
    | 'ranksDesc.r10'
    | 'ranksDesc.r11'
    | 'ranksDesc.r12'
    | 'ranksDesc.r13';

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-background px-[22px] py-7 text-foreground">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-[#3f3f46] bg-[#232327] text-base font-black text-foreground"
        >
          ←
        </button>
        <h1 className="text-2xl font-black text-foreground">{t('howToPlay.title')}</h1>
      </div>

      {/* Intro accordion */}
      <div className="rounded-2xl border border-[#303036] bg-[#212124] p-4">
        <button
          type="button"
          onClick={() => setIntroOpen((o) => !o)}
          className="flex w-full cursor-pointer items-start gap-3.5 text-left select-none"
          aria-expanded={introOpen}
        >
          <div
            className="flex h-[46px] w-[34px] flex-none items-center justify-center rounded-[7px] border text-[15px] font-black text-accent"
            style={{
              background: 'linear-gradient(160deg,#31313a,#232327)',
              borderColor: 'rgba(204,255,0,.45)',
            }}
          >
            7
          </div>
          <div className="flex-1 text-[13px] font-bold leading-relaxed text-muted text-pretty">
            <span className="font-extrabold text-foreground">{t('howToPlay.deckIsTrainer')}</span>{' '}
            {t('howToPlay.deckIsTrainerDesc')}
          </div>
          <span
            className="mt-0.5 flex-none text-xs font-black text-accent transition-transform duration-300"
            style={{ transform: introOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden
          >
            ▾
          </span>
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
          style={{
            maxHeight: introOpen ? 320 : 0,
            opacity: introOpen ? 1 : 0,
          }}
        >
          <div className="mt-3 border-t border-[#2e2e33] pt-3 text-xs font-bold leading-relaxed text-muted text-pretty">
            {t('howToPlay.suitsExplainer')}
          </div>
        </div>
      </div>

      {/* Modes */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#303036] bg-[#212124] p-4">
        <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#71717a]">
          {t('howToPlay.modesTitle')}
        </div>
        {modeRows.map((m) => (
          <AccordionRow
            key={m.id}
            open={openModeId === m.id}
            onToggle={() => setOpenModeId((id) => (id === m.id ? null : m.id))}
            glyph={m.glyph}
            rgb={m.rgb}
            title={m.name}
            short={m.short}
            long={m.long}
          />
        ))}
      </div>

      {/* Ranks */}
      <div className="rounded-2xl border border-[#303036] bg-[#212124] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#71717a]">
            {t('howToPlay.ranksTitle')}
          </div>
          <div className="text-[10px] font-bold text-[#52525b]">
            {t('howToPlay.yourRank', {
              symbol: currentRank.symbol,
              current: currentIndex,
              total: XP_RANKS.length - 1,
            })}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {XP_RANKS.map((rank, i) => {
            const done = i < currentIndex;
            const active = i === rankSel;
            const tNorm = i / 13;
            const inten = Math.pow(tNorm, 2.6);
            const glow = Math.round(2 + inten * 30);
            const a = 0.06 + inten * 0.6;
            const border = active
              ? '#ccff00'
              : `rgba(204,255,0,${done ? Math.max(0.18, a) : (inten * 0.45).toFixed(2)})`;
            const color = active
              ? '#ccff00'
              : done
                ? '#d4d4d8'
                : i >= 11
                  ? `rgba(204,255,0,${(0.3 + inten * 0.7).toFixed(2)})`
                  : '#52525b';
            return (
              <button
                key={rank.symbol}
                type="button"
                onClick={() => setSelectedRank(i)}
                aria-label={rank.symbol}
                aria-pressed={active}
                className="relative flex aspect-[3/4] items-center justify-center rounded-[9px] transition-[transform,box-shadow,border-color] duration-200"
                style={{
                  background: active
                    ? 'linear-gradient(160deg,#3a3a20,#232327)'
                    : done
                      ? 'linear-gradient(160deg,#2c2c30,#202023)'
                      : '#1d1d20',
                  border: `1px solid ${border}`,
                  boxShadow: active
                    ? '0 0 22px rgba(204,255,0,.55)'
                    : `0 0 ${glow}px rgba(204,255,0,${done ? a : inten * 0.5})`,
                  transform: active ? 'scale(1.12)' : 'none',
                  color,
                }}
              >
                {i === 13 && (
                  <span
                    className="absolute -top-2 text-xs leading-none text-accent"
                    style={{ textShadow: '0 0 10px rgba(204,255,0,.8)' }}
                    aria-hidden
                  >
                    ♚
                  </span>
                )}
                {i === currentIndex && (
                  <span
                    className="absolute -bottom-[7px] rounded-full bg-accent px-1.5 py-0.5 text-[7px] font-black tracking-[0.08em] text-background leading-none"
                    style={{ boxShadow: '0 0 10px rgba(204,255,0,.6)' }}
                  >
                    {t('howToPlay.youBadge')}
                  </span>
                )}
                <span className="text-[15px] font-black leading-none">{rank.symbol}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 min-h-[52px] rounded-xl bg-[#1b1b1e] px-3.5 py-3 box-border">
          <div
            className="text-xs font-black tracking-[0.08em]"
            style={{ color: rankSel === currentIndex ? '#ccff00' : '#fafafa' }}
          >
            {t('howToPlay.rankHeading', {
              name: t(selRank.nameKey).toUpperCase(),
              n: rankSel,
            })}
          </div>
          <div className="mt-1 text-[11px] font-bold leading-snug text-muted text-pretty">
            {t(selDescKey)}
          </div>
        </div>
      </div>

      {/* Streak + jokers */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#303036] bg-[#212124] p-4">
        <div className="flex items-start gap-3.5">
          <svg
            viewBox="0 0 24 28"
            className="h-[19px] w-4 flex-none origin-[50%_95%] animate-[flameK_2.2s_ease-in-out_infinite]"
            aria-hidden
          >
            <path
              d="M12 1 C13.5 7.5 19 10.5 19 17 a7 7 0 0 1 -14 0 C5 11.5 10.5 8 12 1 Z"
              fill="#ffb340"
            />
            <path
              d="M12 12 C12.8 15.8 15.5 17.2 15.5 20.4 a3.5 3.5 0 0 1 -7 0 C8.5 17.4 11.2 15.6 12 12 Z"
              fill="#ffe1a1"
            />
          </svg>
          <p className="text-xs font-bold leading-snug text-muted text-pretty">{t('howToPlay.streakText')}</p>
        </div>
        <div className="flex items-start gap-3.5">
          <span className="inline-block flex-none text-lg" aria-hidden>
            🃏
          </span>
          <p className="text-xs font-bold leading-snug text-muted text-pretty">{t('howToPlay.jokersText')}</p>
        </div>
      </div>

      {/* About */}
      <div className="rounded-2xl border border-[#2c2c31] p-4 text-center">
        <div className="text-base text-accent" aria-hidden>
          ♠
        </div>
        <div className="mt-1.5 text-[11px] font-extrabold tracking-[0.16em] text-[#71717a]">
          {t('howToPlay.aboutTitle')}
        </div>
        <p className="mt-2 text-[11px] font-bold leading-relaxed text-[#71717a] text-pretty">
          {t('howToPlay.aboutText')}
        </p>
      </div>
    </div>
  );
}
