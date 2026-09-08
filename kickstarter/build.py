#!/usr/bin/env python3
"""Build the PlayZoo Kickstarter campaign page, in two forms:

  1. Artifact (self-contained): all art inlined as base64. Publish as a Claude Artifact.
       -> kickstarter/dist/playzoo-kickstarter.html   (+ preview.html, wrapped for screenshots)
  2. Site (hosted on playzoo.snapaweb.com/kickstarter): images referenced by same-origin URL,
     so the file is tiny. A full HTML document, served by the Express server.
       -> apps/web/public/kickstarter.html

Source of truth: body.html (markup + CSS + Rex copy, with {{...}} placeholders) + the art in
apps/web/public/. Rebuild:  python kickstarter/build.py
Published artifact: https://claude.ai/code/artifact/88fce1cd-26be-4c48-8e3b-2bb8702389ea
"""
import base64, io, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
PUB  = os.path.join(REPO, "apps", "web", "public")
DIST = os.path.join(HERE, "dist"); os.makedirs(DIST, exist_ok=True)

def _b64_jpg(rel, w, q=82):
    im = Image.open(os.path.join(PUB, rel)).convert("RGB")
    if im.width > w: im = im.resize((w, round(w*im.height/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=q, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

def _b64_png(rel, h):
    im = Image.open(os.path.join(PUB, rel)).convert("RGBA")
    if im.height > h: im = im.resize((round(h*im.width/im.height), h), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()

GAMES = [
 ("trivia","Trivia","Three rounds, four answers, one timer. Fast and right beats slow and smug."),
 ("murder","Murder Mystery","One of you is the killer. Wink, lie, and vote out your own friends."),
 ("codenames","Cover Ops","Crack the grid on your spymaster's one-word clues. Never tap the assassin."),
 ("bingo","Bingo Night","Daub your card, hit a line, do the dare. Grandma never played it like this."),
 ("feud","Survey Showdown","Guess what 100 strangers said. Your gut is wrong — guess anyway."),
 ("taboo","Off Limits","Describe the word without the words. Slip up and the buzzer finds you."),
 ("headsup","Foreheads","The word's on your head; your team's clues are the only hope you've got."),
 ("pictionary","Quick Draw","Draw the word on your phone. Your team guesses. Your art teacher was right."),
 ("telestrations","Sketch Relay","Draw, pass, guess, repeat — telephone with pictures. It always goes wrong."),
 ("reverse","Full Cast","The whole team acts it out at once. One guesser. Total pandemonium."),
 ("monikers","Encore","Same deck, three rounds, each harder: describe, one word, then charades."),
 ("justone","Solo Clue","Everyone writes one clue — matching clues cancel. Think you're clever?"),
 ("ballpark","Ballpark","Every answer's a number. Guess it, then bet on who's closest without going over."),
 ("afterdark","After Dark","18+ fill-in-the-blank. Play your filthiest card. The judge has no shame."),
]
CAST = [
 ("raccoon","John","The schemer"),("flamingo","Trixie","The diva"),("gorilla","Boomer","The bouncer"),
 ("parrot","Pixel","The loudmouth"),("sloth","Mo","The chill one"),("lion","Duke","The big shot"),
 ("zebra","Zara","The party starter"),("fox","Kip","The hustler"),("panda","Bianca","The drama queen"),
 ("toucan","Rico","The DJ"),("hippo","Hank","The heavyweight"),("cat","Duchess","The snob"),
 ("otter","Otis","The prankster"),("bear","Bruno","The bruiser"),("penguin","Waddles","The try-hard"),
 ("owl","Hoot","The know-it-all"),("chameleon","Kai","The two-face"),("rhino","Tank","The muscle"),
 ("skunk","Sludge","The instigator"),("crocodile","Chomp","The competitor"),
]
# (price, name, description, is_feature)
TIERS = [
 ("$15","Zoo Pass","Six months of PlayZoo and five games to lose at — a cheap date with your own public humiliation.",False),
 ("$30","Founding Animal","A full year of PlayZoo, ten games, and one custom animal drawn just for you — immortalized, and frankly better-looking than the original.",True),
 ("$50","Head Keeper","A full year with EVERY game unlocked, plus TWO custom characters made just for you. You basically own a wing of the zoo.",True),
]

def build(mode):
    """mode 'b64' inlines images; mode 'url' references them at same-origin paths."""
    jpg = (lambda rel,w,q=82: "/"+rel) if mode=="url" else _b64_jpg
    png = (lambda rel,h:      "/"+rel) if mode=="url" else _b64_png

    hero    = jpg("bg/home.jpg", 1400, 82)
    rexfull = png("crew/rex-full.png", 560)
    johndesk = jpg("bg/john-desk.jpg", 900, 82)

    games = '<div class="games">\n'
    for slug,label,line in GAMES:
        games += f'  <div class="game"><img src="{jpg(f"tiles/{slug}.jpg",440,80)}" alt="{label} game art"><div class="gt"><b>{label}</b><span>{line}</span></div></div>\n'
    games += (f'  <div class="game soon"><img src="{jpg("tiles/coming-soon.jpg",560,84)}" '
              f'alt="More games coming soon"><span class="soonveil"></span>'
              f'<span class="soonlabel">More coming soon</span></div>\n</div>')

    cast = '<div class="cast">\n'
    for slug,name,role in CAST:
        cast += f'  <div class="critter"><img src="{png(f"cast/{slug}.png",340)}" alt="{name} the {slug}"><b>{name}</b><span>{role}</span></div>\n'
    cast += '</div>'

    tiers = '<div class="tiers tiers-3">\n'
    for price,name,desc,feat in TIERS:
        cls = "tier feature" if feat else "tier"
        tiers += f'  <div class="{cls}"><div class="price">{price}</div><div class="tname">{name}</div><p>{desc}</p></div>\n'
    tiers += '</div>'

    body = open(os.path.join(HERE, "body.html"), encoding="utf-8").read()
    return (body.replace("{{HERO}}", hero).replace("{{REX_FULL}}", rexfull)
                .replace("{{JOHN_DESK}}", johndesk).replace("{{GAMES_GRID}}", games).replace("{{CAST_GRID}}", cast)
                .replace("{{TIERS}}", tiers))

def wrap(body):
    return ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<style>body{margin:0}</style></head><body>\n" + body + "\n</body></html>")

# 1) artifact (base64)
b64 = build("b64")
open(os.path.join(DIST, "playzoo-kickstarter.html"), "w", encoding="utf-8").write(b64)
open(os.path.join(DIST, "preview.html"), "w", encoding="utf-8").write(wrap(b64))
# 2) hosted site page (url refs) -> served at /kickstarter
site = os.path.join(PUB, "kickstarter.html")
open(site, "w", encoding="utf-8").write(wrap(build("url")))
print("artifact:", os.path.getsize(os.path.join(DIST, "playzoo-kickstarter.html")), "bytes")
print("site page:", os.path.getsize(site), "bytes ->", site)
