"""Render the 60-second PlayZoo promo — 1920x1080 widescreen, silent, cut to an implied beat.

JOHN DIRECTED THIS ONE. The framing is the point: John the Raccoon (The Schemer, per the cast
roster) has hijacked the promo, so the captions are in his voice — lowercase asides under ALL-CAPS
punches, and every claim about the product undercut by him immediately.

WHY THIS IS A REWRITE AND NOT AN EDIT. The first cut was built only from apps/web/public/art/,
which is game-screen art: backdrops and reaction cards. The owner's `GRAPHIC ASSETS/` folder was
never opened for it. That folder holds the material this needed — the explainer image (Rex pointing
at a screen while three paws hold up three phones), the sketch-relay conveyor where a drawing
degrades from a cat into a monster, the police lineup where John whistles innocently over a chalk
outline, the four enclosure banners, and a finished Kickstarter end card. All 59 top-level files
were opened and described before any of them were placed here, per LAW 1a.

THREE THINGS THE FIRST CUT GOT WRONG, all fixed here:

  1. TOO SLOW. Fourteen shots over sixty seconds is 4.3s a shot, which is a slideshow. This is 28
     shots averaging 2.1s, with hard two-frame cuts instead of eight-frame fades and a white flash
     on each act change.

  2. LETTERBOXED. 16:9 art was fitted into a 9:16 frame with blurred bars, so two thirds of the
     screen was filler. At 1920x1080 the 2752x1536 plates are within a hair of native and the
     2400x1792 ones need only a vertical crop — every frame is real picture, edge to edge.

  3. IT EXPLAINED NOTHING. It listed features. This one shows the product working — one screen,
     everyone's phone, then the games themselves — before it asks for money.

Frames are composed with PIL and piped into ffmpeg. Each shot pre-scales its source ONCE; the
per-frame work is a crop and the caption.
"""
import os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
SRC = "tools/promo/src"
LOGO_PATH = "apps/web/public/web/logo-playzoo.png"
OUT = "tools/promo/playzoo-promo-16x9.mp4"

BG = (10, 14, 24)
INK = (245, 248, 255)
PINK, VIOLET, TEAL, LIME, AMBER = (236, 72, 153), (139, 92, 246), (45, 212, 191), (163, 230, 53), (245, 158, 11)

FONT_DIR = "C:/Windows/Fonts"
def font(px, black=True):
    for name in (("ariblk.ttf", "arialbd.ttf") if black else ("arialbd.ttf", "arial.ttf")):
        p = os.path.join(FONT_DIR, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    return ImageFont.load_default()

# --- the cut ---------------------------------------------------------------------------------
#   scene : landscape art, cropped to fill 1920x1080. `ay` is the vertical centre of interest as a
#           fraction of the source height — the 2400x1792 sources lose a quarter of their height to
#           the crop, so a shot whose joke lives at the top (the prohibition circles over John's
#           zipped mouth) has to say so or the joke is cropped off.
#   cut   : a keyed cutout over a dark ground plate.
#   card  : a portrait banner held beside its caption — 16:9 is wide enough to do this properly.
#   end   : the wordmark over the confetti plate.
def scene(secs, art, big, small, accent, ay=0.5, ax=0.5):
    return dict(secs=secs, kind="scene", art=art, big=big, small=small, accent=accent, ay=ay, ax=ax)
def cut(secs, art, ground, big, small, accent):
    return dict(secs=secs, kind="cut", art=art, ground=ground, big=big, small=small, accent=accent)
def card(secs, art, big, small, accent):
    return dict(secs=secs, kind="card", art=art, big=big, small=small, accent=accent)
def end(secs, small, accent):
    return dict(secs=secs, kind="end", art="confetti", big="", small=small, accent=accent)

SHOTS = [
    # --- John hijacks the promo -------------------------------------------------------------
    scene(2.6, "john-desk",      "",                   "hi. i'm john.",                        LIME,  ay=0.50),
    scene(1.6, "john-b",         "",                   "they said don't let the raccoon direct.", LIME),
    scene(1.4, "john-a",         "",                   "so obviously i directed it.",           LIME),
    scene(3.8, "zoo-night",      "WELCOME TO PLAYZOO", "the zoo is open. sort of.",             VIOLET),
    # --- what it actually is ----------------------------------------------------------------
    scene(3.6, "explainer",      "ONE BIG SCREEN",     "the telly runs the game",               TEAL,  ay=0.50),
    scene(2.6, "headsup",        "EVERYONE'S PHONE",   "no app. no accounts. scan a code.",     TEAL,  ay=0.45),
    scene(3.2, "cast-hero",      "14 GAMES",           "one AI zookeeper to blame",             AMBER),
    cut(2.4, "cut-rex-wave", "backdrop", "THAT'S REX", "he's the responsible one",              AMBER),
    cut(2.0, "cut-sleeper",  "backdrop", "",           "the talent is asleep again",            LIME),
    # --- the games, fast --------------------------------------------------------------------
    scene(2.0, "buzzers",        "SURVEY SHOWDOWN",    "two teams. no mercy.",                  PINK,  ay=0.52),
    scene(1.8, "whiteboards",    "",                   "everyone is wrong. loudly.",            PINK,  ay=0.50),
    scene(1.8, "charades-zip",   "CHARADES",           "no talking. no writing. no dignity.",   VIOLET, ay=0.45),
    scene(1.6, "charades-tower", "",                   "nobody knows what he is doing",         VIOLET, ay=0.42),
    scene(2.0, "sketch-relay",   "SKETCH RELAY",       "it started as a cat",                   LIME,  ay=0.50),
    scene(1.6, "parrot-easel",   "",                   "it is not a cat anymore",               LIME,  ay=0.48),
    scene(2.0, "spy-board",      "COVER OPS",          "crack the grid. dodge the assassin.",   TEAL,  ay=0.50),
    scene(2.0, "lineup",         "MURDER MYSTERY",     "one of you is lying. it's me.",         PINK,  ay=0.52),
    scene(1.6, "bingo",          "BINGO",              "she cheats",                            AMBER, ay=0.50),
    scene(1.6, "casino",         "HIGH ROLLERS",       "the house is a gorilla",                AMBER, ay=0.50),
    scene(1.8, "bar18",          "AND THE 18+ ONE",    "we don't talk about it",                VIOLET, ay=0.45),
    cut(1.8, "cut-wheel", "backdrop", "",              "the prizes are incredible",             LIME),
    # --- the enclosures ---------------------------------------------------------------------
    card(1.4, "banner-rowdies",  "YOU GET SORTED",     "four enclosures. one of them is yours.", AMBER),
    card(1.4, "banner-cuddle",   "",                   "the nice one.",                          TEAL),
    card(1.4, "banner-owls",     "",                   "the insufferable one.",                  VIOLET),
    card(2.2, "banner-schemers", "MINE",               "i'm a schemer. obviously.",              LIME),
    # --- the ask ----------------------------------------------------------------------------
    scene(2.0, "crate",          "BACK IT",            "kickstarter — goal $3,500",             PINK,  ay=0.48),
    scene(2.4, "ks-medallion",   "GET IN EARLY",       "backers play first",                    PINK,  ay=0.50),
    end(4.4,                                           "playzoo.snapaweb.com",                  TEAL),
]

# Act boundaries, by shot index — a 3-frame white flash lands on each, so the five movements read
# as movements instead of one long list.
FLASH_AT = {4, 9, 21, 25}

def _open(name):
    for ext in (".jpeg", ".jpg", ".png"):
        p = os.path.join(SRC, name + ext)
        if os.path.exists(p):
            return Image.open(p)
    raise SystemExit(f"missing source asset: {name} (run tools/promo/prep_assets.py)")

def load_scene(name, ay, ax, zoom=1.10):
    """Scale to COVER 1920x1080 with a little slack for the push-in, then crop about (ax, ay)."""
    im = _open(name).convert("RGB")
    s = max(W / im.width, H / im.height) * zoom
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    return im, ax, ay

def ground_plate(name, dim=0.45):
    im = _open(name).convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2,
                  (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    return Image.blend(im, Image.new("RGB", (W, H), BG), dim)

def load_cut(name, ground, accent):
    """A keyed cutout over a dimmed plate, sized to OWN the frame.

    The first widescreen pass sized these to clear the caption block, which left the figure about
    30% of the frame wide with dim backdrop all around it — clipart floating on a slide, which is
    precisely the amateur look this rewrite exists to kill. Two changes fix it: the figure is scaled
    to overflow the frame height and bleed off the BOTTOM edge (a subject cropped at the shins reads
    as framing; a whole tiny subject reads as a mistake), and an accent bloom behind it fills the
    plate and ties the figure to its ground instead of leaving it pasted on.

    The overflow must be at the bottom, which means anchoring the TOP. Anchoring the bottom instead
    pushed the excess upward and decapitated every figure: Rex lost his face on the shot captioned
    "THAT'S REX", and the sloth lost the "hang on, we're getting there" bubble that is the entire
    joke of that shot. Faces and speech bubbles live at the top of a figure; feet do not matter."""
    g = ground_plate(ground, 0.55)
    c = _open(name).convert("RGBA")
    s = min((H * 1.32) / c.height, (W * 0.80) / c.width)
    c = c.resize((max(1, int(c.width * s)), max(1, int(c.height * s))), Image.LANCZOS)
    cx = int(W * 0.58)

    # radial accent bloom, brightest behind the figure and gone by the frame edges
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - cx) / (W * 0.52)) ** 2 + ((yy - H * 0.52) / (H * 0.78)) ** 2)
    glow = np.clip(1.0 - r, 0, 1) ** 2.0
    base = np.asarray(g).astype(np.float32)
    tint = np.array(accent, dtype=np.float32)
    g = Image.fromarray(np.clip(base + glow[..., None] * tint * 0.42, 0, 255).astype(np.uint8))

    g.paste(c, (cx - c.width // 2, int(H * 0.015)), c)
    return g

def load_card(name):
    """A portrait enclosure banner held on the left, caption to the right. This composition only
    works because the frame is wide — it is the one thing 16:9 buys that 9:16 cannot."""
    g = ground_plate("doodle", 0.55)
    b = _open(name).convert("RGBA")
    s = (H - 120) / b.height
    b = b.resize((int(b.width * s), int(b.height * s)), Image.LANCZOS)
    g.paste(b, (170, 60), b if b.mode == "RGBA" else None)
    return g

def logo(width):
    im = Image.open(LOGO_PATH).convert("RGBA")
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)

# Captions sit BOTTOM-LEFT, not centred: left-aligned type reads as directed rather than as a
# slideshow label, and it keeps the middle of every frame — where the art puts its subject — clear.
PAD_X, BIG_PX, SMALL_PX = 96, 96, 42

def wrap(d, text, f, maxw):
    """Break a headline to the width actually available. "YOU GET SORTED" at 96px did not fit the
    card column and lost its final D off the right edge — measured, not guessed at, from here on."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def draw_caption(img, big, small, accent, t, card_mode=False):
    d = ImageDraw.Draw(img, "RGBA")
    fb, fs = font(76 if card_mode else BIG_PX), font(SMALL_PX, black=False)
    x = int(W * 0.52) if card_mode else PAD_X
    maxw = W - x - 60

    if not card_mode:
        # a scrim only along the bottom, so the picture keeps the top two thirds
        scrim = Image.new("RGBA", (W, 380), (0, 0, 0, 0))
        sd = ImageDraw.Draw(scrim)
        for i in range(380):
            sd.line([(0, i), (W, i)], fill=(5, 8, 16, int(225 * (i / 380) ** 1.5)))
        img.paste(Image.alpha_composite(img.crop((0, H - 380, W, H)).convert("RGBA"), scrim).convert("RGB"),
                  (0, H - 380))

    y_small = (H // 2 + 40) if card_mode else (H - 150)
    if big:
        lines = wrap(d, big, fb, maxw)
        lh = (76 if card_mode else BIG_PX) + 14
        y_big = y_small - lh * len(lines) - 12
        for ln in lines:
            d.text((x + 6, y_big + 6), ln, font=fb, fill=accent + (255,))
            d.text((x, y_big), ln, font=fb, fill=INK + (255,))
            y_big += lh
    if small:
        d.text((x, y_small), small, font=fs, fill=(206, 216, 240, 255))

    # an accent rule that draws itself across the shot — motion without moving the words
    rw = int(min(1.0, t * 2.2) * (W * 0.30))
    if rw > 3:
        ry = y_small + SMALL_PX + 30
        d.rounded_rectangle([x, ry, x + rw, ry + 7], radius=4, fill=accent + (255,))

def render():
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    written = 0
    for si, sh in enumerate(SHOTS):
        kind, n = sh["kind"], int(round(sh["secs"] * FPS))
        card_mode = kind == "card"
        src = ax = ay = None
        if kind == "scene":
            src, ax, ay = load_scene(sh["art"], sh["ay"], sh["ax"])
        elif kind == "cut":
            still = load_cut(sh["art"], sh["ground"], sh["accent"])
        elif kind == "card":
            still = load_card(sh["art"])
        else:
            still = ground_plate("confetti", 0.25)
            lg = logo(760)
            still.paste(lg, ((W - lg.width) // 2, H // 2 - lg.height // 2 - 70), lg)

        for i in range(n):
            t = i / max(1, n - 1)
            if kind == "scene":
                # push in slightly across the shot: motion on every frame, no drift off the subject
                z = 1.0 + 0.05 * t
                cw, ch = int(W / z), int(H / z)
                px = min(max(int(ax * src.width - cw / 2), 0), src.width - cw)
                py = min(max(int(ay * src.height - ch / 2), 0), src.height - ch)
                frame = src.crop((px, py, px + cw, py + ch)).resize((W, H), Image.BILINEAR)
            else:
                frame = still.copy()

            if kind == "end":
                d = ImageDraw.Draw(frame, "RGBA")
                fs = font(48, black=False)
                tw = d.textlength(sh["small"], font=fs)
                d.text(((W - tw) / 2, H // 2 + 110), sh["small"], font=fs, fill=(226, 233, 250, 255))
                rw = int(min(1.0, t * 2.0) * 420)
                if rw > 3:
                    d.rounded_rectangle([(W - rw) / 2, H // 2 + 200, (W + rw) / 2, H // 2 + 208],
                                        radius=4, fill=sh["accent"] + (255,))
            else:
                draw_caption(frame, sh["big"], sh["small"], sh["accent"], t, card_mode)

            # Hard 2-frame cuts, not fades: a dip to black on every cut is what made the last one
            # feel slow. Act changes get a white flash instead.
            if si in FLASH_AT and i < 3:
                frame = Image.blend(frame, Image.new("RGB", (W, H), (255, 255, 255)), 0.72 - 0.24 * i)
            elif i < 2:
                frame = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), frame, 0.45 + 0.55 * i)

            proc.stdin.write(frame.tobytes())
            written += 1
        print(f"  {si+1:>2}/{len(SHOTS)}  {sh['secs']:>4.1f}s  {kind:<5} {sh['art']}")

    proc.stdin.close()
    proc.wait()
    print(f"frames: {written} ({written / FPS:.2f}s)  {W}x{H}  ->  {OUT}")

if __name__ == "__main__":
    total = sum(s["secs"] for s in SHOTS)
    print(f"{len(SHOTS)} shots, {total:.1f}s, average {total/len(SHOTS):.2f}s per shot")
    render()
