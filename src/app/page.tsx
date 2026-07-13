'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { SetupScreen } from '@/components/setup/SetupScreen';
import { SessionScreen } from '@/components/session/SessionScreen';
import { SummaryScreen } from '@/components/summary/SummaryScreen';
import { ProgressScreen } from '@/components/progress/ProgressScreen';
import { fetchCategories, buildCategoryIdByKey } from '@/lib/supabase/queries';
import { InfoModal } from '@/components/ui/InfoModal';
import { hasSeenExplanation, markExplained } from '@/lib/modes/explained';
import type { CardDrawResult, CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

type Screen = 'landing' | 'setup' | 'session' | 'summary' | 'history';

export default function Home() {
  const t = useTranslations();
  const { user, isLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [draws, setDraws] = useState<CardDrawResult[]>([]);
  const [categoryIdByKey, setCategoryIdByKey] = useState<Record<CategoryKey, string> | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);

  if (isLoading) return <p className="p-6">{t('common.loading')}</p>;

  async function handleSetupStart(sessionConfig: SessionConfig, sessionDraws: CardDrawResult[]) {
    setConfig(sessionConfig);
    setDraws(sessionDraws);
    if (user) {
      const categories = await fetchCategories();
      setCategoryIdByKey(buildCategoryIdByKey(categories));
    }
    if (sessionConfig.gameMode === 'perfect_deck' && !hasSeenExplanation('perfect_deck')) {
      setShowChallengeIntro(true);
    }
    setScreen('session');
  }

  function handleSessionFinish(sessionResult: SessionResult) {
    setResult(sessionResult);
    setScreen('summary');
  }

  if (screen === 'landing') {
    return (
      <LandingScreen
        user={user}
        onStartWorkout={() => setScreen('setup')}
        onShowHistory={() => setScreen('history')}
        onSignOut={signOut}
      />
    );
  }
  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={handleSetupStart}
        onBack={() => setScreen('landing')}
        userId={user?.id ?? null}
      />
    );
  }
  if (screen === 'session' && config) {
    if (showChallengeIntro) {
      // First perfect_deck run on this device: explain the rules BEFORE the
      // session (and its timers) exist. Dismissal mounts SessionScreen fresh.
      return (
        <InfoModal
          title={t('setup.challengeTitle')}
          closeLabel={t('modes.firstRunCta')}
          onClose={() => {
            markExplained('perfect_deck');
            setShowChallengeIntro(false);
          }}
        >
          {t('modes.perfect_deck.explanation')}
        </InfoModal>
      );
    }
    return (
      <SessionScreen
        config={config}
        draws={draws}
        categoryIdByKey={categoryIdByKey}
        userId={user?.id ?? null}
        onFinish={handleSessionFinish}
      />
    );
  }
  if (screen === 'summary' && result) {
    return (
      <SummaryScreen result={result} isGuest={!user} config={config} onDone={() => setScreen('landing')} />
    );
  }
  if (screen === 'history' && user) {
    return <ProgressScreen userId={user.id} onBack={() => setScreen('landing')} />;
  }
  return null;
}
