import type { GameMode } from '../domain/types';

export interface ModeDefinition {
  id: GameMode;
  titleKey: string;
  descKey: string;
  explanationKey: string;
  isChallenge: boolean;
}

// Future modes ("survive_deck", "ghost_race", "sprint" — see spec section 1)
// are added here as new entries plus message keys; step 0 renders cards AND
// their ⓘ explanations from this list.
// Redosled niza = redosled kartica u Challenge meniju (s19): Daily prvi.
export const MODES: ModeDefinition[] = [
  {
    id: 'classic',
    titleKey: 'setup.classicTitle',
    descKey: 'setup.classicDesc',
    explanationKey: 'modes.classic.explanation',
    isChallenge: false,
  },
  {
    id: 'daily',
    titleKey: 'modes.daily.title',
    descKey: 'modes.daily.desc',
    explanationKey: 'modes.daily.explanation',
    isChallenge: true,
  },
  {
    id: 'perfect_deck',
    titleKey: 'setup.challengeTitle',
    descKey: 'setup.challengeDesc',
    explanationKey: 'modes.perfect_deck.explanation',
    isChallenge: true,
  },
  {
    id: 'sprint',
    titleKey: 'modes.sprint.title',
    descKey: 'modes.sprint.desc',
    explanationKey: 'modes.sprint.explanation',
    isChallenge: true,
  },
  {
    id: 'court',
    titleKey: 'modes.court.title',
    descKey: 'modes.court.desc',
    explanationKey: 'modes.court.explanation',
    isChallenge: true,
  },
  {
    id: 'survive',
    titleKey: 'modes.survive.title',
    descKey: 'modes.survive.desc',
    explanationKey: 'modes.survive.explanation',
    isChallenge: true,
  },
];
