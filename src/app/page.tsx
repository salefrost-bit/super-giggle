'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { SetupScreen } from '@/components/setup/SetupScreen';
import { SessionScreen } from '@/components/session/SessionScreen';
import { SummaryScreen } from '@/components/summary/SummaryScreen';
import { HistoryScreen } from '@/components/history/HistoryScreen';
import { fetchCategories, buildCategoryIdByKey } from '@/lib/supabase/queries';
import type { CardDrawResult, CategoryKey, SessionConfig, SessionResult } from '@/lib/domain/types';

type Screen = 'landing' | 'setup' | 'session' | 'summary' | 'history';

export default function Home() {
  const { user, isLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [draws, setDraws] = useState<CardDrawResult[]>([]);
  const [categoryIdByKey, setCategoryIdByKey] = useState<Record<CategoryKey, string> | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);

  if (isLoading) return <p className="p-6">Učitavanje...</p>;

  async function handleSetupStart(sessionConfig: SessionConfig, sessionDraws: CardDrawResult[]) {
    setConfig(sessionConfig);
    setDraws(sessionDraws);
    if (user) {
      const categories = await fetchCategories();
      setCategoryIdByKey(buildCategoryIdByKey(categories));
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
    return <HistoryScreen userId={user.id} onBack={() => setScreen('landing')} />;
  }
  return null;
}
