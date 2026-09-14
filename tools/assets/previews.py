# Make viewable, full-frame previews of an asset folder so each image can be OPENED and DESCRIBED
# one at a time (LAW 1a), without tripping the API's image ceiling.
#
# WHY THIS EXISTS, and the two traps it removes:
#
# 1. THE SIZE CEILING. Once a conversation holds many images, every one of them must be <= 2000 px
#    on its longest edge. The TRIVIA emblems are 2048 px square, so reading a few at native size
#    retroactively blocks all further image reads for the rest of the session. Downscale FIRST.
#
# 2. THE NAME COLLISION. A first version named previews after a 40-character truncation of the
#    source stem. `Quiz_night_animal_emblem_design_2K_20260915044340` and `…044433` truncate to the
#    SAME string, so one silently overwrote the other -- 26 files in, 25 out, and the missing pair
#    was exactly the duplicate question being investigated. Nothing errored. Index the outputs and
#    ASSERT the count.
#
# Previews are whole frames, never crops: a crop can hide the very corner that carries a painted
# checkerboard, and cropping is how you end up describing an image you have not actually seen.
#
# Usage:  python tools/assets/previews.py "GRAPHIC ASSETS/TRIVIA" <outdir> [maxedge]
import os, sys, shutil
from PIL import Image

src = sys.argv[1]
out = sys.argv[2]
maxedge = int(sys.argv[3]) if len(sys.argv) > 3 else 1000

files = sorted(f for f in os.listdir(src) if not f.startswith("."))
shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)

index = []
for i, f in enumerate(files, 1):
    im = Image.open(os.path.join(src, f))
    w, h = im.size
    s = min(1.0, maxedge / max(w, h))
    im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS).save(os.path.join(out, "%02d.png" % i))
    index.append("%02d  %-58s %dx%d" % (i, f, w, h))

written = len([n for n in os.listdir(out) if n.endswith(".png")])
# The collision bug produced fewer files than inputs and said nothing. Never again.
assert written == len(files), "wrote %d previews for %d sources -- names collided" % (written, len(files))

print("\n".join(index))
print("\n%d previews (longest edge %d) -> %s" % (written, maxedge, out))
print("Open them ONE AT A TIME and describe each before touching any original.")
