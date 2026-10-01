// Guards John's Brie chat: the handshake that starts it, the rule that stops him inventing a real
// person, and the silence on the product. Run: node --test apps/server/founderFacts.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOUNDER_FACTS, FOUNDER_LIMITS, FOUNDER_PROFILE } from "./founderFacts.js";
import { brieIntroduced, systemPrompt, JOHN_NO_PRODUCT } from "./john.js";

const user = (content) => ({ role: "user", content });
const bot = (content) => ({ role: "assistant", content });

test("every fact the founder supplied is actually in the briefing", () => {
  // The profile is the checklist; the briefing is the prose John reads. They drift apart the moment
  // someone edits one and not the other, and a silently dropped fact is invisible at runtime -- John
  // simply never mentions it and nobody can tell whether he is being coy or uninformed.
  const f = FOUNDER_FACTS.toLowerCase();
  assert.ok(f.includes("john ramos"), "name");
  assert.ok(f.includes("software development company"), "what he does");
  assert.ok(f.includes("philippines"), "where he lives");
  assert.ok(f.includes("three sisters") && f.includes("half brother"), "family");
  assert.ok(f.includes("red"), "favourite colour");
  assert.ok(f.includes("motorcycle"), "motorcycles");
  assert.equal(FOUNDER_PROFILE.name, "John Ramos");
  assert.equal(Object.keys(FOUNDER_PROFILE).length, 6, "profile grew without the test being updated");
});

test("the refusal rule names the things he must never invent about a real person", () => {
  // This is the half that protects a living human, and it is the half most likely to be quietly
  // trimmed by a later edit that thinks it is tightening a long prompt.
  const l = FOUNDER_LIMITS.toLowerCase();
  for (const forbidden of ["married", "age", "address", "money", "sisters' names", "city"]) {
    assert.ok(l.includes(forbidden), `limit should cover: ${forbidden}`);
  }
  assert.ok(/must not guess|do not guess/.test(l), "must forbid guessing outright");
});

test("the handshake fires on how a real person actually types it", () => {
  // The owner's exact example, first.
  assert.ok(brieIntroduced([user("Hi my name is Brie, Britney")]));
  for (const line of [
    "hi im brie",
    "Hey! My name's Britney :)",
    "my name is Brie",
    "I'm Britney",
    "this is Brie",
    "call me Brie",
    "Hello there, I am Britney",
    "hi, names brie",
  ]) {
    assert.ok(brieIntroduced([user(line)]), `should fire: ${line}`);
  }
});

test("a bare mention is NOT an introduction", () => {
  // Otherwise John flips into a conversation written for somebody else because a stranger mentioned
  // cheese, or asked after her.
  for (const line of [
    "do you like brie",
    "is Britney Spears in the zoo",
    "brie and crackers",
    "who is Brie?",
    "tell Brie I said hi",
  ]) {
    assert.equal(brieIntroduced([user(line)]), false, `should NOT fire: ${line}`);
  }
});

test("only the guest can introduce herself, not John", () => {
  // John's own greeting says her name once she has arrived. If assistant turns counted, his reply
  // would re-trigger the handshake forever -- and worse, could trigger it for a stranger.
  assert.equal(brieIntroduced([bot("my name is Brie and I run the list")]), false);
});

test("the handshake persists for the rest of the conversation", () => {
  const convo = [user("Hi my name is Brie, Britney"), bot("Brie! Finally."), user("so what does he do?")];
  assert.ok(brieIntroduced(convo), "must stay on after the opening turn");
});

// --- the silence on the product -----------------------------------------------------------------
// Owner's instruction: in Brie's chat John must not talk about the Kickstarter or the product AT
// ALL. That is enforced structurally (the prompt never loads the product briefing or the sales
// angle) and by instruction. Both halves are asserted, because either one alone decays silently:
// re-adding `base` to the brie branch would restore the whole product briefing and nothing would
// fail, and deleting the no-product rule would leave him free to improvise a pitch.

const BRIE_BEFORE = systemPrompt("brie");
const BRIE_AFTER = systemPrompt("brie", { brie: true });

test("Brie's John is never handed the Kickstarter or the product briefing", () => {
  // The prohibition itself has to NAME the forbidden subjects ("...or a Kickstarter") to forbid
  // them, so a naive search for the word finds the rule that bans it. Strip the rule, then assert
  // the rest of the prompt is clean — which is the thing actually at stake: not whether the word
  // appears, but whether John was handed any material to talk about.
  for (const [label, prompt] of [["before handshake", BRIE_BEFORE], ["after handshake", BRIE_AFTER]]) {
    assert.ok(prompt.includes(JOHN_NO_PRODUCT), `${label}: the rule should be present verbatim`);
    const p = prompt.replace(JOHN_NO_PRODUCT, "").toLowerCase();
    assert.ok(!p.includes("kickstarter"), `${label}: must not mention the Kickstarter`);
    assert.ok(!p.includes("velvet rope"), `${label}: must not carry the sales angle`);
    assert.ok(!p.includes("jump the line"), `${label}: must not carry the get-in-early nudge`);
    // Markers unique to the shared product briefing, which brie mode must never load.
    assert.ok(!p.includes("enclosure"), `${label}: must not carry the enclosures`);
    assert.ok(!p.includes("how to play"), `${label}: must not carry the game rules`);
    assert.ok(!p.includes("reward tier"), `${label}: must not carry the campaign tiers`);
  }
});

test("the product briefing is genuinely absent, not merely unmentioned", () => {
  // A size check catches the failure the keyword checks cannot: someone re-adds `base` to the brie
  // branch and the whole 10KB briefing comes back with wording the keywords happen to miss.
  const agent = systemPrompt("agent");
  assert.ok(
    BRIE_AFTER.length < agent.length * 0.6,
    `brie prompt (${BRIE_AFTER.length}) should be far smaller than the support desk (${agent.length})`,
  );
});

test("Brie's John is told in words not to raise it either", () => {
  for (const prompt of [BRIE_BEFORE, BRIE_AFTER]) {
    assert.ok(/DO NOT TALK ABOUT THE PRODUCT/.test(prompt), "the explicit silence must be present");
  }
});

test("Brie's John keeps the character, the guardrails and the founder facts", () => {
  for (const prompt of [BRIE_BEFORE, BRIE_AFTER]) {
    assert.ok(prompt.includes("RACCOON"), "still John");
    assert.ok(prompt.includes("TRASH PANDA"), "trash-panda rule must survive the trim");
    assert.ok(/never slurs/.test(prompt), "safety boundaries must survive the trim");
    assert.ok(/NO STAGE DIRECTIONS/.test(prompt), "delivery rule must survive the trim");
    assert.ok(prompt.includes("JOHN RAMOS"), "founder facts loaded");
    assert.ok(prompt.includes("HARD LIMIT ON THE FOUNDER"), "no-guessing rule loaded in BOTH states");
  }
});

test("the handshake is what swaps the instructions, and only that", () => {
  assert.ok(/not told you who they are yet/.test(BRIE_BEFORE), "before: John asks who it is");
  assert.ok(!/BRIE - short for BRITNEY/.test(BRIE_BEFORE), "before: must not assume she is Brie");
  assert.ok(/BRIE - short for BRITNEY/.test(BRIE_AFTER), "after: the conversation is hers");
});

test("the other John surfaces are untouched by any of this", () => {
  // The waitlist doorman and the support desk still get the full briefing and the angle.
  const agent = systemPrompt("agent");
  assert.ok(agent.includes("CUSTOMER SUPPORT"), "agent rules still applied");
  assert.ok(!agent.includes("JOHN RAMOS"), "founder facts must NOT leak into the support desk");
  assert.ok(!/DO NOT TALK ABOUT THE PRODUCT/.test(agent), "support desk must still discuss the product");
});
