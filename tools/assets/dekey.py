# Key the PAINTED background out of the TRIVIA emblems and write real-alpha PNGs.
#
# WHY THIS IS NOT A ONE-LINE COLOUR KEY. Established by opening all 26 files (see EVIDENCE.md):
#
#  * The "transparency" is painted pixels, not alpha -- every source is JPEG/RGB, which cannot
#    carry an alpha channel at all. The thing to remove is a checkerboard someone drew.
#  * There are FOUR background classes, not one: light checker (254/205), mid-grey checker
#    (141/94), dark checker (40/1), and a flat dark field with no checker whatsoever. Checker
#    squares range 20.5 -> 51.4 px. No fixed threshold keys this folder.
#  * Several emblems have discs as dark as their own dark background (02, 10, 17, 18, 21, 23), and
#    06's clapperboard stripes are near-white -- the same value as its light checker. So keying on
#    brightness alone either eats the emblem or punches holes in it.
#
# THE METHOD, and why each piece is there:
#
#  1. LOCAL CONTRAST, NOT A FITTED GRID. Over a window of one checker period the background
#     averages to its own mean, so the residual r = lum - blur(lum) is exactly +/-(1-a)*delta on
#     background and glow, and ~0 on smooth opaque art. Taking blur(|r|) discards the SIGN -- and
#     the sign is the only thing the checker's phase controls -- which yields (1-a)*delta without
#     ever needing to know where the squares are. alpha follows directly.
#
#     This replaced a global grid fit, which is the obvious approach and does not work. The
#     checker was painted by a generative model, not ruled: its period is stable (measured 51.06
#     -> 51.24 across a frame) but its PHASE drifts, so one global (period, phase) is in step at
#     one edge and half a square out elsewhere. The failure is not subtle and it is invisible in
#     every summary statistic -- it leaves a full-width BAND of un-keyed checkerboard across the
#     image, which scored a healthy "49.1% cleared, fit 1.20" and was caught only by looking at
#     the result over a black ground.
#
#     The local form keeps the property that made the grid attractive: an opaque region carries no
#     contrast at the checker's scale, so it comes out alpha 1 even where the subject is the exact
#     colour of the background. That is what protects 06's white clapper stripes.
#
#  2. HARD FLOOR. The window blurs alpha at its own scale, softening hard subject edges, and a
#     TEXTURED opaque region (black linework on a flat disc) has local contrast that would read as
#     transparent. Pixels far from BOTH background tones are unambiguously opaque and are pinned
#     to alpha 1, which fixes both. The test is distance to the NEARER tone, not the local one, so
#     it does not reintroduce checker mottling in the glow.
#
#  3. CONNECTIVITY. Only background reachable from the border is removed; enclosed regions are
#     filled back to opaque. This keeps 07's flame core filled (the owner's call), and protects
#     06's clapper stripes, 22's gloss highlight and 23's blank screen -- interior areas that match
#     a background tone and that a global colour key would punch straight out.
#
#  4. UNPREMULTIPLY. F = B + (obs - B)/alpha recovers the true colour of semi-transparent glow
#     pixels. Without it the keyed halos keep the checker's grey baked in, which is invisible on a
#     white ground and an obvious dirty fringe on a black one. The local tone B(x,y) is recovered
#     from the SIGN of the residual -- positive means the pixel sits on the lighter square -- so
#     the exact two-tone background is known per pixel without knowing the grid.
#
# ROBUST STATISTICS THROUGHOUT. The border frame is NOT all background: on Science the emblem's
# ring reaches the bottom of the frame, so that strip reads ~165 whatever the checker does. Tones
# and delta are therefore taken as MEDIANS over the border, which survive a contaminated edge,
# rather than means or a median split, which do not.
#
# KNOWN LIMITATION, NOT FIXED -- Red_cross, and to a lesser degree Thumb. Inside a broad soft
# glow the generator did not let the glow TINT the checkerboard; it drew the checker at full
# strength through it. Sampled in Red_cross, a dark square inside the teal halo is [0,1,0]:
# pure background, no teal in it whatsoever. There is no unpremultiply that recovers colour that
# was never painted, so the halo keeps a faint checker texture, visible at 1:1 over black and not
# at game size.
#
# Substituting the locally averaged colour for background-toned pixels inside the object WAS
# tried and is worse: when the background tone is black, "sits at a background tone" also matches
# every black outline in the artwork, so the repair washes the linework out to muddy grey.
# Separating show-through from the art's own blacks is not possible from this data. Repainting
# the glow would be inpainting -- generating art, not processing it -- so it is left alone and
# recorded here instead.
#
# Flat-field sources (delta < FLAT_DELTA) have no checker to measure and fall back to distance
# keying against a single tone; connectivity still applies. File 11 lands here deliberately: its
# tone separation is 5.9/255, too faint to separate from JPEG noise.
#
# Usage:  python tools/assets/dekey.py "GRAPHIC ASSETS/TRIVIA" [outdir]
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage

BORDER = 24        # px frame sampled to model the background
FLAT_DELTA = 4.0   # below this there is genuinely no checker (only Flame and Music qualify)
NOISE = 12.0       # JPEG noise floor, RGB euclidean, flat-field case
SOFT = 40.0        # distance at which a flat-field pixel is fully opaque
FLOOR = 0.18       # alpha at or below this is snapped to fully clear (JPEG softening margin)
FLOOR_WEAK = 0.34  # the same, for a faint checker, where alpha/delta is proportionally noisier
DEFAULT_SQUARE = 48.0


def square_wave(idx, s, phase):
    """+1/-1 square wave of square width s, evaluated at arbitrary indices."""
    return np.where(np.floor((idx - phase) / s).astype(np.int64) % 2 == 0, 1.0, -1.0)


def fit_square(profile):
    """Estimate the checker's square size from a border profile.

    Only the SIZE is used -- it sets the measurement window. The phase is deliberately discarded:
    it drifts across the frame, and relying on it is what produced the un-keyed band.
    """
    p = profile - profile.mean()
    if np.abs(p).max() < 1e-6:
        return None
    idx = np.arange(len(p))
    sizes = np.arange(8.0, 140.0, 0.05)
    c = np.exp(-1j * np.pi * np.outer(1.0 / sizes, idx)) @ p
    return float(sizes[int(np.argmax(np.abs(c)))])


def border_mask(h, w):
    m = np.zeros((h, w), bool)
    m[:BORDER, :] = m[-BORDER:, :] = m[:, :BORDER] = m[:, -BORDER:] = True
    return m


class Background:
    """The painted background of one source, measured from its border frame."""

    def __init__(self, a):
        h, w = a.shape[:2]
        lum = a.mean(2)
        m = border_mask(h, w)

        sx = fit_square(lum[:BORDER, :].mean(0))
        sy = fit_square(lum[:, :BORDER].mean(1))
        sizes = [s for s in (sx, sy) if s]
        self.square = float(np.median(sizes)) if sizes else DEFAULT_SQUARE
        self.window = max(9, int(round(2 * self.square)) | 1)

        # Residual at the checker's own scale. Reflected edges keep the local two-tone statistics
        # intact, unlike replication, which flattens the frame and hides the background entirely.
        self.smooth = ndimage.uniform_filter(lum, size=self.window, mode="reflect")
        self.smooth_rgb = np.dstack([ndimage.uniform_filter(a[..., i], size=self.window,
                                                            mode="reflect") for i in range(3)])
        r = lum - self.smooth

        # Medians, so one contaminated edge cannot move the model.
        self.delta = float(np.median(np.abs(r[m])))
        if self.delta < FLAT_DELTA:
            self.kind = "flat"
            self.B1 = self.B2 = np.median(a[m], axis=0).astype(np.float32)
            self.sep = 0.0
            return

        hi = m & (r > 0.5 * self.delta)
        lo = m & (r < -0.5 * self.delta)
        if not hi.any() or not lo.any():
            self.kind = "flat"
            self.B1 = self.B2 = np.median(a[m], axis=0).astype(np.float32)
            self.sep = 0.0
            return

        self.kind = "checker"
        self.B1 = np.median(a[hi], axis=0).astype(np.float32)   # lighter square
        self.B2 = np.median(a[lo], axis=0).astype(np.float32)   # darker square
        self.sep = float(np.linalg.norm(self.B1 - self.B2))

    def local_tone(self, lum):
        """Which of the two tones each pixel sits on, from the sign of its residual."""
        return np.where((lum - self.smooth)[..., None] > 0, self.B1, self.B2)


def key(a, bg):
    """Return (rgba uint8, alpha float) for one source array."""
    lum = a.mean(2)
    d1 = np.linalg.norm(a - bg.B1, axis=2)
    d2 = np.linalg.norm(a - bg.B2, axis=2)

    if bg.kind == "checker":
        B = bg.local_tone(lum)
        # blur(|r|) == (1 - alpha) * delta, with no dependence on where the squares fall.
        amp = ndimage.uniform_filter(np.abs(lum - bg.smooth), size=bg.window, mode="reflect")
        alpha = 1.0 - np.clip(amp / bg.delta, 0.0, 1.0)
        # JPEG softening means amp sits a little under delta even on pure background, leaving
        # alpha ~0.1 -- a faint checker ghost that is invisible on white and plainly visible on
        # black. Rescale so anything at or below FLOOR is fully clear.
        # A faint checker gives a proportionally noisier alpha = 1 - amp/delta, which survives a
        # fixed floor as drifting semi-opaque haze. Red_cross (delta 5.5) needs more margin than
        # Science (delta 39.8). Keying it as a FLAT field instead is not the answer: that models
        # its real two-tone background as one colour, so the modulation is charged to the
        # foreground and the glow comes out visibly checkered.
        floor = float(np.interp(bg.delta, [5.0, 20.0], [FLOOR_WEAK, FLOOR]))
        alpha = np.clip((alpha - floor) / (1.0 - floor), 0.0, 1.0)
        # RAMP, not a step. A binary "far from both tones => opaque" test cuts the alpha channel
        # along a threshold contour, which on a broad soft glow is a visibly stepped, ragged
        # boundary (worst on Red_cross and Thumb). Ramping it across a band keeps the edge smooth.
        # The floor must not itself depend on the checker. A per-pixel distance is larger on one
        # tone than the other, which stamps the checkerboard straight back into the alpha channel
        # as a ring of dots around every soft glow. Distance measured on the BLURRED image has the
        # checker already averaged out, so the ramp comes out smooth. The sharp per-pixel test is
        # kept only far above threshold, where no glow reaches and edges must stay crisp.
        thr = max(55.0, bg.sep * 1.1)
        bmean = (bg.B1 + bg.B2) / 2.0
        d_smooth = np.linalg.norm(bg.smooth_rgb - bmean, axis=2)
        alpha = np.maximum(alpha, np.clip((d_smooth - 0.30 * thr) / (0.50 * thr), 0, 1))
        alpha = np.maximum(alpha, (np.minimum(d1, d2) > 2.2 * thr).astype(np.float32))
    else:
        # Flat field: the noise floor is measured from this image's own border rather than assumed.
        # A fixed floor left a wide band of barely-opaque background around the flame, which the
        # unpremultiply then amplified into a grainy grey cloud -- invisible on black, filthy on
        # white.
        B = np.broadcast_to(bg.B1, a.shape)
        m = border_mask(*lum.shape)
        d_raw = np.linalg.norm(a - bg.B1, axis=2)
        # Even a "flat" field here carries a faint checker (Red_cross alternates 11 and 0). A
        # per-pixel distance therefore alternates too, and stamps a ring of dots into the alpha
        # around every soft glow. Measured on the blurred image the checker is already gone.
        d_smooth = np.linalg.norm(bg.smooth_rgb - bg.B1, axis=2)
        lo = max(NOISE, float(np.percentile(d_smooth[m], 99.0)))
        alpha = np.clip((d_smooth - lo) / max(SOFT, lo * 0.8), 0.0, 1.0)
        alpha = np.clip((alpha - FLOOR) / (1.0 - FLOOR), 0.0, 1.0)
        # Blurring costs edge sharpness, so genuine subject colour still wins outright.
        alpha = np.maximum(alpha, (d_raw > max(60.0, lo * 3.0)).astype(np.float32))

    # Only background reachable from the border is removed; enclosed regions are filled back.
    holes = alpha < 0.95
    lab, n = ndimage.label(holes)
    outside = np.zeros_like(holes)
    if n:
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        if edge:
            outside = np.isin(lab, list(edge))
            alpha = np.where(holes & ~outside, 1.0, alpha)
        else:
            alpha = np.ones_like(alpha)

    # A pixel that sits AT a background tone and is joined to the frame edge by an unbroken path of
    # background-toned pixels IS background, whatever its contrast or its alpha says. This is
    # decided on colour and connectivity alone, deliberately independent of alpha, because alpha
    # cannot be trusted near the artwork: the smoothed hard floor blurs the object's influence
    # half a window outward, inflating alpha into a collar around it in which checker squares
    # survive fully opaque -- visible at 1:1 hugging the Geography badge, and invisible in every
    # statistic, which called that file 38% clear with 0.11% soft.
    #
    # Connectivity is what makes this safe. Interiors are never reached: the near-black burger
    # disc is ringed by mint, the flame core is enclosed, and the clapper stripes sit inside the
    # badge. History's dark purple disc is 53 from the checker's black, outside the tolerance.
    # A flat field needs a wider tolerance than a checker: with no two-tone signature to key on,
    # the field blends gradually into the neon glow and a tight tolerance leaves a dark ragged
    # collar round the flame -- invisible on black, obvious on white. The subject's own colours
    # here are saturated neon, far outside this radius.
    tol = max(25.0, bg.sep * 0.35) if bg.kind == "checker" else 48.0
    bgcol = np.minimum(d1, d2) < tol
    lab2, n2 = ndimage.label(bgcol)
    if n2:
        edge2 = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
        if edge2:
            bgmask = np.isin(lab2, list(edge2))
            alpha = np.where(bgmask, 0.0, alpha)

            # The boundary itself is a blend of artwork and background and so matches NEITHER
            # tone: a mid-grey ring one pixel outside a dark disc on a light checker. A hard cut
            # leaves it fully opaque, which reads as a stepped grey halo around the badge on a
            # dark ground. Ramping alpha by how far the colour has travelled away from the
            # background gives the edge back its anti-aliasing, and the unpremultiply then
            # recovers the artwork's own colour underneath it.
            band = ndimage.binary_dilation(bgmask, iterations=8) & ~bgmask
            ramp = np.clip((np.minimum(d1, d2) - tol) / tol, 0.0, 1.0)
            alpha = np.where(band, np.minimum(alpha, ramp), alpha)

    alpha = drop_islands(alpha, a, bg)

    # Dividing by a small alpha amplifies that pixel by 1/alpha, so the divisor is floored -- but
    # only just. Flooring it higher (0.35 was tried) UNDER-corrects the soft band and leaves the
    # light checker's grey in it, which reads as a white halo around the whole badge on a dark
    # ground. Substituting the locally averaged colour there was also tried and is worse again: at
    # an object's edge that average contains the subject, so it drags the bright ring outward.
    F = np.clip(B + (a - B) / np.maximum(alpha, 0.15)[..., None], 0, 255)
    F = np.where(alpha[..., None] >= 0.999, a, F)
    return np.dstack([F, np.clip(alpha * 255.0, 0, 255)]).astype(np.uint8), alpha


def drop_islands(alpha, a, bg):
    """Clear detached leftovers that are background-coloured.

    Every source in this folder is ONE object -- a badge, a tick, a clock. So anything left opaque
    but detached from the main mass is a keying failure: a smudge where the checker's contrast
    faded, or a band along an edge where the source carries something that is not checkerboard.

    The test is colour, not size. A leftover piece of background still LOOKS like the background,
    whereas a genuine detached detail (a sparkle, a motion tick) is mint or pink and nowhere near
    the grey. Deleting by size alone would take the real details with the smudges.
    """
    # Labelled at a LOW threshold on purpose. Leftover fragments sit well under half opacity, so a
    # 0.5 cut never gives them a component of their own and the colour test below never sees them.
    lab, n = ndimage.label(alpha > 0.25)
    if n:
        areas = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        main = int(np.argmax(areas)) + 1
        tol = max(30.0, bg.sep * 0.8)
        for c in range(1, n + 1):
            if c == main or areas[c - 1] > 0.30 * areas[main - 1]:
                continue
            mean = a[lab == c].mean(0)
            if min(np.linalg.norm(mean - bg.B1), np.linalg.norm(mean - bg.B2)) < tol:
                alpha[lab == c] = 0.0

        # FAINT residue is the other half of the problem and the opaque test above cannot see it:
        # the leftover bands along some frame edges sit at alpha 30-110, so they never appear as a
        # component at all, yet they are plainly visible over black. A real glow hugs its object;
        # faint haze far from it does not belong to it. Tapered, so there is no cut line.
        reach = max(120.0, 3.0 * (bg.square or DEFAULT_SQUARE))
        dist = ndimage.distance_transform_edt(lab != main)
        taper = np.clip((1.7 * reach - dist) / (0.7 * reach), 0.0, 1.0)
        alpha = np.where(alpha < 0.6, alpha * taper, alpha)
    return alpha


def verification_sheet(rgba):
    """THIS file over white and over black, side by side.

    A surviving checker square, a grey fringe or a clipped glow is invisible on one ground and
    obvious on the other. One file per sheet -- never a montage of different files.
    """
    im = Image.fromarray(rgba, "RGBA").resize((500, 500), Image.LANCZOS)
    sheet = Image.new("RGB", (1010, 500), (128, 128, 128))
    for x, ground in ((0, (255, 255, 255)), (510, (0, 0, 0))):
        panel = Image.new("RGB", (500, 500), ground)
        panel.paste(im, (0, 0), im)
        sheet.paste(panel, (x, 0))
    return sheet


def residue(rgba, bg):
    """Worst surviving trace of the background, as a fraction of its own contrast.

    Measured where the result is still opaque: if a checker square survived, the local contrast
    there is still ~delta. This is the number that would have caught the un-keyed band.
    """
    a = rgba[..., 3].astype(np.float32) / 255.0
    if bg.kind != "checker":
        return 0.0
    lum = rgba[..., :3].astype(np.float32).mean(2)
    sm = ndimage.uniform_filter(lum, size=bg.window, mode="reflect")
    amp = ndimage.uniform_filter(np.abs(lum - sm), size=bg.window, mode="reflect")
    # Only count regions left opaque that still carry the background's own contrast signature.
    suspect = (a > 0.5) & (np.abs(lum - sm) < 2.5 * bg.delta)
    return float(np.percentile(amp[suspect], 99.9) / bg.delta) if suspect.any() else 0.0


def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, "transparent")
    prev, check = os.path.join(out, "_preview"), os.path.join(out, "_check")
    for d in (out, prev, check):
        os.makedirs(d, exist_ok=True)

    files = sorted(f for f in os.listdir(src) if f.lower().endswith((".jpg", ".jpeg")))
    square = [f for f in files if Image.open(os.path.join(src, f)).size == (2048, 2048)]
    print("%d sources, %d are 2048x2048 emblems/props to key "
          "(the other %d are scenes and must not be keyed)\n" % (len(files), len(square),
                                                                 len(files) - len(square)))
    flagged = []
    for i, f in enumerate(square, 1):
        a = np.asarray(Image.open(os.path.join(src, f)).convert("RGB")).astype(np.float32)
        bg = Background(a)
        rgba, alpha = key(a, bg)
        stem = os.path.splitext(f)[0]

        Image.fromarray(rgba, "RGBA").save(os.path.join(out, stem + ".png"))
        Image.fromarray(rgba, "RGBA").convert("RGB").resize((512, 512), Image.LANCZOS) \
            .save(os.path.join(prev, stem + ".jpg"), quality=88)
        verification_sheet(rgba).save(os.path.join(check, stem + ".jpg"), quality=90)

        clear = (alpha < 0.04).mean() * 100
        soft = ((alpha > 0.04) & (alpha < 0.96)).mean() * 100
        res = residue(rgba, bg)
        why = []
        if clear < 5.0:
            why.append("cleared only %.1f%%" % clear)
        if res > 0.5:
            why.append("background residue %.2f" % res)
        if why:
            flagged.append((f, "; ".join(why)))
        print("%02d %-42s %-7s sq=%6.2f d=%5.1f sep=%5.1f  clear=%5.1f%% soft=%5.2f%% res=%.2f"
              % (i, f[:40], bg.kind, bg.square, bg.delta, bg.sep, clear, soft, res))

    n = len([x for x in os.listdir(out) if x.endswith(".png")])
    # The previews bug that silently collapsed two files onto each other is why this asserts.
    assert n == len(square), "wrote %d PNGs for %d emblems -- names collided" % (n, len(square))
    print("\n%d keyed PNGs -> %s" % (n, out))
    if flagged:
        print("\nSUSPECT:")
        for f, why in flagged:
            print("   %-50s %s" % (f[:48], why))
    print("\nVerification sheets (over white | over black) -> %s" % check)
    print("Open every sheet ONE AT A TIME. No statistic here substitutes for that: the band that "
          "broke the previous version scored clean on all of them.")


if __name__ == "__main__":
    main()
