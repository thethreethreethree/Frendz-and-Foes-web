import { describe, it, expect } from "vitest";
import {
  createOffLimits,
  offLimitsReducer,
  currentOffLimitsCard,
  toPublic,
  OFFLIMITS_DECK,
  type OffLimitsState,
} from "../src/offlimits.js";

const twoTeams = [
  { id: "r", name: "Red" },
  { id: "b", name: "Blue" },
];

function started(config = {}): OffLimitsState {
  let s = createOffLimits({ config });
  s = offLimitsReducer(s, { type: "SET_TEAMS", teams: twoTeams });
  s = offLimitsReducer(s, { type: "START" });
  return offLimitsReducer(s, { type: "BEGIN_TURN" });
}

describe("off limits engine", () => {
  it("starts in setup and needs two teams to start", () => {
    let s = createOffLimits();
    expect(s.phase).toBe("setup");
    s = offLimitsReducer(s, { type: "START" }); // no teams
    expect(s.phase).toBe("setup");
    s = offLimitsReducer(s, { type: "SET_TEAMS", teams: [{ id: "r", name: "Red" }] });
    s = offLimitsReducer(s, { type: "START" }); // only one team
    expect(s.phase).toBe("setup");
  });

  it("BEGIN_TURN starts the clock and exposes a card to the host", () => {
    const s = started({ turnSeconds: 45 });
    expect(s.phase).toBe("playing");
    expect(s.secondsLeft).toBe(45);
    expect(currentOffLimitsCard(s)).not.toBeNull();
  });

  it("GOT scores the active team and advances the card", () => {
    const s = started();
    const first = currentOffLimitsCard(s)!;
    const after = offLimitsReducer(s, { type: "GOT" });
    expect(after.teams[0].score).toBe(1);
    expect(after.turnLog).toEqual([{ word: first.word, result: "got" }]);
    expect(currentOffLimitsCard(after)!.word).not.toBe(first.word); // advanced
  });

  it("SKIP costs a point only when a skip penalty is set, never below zero", () => {
    // free skips (default)
    let s = started();
    s = offLimitsReducer(s, { type: "SKIP" });
    expect(s.teams[0].score).toBe(0);
    // penalized skips
    let p = started({ skipPenalty: 1 });
    p = offLimitsReducer(p, { type: "SKIP" });
    expect(p.teams[0].score).toBe(0); // clamped, not -1
  });

  it("running out of time ends the turn and banks the review", () => {
    let s = started({ turnSeconds: 2 });
    s = offLimitsReducer(s, { type: "GOT" });
    s = offLimitsReducer(s, { type: "TICK" }); // 2 -> 1
    expect(s.phase).toBe("playing");
    s = offLimitsReducer(s, { type: "TICK" }); // 1 -> 0 -> end
    expect(s.phase).toBe("turnover");
    expect(s.lastReview.length).toBe(1);
  });

  it("NEXT_TURN passes to the other team", () => {
    let s = started();
    s = offLimitsReducer(s, { type: "END_TURN" });
    s = offLimitsReducer(s, { type: "NEXT_TURN" });
    expect(s.phase).toBe("ready");
    expect(s.activeIdx).toBe(1);
    expect(s.round).toBe(1);
  });

  it("reaching the win score ends the game with a winner", () => {
    let s = started({ winScore: 2 });
    s = offLimitsReducer(s, { type: "GOT" });
    s = offLimitsReducer(s, { type: "GOT" }); // score 2 >= winScore
    s = offLimitsReducer(s, { type: "END_TURN" });
    expect(s.phase).toBe("ended");
    expect(s.winner).toBe("r");
  });

  it("SECRET SAFETY: the public projection never contains the current word or the deck", () => {
    const s = started();
    const word = currentOffLimitsCard(s)!.word;
    const pub = toPublic(s);
    const json = JSON.stringify(pub);
    expect(json).not.toContain(word); // the room's display must never see the live word
    expect(json).not.toContain("taboo");
    expect((pub as Record<string, unknown>).deckOrder).toBeUndefined();
    // sanity: the word really is a deck word (guards against a false pass on an empty deck)
    expect(OFFLIMITS_DECK.some((c) => c.word === word)).toBe(true);
  });
});
