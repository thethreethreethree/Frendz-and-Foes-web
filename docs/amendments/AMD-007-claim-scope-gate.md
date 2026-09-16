# AMD-007 — A claim may not be broader than the evidence that verified it

- **Status:** PROPOSED — awaiting founder ratification
- **Date proposed:** 2026-09-16
- **Proposed by:** agent (draft for ratification), triggered by CAT-003 catastrophic event 2026-09-16
- **Ratified by:** —
- **Affects:** CLAUDE.md §1 (Core Method) — adds §1.8; CLAUDE.md §6 Quick Decision Checklist — adds
  item 6a; the Evidence Protocol R5 (extends its principle from inputs to outputs). Introduces no
  change to §0, §3, §4, §5 or §7.

---

## Trigger

Catastrophic event **CAT-003** (2026-09-16) — recorded in
[`docs/catastrophic-events/CAT-003-verification-scope-narrower-than-claim-2026-09-16.md`](../catastrophic-events/CAT-003-verification-scope-narrower-than-claim-2026-09-16.md).

Five occurrences in one session, all the same shape: the agent checked one instance and reported a
conclusion about the class.

1. Fixed a white-on-white contrast fault in one file; reported "the bug is fixed". The identical
   fault remained in three other files, including the display's pairing card — **which the agent had
   read while fixing the first one** — and a page intended for a printer.
2. Fixed the room-code contrast inside `RemoteShell`; reported it fixed. `StatusPill` was untouched.
   The fix reached **1 of 14** host controllers. A single table (`CtrlButton=0 / StatusPill=1 /
   Home=0`) settled it in seconds — and was only run because the owner asked "are you sure".
3. Read in a handover that a `scrollcheck` guard existed; treated scroll as guarded. The tool was
   never committed. `/waitlist` then shipped with no scroll container and its chat composer 34px
   below an unreachable fold.
4. Found this working copy's memory directory empty; reported the deploy credentials lost. Twenty
   memory files sat under a second path slug for a second working copy of the same repo.
5. Found `playzoo.snapaweb.com` gated; reported that the games could not be tested. A deliberately
   unlocked mirror was documented in three files the agent had already read.

Occurrences 4 and 5 cost the owner about an hour, during which they stated three times that the
agent already possessed what it claimed not to have.

## Diagnosis

The constitution and the Evidence Protocol between them govern the **input** side of the work
thoroughly and the **output** side not at all.

- **Evidence Protocol R5** requires every report to end with "Not opened" — a list of **files the
  agent did not read**. It is silent on **claims the agent did not test**. An agent can enumerate
  every unopened file with complete honesty and still write "the bug is fixed" off a one-file check.
  R5 was obeyed in all five occurrences above.
- **§1.5 (Holistic)** requires tracing what a change might *break* elsewhere. That is a different
  question from whether a claim of success *covers* everywhere, and the constitution only asked the
  first one.
- **§0.1** guarantees the methodology is present before acting. It does not constrain what may be
  asserted afterwards.

So the discipline held by its own terms while the failure it was written to prevent occurred. This is
structurally identical to **CAT-001**: a rule that can be *passed* without producing the outcome it
exists for. AMD-005 fixed that for preconditions; nothing yet fixes it for conclusions.

The behavioural fix ("I will be more careful what I claim") is exactly the fix AMD-005 rejected for
CAT-001 — it depends on the same judgement that just failed five times consecutively. What is needed
is a **required artifact**: a scope statement that must be written before the claim, so a mismatch is
visible on the page rather than resident in the agent's confidence.

## Proposed change

The exact text to insert. `CLAUDE.md` has **not** been edited — per §7.4 its text may only change as
the consequence of a *ratified* amendment, and this one is proposed.

### To be inserted in CLAUDE.md as §1.8

> ### 1.8 Claim-scope gate
>
> > Added by [AMD-007](docs/amendments/AMD-007-claim-scope-gate.md), ratified [date].
>
> Before reporting anything as **fixed, verified, complete, safe, absent or lost**, state both:
>
> 1. **the scope the evidence covers** — what was actually checked, and
> 2. **the scope the claim covers** — what the statement will be taken to mean.
>
> If (2) exceeds (1), either narrow the claim or widen the evidence *before* writing it down. A
> claim broader than its evidence is a forecast presented as a finding.
>
> Three corollaries, each independently binding:
>
> - **A guard you have not watched fail is not a guard.** A test, check, gate or assertion may not
>   be cited as protection until it has been observed FAILING on the defect it exists to catch.
>   Passing proves it runs; failing proves it detects.
> - **A guard that is described but not committed does not exist.** Protection recorded only in a
>   handover, a memory, a comment or a conversation must be present in the working tree, or must be
>   reported as absent. A believed guard is worse than a known gap, because the next reader stops
>   looking.
> - **An absence is a claim.** "It is missing", "it is lost", "there is no access" are assertions
>   about the world and carry the same burden as any other. State every place you looked. Where
>   prior sessions built the system, the owner saying "you already have this" is evidence about a
>   location, not a misunderstanding to correct.

### To be inserted in CLAUDE.md §6 Quick Decision Checklist

> 6a. **(Added by [AMD-007](docs/amendments/AMD-007-claim-scope-gate.md), ratified [date].)** Is the
> claim I am about to make broader than what I actually checked? Have I watched my guard fail? If I
> am asserting something is missing, have I listed where I looked?

## Soundness gate (§7.2)

**1. Triggered by evidence.** Five documented occurrences within one session, recorded in CAT-003
with file paths, measured values (1.03:1, 1.4:1, 878px vs 844px) and the commits that shipped them.
Exceeds the "≥1 documented incident" bar by five.

**2. Diagnosed, not preferred.** The diagnosis is specific and falsifiable: R5 enumerates unread
*inputs* and has no provision for untested *outputs*; §1.5 asks what a change breaks, not what a
claim covers. Both were obeyed in all five occurrences. The rule is proposed because the gap is
structural, not because more caution would feel better.

**3. Ripple-traced.**

| section | effect | contradiction? |
|---|---|---|
| §0 / §0.1 | complementary — §0.1 gates the precondition, §1.8 gates the conclusion | none |
| §1.5 Holistic | extends it from "what does this break" to "what does this claim cover" | none |
| §1.6 Close the loop | reinforces — "resolution AND ITS MEASURED OUTCOME" now has a required form | none |
| §1.7 Ground-up audit | an audit's findings are claims; §1.8 applies to them too | none |
| §2 No error loops | supplies the missing trigger — a scope mismatch is a detectable recurrence signal, where §2 previously relied on noticing | none |
| §3.5 Measure consequence, not agreement | same principle turned on the agent itself: measuring your own check is grading your own homework | none, it is the generalisation |
| §6 Checklist | adds 6a | none |
| Evidence Protocol R5 | extends the principle from files to claims; R5 stands unchanged | none |
| §7 | no change to the amendment process | none |

**4. Alternative-tested.** Would the existing rules have caught the five? Walked individually:
occurrence 1 — R5 satisfied, the unread-file list was accurate and irrelevant; occurrence 2 — §1.5
satisfied, nothing was broken, the fix was simply incomplete; occurrence 3 — no rule addresses
trusting a handover's claim of a guard; occurrences 4 and 5 — no rule treats an absence as a claim
requiring stated search scope. **The existing constitution catches none of the five.** §1.8 catches
all five, each at the point of writing rather than after the owner objects.

**5. Outside-view checked.** The obvious objection is "this is just *be careful*, dressed up." It is
not: it mandates a specific artifact (a two-part scope statement) that either appears or does not,
and three corollaries that are each independently checkable by a reader who was not present. "Have
you watched this test fail?" has a yes/no answer. "Be careful" does not.

The second objection is cost. Measured against the session that triggered it: the scope checks that
resolved all five took under a minute each. The failures cost roughly an hour, a production deploy
that fixed one surface of fourteen while reporting otherwise, and the owner's confidence in every
other report made that day.

**6. Does not soften under pressure.** §1.8 adds friction to the agent exclusively and removes none.
It cannot be used to defer work: it constrains what may be *said* about work, never whether the work
proceeds. Under deadline it becomes harder to comply with, not easier — which is the correct
direction for a rule in this constitution.

## Note on scope of this proposal

This amendment is itself a claim, and §1.8 applies to it. **Evidence scope:** one session,
2026-09-16, one agent, five occurrences, all in this repository. **Claim scope:** a structural gap
in the constitution's treatment of conclusions. The generalisation beyond this session is
**[INFERRED]**, not observed — the rule has not yet been operated. Per §7.5 the constitution
distrusts its own evolution until results prove it, so if §1.8 produces no measurable reduction in
scope-mismatched claims over a period of operation, it is eligible for counter-amendment.

## Decision

**PENDING — awaiting founder review.**

The soundness gate above is the agent's own evaluation of its own proposal, which is exactly the
structure §7.1 defaults to denying and §3.5 calls grading your own homework. It is offered as
argument, not as verdict. The constitution holds until the founder says otherwise.

Ratifying means editing `CLAUDE.md` to insert §1.8 and checklist item 6a, referencing AMD-007 in the
commit message per §7.4, then appending a `## Status Update` here. Denying means `CLAUDE.md` is
untouched and this file stays as the record of what was rejected and why — which per the README is
itself an asset, not a loss.

One honest argument **against** ratifying, stated because the outside-view check is worth more than
a win: the constitution already has seven sections and six amendments, and every rule added is a
rule that can be cited fluently without being followed — the CAT-001 failure mode. If the founder
judges that §1.8 would become another label rather than another gate, denial is the correct call and
the two committed guards from this session (`tools/smoke/scrollcheck.mjs`, `test/founderRoom.test.mjs`)
already carry most of the practical benefit without touching the constitution at all.
