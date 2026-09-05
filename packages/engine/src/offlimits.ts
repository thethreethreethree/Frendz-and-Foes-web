// "Off Limits" — our describe-without-the-forbidden-words game. Now a thin binding of the shared
// word-deck engine (wordgame.ts) to the Off Limits deck. All game logic lives in the engine; this
// file just fixes the deck and keeps the original Off Limits names/types stable for callers + tests.

import { OFFLIMITS_V1, type OffLimitsCard } from "./data/offlimits-v1.js";
import {
  createWordGame,
  wordGameReducer,
  cardAt,
  toPublicWordGame,
  DEFAULT_WORDGAME_CONFIG,
  type WordGameState,
  type WordGamePublic,
  type WordGameConfig,
  type WordGameAction,
} from "./wordgame.js";

export type { OffLimitsCard } from "./data/offlimits-v1.js";
// TurnEntry and the WordGame* types are exported from wordgame.js via the engine index.

export const OFFLIMITS_DECK: readonly OffLimitsCard[] = OFFLIMITS_V1;

// Off Limits uses the shared engine's shapes directly; these aliases keep the old names.
export type OffLimitsState = WordGameState;
export type OffLimitsPublic = WordGamePublic;
export type OffLimitsConfig = WordGameConfig;
export type OffLimitsAction = WordGameAction;
export type OffLimitsPhase = WordGameState["phase"];
export type OffLimitsTeam = WordGameState["teams"][number];

export const DEFAULT_OFFLIMITS_CONFIG = DEFAULT_WORDGAME_CONFIG;

export const createOffLimits = (opts?: {
  config?: Partial<OffLimitsConfig>;
  teams?: Array<{ id: string; name: string; color?: string }>;
}): OffLimitsState => createWordGame(OFFLIMITS_DECK, opts);

export const offLimitsReducer = (state: OffLimitsState, action: OffLimitsAction): OffLimitsState =>
  wordGameReducer(OFFLIMITS_DECK, state, action);

export const currentOffLimitsCard = (state: OffLimitsState): OffLimitsCard | null =>
  cardAt(OFFLIMITS_DECK, state) as OffLimitsCard | null;

export const toPublic = toPublicWordGame;
// `activeTeam` is provided by the shared engine (wordgame.ts) via the engine index.
