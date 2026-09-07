# PlayZoo — Kickstarter campaign page

A standalone, self-contained HTML campaign page for PlayZoo, written in **Rex's voice**
(sarcastic, cheeky). Structure follows the "Zwaptz — Ten Pages" template: a sticky numbered
nav + dark/light proof toggle, then ten bounded "blocks" with monospace tabs.

- **Published artifact:** https://claude.ai/code/artifact/88fce1cd-26be-4c48-8e3b-2bb8702389ea
- **Funding goal:** $3,500 USD.
- **Design:** PlayZoo neon-on-midnight (violet/pink/teal/lime/amber on `#0a0e18`),
  Bricolage Grotesque display + Inter body + IBM Plex Mono labels.

## Source of truth
- `body.html` — markup, CSS, and all copy, with `{{HERO}}`, `{{REX_FULL}}`, `{{GAMES_GRID}}`,
  `{{CAST_GRID}}`, `{{TIERS}}` placeholders.
- Art comes from `apps/web/public/` (hero `bg/home.jpg`, Rex `crew/rex-full.png`,
  14 tiles `tiles/*.jpg`, 20 cast cutouts `cast/*.png`) — inlined as base64 at build time.

## Rebuild
```
python kickstarter/build.py
```
Writes `dist/playzoo-kickstarter.html` (publish this as the Artifact — same URL via the update flow)
and `dist/preview.html` (wrapped for local screenshotting). `dist/` is gitignored (base64 output is large).

## Reward tiers
1. **$15 — Zoo Pass:** 6 months of PlayZoo + 5 games.
2. **$30 — Founding Animal:** 1 year + 10 games + 1 custom character drawn for the backer.
3. **$50 — Head Keeper:** 1 year, every game unlocked + 2 custom characters.
