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

## Story images for Kickstarter's editor
```
python kickstarter/build.py && python kickstarter/export_ks.py
```
Writes `dist/story/NN-slug.png` (one PNG per block, rounded corners + transparent margin)
and `dist/story/kickstarter-copy.txt` (the plain-text copy for captions/alt text).

**Render width is the whole ballgame.** Kickstarter shows story images in a ~680px column.
The first export rendered the *desktop* layout at a 980px viewport, so 17px body text arrived
on the page at ~12px — the "text is too small" bug. The exporter now renders at a **560px CSS
viewport at 3×** (1680px PNGs): body text lands at ~21px on Kickstarter, ~1.9× bigger, while
560px stays above the page's own 34rem breakpoint so the games grid keeps 2 columns and the
block structure survives. Going narrower (phone width) would stack the games one per row.
