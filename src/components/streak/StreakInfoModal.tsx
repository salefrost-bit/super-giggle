'use client';

import { useTranslations } from 'next-intl';
import { InfoModal } from '@/components/ui/InfoModal';

interface StreakInfoModalProps {
  days: number;
  freezesLeftThisWeek: number;
  onClose: () => void;
}

// Minimal streak-mechanics explainer (spec section 7). The trained/frozen-day
// calendar is Krug B (Progress redesign) — this modal only removes the
// "what are the snowflakes" mystery now.
export function StreakInfoModal({ days, freezesLeftThisWeek, onClose }: StreakInfoModalProps) {
  const t = useTranslations();
  return (
    <InfoModal title={t('streak.title')} closeLabel={t('common.close')} onClose={onClose}>
      <p className="mb-3">{t('streak.explanation')}</p>
      <p className="font-extrabold text-foreground">
        🔥 {t('progress.streak', { days })} ·{' '}
        {t('progress.streakCaption', { freezes: '❄️'.repeat(freezesLeftThisWeek) || '0' })}
      </p>
    </InfoModal>
  );
}
