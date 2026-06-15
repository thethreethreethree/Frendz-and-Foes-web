import { turnFocus, type GameState } from "@ff/engine";

const SLOT_NAMES = ["Steady Green (1st)", "Flashing Green (2nd)", "Blue (3rd)"];

export interface TurnInfo {
  label: string;
  /** The team expected to answer right now, if any (for defaulting the credit/miss target). */
  activeTeamId: string | null;
  complete: boolean;
  idle: boolean;
}

export function turnInfo(state: GameState): TurnInfo {
  const focus = turnFocus(state);
  const turn = state.turn;
  const teamAt = (i: number) => turn?.participants[i]?.teamId ?? null;

  switch (focus.stage) {
    case "participant":
      return { label: `${SLOT_NAMES[focus.index]} to answer`, activeTeamId: teamAt(focus.index), complete: false, idle: false };
    case "random-fill":
      return { label: `Random team — fill #${focus.fillIndex + 1}`, activeTeamId: null, complete: false, idle: false };
    case "bonus-participant":
      return { label: `Bonus · ${SLOT_NAMES[focus.index]}`, activeTeamId: teamAt(focus.index), complete: false, idle: false };
    case "bonus-random":
      return { label: "Bonus · Random team", activeTeamId: null, complete: false, idle: false };
    case "done":
      return { label: "Question complete", activeTeamId: null, complete: true, idle: false };
    case "idle":
    default:
      return { label: "Set the buzz-in teams", activeTeamId: null, complete: false, idle: true };
  }
}
