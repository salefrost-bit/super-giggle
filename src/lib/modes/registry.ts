import type { GameMode } from '../domain/types';

export interface ModeDefinition {
  id: GameMode;
  titleKey: string;
  descKey: string;
  isChallenge: boolean;
}

// Future modes ("survive_deck", "ghost_race", "sprint" — see spec section 1)
// are added here as new entries plus message keys; step 0 renders from this list.
export const MODES: ModeDefinition[] = [
  { id: 'classic', titleKey: 'setup.classicTitle', descKey: 'setup.classicDesc', isChallenge: false },
  { id: 'perfect_deck', titleKey: 'setup.challengeTitle', descKey: 'setup.challengeDesc', isChallenge: true },
];
