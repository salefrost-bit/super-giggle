'use client';

import { useTranslations } from 'next-intl';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const t = useTranslations();
  return (
    <p className="bg-surface/70 backdrop-blur px-3 py-2 rounded-xl text-[13px] font-bold text-muted">
      {t('workout.cardOf', { current, total })}
    </p>
  );
}
