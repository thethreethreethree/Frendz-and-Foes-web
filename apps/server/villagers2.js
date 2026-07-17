// Murder v2 roster — "The Villagers". The canonical 100 characters (source of truth:
// apps/server/murder-characters.txt + Character Selection RAW/character_weapon_manifest.md).
//
// Each character owns exactly ONE item set — the physical card art "ITEM SET <n>". A set holds three
// murder methods and sits at one location, and belongs to exactly one character, so a revealed set
// points at exactly one profession. THAT uniqueness is the deduction engine (asserted by
// test/villagers.test.mjs) — it lives at the SET level, not the method level, because the founder's
// manifest deliberately shares individual methods across characters (three villagers can reach for a
// letter opener; only one of them owns Item Set 3 in the Library).
//
// weaponId is the stable internal id of a character's set. It is NOT shown to players: they see the
// set's location label, its three methods, and the card art.
//
// RAW columns: [id, name, profession, weaponId, setNumber, location, methods[3], emoji, blurb]

const RAW = [
  ["sam", "Sam", "Gardener", "trowel", 1, "Garden", ["Pruning shears", "garden trowel", "rose fertilizer poison"], "🌱", "Always seen with dirt under his nails. Tends the town square roses. Knows everyone's comings and goings."],
  ["allen", "Allen", "Doctor", "scalpel", 2, "Clinic", ["Syringe with fatal dose", "scalpel", "\"accidental\" wrong prescription"], "🔪", "Tends to the sick with a steady hand, but has been known to be forgetful. His family has been in town for generations."],
  ["eugene", "Eugene", "Librarian", "lamp", 3, "Library", ["Heavy brass bookend", "letter opener", "toppled bookshelf"], "🪔", "Quiet and keeps to himself. Found an unusual old book in the library archives recently."],
  ["larry", "Larry", "Blacksmith", "hammer", 4, "Forge", ["Forge hammer", "red-hot iron poker", "freshly forged blade"], "🔨", "A man of few words, known for his skill at the forge. A recent argument with a local farmer is rumored."],
  ["gilbert", "Gilbert", "Town Mayor", "gavel", 5, "Town Office", ["Ceremonial gavel", "heavy walking cane", "hired hands (orders, not fingerprints)"], "⚖️", "The long-standing mayor. Recently proposed a controversial new zoning law that angered many."],
  ["ronnie", "Ronnie", "Postman", "letter_opener", 6, "Post Office", ["Loaded mailbag swung as a club", "letter opener", "poisoned parcel"], "✉️", "Always cheerful, delivers mail with a smile. Knows where everyone lives, but also reads the return addresses."],
  ["mildred", "Mildred", "Cook", "rolling_pin", 7, "Kitchen", ["Poisoned pastry", "cast-iron skillet", "kitchen knife"], "🥖", "Her pastries are legendary. A recent bad batch of flour has her agitated. The last one to see the victim?"],
  ["barbara", "Barbara", "Shopkeeper", "scissors", 8, "Boutique", ["Silk scarf (strangulation)", "antique hatpin", "heavy vintage iron"], "✂️", "A vibrant lady, sells vintage clothes. Her shop was recently broken into, but nothing was taken."],
  ["walter", "Walter", "Bartender", "bottle", 9, "The Tavern", ["Poisoned drink", "broken bottle", "corkscrew"], "🍾", "Pours drinks and hears every secret in town. Never forgets a face or an unpaid tab."],
  ["edith", "Edith", "Seamstress", "sewing_needle", 10, "The Sewing Room", ["Long steel needle", "fabric shears", "measuring tape (garrote)"], "🧵", "Sews the finest garments around. Her needle is always sharp and her gossip sharper."],
  ["floyd", "Floyd", "Cobbler", "awl", 11, "The Workshop", ["Cobbler's awl", "shoe hammer", "leather strap (garrote)"], "👞", "Mends shoes by candlelight. Walks with a limp no one can explain."],
  ["agnes", "Agnes", "Schoolteacher", "pointer", 12, "The Classroom", ["Heavy wooden ruler/pointer", "inkwell laced with poison", "slate board"], "📏", "Teaches the village children their letters. Stern, observant, misses nothing."],
  ["cyrus", "Cyrus", "Astronomer", "telescope", 13, "The Observatory", ["Brass telescope as a bludgeon", "star chart weights", "lured victim off the observatory tower"], "🔭", "Reads the heavens and predicts the harvest. Some call him a fraud."],
  ["pearl", "Pearl", "Innkeeper", "fire_poker", 14, "The Inn", ["Master room key (locked-room setup)", "heavy guest ledger", "room service tray poison"], "🔥", "Runs the inn's front desk. Keeps a ledger of every guest who's ever stayed."],
  ["otis", "Otis", "Woodcutter", "axe", 15, "The Woods", ["Felling axe", "\"falling\" tree", "bare hands"], "🪓", "Hauls timber from dawn to dusk. Strong as an ox, slow to anger, but anger he does."],
  ["vera", "Vera", "Sexton", "bell_rope", 16, "The Belfry", ["Bell rope (hanging/strangulation)", "heavy candlestick", "dropped bell counterweight"], "🔔", "Tends the chapel and rings the bell. Knows who confesses and who stays away."],
  ["dexter", "Dexter", "Banker", "coin_sack", 17, "The Vault", ["Coin sack as a cosh", "vault door (trapped inside)", "letter opener"], "💰", "Counts coins all day at the bank. Recently noticed money going missing."],
  ["hazel", "Hazel", "Herbalist", "toxic_herbs", 18, "The Apothecary", ["Poisonous herbal tea", "nightshade tincture", "mislabeled remedy"], "☘️", "Brews remedies from herbs in the wood. Some heal, some do not."],
  ["marvin", "Marvin", "Cattle Drover", "branding_iron", 19, "The Cattle Trail", ["Cattle prod", "staged stampede", "drover's whip"], "🐄", "Drives the cattle to market. Smells of the field and speaks little."],
  ["lottie", "Lottie", "Laundress", "clothesline", 20, "The Wash House", ["Drowning in the wash tub", "lye water", "wet twisted linen (garrote)"], "🧺", "Washes the town's linens. Sees every stain that comes through her tubs."],
  ["hubert", "Hubert", "Clockmaker", "pendulum", 21, "Clock Tower", ["Clock tower gears (staged accident)", "heavy pendulum weight", "winding key spike"], "🕰️", "Keeps the town clock running. Obsessed with time and punctuality."],
  ["beatrice", "Beatrice", "Painter", "palette_knife", 22, "Art Studio", ["Toxic paint pigments (arsenic/lead)", "palette knife", "turpentine"], "🎨", "Paints portraits of the wealthy. Notices details others overlook."],
  ["roscoe", "Roscoe", "Stablehand", "horseshoe", 23, "Stables", ["Horseshoe", "spooked horse kick (staged)", "pitchfork"], "🐴", "Tends the stables and shoes the horses. A quiet temper that occasionally flares."],
  ["opal", "Opal", "Florist", "florist_wire", 24, "Florist Shop", ["Oleander bouquet (poison)", "florist wire (garrote)", "thorn-laced arrangement with toxin"], "🌸", "Sells flowers on the corner each morning. Cheerful, but always watching."],
  ["clyde", "Clyde", "Gravedigger", "spade", 25, "Graveyard", ["Spade", "open grave (buried alive)", "headstone toppled onto victim"], "🪦", "Digs the graves and tends the cemetery. Knows the dead better than the living."],
  ["mabel", "Mabel", "Baker", "bread_peel", 26, "Bakery", ["Rolling pin", "scalding oven", "poisoned loaf"], "🍞", "Bakes bread before sunrise. Her ovens run hot and her temper hotter."],
  ["errol", "Errol", "Peddler", "cane", 27, "Curio Shop", ["Exotic imported poison", "curved foreign dagger", "rigged trinket"], "🧳", "The traveling peddler who came to town and never left. His wares are oddly exotic."],
  ["glenda", "Glenda", "Town Clerk", "ledger", 28, "Town Hall", ["Heavy record ledger", "official seal press", "blackmail leading victim to a fatal \"accident\""], "📒", "Keeps the town records and certificates. Knows everyone's true age and origin."],
  ["buster", "Buster", "Houndsman", "dog_chain", 29, "The Kennels", ["Set the hounds loose", "hunting knife", "dog chain"], "🐕", "Trains the hunting dogs. A scar across his cheek he won't discuss."],
  ["iris", "Iris", "Musician", "piano_wire", 30, "The Tavern Piano", ["Piano wire (garrote)", "heavy metronome", "dropped piano lid"], "🎹", "Plays piano at the tavern each night. Hears confessions disguised as drunken rambling."],
  ["norbert", "Norbert", "Fisherman", "gaff", 31, "Docks", ["Filleting knife", "fishing line (garrote)", "drowning off his boat"], "🎣", "Catches fish at the lake before anyone wakes. Solitary and weathered."],
  ["estelle", "Estelle", "Fortune Teller", "crystal_ball", 32, "Séance Parlor", ["Poisoned tea leaves", "crystal ball as a bludgeon", "ritual dagger"], "🔮", "Reads palms and tea leaves for coin. Claims she saw the crime in a vision."],
  ["percy", "Percy", "Chimney Sweep", "brush_rod", 33, "Chimney Sweep", ["Blocked flue (carbon monoxide)", "soot brush pole", "shoved from a rooftop"], "🧹", "Sweeps the chimneys black with soot. Slips in and out of homes unseen."],
  ["doris", "Doris", "Storekeeper", "scale_weight", 34, "Dry Goods Store", ["Rat poison from her shelves", "scale weight", "tainted goods sold to the victim"], "🏬", "Runs the general store. Knows exactly what everyone buys."],
  ["alphonse", "Alphonse", "Chef", "chef_knife", 35, "Professional Kitchen", ["Chef's knife", "deliberate deadly allergen in a dish", "boiling stockpot"], "🍳", "The visiting chef from the city. Arrogant, particular, and recently insulted."],
  ["winifred", "Winifred", "Beekeeper", "smoker", 36, "Apiary", ["Provoked swarm (fatal stings)", "smoker fire", "toxic honey"], "🐝", "Keeps the bees and sells the honey. Calm hands, watchful eyes."],
  ["gus", "Gus", "Mechanic", "wrench", 37, "Vehicle Workshop", ["Sabotaged brakes", "heavy wrench", "engine crush \"accident\""], "🔧", "Repairs anything with an engine. Grease-stained and gruff."],
  ["cora", "Cora", "Nurse", "syringe", 38, "Sickroom", ["Lethal medicine overdose", "suffocation with a pillow", "swapped medication"], "💉", "Nurses the doctor's patients. Knows which medicines went missing."],
  ["leland", "Leland", "Surveyor", "stake", 39, "The Survey Line", ["Surveyor's tripod", "sightline stake", "lured victim to an unstable cliff edge"], "📐", "Surveys the land for new construction. Recently mapped a disputed boundary."],
  ["maisie", "Maisie", "Dairymaid", "churn_staff", 40, "The Dairy", ["Milking stool", "tainted milk", "butter churn dasher"], "🥛", "Milks the cows and churns the butter. Up before dawn, sees who else is."],
  ["horace", "Horace", "Constable", "truncheon", 41, "Precinct", ["Service revolver", "truncheon", "staged \"resisting arrest\" incident"], "👮", "Keeps law and order, badge always polished. Has a grudge he hides well."],
  ["bess", "Bess", "Landlady", "skillet", 42, "Lodgings", ["Poisoned supper tray", "sabotaged staircase", "gas lamp left leaking in a room"], "🛏️", "Runs the boarding house for travelers. Eavesdrops through thin walls."],
  ["ambrose", "Ambrose", "Stonemason", "chisel", 43, "Stoneworks", ["Mason's chisel", "mallet", "toppled statue"], "🗿", "Carves the headstones and statues. Steady hands that never tremble."],
  ["faye", "Faye", "Hairdresser", "curling_iron", 44, "Parlor", ["Straight razor", "scalding curling iron", "chemical hair tonic poison"], "💇", "Styles the ladies' hair in the salon. The town's true intelligence network."],
  ["wendell", "Wendell", "Lawyer", "law_book", 45, "Chambers", ["Heavy law tome", "cane sword", "engineered \"legal\" ruin driving a staged suicide"], "📕", "Argues the law in the courthouse. Slippery with words and motives."],
  ["greta", "Greta", "Orchardist", "pruning_saw", 46, "Orchard", ["Poisoned cider", "orchard ladder sabotage", "pruning saw"], "🍎", "Tends the orchard and presses the cider. A recent feud over land lines."],
  ["silas", "Silas", "Preacher", "crucifix", 47, "Parish", ["Heavy candlestick", "poisoned communion wine", "bell tower fall"], "✝️", "Preaches every Sunday from the pulpit. Knows every sin in town."],
  ["nellie", "Nellie", "Poultry Seller", "hatchet", 48, "Butcher", ["Butchering hatchet", "tainted eggs", "wire coop snips (garrote)"], "🐔", "Sells eggs and poultry at market. Sharp-tongued and observant."],
  ["bertram", "Bertram", "Organ Tuner", "organ_pipe", 49, "The Organ Loft", ["Organ pipe as a club", "tuning wire (garrote)", "collapsed organ loft"], "🎵", "Tunes and repairs the church organ. Hears the building's every creak."],
  ["ruby", "Ruby", "Dancer", "hairpin", 50, "The Saloon", ["Poisoned drink slipped mid-dance", "stiletto heel", "hidden hairpin blade"], "💃", "Dances at the saloon and charms the patrons. Knows men's weaknesses."],
  ["linus", "Linus", "Lighthouse Keeper", "lantern", 51, "Lighthouse", ["Push from the lighthouse gallery", "signal lantern oil fire", "heavy lens weight"], "🗼", "Keeps the lighthouse on the point. Sees ships and shadows by night."],
  ["thelma", "Thelma", "Operator", "phone_cord", 52, "Switchboard", ["Telephone cord (garrote)", "switchboard sabotage (false emergency lure)", "headset cable"], "☎️", "Runs the telephone exchange. Could listen in if she chose to."],
  ["cecil", "Cecil", "Groundskeeper", "sickle", 53, "Estate Garden", ["Hedge shears", "garden sickle", "drowning in the estate fountain"], "🌾", "Trims the hedges of the grand estates. Moves through gardens invisibly."],
  ["wilma", "Wilma", "Storyteller", "candelabra", 54, "Library", ["Heavy storybook", "knitting needle from her bag", "poisoned sweets for a grown-up \"reader\""], "📖", "Reads to the children at story hour. Patient, but recently distracted."],
  ["jasper", "Jasper", "Quarryman", "pickaxe", 55, "Quarry", ["Blasting charge", "pickaxe", "shoved into a deep pit"], "⛏️", "Mines the quarry on the hill's edge. Knows where the deep pits lie."],
  ["etta", "Etta", "Preserver", "mason_jar", 56, "Cellar", ["Botulism-tainted preserves", "heavy glass jar", "locked cellar (suffocation)"], "🫙", "Pickles and preserves the harvest. Her cellar holds many jars and secrets."],
  ["mortimer", "Mortimer", "Undertaker", "coffin_nail", 57, "Mortuary", ["Embalming fluid injection", "coffin lid (trapped alive)", "trocar"], "⚰️", "The undertaker who prepares the dead. Calm in the face of any corpse."],
  ["goldie", "Goldie", "Pawnbroker", "brass_knuckles", 58, "Pawn Shop", ["Pawned pistol from the case", "jeweler's loupe chain (garrote)", "heavy candelabra from inventory"], "💍", "Pawns and appraises valuables. Recognized a stolen ring last week."],
  ["reuben", "Reuben", "Shepherd", "crook", 59, "The Sheepfold", ["Shearing blades", "shepherd's crook", "bare-handed strength"], "🐑", "Shears the sheep each spring. Strong forearms and a quick blade."],
  ["verna", "Verna", "Embroiderer", "hat_pin", 60, "The Linen Room", ["Embroidery scissors", "long needle", "silk thread (garrote)"], "🎩", "Embroiders fine linens for the gentry. Notices when patterns don't match."],
  ["homer", "Homer", "Ferryman", "oar", 61, "Ferry", ["Drowning mid-crossing", "boat oar", "capsized ferry \"accident\""], "🚣", "Ferries folk across the river. Hears confessions mid-crossing."],
  ["sadie", "Sadie", "Greengrocer", "produce_knife", 62, "Market", ["Tainted produce", "cart \"accidentally\" rolled downhill", "produce scale weight"], "🥬", "Sells produce from her cart each dawn. Knows who's flush and who's broke."],
  ["earl", "Earl", "Brewer", "keg_mallet", 63, "Brewery", ["Poisoned keg", "drowning in the brewing vat", "barrel dropped from the loft"], "🍺", "Brews the town's ale and stout. A keg went missing and he's furious."],
  ["myrtle", "Myrtle", "Apothecary", "poison_vial", 64, "Apothecary", ["Arsenic vial", "cyanide compound", "mislabeled prescription"], "⚗️", "Keeps the apothecary's poisons under lock. Recently found one vial empty."],
  ["dudley", "Dudley", "Iceman", "ice_pick", 65, "Ice House", ["Ice pick", "ice block dropped on the victim", "locked cold cellar (hypothermia)"], "🧊", "Delivers ice before the heat of day. Enters every cellar in town."],
  ["lucille", "Lucille", "Theatre Owner", "sandbag", 66, "Theater", ["Sandbag dropped from the rigging", "prop weapon swapped for a real one", "trapdoor fall"], "🎭", "Manages the town theatre. A master of disguise and performance."],
  ["hank", "Hank", "Farmer", "pitchfork", 67, "Farm", ["Pitchfork", "scythe", "plow \"accident\""], "🚜", "Plows the fields and works the soil. The farmer who argued with the blacksmith."],
  ["birdie", "Birdie", "Pigeon Keeper", "birdcage", 68, "Chicken Coop", ["Forged message luring the victim into danger", "coop wire (garrote)", "poisoned grain intended for a rival's hands"], "🕊️", "Keeps and races the carrier pigeons. Messages pass through her hands."],
  ["vernon", "Vernon", "Roofer", "roofing_bar", 69, "The Heights", ["Loosened roof tiles dropped from above", "roofing hammer", "sabotaged ladder"], "🏠", "Repairs the rooftops and gutters. Sees into yards from above."],
  ["della", "Della", "Chandler", "candlestick", 70, "The Workshop", ["Concentrated lye", "hot wax", "candle fire set in the night"], "🕯️", "Sells candles and soap she makes herself. Her lye is dangerously strong."],
  ["augustus", "Augustus", "Veteran", "revolver", 71, "The Barracks", ["Old service pistol", "cavalry saber", "wartime knowledge of traps"], "🎖️", "The retired colonel with war stories. Keeps an old service pistol."],
  ["fern", "Fern", "Forager", "poison_mushroom", 72, "The Forager's Pantry", ["Death cap mushrooms", "hemlock", "foraged berries swapped into a meal"], "🍄", "Gathers mushrooms in the deep forest. Knows which kill and which cure."],
  ["spencer", "Spencer", "Photographer", "tripod", 73, "The Darkroom", ["Darkroom chemicals (cyanide fixer)", "heavy tripod", "magnesium flash fire"], "📷", "Photographs weddings and funerals alike. His camera captured something odd."],
  ["ida", "Ida", "Matron", "key_ring", 74, "The Hearth", ["Iron fireplace poker", "sedative-laced meal", "locked-room \"accident\" in the orphanage"], "🗝️", "Runs the orphanage with an iron rule. Protective and fiercely secretive."],
  ["roy", "Roy", "Sawyer", "saw_blade", 75, "The Timber Yard", ["Sawmill blade (staged accident)", "log rolled onto the victim", "crosscut saw"], "🪚", "Operates the sawmill by the creek. Lost a finger and gained a grudge."],
  ["blanche", "Blanche", "Perfumer", "atomizer", 76, "The Vanity", ["Poisoned perfume atomizer", "toxic powder", "chloroform-soaked handkerchief"], "🌷", "Sells perfume and powders. Can identify any scent in a room."],
  ["travis", "Travis", "Tracker", "hunting_knife", 77, "The Wilds", ["Hunting rifle", "snare trap", "\"hunting accident\" deep in the woods"], "🌲", "Guides hunters through the backwoods. Tracks anything that moves."],
  ["geraldine", "Geraldine", "Knitter", "knitting_needle", 78, "The Fireside", ["Knitting needles", "wool yarn (garrote)", "weighted knitting bag"], "🧶", "Knits and sells warm woolens. Counts her stitches and her enemies."],
  ["oscar", "Oscar", "Lamplighter", "lamp_pole", 79, "Gaswork Fixtures", ["Lamplighter's pole", "gas leak left open", "lamp oil fire"], "🏮", "Tends the town's gaslamps each dusk. Walks every street after dark."],
  ["polly", "Polly", "Waitress", "coffee_pot", 80, "Counter Station", ["Poisoned coffee", "scalding pot", "diner steak knife"], "☕", "Pours coffee at the morning diner. Overhears every breakfast plot."],
  ["cornelius", "Cornelius", "Collector", "antique_dagger", 81, "Collector", ["Antique dueling pistol", "heavy coin case", "ornamental dagger from the collection"], "🗡️", "Collects rare coins and antiques. A recent acquisition is suspiciously valuable."],
  ["maude", "Maude", "Bookkeeper", "abacus", 82, "Bookkeeper", ["Heavy ledger", "letter spike (spindle)", "falsified records luring the victim to an ambush"], "🧮", "Keeps the boarding stable's books. Knows who rode out and when."],
  ["felix", "Felix", "Entertainer", "juggling_club", 83, "Entertainer", ["Juggling knives", "\"misfired\" fire-breathing act", "weighted juggling club"], "🤹", "Juggles and performs in the square. The clown everyone underestimates."],
  ["harriet", "Harriet", "Aviarist", "brass_perch", 84, "Aviary", ["Cage wire (garrote)", "bird feed laced with poison meant for human food", "heavy iron cage"], "🐦", "Raises and sells songbirds. Her cages hold more than birds."],
  ["bernard", "Bernard", "Watchmaker", "screwdriver", 85, "Watchmaker", ["Precision spring-loaded trap", "tiny poisoned watch pin", "timed sabotage device"], "⌚", "Repairs watches with tiny tools. Patient, precise, and very still."],
  ["lena", "Lena", "Weaver", "shuttle", 86, "Weaver", ["Woven cord (garrote)", "basket-cutting knife", "rigged chair collapse"], "🪡", "Weaves baskets and chair seats. Her hands are never idle."],
  ["chester", "Chester", "Coachman", "coach_whip", 87, "Coachman", ["Run down by the coach", "coach whip", "sabotaged wheel on a cliff road"], "🐎", "Drives the stagecoach between towns. Arrives with news and rumor."],
  ["pauline", "Pauline", "Bath Attendant", "pail", 88, "Bath Attendant", ["Drowning in the bath", "scalding water", "wet floor \"slip\" onto stone"], "🛁", "Tends the public bathhouse. Sees everyone with their guard down."],
  ["virgil", "Virgil", "Tollkeeper", "toll_chain", 89, "Bridge", ["Pushed from the bridge", "toll gate counterweight", "boat hook"], "🌉", "Keeps the toll bridge at the river. Notes every traveler who crosses."],
  ["dottie", "Dottie", "Confectioner", "candy_mallet", 90, "Confectionery", ["Poisoned bonbons (for an adult target)", "boiling sugar syrup", "candy-making copper pot"], "🍬", "Sells sweets and candies to the children. Sugar-sweet and secretly shrewd."],
  ["rufus", "Rufus", "Ratcatcher", "rat_trap", 91, "Cellar", ["Rat poison", "spring-loaded vermin trap scaled up", "access to every crawlspace for an ambush"], "🐀", "Hunts vermin from the granaries. Crawls through every dark space."],
  ["selma", "Selma", "Scribe", "quill", 92, "Study", ["Forged letter luring the victim to danger", "sharpened quill/pen knife", "blackmail-driven \"accident\""], "🖋️", "Reads and writes letters for the illiterate. Holds the town's private words."],
  ["monroe", "Monroe", "Prizefighter", "dumbbell", 93, "Training Hall", ["Bare fists", "weighted hand wraps", "a single fatal blow staged as a brawl"], "🥊", "Boxes at the county fairs. A temper that's cost him before."],
  ["cleo", "Cleo", "Animal Trainer", "trainer_chain", 94, "Menagerie", ["Released big cat", "trainer's whip", "\"animal attack\" staged with claw tools"], "🐅", "Trains the circus animals passing through. Fearless and unreadable."],
  ["wallace", "Wallace", "Auctioneer", "hand_bell", 95, "Auction House", ["Auction gavel", "livestock pen \"trampling", "\" rigged sale luring the victim to a remote estate"], "📢", "Auctions livestock and estates. A fast talker with faster eyes."],
  ["minnie", "Minnie", "Almoner", "alms_box", 96, "Almshouse", ["Overdose of patient medicine", "pillow suffocation", "tainted broth"], "⛪", "Tends the sick at the almshouse. Gentle, tireless, and recently grieving."],
  ["gordon", "Gordon", "Knife Grinder", "whetstone", 97, "Grinding Tools", ["Any freshly sharpened blade", "grinding wheel", "deliberately dulled blade causing a fatal work accident"], "🪨", "Repairs and sharpens every blade in town. His whetstone is always wet."],
  ["audra", "Audra", "Choirmaster", "baton", 98, "Music Master", ["Conductor's baton (stiletto-thin)", "heavy hymnal", "choir loft railing sabotage"], "🎼", "Conducts the village choir. Demands harmony and notices discord."],
  ["theodore", "Theodore", "Magistrate", "justice_scales", 99, "Judicial Accoutrement", ["Antique gavel", "cane sword", "orchestrated \"lawful\" execution of a frame-up"], "⚖️", "The retired judge who knows the law's every loophole. Watches and waits."],
  ["josephine", "Josephine", "Dressmaker", "shears", 100, "Modiste Supplies", ["Dressmaker's shears", "corset lacing (garrote)", "hatpin"], "🧷", "Runs the dress emporium across from Barbara's. A bitter rivalry simmers."],
];

export const VILLAGERS = RAW.map(([id, name, profession, weaponId, setNumber, , , , blurb]) => ({
  id,
  name,
  profession,
  weaponId,
  setNumber,
  blurb,
  // `art` is the full character card (577x650); `thumb` is a 256w copy for grids and lists, so a
  // 100-card picker costs ~1.9MB instead of ~53MB. UI falls back to the emoji if either 404s.
  art: `/villagers/${id}.webp`,
  thumb: `/villagers/thumb/${id}.webp`,
}));

// A weapon entry IS an item set. `label` is the location shown to players; `methods` are the three
// ways that set can kill; `art` is the owning character's item-set card.
export const WEAPONS = Object.fromEntries(
  RAW.map(([ownerId, , , weaponId, setNumber, location, methods, emoji]) => [
    weaponId,
    {
      id: weaponId,
      label: location,
      location,
      setNumber,
      methods,
      emoji,
      art: `/weapons/${ownerId}.webp`,
      thumb: `/weapons/thumb/${ownerId}.webp`,
    },
  ]),
);

const BY_ID = new Map(VILLAGERS.map((v) => [v.id, v]));
const BY_WEAPON = new Map(VILLAGERS.map((v) => [v.weaponId, v]));

export function getVillager(id) {
  return BY_ID.get(id) || null;
}
/** The character whose signature item set this is — i.e. who a clue frames. */
export function villagerForWeapon(weaponId) {
  return BY_WEAPON.get(weaponId) || null;
}
/** A set's method by index, clamped — the specific way this kill was staged. */
export function methodAt(weaponId, i) {
  const w = WEAPONS[weaponId];
  if (!w) return null;
  const n = Number.isInteger(i) ? i : 0;
  return w.methods[Math.min(Math.max(n, 0), w.methods.length - 1)];
}
