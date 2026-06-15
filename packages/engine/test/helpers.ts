import { reducer } from "../src/engine.js";
import type { Action, GameState, Team } from "../src/types.js";

/** Fold a sequence of actions over a state. */
export function play(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(reducer, state);
}

export function teamScore(state: GameState, teamId: string): number {
  return state.teams.find((t) => t.id === teamId)?.score ?? NaN;
}

export const teams = (...ids: string[]): Array<Pick<Team, "id" | "name">> =>
  ids.map((id) => ({ id, name: id.toUpperCase() }));
