'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MODES, type ModeDefinition } from '@/lib/modes/registry';
import type { GameMode } from '@/lib/domain/types';

const SPRINT_MINUTES = [3, 5, 10] as const;

// r,g,b komponente iz prototipa (shuffle-prototype.html, chModes c2 vrednosti).
const MODE_RGB: Record<GameMode, string> = {
  classic: '204,255,0',
  daily: '185,168,255',
  perfect_deck: '204,255,0',
  sprint: '255,179,64',
  court: '255,215,94',
  survive: '255,81,71',
};

function splitIcon(title: string): { icon: string; label: string } {
  const [icon, ...rest] = title.split(' ');
  return { icon, label: rest.join(' ') };
}

interface ModeSelectorProps {
  onSelect: (mode: GameMode, options?: { minutes: number }) => void;
  beatChipLabel?: string | null;
  modes?: ModeDefinition[];
}

export function ModeSelector({ onSelect, modes = MODES }: ModeSelectorProps) {
  const t = useTranslations();
  const [expandedId, setExpandedId] = useState<GameMode | null>(null);
  const [sprintMinutes, setSprintMinutes] = useState<number>(5);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight">{t('setup.chooseMode')}</h2>
      <div className="flex flex-col gap-3 flex-1">
        {modes.map((mode) => {
          const rgb = MODE_RGB[mode.id] ?? MODE_RGB.classic;
          const color = `rgb(${rgb})`;
          const isExpanded = expandedId === mode.id;
          const isSprint = mode.id === 'sprint';
          const border = `rgba(${rgb},${isExpanded ? 0.55 : 0.3})`;
          const glow = `rgba(${rgb},${isExpanded ? 0.14 : 0.05})`;
          const soft = `rgba(${rgb},.2)`;
          const { icon, label } = splitIcon(t(mode.titleKey));

          return (
            <div
              key={mode.id}
              className="rounded-[18px] p-4 transition-[border-color,box-shadow] duration-300"
              style={{
                background: 'linear-gradient(160deg,#242428,#1d1d20)',
                border: `1px solid ${border}`,
                boxShadow: `0 0 20px ${glow}`,
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (isSprint ? onSelect(mode.id, { minutes: sprintMinutes }) : onSelect(mode.id))}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[19px] flex-none"
                    style={{
                      background: `radial-gradient(circle at 50% 34%, ${soft}, rgba(0,0,0,.15) 78%), #1d1d20`,
                      border: `1px solid ${border}`,
                    }}
                  >
                    {icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-black" style={{ color }}>
                      {label}
                    </span>
                    <span className="block text-[11px] font-bold text-muted mt-0.5 leading-snug">
                      {t(mode.descKey)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : mode.id)}
                  aria-label={t('modes.infoAria')}
                  aria-expanded={isExpanded}
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-black flex-none"
                  style={{
                    border: '1px solid #3f3f46',
                    background: '#232327',
                    color: isExpanded ? color : 'var(--color-muted)',
                  }}
                >
                  i
                </button>
              </div>

              {isSprint && (
                <div className="flex gap-[7px] mt-2.5 ml-[52px]">
                  {SPRINT_MINUTES.map((minutes) => {
                    const isActive = minutes === sprintMinutes;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setSprintMinutes(minutes)}
                        className="flex-1 text-center text-xs font-black rounded-full py-1.5 transition-all duration-200"
                        style={{
                          color: isActive ? '#18181b' : 'var(--color-muted)',
                          background: isActive ? 'rgb(255,179,64)' : 'transparent',
                          border: `1px solid ${isActive ? 'rgb(255,179,64)' : '#3a3a40'}`,
                        }}
                      >
                        {t('modes.sprint.duration', { minutes })}
                      </button>
                    );
                  })}
                </div>
              )}

              {isExpanded && (
                <div className="motion-safe:animate-[fadeIn_0.25s_ease-out]">
                  <div
                    className="mt-2.5 ml-[52px] rounded-[10px] px-3 py-2.5 text-[11px] font-bold text-muted leading-relaxed"
                    style={{ background: '#1b1b1e' }}
                  >
                    {t(mode.explanationKey)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
