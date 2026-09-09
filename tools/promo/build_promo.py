"""Render the PlayZoo promo - 1920x1080 widescreen, silent, cut to an implied beat.

WHAT THIS SELLS, AND IN WHAT ORDER. The product first, the comedy alongside it. A viewer decides in
about five seconds whether a thing is for them, and the previous cut spent its first three shots on
John being funny before it said what PlayZoo was. This one says "14 party games, one AI host" at
four seconds, shows the one-screen-plus-phones idea at nine, and only then runs the games.

The AI host is the actual differentiator - no other party-game app has one - so it gets its own act
rather than a line buried in the montage.

CAPTIONS STAY OUT OF THE BOTTOM 18%. Measured on the live Kickstarter page: the caption sat at 93.4%
of the frame height and the player's control bar covered it completely. Every player puts its
scrubber and timecode in that strip, so text down there is text you have chosen to hide behind a UI
you do not control. PLAYER_SAFE_BOTTOM reserves it, and the caption block is derived from it rather
than from a hand-picked offset.

GAME NAMES ARE THE CANONICAL ONES from productKnowledge.js. An earlier cut captioned shots "High
Rollers" and "Charades", neither of which is a PlayZoo game - a backer who watches this and then
reads the campaign page has to meet the same fourteen names in both places.

Everything is composited from the owner's GRAPHIC ASSETS folder; all 59 top-level files were opened
and described before any was placed, per LAW 1a. Frames are built with PIL and piped into ffmpeg -
each shot pre-scales its source once, so the per-frame work is a crop and the caption.
"""
import math, os, subprocess
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

# CALIBRI, at the owner's direction. He overlaid a sample caption on a frame and asked for the font
# and size to be matched to it, so the size was MEASURED rather than guessed: in his screenshot the
# video area is ~1800px wide standing in for 1920, a scale of 0.9375. His sample string comes to
# about 1008px in video coordinates. The same string in my old Arial Bold 62px computes to 853px and
# measured 853px off the screenshot, which confirms the scale before it is used on his text.
# 1008px puts his sample at Calibri ~81px bold. Hence an 80px subline, up from 62.
def font(px, black=True):
    for name in ("calibrib.ttf", "calibri.ttf", "arialbd.ttf"):
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
#   fx    : how the PICTURE enters, on top of the caption's own pop.
#           "whip"  a fast horizontal smear that settles — used to enter the quick game shots
#           "shake" a decaying camera knock — used on the two impact beats
#           "spin"  the banner rotates and scales into place — the enclosure cards
#   cap   : "bottom" (default) or "top". The Kickstarter medallion carries its OWN call to action --
#           a green "Back us on Kickstarter" roundel and a scroll reading PLAYZOO PROJECT ACTIVE --
#           and a bottom-left caption sat straight across both, so the frame read "Back us on K...".
#           Moving the words lets the artwork do the asking, which is stronger than repeating it.
def scene(secs, art, big, small, accent, ay=0.5, ax=0.5, fx=None, cap="bottom"):
    return dict(secs=secs, kind="scene", art=art, big=big, small=small, accent=accent,
                ay=ay, ax=ax, fx=fx, cap=cap)
def cut(secs, art, ground, big, small, accent, fx=None):
    return dict(secs=secs, kind="cut", art=art, ground=ground, big=big, small=small,
                accent=accent, fx=fx)
def card(secs, art, big, small, accent, fx="spin"):
    return dict(secs=secs, kind="card", art=art, big=big, small=small, accent=accent, fx=fx)
def end(secs, small, accent):
    return dict(secs=secs, kind="end", art="confetti", big="", small=small, accent=accent)

SHOTS = [
    # --- WHAT IT IS. A viewer decides in the first five seconds whether this is for them, so the
    #     product goes first and the comedy rides along. The old cut opened with three shots of
    #     John being funny before saying what PlayZoo was.
    scene(3.0, "john-desk",      "",                    "hi. i'm john. i work here.",             LIME,  ay=0.50),
    scene(4.2, "zoo-night",      "14 PARTY GAMES",      "one AI host runs the whole night",       VIOLET),
    scene(4.6, "explainer",      "ONE BIG SCREEN",      "everyone else plays from their phone",   TEAL,  ay=0.50),
    scene(3.4, "headsup",        "NO APP. NO ACCOUNTS.", "they scan a code and they're in",       TEAL,  ay=0.45),

    # --- THE HOST. The actual differentiator, and it was buried at 22s in the old cut behind the
    #     game montage. No other party-game app has one, so it gets its own act.
    cut(3.2, "cut-rex-wave", "backdrop", "MEET REX",     "he hosts every single game",             AMBER),
    scene(3.8, "rex-host",       "A REAL AI HOST",      "he reacts to what you actually do",      AMBER, ay=0.50),
    cut(3.0, "cut-sleeper",  "backdrop", "",            "and he has opinions about it",           LIME),

    # --- THE GAMES, by their REAL names. The old cut invented "High Rollers" and "Charades";
    #     neither is a PlayZoo game. These are the canonical fourteen from productKnowledge.js, so
    #     a backer who reads the campaign page sees the same names.
    scene(2.6, "buzzers",        "SURVEY SHOWDOWN",     "two teams, one board",                   PINK,  ay=0.52, fx="shake"),
    scene(2.6, "spy-board",      "COVER OPS",           "crack the grid, dodge the assassin",     TEAL,  ay=0.50, fx="whip"),
    scene(2.6, "lineup",         "MURDER MYSTERY",      "one of you is lying",                    PINK,  ay=0.52, fx="shake"),
    scene(2.6, "sketch-relay",   "SKETCH RELAY",        "the drawing gets worse every pass",      LIME,  ay=0.50, fx="whip"),
    scene(2.4, "gameshow",       "TRIVIA",              "fastest right answer takes it",          VIOLET, ay=0.50, fx="whip"),
    scene(2.4, "charades-zip",   "FULL CAST",           "no talking. no writing.",                VIOLET, ay=0.45, fx="whip"),
    scene(2.2, "bingo",          "BINGO NIGHT",         "every line comes with a dare",           AMBER, ay=0.50, fx="whip"),
    scene(2.2, "casino",         "BALLPARK",            "guess the number, bet on the best",      AMBER, ay=0.50, fx="whip"),
    scene(2.4, "bar18",          "AFTER DARK",          "the 18+ one, for once they've gone",     VIOLET, ay=0.45, fx="whip"),
    scene(3.0, "cast-hero",      "AND SIX MORE",        "fourteen games, one subscription",       AMBER),

    # --- THE CLUB. Sold as a feature now rather than as four punchlines in a row.
    card(1.8, "banner-rowdies",  "A BACKERS-ONLY CLUB", "Rex sorts you into an enclosure",        AMBER),
    card(1.5, "banner-cuddle",   "",                    "four of them to land in",                TEAL),
    card(1.5, "banner-owls",     "",                    "you do not get to choose",               VIOLET),
    card(1.9, "banner-schemers", "",                    "john insists his is the best one",       LIME),

    # --- THE ASK.
    scene(2.6, "crate",          "BACK IT",             "kickstarter - goal $3,500",              PINK,  ay=0.48),
    scene(3.0, "ks-medallion",   "BACKERS PLAY FIRST",  "and pick which games they get",          PINK,  ay=0.56, cap="top"),
    end(4.6,                                            "playzoo.snapaweb.com",                   TEAL),
]

# Durations are now set PER SHOT rather than scaled by a blanket multiplier. The multiplier existed
# to slow a cut that was uniformly too fast; this script is paced deliberately -- 4.6s on the
# explainer because it is the shot that has to land, 2.2s on a game the picture explains by itself.
# A global 1.15x would stretch both equally and undo that.

# Act boundaries, by shot index — a 3-frame white flash lands on each, so the five movements read
# as movements instead of one long list.
FLASH_AT = {4, 7, 17, 21}

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
    works because the frame is wide — it is the one thing 16:9 buys that 9:16 cannot.

    Returns the ground and the banner SEPARATELY: the banner is composited per frame so it can
    rotate and scale into place, which it cannot do once flattened into the plate."""
    g = ground_plate("doodle", 0.55)
    b = _open(name).convert("RGBA")
    sc = (H - 120) / b.height
    return g, b.resize((int(b.width * sc), int(b.height * sc)), Image.LANCZOS)

def place_banner(ground, banner, k):
    """k 0..1 through the spin-in. Rotates from 14 degrees and scales up, settling with the same
    overshoot the captions use so picture and type land as one move."""
    f = ground.copy()
    e = _ease_out_back(k) if k > 0 else 0.0
    scale = 0.62 + 0.38 * e
    ang = 14.0 * (1 - k)
    b = banner.rotate(ang, resample=Image.BICUBIC, expand=True)
    if abs(scale - 1.0) > 0.002:
        b = b.resize((max(1, int(b.width * scale)), max(1, int(b.height * scale))), Image.BICUBIC)
    if k < 0.999:
        b.putalpha(b.getchannel("A").point(lambda v: int(v * min(1.0, k * 2.2))))
    cx, cy = 170 + banner.width // 2, 60 + banner.height // 2
    f.paste(b, (cx - b.width // 2, cy - b.height // 2), b)
    return f

FX_FRAMES = {"whip": 5, "shake": 11, "spin": 13}

def _pan(frame, ox, oy, zoom):
    """Offset a frame WITHOUT exposing an edge.

    The first attempt translated with an affine and left a black band where the picture used to be —
    which reads as a rendering glitch, not as camera movement. Zooming slightly first gives the
    offset something to move into, and clamping the crop guarantees it can never reach past the
    image no matter how large the offset gets."""
    zw, zh = int(W * zoom), int(H * zoom)
    z = frame.resize((zw, zh), Image.BILINEAR)
    cx = min(max((zw - W) / 2 + ox, 0), zw - W)
    cy = min(max((zh - H) / 2 + oy, 0), zh - H)
    return z.crop((int(cx), int(cy), int(cx) + W, int(cy) + H))

def _whip(frame, k):
    """A horizontal smear that decays as the shot settles.

    The smear is made by squashing the frame horizontally and stretching it back, which averages
    neighbouring columns — a directional blur PIL has no filter for, and far cheaper than summing
    shifted copies. The slide is deliberately small: the blur does the work, and a large slide would
    need a zoom big enough to visibly soften the whole shot."""
    narrow = max(10, int(W * (1.0 - 0.90 * k)))
    f = frame.resize((narrow, H), Image.BILINEAR).resize((W, H), Image.BILINEAR)
    return _pan(f, W * 0.055 * k, 0, 1.14)

def _shake(frame, k, i):
    """A decaying camera knock. Oscillates so it reads as an impact rather than a drift."""
    amp = 30 * k
    return _pan(frame, amp * math.sin(i * 2.30), amp * 0.55 * math.cos(i * 3.10), 1.075)

def logo(width):
    im = Image.open(LOGO_PATH).convert("RGBA")
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)

# Caption geometry — STICKER style, picked by the owner from three rendered comparisons on a real
# shot rather than from descriptions.
#
# The old captions were 96px on a 1080-tall frame and read as small. These are 150px, white, with a
# heavy black outline and a hard offset shadow in the shot's accent colour, tilted two degrees so
# they sit like a sticker slapped onto the frame rather than a subtitle burned into it.
#
# The OUTLINE is the part that matters, not the size: a plain white word vanishes into the parrot's
# lime plumage or the bingo card. A black stroke keeps every letter readable over any of this art.
# The lowest caption pixel used to sit at 93.4% of the frame height, measured. Every video player
# puts its control bar, its scrubber and its timecode in exactly that strip -- Kickstarter's covered
# the subline completely, which the owner spotted on the live campaign page. Text in the bottom
# ~10% of a video is text you have chosen to hide behind a UI you do not control.
#
# Everything now finishes above 82% of the height, leaving the whole bottom band to the player.
PLAYER_SAFE_BOTTOM = 0.82
BIG_PX, SMALL_PX = 170, 80
CARD_BIG_PX, CARD_SMALL_PX = 112, 68
PAD_X, TILT = 96, -2.0

# Sticker entrance timing, in FRAMES rather than as a fraction of the shot. A fraction would make
# the pop last 0.4s on a 1.4s banner and 1.1s on the 3.8s opener — the same motion reading as two
# different animations. Frames keep every sticker's pop identical, which is what makes them feel
# like one design rather than one-per-shot.
POP_START, POP_FRAMES = 2, 11        # headline: scales up past 1.0 and settles
SUB_START, SUB_FRAMES = 8, 9         # subline: staggered after it, rises and fades in

def _ease_out_back(p):
    """Overshoots 1.0 then settles — the snap that makes a sticker read as slapped on."""
    c1 = 1.70158
    c3 = c1 + 1
    q = p - 1
    return 1 + c3 * q * q * q + c1 * q * q

def wrap(d, text, f, maxw):
    """Break a headline to the width actually available. "YOU GET SORTED" at 96px overflowed the
    card column and lost its final D off the right edge, so headline width is measured from here on
    rather than assumed — and a gate in the build re-measures every caption before rendering."""
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

def _text_layer(text, f, fill, stroke, stroke_fill, accent_offset=None):
    """One line of caption on its own transparent layer, so it can be rotated, scaled and faded as
    a unit. Everything animated has to be a layer; PIL cannot transform text drawn straight on."""
    pad = stroke + (accent_offset or 0) + 40
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    w = int(probe.textlength(text, font=f)) + pad * 2
    lay = Image.new("RGBA", (w, f.size + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    if accent_offset:
        d.text((pad + accent_offset, pad + accent_offset), text, font=f, fill=fill + (255,),
               stroke_width=stroke, stroke_fill=fill + (255,))
    d.text((pad, pad), text, font=f, fill=INK + (255,), stroke_width=stroke, stroke_fill=stroke_fill)
    return lay, pad

def _place(img, lay, x, y, scale=1.0, alpha=1.0, angle=0.0):
    """Composite a caption layer, scaled about its own centre so a pop grows in place."""
    if alpha <= 0.01:
        return
    if angle:
        lay = lay.rotate(angle, resample=Image.BICUBIC, expand=True)
    w0, h0 = lay.size
    if abs(scale - 1.0) > 0.002:
        lay = lay.resize((max(1, int(w0 * scale)), max(1, int(h0 * scale))), Image.BICUBIC)
    if alpha < 0.999:
        al = lay.getchannel("A").point(lambda v: int(v * alpha))
        lay.putalpha(al)
    img.paste(lay, (int(x + (w0 - lay.width) / 2), int(y + (h0 - lay.height) / 2)), lay)

def draw_caption(img, big, small, accent, t, i, card_mode=False, cap_top=False):
    d = ImageDraw.Draw(img, "RGBA")
    big_px = CARD_BIG_PX if card_mode else BIG_PX
    small_px = CARD_SMALL_PX if card_mode else SMALL_PX
    fb, fs = font(big_px), font(small_px)
    x = int(W * 0.52) if card_mode else PAD_X
    maxw = W - x - 60

    if not card_mode:
        scrim = Image.new("RGBA", (W, 700), (0, 0, 0, 0))
        sd = ImageDraw.Draw(scrim)
        for k in range(700):
            # a top scrim has to fade the OTHER way, or it darkens the picture and not the text
            a = (1 - k / 700) if cap_top else (k / 700)
            sd.line([(0, k), (W, k)], fill=(5, 8, 16, int(222 * a ** 1.5)))
        y0 = 0 if cap_top else H - 700
        img.paste(Image.alpha_composite(img.crop((0, y0, W, y0 + 700)).convert("RGBA"), scrim).convert("RGB"),
                  (0, y0))

    # Derived from the safe zone rather than a hand-picked offset, so changing the reserved band
    # moves the whole block instead of needing three numbers kept in sync.
    #   rule bottom = y_small + SMALL_PX + 30 + 9  ->  must land above PLAYER_SAFE_BOTTOM
    y_bottom = int(H * PLAYER_SAFE_BOTTOM) - (small_px + 39)
    y_small = (H // 2 + 24) if card_mode else (330 if cap_top else y_bottom)

    # headline: pops in with an overshoot, and unwinds a little extra tilt as it lands
    if big:
        pp = min(1.0, max(0.0, (i - POP_START) / POP_FRAMES))
        e = _ease_out_back(pp) if pp > 0 else 0.0
        scale = 0.55 + 0.45 * e
        angle = TILT + (1 - pp) * 7.0
        alpha = min(1.0, pp * 2.4)
        lines = wrap(d, big, fb, maxw)
        lh = big_px + 18
        y = y_small - 66 - lh * len(lines)
        for ln in lines:
            lay, pad = _text_layer(ln, fb, accent, 9 if card_mode else 12, (8, 10, 18, 255),
                                   accent_offset=8 if card_mode else 13)
            _place(img, lay, x - pad, y - pad, scale, alpha, angle)
            y += lh

    # subline: staggered behind the headline, rising into place
    if small:
        sp = min(1.0, max(0.0, (i - SUB_START) / SUB_FRAMES))
        lay, pad = _text_layer(small, fs, accent, 4 if card_mode else 6, (8, 10, 18, 255))
        _place(img, lay, x - pad, y_small - pad + int((1 - sp) * 46), 1.0, sp)

    rw = int(min(1.0, t * 2.2) * (W * 0.30))
    if rw > 3:
        ry = y_small + small_px + 30
        d.rounded_rectangle([x, ry, x + rw, ry + 9], radius=5, fill=accent + (255,))

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
            still, banner = load_card(sh["art"])
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
            elif kind == "card":
                kk = min(1.0, (i + 1) / FX_FRAMES["spin"]) if sh.get("fx") == "spin" else 1.0
                frame = place_banner(still, banner, kk)
            else:
                frame = still.copy()

            fx = sh.get("fx")
            if fx == "whip" and i < FX_FRAMES["whip"]:
                frame = _whip(frame, 1.0 - i / FX_FRAMES["whip"])
            elif fx == "shake" and i < FX_FRAMES["shake"]:
                frame = _shake(frame, (1.0 - i / FX_FRAMES["shake"]) ** 1.6, i)

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
                draw_caption(frame, sh["big"], sh["small"], sh["accent"], t, i, card_mode,
                         sh.get("cap") == "top")

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
