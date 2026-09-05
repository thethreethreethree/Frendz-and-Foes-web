import { describe, it, expect } from "vitest";
import {
  createMonikers,
  monikersReducer,
  currentMonikersCard,
  toPublicMonikers,
  MONIKERS_DECK,
  type MonikersState,
} from "../src/monikers.js";

function setup(deckSize = 6): MonikersState {
  let s = createMonikers({ config: { deckSize, turnSeconds: 60 } });
  s = monikersReducer(s, { type: "SET_TEAMS", teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
  s = monikersReducer(s, { type: "START" });
  return monikersReducer(s, { type: "BEGIN_TURN" });
}

// Clear the current round by getting every remaining card (one team runs the table).
function clearRound(s: MonikersState): MonikersState {
  let guard = 0;
  while (s.phase === "playing" && s.remaining.length > 0 && guard++ < 100) {
    s = monikersReducer(s, { type: "GOT" });
    if (s.phase === "playing" && s.remaining.length > 0) continue;
  }
  return s;
}

describe("encore (monikers) engine", () => {
  it("START builds a pool of the configured size and deals the round pile", () => {
    const s = setup(6);
    expect(s.pool.length).toBe(6);
    expect(s.remaining.length).toBe(6);
    expect(s.round).toBe(0);
    expect(currentMonikersCard(s)).not.toBeNull();
  });

  it("GOT scores the card's points and removes it from the round", () => {
    const s = setup(6);
    const card = currentMonikersCard(s)!;
    const after = monikersReducer(s, { type: "GOT" });
    expect(after.teams[0].score).toBe(card.points);
    expect(after.remaining.length).toBe(5);
  });

  it("PASS keeps the card in play (sent to the bottom)", () => {
    const s = setup(6);
    const after = monikersReducer(s, { type: "PASS" });
    expect(after.remaining.length).toBe(6);
    expect(after.remaining[0]).not.toBe(s.remaining[0]); // a different card is now on top
  });

  it("clearing a round → roundover; NEXT_ROUND refills the SAME pool with the next rule", () => {
    let s = setup(6);
    s = clearRound(s);
    expect(s.phase).toBe("roundover");
    expect(s.round).toBe(0);
    s = monikersReducer(s, { type: "NEXT_ROUND" });
    expect(s.phase).toBe("ready");
    expect(s.round).toBe(1);
    expect(s.remaining.length).toBe(6); // same cards, replayed
    s = monikersReducer(s, { type: "BEGIN_TURN" });
    expect(currentMonikersCard(s)).not.toBeNull();
  });

  it("clearing the third round ends the game with the higher score winning", () => {
    let s = setup(6);
    for (let r = 0; r < 3; r++) {
      s = clearRound(s);
      if (s.phase === "roundover") {
        s = monikersReducer(s, { type: "NEXT_ROUND" });
        s = monikersReducer(s, { type: "BEGIN_TURN" });
      }
    }
    expect(s.phase).toBe("ended");
    expect(s.winner).toBe("a"); // team A ran every table
    expect(s.teams[0].score).toBeGreaterThan(s.teams[1].score);
  });

  it("a timeout passes the clock but the pile persists to the next team", () => {
    let s = setup(6);
    s = monikersReducer(s, { type: "GOT" }); // 6 -> 5 remaining
    s = monikersReducer(s, { type: "END_TURN" });
    expect(s.phase).toBe("turnover");
    s = monikersReducer(s, { type: "NEXT_TURN" });
    expect(s.phase).toBe("ready");
    expect(s.activeIdx).toBe(1);
    expect(s.remaining.length).toBe(5); // pile carried over
  });

  it("SECRET SAFETY: the public projection carries counts, not the live card or pile words", () => {
    const s = setup(6);
    const word = currentMonikersCard(s)!.word;
    const json = JSON.stringify(toPublicMonikers(s));
    expect(json).not.toContain(word);
    expect((toPublicMonikers(s) as Record<string, unknown>).remaining).toBeUndefined();
    expect(toPublicMonikers(s).remainingCount).toBe(6);
    expect(MONIKERS_DECK.some((c) => c.word === word)).toBe(true);
  });
});
