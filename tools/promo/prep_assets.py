"""Collect the promo's source art out of `GRAPHIC ASSETS/` into tools/promo/src/ under clean names.

WHY THIS EXISTS. Two problems make the supplied folder unusable directly:

  1. SEVERAL FILENAMES CONTAIN NON-ASCII CHARACTERS (a literal '…' where the generator truncated the
     prompt). Those names do not survive a round trip through the shell on this machine, so every
     asset is matched here by an unambiguous filename PREFIX and copied to an ASCII name.

  2. THE CUTOUTS ARE JPEGs WITH THE TRANSPARENCY CHECKERBOARD BAKED IN. They have no alpha at all —
     the grey-and-white squares are picture. Composited as-is they would put a chessboard behind
     the sloth. They are keyed here.

KEYING METHOD. These checkers are LIGHT: white (255) alternating with about #D7D7D7, and both are
fully desaturated. So the background mask is "almost colourless AND bright", and the cut is a flood
fill inward from the border through that mask. It stops at the dark ink outline every one of these
drawings has.

This is the easy case. tools/coverops/props.py records four approaches that failed on a NEAR-BLACK
checker, where "bright" does not identify the background and the dark checker squares act as
barriers. Nothing that clever is needed here, and a border flood is safe for a reason worth stating:
interior whites (Rex's teeth, the bingo card, the sloth's eyes) are enclosed by ink, so the fill
cannot reach them. A global "delete all near-white" would have punched holes straight through them.
"""
import os, shutil, sys
from collections import deque
import numpy as np
from PIL import Image

SRC_DIR = "GRAPHIC ASSETS"
OUT = "tools/promo/src"

# (clean name, filename prefix, needs keying)
SCENES = [
    ("john-desk",      "John on the Desk",                        False),
    ("john-a",         "John A",                                  False),
    ("john-b",         "John B",                                  False),
    ("zoo-night",      "Empty_zoo_party_set_at",                  False),
    ("zoo-empty",      "Empty_party_zoo_at_night",                False),
    ("explainer",      "Zookeeper_explaining_app_to_animals",     False),
    ("cast-hero",      "Zookeeper_wrangling_mob_of_animals",      False),
    ("cast-party",     "Zookeeper_wrangling_party_animals",       False),
    ("rex-host",       "Human_zookeeper_hosting_game_show",       False),
    ("buzzers",        "Cartoon_teams_slamming_game_buzzers",     False),
    ("gameshow",       "Cartoon_animals_at_game_show",            False),
    ("whiteboards",    "Cartoon_animals_playing_guessing",        False),
    # Owner-supplied replacement, 2026-09-09. The original charades art drew John with an extra
    # arm -- he had a raised hand, a hand at his mouth AND two more paws below. The owner spotted it
    # in the finished video and supplied this redraw. Matched by its own filename, not the old
    # prefix, so re-running prep cannot silently pull the broken one back in.
    ("charades-zip",   "Fix_raccoon_arms",                        False),
    ("charades-tower", "Animals_playing_charades_game",           False),
    ("sketch-relay",   "Animals_passing_sketchbooks",             False),
    ("parrot-easel",   "Parrot_drawing_on_easel_pad",             False),
    ("spy-board",      "Raccoon_spymaster_pointing_laser",        False),
    ("lineup",         "Raccoon_hiding_knife",                    False),
    ("bingo",          "Flamingo_operating_bingo_cage",           False),
    ("casino",         "Gorilla_croupier_raking_casino",          False),
    ("bar18",          "Animals_playing_card_game",               False),
    ("headsup",        "Cartoon_animal_holding_phone",            False),
    ("crate",          "Zoo_animals_opening_mystery_crate",       False),
    ("ks-medallion",   "Create_cartoon_circle_kickstarter",       False),
    ("ks-badge",       "Create_Kickstarter_badge_graphic",        False),
    ("confetti",       "Confetti_cannons_firing_celebrat",        False),
    ("stage-empty",    "Neon_game-show_zoo_setting",              False),
    ("backdrop",       "Neon_zoo_backdrop_at_night",              False),
    ("doodle",         "Seamless_doodle_pattern_on_navy",         False),
    ("banner-rowdies",  "1.png",                                  False),
    ("banner-cuddle",   "2.png",                                  False),
    ("banner-owls",     "3.png",                                  False),
    ("banner-schemers", "4.png",                                  False),
    # checkerboard JPEGs -> keyed PNGs with real alpha
    ("cut-wheel",      "Sloth_turning_giant_prize_wheel",         True),
    ("cut-john-plug",  "Raccoon_pulling_power_plug",              True),
    ("cut-john-scheme","Raccoon_rubbing_hands_scheming",          True),
    ("cut-rex-wave",   "Zookeeper_hollering_to_animals_2K_202609070328", True),
    # Gorilla_bouncer_giving_thumbs-up is DELIBERATELY ABSENT. Its floor glow is a semi-transparent
    # effect painted over the checkerboard, so those pixels match neither checker tone and no
    # tone-based key can see them — dead end #1 in tools/coverops/props.py. Composited on the dark
    # ground it shows a chessboard under his feet. Boomer is already in the casino, the cast hero,
    # the crate and the cage shots, so the cut loses nothing by leaving this one out.
    ("cut-sloth",      "Cartoon_sloth_lounging_with_cock",        True),
    ("cut-parrot",     "Cartoon_parrot_wearing_headset",          True),
    ("cut-sleeper",    "Zookeeper_checking_clipboard",            True),
]

def find(prefix, names):
    hits = [n for n in names if n.startswith(prefix)]
    if not hits:
        return None
    # shortest match: "1.png" must not win over "10.png"-style neighbours, and an exact name wins
    return sorted(hits, key=len)[0]

def _flood(mask, y0, x0):
    """The connected component of `mask` containing (y0, x0), as a boolean array."""
    h, w = mask.shape
    out = np.zeros_like(mask)
    q = deque([(y0, x0)]); out[y0, x0] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny,nx] and not out[ny,nx]:
                out[ny,nx] = True; q.append((ny,nx))
    return out

def _components(mask, step=3, min_px=400):
    """Seed points, one per connected region of `mask` big enough to matter."""
    h, w = mask.shape
    claimed = np.zeros_like(mask)
    for y in range(0, h, step):
        for x in range(0, w, step):
            if mask[y, x] and not claimed[y, x]:
                comp = _flood(mask, y, x)
                claimed |= comp
                if comp.sum() >= min_px:
                    yield y, x

def key_checker(path):
    """Flood inward from the border through the checkerboard.

    The tones are LEARNED from the border, not assumed. A fixed "bright" threshold silently failed
    on Zookeeper_hollering_..._0328, whose checker is mid-grey (about 100 and 160) rather than the
    208/255 the other files use: the mask matched nothing, the key reported 0% background, and the
    file came through with the chessboard fully intact. Reading the actual border tones handles
    both, and is why this reports the background fraction — a 0% is a failure, not a clean cut."""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    mx = a.max(axis=2); mn = a.min(axis=2)
    flat = (mx - mn) < 26                      # the checker is grey: colourless by definition

    h, w = flat.shape
    ring = np.zeros_like(flat)
    b = max(6, min(h, w) // 120)
    ring[:b, :] = ring[-b:, :] = ring[:, :b] = ring[:, -b:] = True
    vals = mn[ring & flat]
    if vals.size == 0:
        raise SystemExit(f"{path}: no grey border found — this is not a checkerboard cutout")
    lo, hi = np.percentile(vals, 2), np.percentile(vals, 98)
    bgish = flat & (mn >= lo - 22) & (mn <= hi + 22)

    seen = np.zeros_like(bgish)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
            if 0 <= ny < h and 0 <= nx < w and bgish[ny,nx] and not seen[ny,nx]:
                seen[ny,nx] = True; q.append((ny,nx))

    # A border flood cannot reach checker that is WALLED IN — inside the loops of John's tangled
    # cables, for instance. But the same un-reachability is what protects the sloth's white speech
    # bubble and Rex's teeth, so the enclosed regions cannot simply be cleared as well.
    #
    # The discriminator is that a CHECKERBOARD alternates two tones, while a bubble or a tooth is
    # one flat tone. So an enclosed grey region is cleared only if it contains a real share of BOTH
    # learned tones. Verified both ways: the cable loops went, the speech bubble stayed.
    mid = (lo + hi) / 2
    if hi - lo > 18:
        for y0, x0 in _components(bgish & ~seen):
            comp = _flood(bgish & ~seen, y0, x0)
            v = mn[comp]
            if v.size and (v < mid).mean() > 0.15 and (v >= mid).mean() > 0.15:
                seen |= comp

    alpha = np.where(seen, 0, 255).astype(np.uint8)
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray(alpha))
    # trim to the subject so later scaling is about the art, not the empty margin
    bbox = Image.fromarray(alpha).getbbox()
    if bbox:
        out = out.crop(bbox)
    return out, float(seen.mean())

def main():
    os.makedirs(OUT, exist_ok=True)
    names = os.listdir(SRC_DIR)
    missing = []
    for clean, prefix, needs_key in SCENES:
        src = find(prefix, names)
        if not src:
            missing.append((clean, prefix))
            continue
        p = os.path.join(SRC_DIR, src)
        if needs_key:
            img, frac = key_checker(p)
            dst = os.path.join(OUT, clean + ".png")
            img.save(dst)
            print(f"  keyed  {clean:<18} {img.size}  bg {frac*100:4.1f}%  <- {src[:46]}")
        else:
            ext = os.path.splitext(src)[1].lower()
            dst = os.path.join(OUT, clean + ext)
            shutil.copyfile(p, dst)
            print(f"  copied {clean:<18} {Image.open(dst).size}  <- {src[:46]}")
    if missing:
        print("\nMISSING (prefix matched nothing):")
        for clean, prefix in missing:
            print(f"  {clean}  <- {prefix!r}")
        sys.exit(1)
    print(f"\n{len(SCENES)} assets prepared in {OUT}")

if __name__ == "__main__":
    main()
