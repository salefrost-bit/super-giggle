'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';
import { LandingScreen } from '@/components/landing/LandingScreen';
import { SetupScreen } from '@/components/setup/SetupScreen';
import { SessionScreen } from '@/components/session/SessionScreen';
import { SummaryScreen } from '@/components/summary/SummaryScreen';
import { ProgressScreen } from '@/components/progress/ProgressScreen';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import {
  fetchCategories,
  buildCategoryIdByKey,
  fetchAllExercises,
  fetchDifficultyLevels,
} from '@/lib/supabase/queries';
import { getBestDurationSeconds, getBestScore, getTotalXp } from '@/lib/supabase/records';
import { InfoModal } from '@/components/ui/InfoModal';
import { hasSeenExplanation, markExplained } from '@/lib/modes/explained';
import { MODES } from '@/lib/modes/registry';
import { loadLastConfig, validateLastConfig } from '@/lib/domain/lastConfig';
import type { LastConfig } from '@/lib/domain/lastConfig';
import { drawSessionCards, createCourtDeck } from '@/lib/domain/deck';
import { buildDraws } from '@/lib/domain/draws';
import { calculateReps } from '@/lib/domain/reps';
import { calculateParSeconds, resolveBudget } from '@/lib/domain/challenge';
import { buildDailySession, dailyDateString, isDailyDoneLocal } from '@/lib/domain/daily';
import { hasDailyForDate } from '@/lib/supabase/sessions';
import { SUIT_TO_CATEGORY } from '@/lib/domain/types';
import type { CardDrawResult, CategoryKey, Exercise, SessionConfig, SessionResult } from '@/lib/domain/types';
import { rankForXp } from '@/lib/domain/score';

type Screen = 'landing' | 'setup' | 'session' | 'summary' | 'profile' | 'history' | 'how-to-play';

// "Run it back · {context}" (s21) — entry naziv + dužina iz LastConfig; za
// challenge stazu prikazuje ime moda (i minute za Blitz) jer deckSize tu nije
// smislen (sprint čuva fiksnih 52, daily fiksnih 20 — spec §9, ništa se ne dira).
function describeLastConfig(
  cfg: LastConfig,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): string {
  if (cfg.entry === 'challenge') {
    const modeDef = MODES.find((m) => m.id === cfg.gameMode);
    const modeLabel = modeDef ? t(modeDef.titleKey) : cfg.gameMode;
    if (cfg.gameMode === 'sprint' && cfg.sprintMinutes != null) {
      return `${modeLabel}, ${t('landing.minutesShort', { minutes: cfg.sprintMinutes })}`;
    }
    return modeLabel;
  }
  const entryLabel = cfg.entry === 'custom' ? t('landing.entryCustom') : t('landing.entryQuick');
  const lengthLabel =
    cfg.deckSize === 12
      ? t('setup.quarterLabel')
      : cfg.deckSize === 24
        ? t('setup.halfLabel')
        : cfg.deckSize === 52
          ? t('setup.fullLabel')
          : t('progress.cardsLine', { count: cfg.deckSize });
  return `${entryLabel}, ${lengthLabel}`;
}

function splitIcon(title: string): { icon: string; label: string } {
  const [icon, ...rest] = title.split(' ');
  return { icon, label: rest.join(' ') };
}

// s22: prvi-put modal (mod/jokeri objašnjenje pre prve sesije tog tipa) —
// bespoke centrirana kartica, za razliku od generičkog InfoModal bottom-sheet-a
// koji ostaje nepromenjen za StreakInfoModal/formula modal (van obima Task 11).
function FirstRunModal({
  title,
  kicker,
  body,
  ctaLabel,
  onClose,
}: {
  title: string;
  kicker: string;
  body: string;
  ctaLabel: string;
  onClose: () => void;
}) {
  const { icon, label } = splitIcon(title);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(10,10,13,.72)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[390px] rounded-3xl p-6 motion-safe:animate-[badgeK_0.45s_cubic-bezier(.2,.9,.3,1.3)]"
        style={{
          background: 'linear-gradient(160deg,#26262b,#1d1d20)',
          border: '1px solid rgba(204,255,0,.4)',
          boxShadow: '0 0 50px rgba(204,255,0,.15), 0 24px 50px rgba(0,0,0,.6)',
        }}
      >
        <span
          className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl mx-auto"
          style={{
            background: 'radial-gradient(circle at 50% 34%, rgba(204,255,0,.25), rgba(0,0,0,.15) 78%), #1d1d20',
            border: '1px solid rgba(204,255,0,.45)',
          }}
        >
          {icon}
        </span>
        <p className="text-[22px] font-black text-center mt-3.5">{label}</p>
        <p className="text-[10px] font-extrabold tracking-[0.2em] text-accent text-center mt-1 uppercase">
          {kicker}
        </p>
        <p className="text-[13px] font-bold text-muted text-center leading-relaxed mt-3.5">{body}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full font-extrabold text-sm tracking-[0.12em] py-4 rounded-2xl mt-[18px] bg-accent text-background"
          style={{ boxShadow: '0 0 26px rgba(204,255,0,.3)' }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const t = useTranslations();
  const { user, isLoading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [draws, setDraws] = useState<CardDrawResult[]>([]);
  const [categoryIdByKey, setCategoryIdByKey] = useState<Record<CategoryKey, string> | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [introStep, setIntroStep] = useState<'jokers' | 'challenge' | null>(null);
  const [pendingChallengeIntro, setPendingChallengeIntro] = useState(false);
  const [canRepeatLast, setCanRepeatLast] = useState(false);
  const [repeatContext, setRepeatContext] = useState<string | undefined>(undefined);
  const [dailyDone, setDailyDone] = useState(false);
  const [rankSymbol, setRankSymbol] = useState('🃏');

  useEffect(() => {
    if (screen !== 'landing') return;
    let cancelled = false;

    async function checkLandingState() {
      const dateString = dailyDateString(new Date());
      if (user?.id) {
        try {
          const done = await hasDailyForDate(user.id, dateString);
          if (!cancelled) setDailyDone(done);
        } catch {
          if (!cancelled) setDailyDone(false);
        }
        try {
          const xp = await getTotalXp(user.id);
          if (!cancelled) setRankSymbol(rankForXp(xp).symbol);
        } catch {
          if (!cancelled) setRankSymbol('🃏');
        }
      } else {
        if (!cancelled) setDailyDone(isDailyDoneLocal(dateString));
        if (!cancelled) setRankSymbol('🃏');
      }

      const last = loadLastConfig();
      if (!cancelled) setRepeatContext(last ? describeLastConfig(last, t) : undefined);
      if (
        !last ||
        (last.gameMode !== 'classic' &&
          last.gameMode !== 'perfect_deck' &&
          last.gameMode !== 'sprint' &&
          last.gameMode !== 'court' &&
          last.gameMode !== 'survive' &&
          last.gameMode !== 'daily')
      ) {
        if (!cancelled) setCanRepeatLast(false);
        return;
      }
      if (last.gameMode === 'daily') {
        if (!cancelled) setCanRepeatLast(true);
        return;
      }
      try {
        const [exercises] = await Promise.all([fetchAllExercises(), fetchDifficultyLevels()]);
        if (!cancelled) setCanRepeatLast(validateLastConfig(last, exercises));
      } catch {
        if (!cancelled) setCanRepeatLast(false);
      }
    }

    void checkLandingState();
    return () => {
      cancelled = true;
    };
  }, [screen, user?.id, t]);

  if (isLoading) return <p className="p-6">{t('common.loading')}</p>;

  async function handleSetupStart(sessionConfig: SessionConfig, sessionDraws: CardDrawResult[]) {
    setConfig(sessionConfig);
    setDraws(sessionDraws);
    if (user) {
      const categories = await fetchCategories();
      setCategoryIdByKey(buildCategoryIdByKey(categories));
    }
    const modeDef = MODES.find((m) => m.id === sessionConfig.gameMode);
    const needsChallengeIntro = !!(
      modeDef?.isChallenge &&
      sessionConfig.gameMode &&
      !hasSeenExplanation(sessionConfig.gameMode)
    );
    const needsJokersIntro = !hasSeenExplanation('jokers');
    if (needsJokersIntro) {
      setPendingChallengeIntro(needsChallengeIntro);
      setIntroStep('jokers');
    } else if (needsChallengeIntro) {
      setIntroStep('challenge');
    }
    setScreen('session');
  }

  function handleSessionFinish(sessionResult: SessionResult) {
    setResult(sessionResult);
    setScreen('summary');
  }

  async function handleStartDaily() {
    const [allExercises, levels, categories] = await Promise.all([
      fetchAllExercises(),
      fetchDifficultyLevels(),
      fetchCategories(),
    ]);
    const { config: dailyConfig, draws: dailyDraws } = buildDailySession({
      exercises: allExercises,
      categories,
      levels,
    });
    await handleSetupStart(dailyConfig, dailyDraws);
  }

  async function handleRepeatLast() {
    const last = loadLastConfig();
    if (
      !last ||
      (last.gameMode !== 'classic' &&
        last.gameMode !== 'perfect_deck' &&
        last.gameMode !== 'sprint' &&
        last.gameMode !== 'court' &&
        last.gameMode !== 'survive' &&
        last.gameMode !== 'daily')
    ) {
      return;
    }

    if (last.gameMode === 'daily') {
      await handleStartDaily();
      return;
    }

    const [allExercises, levels] = await Promise.all([
      fetchAllExercises(),
      fetchDifficultyLevels(),
    ]);
    if (!validateLastConfig(last, allExercises)) {
      setCanRepeatLast(false);
      return;
    }

    const difficulty = levels.find((level) => level.id === last.difficultyLevelId);
    if (!difficulty && last.gameMode !== 'sprint') {
      setCanRepeatLast(false);
      return;
    }

    const categoryKeys: CategoryKey[] = ['push', 'pull', 'legs', 'core'];
    const exerciseByCategory = {} as Record<CategoryKey, Exercise>;
    for (const key of categoryKeys) {
      const exercise = allExercises.find((item) => item.id === last.exerciseIds[key]);
      if (!exercise) {
        setCanRepeatLast(false);
        return;
      }
      exerciseByCategory[key] = exercise;
    }

    if (last.gameMode === 'sprint') {
      if (last.sprintMinutes == null) {
        setCanRepeatLast(false);
        return;
      }
      const sprintDifficulty =
        difficulty ?? levels.find((level) => level.defaultRepMultiplier === 1.0);
      if (!sprintDifficulty) {
        setCanRepeatLast(false);
        return;
      }
      const cards = drawSessionCards(52);
      const sessionDraws = buildDraws(cards, exerciseByCategory, 1.0, false);
      await handleSetupStart(
        {
          difficultyLevelId: sprintDifficulty.id,
          repMultiplier: 1.0,
          deckSize: 52,
          exerciseByCategory,
          entry: last.entry,
          gameMode: 'sprint',
          sprintMinutes: last.sprintMinutes,
        },
        sessionDraws
      );
      return;
    }

    if (!difficulty) {
      setCanRepeatLast(false);
      return;
    }

    const cards = last.gameMode === 'court' ? createCourtDeck() : drawSessionCards(last.deckSize);
    const mode = last.gameMode;
    const draws: CardDrawResult[] = cards.map((card, index) => {
      const categoryKey = SUIT_TO_CATEGORY[card.suit];
      return {
        orderIndex: index,
        card,
        categoryKey,
        exercise: exerciseByCategory[categoryKey],
        reps: calculateReps(card, last.repMultiplier),
        completedAt: null,
        beatQuota: mode === 'perfect_deck' || mode === 'court' ? null : undefined,
      };
    });

    const sessionConfig: SessionConfig = {
      difficultyLevelId: last.difficultyLevelId,
      repMultiplier: last.repMultiplier,
      deckSize: last.deckSize,
      exerciseByCategory,
      entry: last.entry,
      gameMode: mode,
    };

    if (mode === 'perfect_deck') {
      const totalReps = draws.reduce((sum, draw) => sum + draw.reps, 0);
      const par = calculateParSeconds(totalReps, last.deckSize, difficulty);
      let record: number | null = null;
      let bestScore: number | null = null;
      if (user?.id) {
        try {
          [record, bestScore] = await Promise.all([
            getBestDurationSeconds(user.id, last.difficultyLevelId, last.deckSize),
            getBestScore(user.id, last.difficultyLevelId, last.deckSize),
          ]);
        } catch (err) {
          console.error('Failed to fetch record/best score, falling back to par', err);
        }
      }
      const { budgetSeconds, parSource } = resolveBudget(par, record);
      sessionConfig.budgetSeconds = budgetSeconds;
      sessionConfig.parSource = parSource;
      sessionConfig.bestScoreForCombo = bestScore;
      sessionConfig.parSecondsPerRep = difficulty.parSecondsPerRep;
      sessionConfig.parTransitionSeconds = difficulty.parTransitionSeconds;
    } else if (mode === 'court') {
      const totalReps = draws.reduce((sum, draw) => sum + draw.reps, 0);
      const par = calculateParSeconds(totalReps, 16, difficulty);
      sessionConfig.budgetSeconds = par;
      sessionConfig.parSource = 'par';
      sessionConfig.parSecondsPerRep = difficulty.parSecondsPerRep;
      sessionConfig.parTransitionSeconds = difficulty.parTransitionSeconds;
    } else if (mode === 'survive') {
      sessionConfig.parSecondsPerRep = difficulty.parSecondsPerRep;
      sessionConfig.parTransitionSeconds = difficulty.parTransitionSeconds;
    }

    await handleSetupStart(sessionConfig, draws);
  }

  if (screen === 'landing') {
    return (
      <LandingScreen
        user={user}
        rankSymbol={rankSymbol}
        dailyDone={dailyDone}
        onStartDaily={handleStartDaily}
        onStartWorkout={() => setScreen('setup')}
        onRepeatLast={canRepeatLast ? handleRepeatLast : undefined}
        repeatContext={repeatContext}
        onShowProfile={() => setScreen('profile')}
        onShowHowToPlay={() => setScreen('how-to-play')}
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
    if (introStep === 'jokers') {
      return (
        <FirstRunModal
          title={t('jokers.title')}
          kicker={t('modes.firstRunKicker')}
          body={t('jokers.explanation')}
          ctaLabel={t('modes.firstRunCta')}
          onClose={() => {
            markExplained('jokers');
            setIntroStep(pendingChallengeIntro ? 'challenge' : null);
          }}
        />
      );
    }
    if (introStep === 'challenge') {
      const modeDef = MODES.find((m) => m.id === config.gameMode);
      return (
        <FirstRunModal
          title={t(modeDef?.titleKey ?? 'setup.challengeTitle')}
          kicker={t('modes.firstRunKicker')}
          body={t(modeDef?.explanationKey ?? 'modes.perfect_deck.explanation')}
          ctaLabel={t('modes.firstRunCta')}
          onClose={() => {
            if (config.gameMode) markExplained(config.gameMode);
            setIntroStep(null);
          }}
        />
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
      <SummaryScreen
        result={result}
        isGuest={!user}
        config={config}
        userId={user?.id ?? null}
        onDone={() => setScreen('landing')}
      />
    );
  }
  if (screen === 'profile') {
    return (
      <ProfileScreen
        userId={user?.id ?? null}
        onBack={() => setScreen('landing')}
        onShowHistory={() => setScreen(user ? 'history' : 'landing')}
        onSignOut={signOut}
      />
    );
  }
  // Privremeno do Task 17 (HistoryScreen) — ProgressScreen drži istoriju.
  if (screen === 'history' && user) {
    return <ProgressScreen userId={user.id} onBack={() => setScreen('profile')} />;
  }
  if (screen === 'how-to-play') {
    return (
      <InfoModal title={t('howToPlay.title')} closeLabel={t('common.close')} onClose={() => setScreen('landing')}>
        <p className="mb-3">{t('howToPlay.deckIsTrainerDesc')}</p>
        <p>{t('howToPlay.suitsExplainer')}</p>
      </InfoModal>
    );
  }
  return null;
}
