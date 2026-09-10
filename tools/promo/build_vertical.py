"""The 9:16 vertical cut, built from the SAME shot list as the widescreen one.

WHY THIS IMPORTS RATHER THAN COPIES. SHOTS, the captions, the colours and the fonts all come from
build_promo.py. Two files holding two copies of one script is a guarantee that a fix lands in one
shape and not the other -- which is precisely how three game slugs drifted apart earlier. There is
one script; this file only decides how it is arranged on a tall frame.

WHY NOT SIMPLY CROP TO 9:16. The art is landscape: nineteen sources at 4:3 and seven at 16:9.
Cropping a 4:3 image to 9:16 keeps 42% of its width, so most of every scene is thrown away. The
first vertical attempt instead FITTED the whole landscape frame across the width and filled the rest
with a blurred enlargement -- which put the art in a band across roughly 35% of the height and left
two thirds of the screen as blur. The owner called that filler, and it was.

So the frame is DESIGNED rather than cropped or padded:

     0 --- 150   left clear: the platform's own UI (account name, follow button)
   150 -- 1200   THE ART, 1080x1050 -- 55% of the height, keeping ~77% of a 4:3 source's width
  1240 -- 1560   THE CAPTION, in its own space on the brand pattern
  1560 -- 1920   left clear: TikTok, Reels and Shorts all put controls here

The difference between this and letterboxing is that the empty space is doing a job. Blur is an
apology for the wrong shape; this gives the words somewhere to live that the picture was never
using, and it keeps text out of the two strips every vertical platform covers with its own
interface -- the same mistake that hid the widescreen captions behind Kickstarter's control bar.

Writes a NEW file rather than overwriting playzoo-promo-9x16.mp4: that older cut is a different
script and the owner chose to keep it.
"""
import os, subprocess, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_promo as B          # one shot list, two shapes

W, H, FPS = 1080, 1920, 30
OUT = "tools/promo/playzoo-promo-vertical.mp4"

UI_TOP      = 150
ART_TOP     = UI_TOP
ART_H       = 1050
ART_BOTTOM  = ART_TOP + ART_H            # 1200
CAP_TOP     = ART_BOTTOM + 40            # 1240
SAFE_BOTTOM = 1560                       # nothing is drawn below this line

# Type is BIGGER relative to the frame than in the widescreen cut, not smaller. The canvas is 1080
# wide instead of 1920, so a caption sized for the wide frame arrives at roughly half the relative
# size -- unreadable on a phone held at arm's length, which is the only place this cut is watched.
BIG_PX, SMALL_PX = 104, 54
PAD_X = 64

GROUND = None
SCALED = {}


def ground():
    """The brand doodle pattern, heavily dimmed: the surface the whole frame sits on."""
    im = B._open("doodle").convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    im = im.crop(((im.width - W) // 2, (im.height - H) // 2,
                  (im.width - W) // 2 + W, (im.height - H) // 2 + H))
    return Image.blend(im, Image.new("RGB", (W, H), B.BG), 0.86)


def art_tile(name, ay=0.5, ax=0.5, zoom=1.06):
    """Scale a source to COVER the art band, with slack for the push-in."""
    im = B._open(name).convert("RGB")
    s = max(W / im.width, ART_H / im.height) * zoom
    return im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS), ax, ay


def crop_tile(scaled, ax, ay, t, si):
    """Per-frame crop out of a pre-scaled source, aimed at the subject via ax/ay."""
    sw, sh = scaled.size
    span_x, span_y = max(0, sw - W), max(0, sh - ART_H)
    dirn = 1 if si % 2 == 0 else -1
    px = min(max(ax * sw - W / 2 + span_x * dirn * (t - 0.5) * 0.10, 0), span_x)
    py = min(max(ay * sh - ART_H / 2, 0), span_y)
    return scaled.crop((int(px), int(py), int(px) + W, int(py) + ART_H))


def rounded(img, r=28):
    """Round the band's corners so the art reads as a card ON the ground, not a crop OF the frame."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=r, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0))
    out.putalpha(mask)
    return out


def draw_caption(frame, big, small, accent, t, i):
    """The caption in its OWN band: never over the art, never in a platform's UI strip."""
    d = ImageDraw.Draw(frame, "RGBA")
    fb, fs = B.font(BIG_PX), B.font(SMALL_PX)
    maxw = W - PAD_X * 2
    y = CAP_TOP

    if big:
        pp = min(1.0, max(0.0, (i - B.POP_START) / B.POP_FRAMES))
        e = B._ease_out_back(pp) if pp > 0 else 0.0
        scale, alpha = 0.55 + 0.45 * e, min(1.0, pp * 2.4)
        angle = B.TILT + (1 - pp) * 7.0
        for ln in B.wrap(d, big, fb, maxw):
            lay, pad = B._text_layer(ln, fb, accent, 9, (8, 10, 18, 255), accent_offset=10)
            B._place(frame, lay, PAD_X - pad, y - pad, scale, alpha, angle)
            y += BIG_PX + 12
        y += 8

    if small:
        sp = min(1.0, max(0.0, (i - B.SUB_START) / B.SUB_FRAMES))
        for ln in B.wrap(d, small, fs, maxw):
            lay, pad = B._text_layer(ln, fs, accent, 5, (8, 10, 18, 255))
            B._place(frame, lay, PAD_X - pad, y - pad + int((1 - sp) * 40), 1.0, sp)
            y += SMALL_PX + 8
        y += 10

    rw = int(min(1.0, t * 2.2) * (W - PAD_X * 2) * 0.45)
    if rw > 3 and y + 8 < SAFE_BOTTOM:
        d.rounded_rectangle([PAD_X, y, PAD_X + rw, y + 8], radius=4, fill=accent + (255,))


def compose(sh, si, i, n):
    t = i / max(1, n - 1)
    frame = GROUND.copy()
    kind = sh["kind"]

    if kind == "card":
        # A portrait enclosure banner is the ONE asset already shaped for a tall frame. Shown whole
        # and large rather than cropped, with the same spin-in the widescreen cut gives it.
        b = B._open(sh["art"]).convert("RGBA")
        s = min(ART_H / b.height, (W - 180) / b.width)
        b = b.resize((int(b.width * s), int(b.height * s)), Image.LANCZOS)
        k = min(1.0, (i + 1) / 13)
        e = B._ease_out_back(k) if k > 0 else 0.0
        sc = 0.62 + 0.38 * e
        rot = b.rotate(14.0 * (1 - k), resample=Image.BICUBIC, expand=True)
        rot = rot.resize((max(1, int(rot.width * sc)), max(1, int(rot.height * sc))), Image.BICUBIC)
        if k < 0.999:
            rot.putalpha(rot.getchannel("A").point(lambda v: int(v * min(1.0, k * 2.2))))
        frame.paste(rot, (W // 2 - rot.width // 2, ART_TOP + ART_H // 2 - rot.height // 2), rot)

    elif kind == "end":
        tile = crop_tile(*art_tile("confetti"), t, si)
        tile = Image.blend(tile, Image.new("RGB", tile.size, B.BG), 0.4)
        card = rounded(tile)
        frame.paste(card, (0, ART_TOP), card)
        lg = Image.open(B.LOGO_PATH).convert("RGBA")
        lg = lg.resize((720, int(lg.height * 720 / lg.width)), Image.LANCZOS)
        frame.paste(lg, ((W - lg.width) // 2, ART_TOP + ART_H // 2 - lg.height // 2), lg)

    else:
        if kind == "cut":
            # A keyed cutout needs its own ground INSIDE the band, or it floats on the doodle.
            plate = crop_tile(*art_tile(sh["ground"]), t, si)
            plate = Image.blend(plate, Image.new("RGB", plate.size, B.BG), 0.55)
            c = B._open(sh["art"]).convert("RGBA")
            s = min((ART_H * 1.02) / c.height, (W * 0.86) / c.width)
            c = c.resize((max(1, int(c.width * s)), max(1, int(c.height * s))), Image.LANCZOS)
            plate.paste(c, (W // 2 - c.width // 2, 6), c)
            tile = plate
        else:
            src, ax, ay = SCALED[si]
            tile = crop_tile(src, ax, ay, t, si)
        card = rounded(tile)
        frame.paste(card, (0, ART_TOP), card)

    draw_caption(frame, sh["big"], sh["small"], sh["accent"], t, i)

    if si in B.FLASH_AT and i < 3:
        frame = Image.blend(frame, Image.new("RGB", (W, H), (255, 255, 255)), 0.5 - i * 0.16)
    return frame


def render():
    global GROUND
    GROUND = ground()
    for si, sh in enumerate(B.SHOTS):
        if sh["kind"] == "scene":
            SCALED[si] = art_tile(sh["art"], sh.get("ay", 0.5), sh.get("ax", 0.5))

    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-an",
           "-c:v", "libx264", "-preset", "medium", "-crf", "21",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    written = 0
    for si, sh in enumerate(B.SHOTS):
        n = int(sh["secs"] * FPS)
        for i in range(n):
            proc.stdin.write(compose(sh, si, i, n).tobytes())
            written += 1
        print(f"  shot {si+1:>2}/{len(B.SHOTS)}  {sh['secs']:>4.1f}s  {sh['art']}")
    proc.stdin.close()
    proc.wait()
    print(f"frames: {written} ({written / FPS:.2f}s)  {W}x{H}  ->  {OUT}")


if __name__ == "__main__":
    total = sum(s["secs"] for s in B.SHOTS)
    print(f"{len(B.SHOTS)} shots, {total:.1f}s — vertical 9:16 from the same script")
    render()
