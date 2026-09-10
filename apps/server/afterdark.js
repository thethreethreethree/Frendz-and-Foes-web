// "After Dark" — our take on the adult fill-in-the-blank card game. A rotating judge reads a prompt
// with a blank; everyone else plays a response card from their private hand; the judge picks the
// funniest; that player scores. True to the format and its R-rated spirit, but ALL card text is
// ORIGINAL to this project (the real game's cards are copyrighted — mechanics are not). Adult humor,
// but written to avoid slurs and punching at protected groups.
//
// AUTHORITATIVE on the server: hands are private (ca:you), submissions are anonymous until the judge
// has picked. Marked adult — brands can disable it or swap the deck via the admin later.

import { randomBytes } from "node:crypto";

// Prompts. "___" marks a blank; `pick` is how many response cards to play (default 1).
//
// DECK: "PlayZoo adult card set" v1, supplied by the owner 2026-09-10, replacing the smaller starter deck
// (34 prompts / 91 responses) whose repetition showed up within a couple of rounds.
// 100 prompts, 500 responses. All card text is ORIGINAL to this project.
//
// The source file writes its blank as "_____"; it is normalised to "___" here because that is what
// fillPrompt() substitutes. Left alone, every prompt would render with the leftovers showing.
//
// 28 prompts carry no blank at all -- they are questions ("What made the pastor quit?"). That is
// deliberate and handled: fillPrompt appends the answer when it finds nothing to substitute.
export const AD_PROMPTS = [
  { text: "My therapist's notes on me just say \"___.\"", pick: 1 },
  { text: "My divorce papers list the cause as ___.", pick: 1 },
  { text: "I'm not saying it's cheating, but it's definitely ___.", pick: 1 },
  { text: "HR has asked that we stop bringing ___ to the office.", pick: 1 },
  { text: "I tapped out the second he brought out ___.", pick: 1 },
  { text: "Grandma's last words were \"Don't let them find ___.\"", pick: 1 },
  { text: "What did I find in my dad's search history?", pick: 1 },
  { text: "Tonight on a very special true-crime documentary: ___.", pick: 1 },
  { text: "The real reason I got kicked out of the hot tub: ___.", pick: 1 },
  { text: "Nothing kills the mood faster than ___.", pick: 1 },
  { text: "My OnlyFans niche is ___.", pick: 1 },
  { text: "Scientists have finally cured erectile dysfunction with ___.", pick: 1 },
  { text: "The estate sale was mostly ___.", pick: 1 },
  { text: "Honey, we need to talk about ___.", pick: 1 },
  { text: "The airline apologizes for ___ in seat 14C.", pick: 1 },
  { text: "What's the worst thing to whisper during sex?", pick: 1 },
  { text: "My dating profile says I'm looking for someone who's into ___.", pick: 1 },
  { text: "This weekend's mandatory team-building activity: ___.", pick: 1 },
  { text: "Coming this summer, a heartwarming animated movie about ___.", pick: 1 },
  { text: "What made the pastor quit?", pick: 1 },
  { text: "Welcome to Hell. Your eternal punishment is ___.", pick: 1 },
  { text: "My last three brain cells are dedicated entirely to ___.", pick: 1 },
  { text: "Airport security held up ___ and asked, \"Whose is this?\"", pick: 1 },
  { text: "What's the secret ingredient in the church bake sale brownies?", pick: 1 },
  { text: "Doctors are baffled. It turns out ___ is contagious.", pick: 1 },
  { text: "Everything was fine at the baby shower until ___.", pick: 1 },
  { text: "The one thing my parents still agree on: ___.", pick: 1 },
  { text: "My sex tape is mostly just ___.", pick: 1 },
  { text: "My ex and I are still fighting over custody of ___.", pick: 1 },
  { text: "Why am I banned from the all-you-can-eat buffet?", pick: 1 },
  { text: "Instead of a ring, he proposed with ___.", pick: 1 },
  { text: "What's the real reason the neighbors moved out?", pick: 1 },
  { text: "Crying in the shower because of ___. Again.", pick: 1 },
  { text: "___: the reason I'm on a list.", pick: 1 },
  { text: "My wife's boyfriend keeps bringing ___ to dinner.", pick: 1 },
  { text: "What's the one thing you shouldn't bring to a threesome?", pick: 1 },
  { text: "The pharmacist lowered her voice and said, \"This may cause ___.\"", pick: 1 },
  { text: "I've been celibate for three years because of ___.", pick: 1 },
  { text: "The package arrived in an unmarked box. It's ___.", pick: 1 },
  { text: "The deleted chapter of the Bible is all about ___.", pick: 1 },
  { text: "Dad left to buy cigarettes and came back with ___.", pick: 1 },
  { text: "What's keeping my marriage alive?", pick: 1 },
  { text: "The honeymoon was ruined by ___.", pick: 1 },
  { text: "What's in the office fridge that nobody will claim?", pick: 1 },
  { text: "My LinkedIn headline: \"Passionate about ___.\"", pick: 1 },
  { text: "BREAKING: Local man arrested for ___ at the mall.", pick: 1 },
  { text: "What did they find during my colonoscopy?", pick: 1 },
  { text: "What happened in Vegas that absolutely did not stay in Vegas?", pick: 1 },
  { text: "What's the worst thing to hear through the bathroom door?", pick: 1 },
  { text: "What's the real reason I'm still single?", pick: 1 },
  { text: "I've been in therapy for three years to get over ___.", pick: 1 },
  { text: "My next tattoo: ___, right across my ass.", pick: 1 },
  { text: "The first thing I'm doing when I win the lottery: ___.", pick: 1 },
  { text: "What's the worst thing to find in a hotel bed?", pick: 1 },
  { text: "Mom, Dad, please sit down. I'm into ___.", pick: 1 },
  { text: "The Vatican has officially approved ___.", pick: 1 },
  { text: "What's getting me through this recession?", pick: 1 },
  { text: "Why is Grandpa no longer invited to family reunions?", pick: 1 },
  { text: "The ancient prophecy foretold ___.", pick: 1 },
  { text: "What did I do at the office Christmas party?", pick: 1 },
  { text: "My love language is ___.", pick: 1 },
  { text: "The only way to satisfy my partner is ___.", pick: 1 },
  { text: "My birth plan: no drugs, soft music, and ___.", pick: 1 },
  { text: "What will get you kicked out of a funeral?", pick: 1 },
  { text: "My grandparents' secret to sixty years of marriage: ___.", pick: 1 },
  { text: "The real secret behind my father's success: ___.", pick: 1 },
  { text: "Pro tip: never look up ___ on the work computer.", pick: 1 },
  { text: "What would I save first in a house fire?", pick: 1 },
  { text: "After our romantic candlelit dinner, we'll be moving on to ___.", pick: 1 },
  { text: "Rich people don't want you to know about ___.", pick: 1 },
  { text: "The world's saddest museum exhibit: ___.", pick: 1 },
  { text: "This year's Olympics introduced a brand-new event: ___.", pick: 1 },
  { text: "What's my proctologist's favorite story to tell at parties?", pick: 1 },
  { text: "My body is a temple, and that temple is full of ___.", pick: 1 },
  { text: "Plot twist: the killer was ___ all along.", pick: 1 },
  { text: "What's the password to the sex dungeon?", pick: 1 },
  { text: "What's that stain on the ceiling?", pick: 1 },
  { text: "I promise to love you through sickness, health, and ___.", pick: 1 },
  { text: "What woke up the entire hostel at 3 a.m.?", pick: 1 },
  { text: "The most romantic thing a man has ever done for me: ___.", pick: 1 },
  { text: "Why are there police outside my parents' house?", pick: 1 },
  { text: "Red flag on the first date: ___.", pick: 1 },
  { text: "The unspoken rule of the nude beach: never mention ___.", pick: 1 },
  { text: "According to my doctor, it's not a rash. It's ___.", pick: 1 },
  { text: "Tonight on the cooking channel: \"Twenty Ways to Serve ___.\"", pick: 1 },
  { text: "What finally broke me?", pick: 1 },
  { text: "___: now available in a fun party size!", pick: 1 },
  { text: "My sugar daddy gave me ___ instead of rent money.", pick: 1 },
  { text: "What's my kink?", pick: 1 },
  { text: "Here lies me. Cause of death: ___.", pick: 1 },
  { text: "What got me through the divorce?", pick: 1 },
  { text: "Blessed are the meek, for they shall inherit ___.", pick: 1 },
  { text: "My rideshare driver would not stop talking about ___.", pick: 1 },
  { text: "What's the worst gift to bring to a baby shower?", pick: 1 },
  { text: "___ is the reason I have trust issues.", pick: 1 },
  { text: "The CEO's forty-minute apology video was about ___.", pick: 1 },
  { text: "I can't believe I'm paying rent for ___.", pick: 1 },
  { text: "My perfect Sunday: coffee, a long walk, and ___.", pick: 1 },
  { text: "My mother-in-law handed me ___ and said, \"You need this.\"", pick: 1 },
  { text: "My mom's new boyfriend is really into ___.", pick: 1 },
];

export const AD_RESPONSES = [
  "A threesome where everyone's just being polite", "Accidentally saying \"thank you\" after sex", "Faking an orgasm to end a conversation",
  "A sex swing that's now just where we dry laundry", "Screaming my own name during sex", "Sex so bad the neighbors left a sympathy card",
  "Grandma's surprisingly active dating profile", "Two virgins doing their absolute best", "Morning wood during a eulogy",
  "A condom that expired two presidents ago", "Getting caught masturbating by the robot vacuum", "A dildo left behind in a rental car",
  "Accidentally joining a swingers' barbecue", "A tasteful nude of my accountant", "Discovering my partner's kink is being ignored",
  "Birth control made entirely of optimism", "Dirty talk that's just me reading the grocery list", "Leaked nudes that got zero engagement",
  "An erection that won't leave during a job interview", "Queefing during a moment of silence", "Getting a boner from a strong breeze",
  "Butt stuff on the first date", "An OnlyFans with three subscribers, all of them cousins", "A fleshlight clearly visible through the trash bag",
  "Sexting the family group chat by accident", "Stepping on a used condom barefoot", "A sexual harassment seminar that ends in an orgy",
  "The vasectomy doctor's cold, cold hands", "Dry humping in a parked minivan", "A hickey from the dentist",
  "Nipples that look permanently surprised", "A penis shaped like a question mark", "Pegging, but make it corporate",
  "A butt plug with a tiny Eiffel Tower on the end", "Moaning a little too convincingly during a massage", "Dad's surprisingly well-organized porn folder",
  "A vibrator that connects to Bluetooth and announces itself to the whole car", "Edging through an entire video call", "The one pube that lives on the soap",
  "Getting walked in on the one time I tried something new", "A foot fetishist who works at a shoe store", "Period sex on a white couch",
  "A threesome with my therapist and her therapist", "A sex dungeon with a strict shoes-off policy", "Crying during sex, and not the good kind",
  "The missionary position, but with side quests", "Sex with a mime: silent, confusing, lots of pointing", "A sex doll who's a better listener than my ex",
  "My ex's sex tape, which is mostly him adjusting the camera", "A Brazilian wax performed by a nervous intern", "Anal beads on a key ring",
  "A glory hole at the public library", "Premature ejaculation on a nude beach", "Sending a nude, then a follow-up nude with better lighting",
  "Horny on main", "A blowjob that turned into a TED talk", "Handcuffs with no key and the landlord on his way up",
  "Sleeping with my boss's boss to get back at my boss", "Role-playing as a tax auditor", "A strap-on in the office Secret Santa",
  "The walk of shame through a church parking lot", "My neighbor's very loud sex and her very specific instructions", "A booty call from 2016",
  "Matching with my cousin on a dating app", "A sext that just says \"hey\"", "A dick pic with a watermark",
  "A dick pic accidentally sent to Grandma", "Kissing with too much tongue, like a lizard drinking", "A wedding night spent entirely on the toilet",
  "Having a sex position named after me, and not in a good way", "Swinging with the in-laws", "Grabbing a stranger's butt on the train and just committing to it",
  "My mom's vibrator in the kitchen utensil drawer", "Finding out my parents have a safe word", "My parents' headboard, audible from the garage",
  "A wet dream about my 70-year-old landlord", "Getting spanked at the self-checkout", "An erotic novel written by my aunt, starring my uncle",
  "Balls that hang like a sad grandfather", "Boobs that point in two different directions", "A very small penis with a very big personality",
  "A sensual foot rub from a man named Keith", "A sex toy that's older than me", "A vibrator going off in my bag at a funeral",
  "Suspiciously sticky bedsheets at a five-star hotel", "Two hours of foreplay and then a sneeze", "A gentleman's club with a salad bar",
  "An orgy where nobody brought snacks", "A three-way call that turned into a three-way", "Getting a lap dance from someone who went to my high school",
  "Accidentally reading my dad's sexts", "A romance scam run by a very tired grandmother", "Cybersex with a spam bot",
  "My ex's mom, who was always a little flirty", "Getting off to the weather forecast", "A limp, apologetic erection",
  "A sex tape filmed vertically", "Doing cocaine off the lid of Grandpa's coffin", "Day three of a mushroom trip in a furniture superstore",
  "Microdosing at my nephew's baptism", "Getting blackout drunk at the company retreat", "A ketamine hole I still visit on weekends",
  "Smoking weed with the priest after confession", "A drug dealer who insists on sending invoices", "Getting too high to finish a sandwich",
  "Beer for breakfast because it's technically a grain", "My uncle's \"special\" brownies at Thanksgiving", "A hangover with its own zip code",
  "Vodka in a water bottle at 9 a.m.", "Throwing up into my own hands to be polite", "Waking up in a ball pit with no memory of the last three days",
  "Licking a toad for spiritual reasons", "An ayahuasca retreat that was just a guy named Brad and a kettle", "Taking an edible right before a funeral",
  "The fourth tequila shot, which is when I start speaking fluent Spanish", "Sobriety, for about forty minutes", "Snorting crushed-up vitamins just to feel something",
  "Accidentally taking molly at a Tupperware party", "A guy at the rave explaining the universe to a traffic cone", "My sponsor's bar tab",
  "Getting so high I become a podcast", "Jell-O shots made by someone's dad", "A beer bong at a christening",
  "Waking up in Tijuana with a new tattoo and a new wife", "Poppers at a parent-teacher meeting", "A wine tasting where I swallowed every single sample",
  "A bong made out of a trophy I won in fourth grade", "A drug-sniffing dog who's also clearly on drugs", "Mixing three energy drinks and seeing God",
  "Diarrhea at a destination wedding", "A stranger's warm toilet seat", "Sharting in white linen pants",
  "Farting during the first kiss", "The back pimple I've been growing since high school", "Pooping at a party and the toilet won't flush",
  "An ingrown hair with ambition", "Gym socks that can stand up on their own", "Sneezing and peeing at the same time",
  "Earwax I'm too proud to throw away", "A burp that tastes like yesterday", "My doctor's finger, lingering",
  "Toilet paper stuck to my shoe for the entire date", "A porta-potty in July", "A livestreamed colonoscopy",
  "Food poisoning on a 14-hour flight", "A toenail in the salad", "Swamp ass on a leather couch",
  "Belly button lint I've been saving since college", "Dandruff like a light snowfall on a black suit", "Back hair you could braid",
  "A fart that's been following me around all day", "Peeing in the pool and making eye contact", "My uncle's toenail clippings on the couch",
  "A hot dog water sommelier", "Sweat stains shaped like my home state", "Vomiting on the rollercoaster, then riding it again",
  "Nose hair long enough to floss with", "A bra that's been worn for eleven straight days", "Lactose intolerance at a cheese festival",
  "Explosive diarrhea on a glass-bottom boat", "A tampon string at a pool party", "A pimple that popped onto the mirror and stayed there",
  "Crop-dusting the entire wedding reception", "Holding in a fart for a whole yoga class", "A foot fungus with its own ecosystem",
  "A skin tag I've grown attached to", "A booger on the ceiling from 2009", "The communal bar of soap at my uncle's house",
  "A stranger's hair in my hotel bathtub", "Smelling my own armpit in a meeting", "Spray tan streaks shaped like handprints",
  "Toe jam", "The sound a stomach makes during a silent auction", "The last square of toilet paper",
  "My grandpa's nose, which is just a second grandpa", "Bad breath that walks into the room before I do", "Grandma's ashes in the wrong Tupperware",
  "Dying alone, but with great Wi-Fi", "A will that leaves everything to the cat", "Getting dumped at a funeral",
  "A eulogy that's mostly a roast", "Being cremated with my phone still vibrating", "Hitting \"reply all\" on a condolence email",
  "Dad's surprise second family", "A clown at the funeral that nobody hired", "A coffin with cup holders",
  "The deep, crushing silence after \"I love you\"", "Realizing my parents are just people who were bad at it", "Getting ghosted by my therapist",
  "A midlife crisis that started at 24", "The void, staring back and judging my outfit", "Crying in a warehouse store parking lot",
  "Existential dread with a side of fries", "Finding out my birth was a clerical error", "Dad leaving to get milk and texting \"k\" ever since",
  "Being the least attractive person at a nudist colony", "A hearse with truck nuts", "An open-casket funeral with a beauty filter",
  "Mistaking a wake for a surprise party", "Being outlived by my goldfish", "A retirement party for a man who died at his desk three weeks ago",
  "Death, but with a loyalty program", "A serial killer with lovely table manners", "A haunted house that's just my childhood home",
  "Being buried with my browser history", "The funeral slideshow that accidentally included nudes", "A Ouija board that only spells out passive-aggressive notes",
  "The Grim Reaper waiting in the drive-thru line", "Heaven, but it's a group chat with everyone I've ever wronged", "Hell, but it's an open-plan office",
  "Inheriting a haunted doll and three dollars", "A life insurance policy my wife keeps bringing up", "A family reunion with a court-appointed mediator",
  "My childhood, reviewed at two stars", "Mom saying \"I'm not mad, I'm just disappointed\"", "Being mourned by exactly one online forum",
  "A priest who reads the wrong name at the funeral", "A tombstone with a typo", "Dying at the gym, which is why I don't go",
  "A widow who's clearly thrilled", "Losing a staring contest with a corpse", "Accidentally making out at a wake",
  "A mortician who's a little too into his job", "Dying in a way that becomes a warning label", "A stack of bodies in the freezer next to the ice cream",
  "A LinkedIn post about grief that ends in a sales pitch", "Accidentally calling my boss \"Mom\" in a board meeting", "A man who says he's an entrepreneur and means he sells vapes",
  "Getting promoted to a job I don't understand", "Linda from HR", "Saying \"per my last email\"",
  "Microwaving fish in the office", "Replying all with my nudes", "A salary paid entirely in exposure",
  "A boss who says \"we're a family\" right before the layoffs", "Getting laid off by a chatbot", "A standing desk and a sitting soul",
  "The office printer, sensing my fear", "A spreadsheet that made a grown man cry", "The meeting about the meeting that could have been an email",
  "A LinkedIn endorsement for \"karaoke\"", "A retirement account worth $19 and a gift card", "An NFT of my own death certificate",
  "My landlord's lingering, wet handshake", "Rent that went up because I smiled", "A timeshare presentation in Hell",
  "Tipping 30% out of fear", "Being 35 and still not knowing how taxes work", "Six figures of student debt and a degree in interpretive dance",
  "A self-checkout machine accusing me of theft", "Working from home in just a tie", "Forgetting my camera was on during a video call, on the toilet",
  "A performance review written by my own mother", "Being the emergency contact for a coworker I've never met", "A company pizza party during a mass layoff",
  "A motivational poster in a prison", "An intern who's clearly a narc", "The coworker who replies \"noted\" to everything",
  "Stealing toilet paper from work because I'm an adult", "Being paid in company stock of a company that's on fire", "Telling a job interviewer my greatest weakness is men",
  "A business card that just says \"Visionary\"", "The guy from accounting who knows what I did", "A CEO who does ice baths and layoffs on the same morning",
  "Getting a raise of eleven cents an hour", "Replying \"you too\" when the waiter says \"enjoy your meal\"", "My ex's new partner being extremely nice",
  "A group project where I'm the one doing nothing", "Saying \"we should hang out\" and meaning never", "A 45-minute voice memo from my aunt",
  "A participation trophy for my divorce", "Losing a fistfight with a goose in a parking lot", "Being left on read by God",
  "The friend who brings a guitar to the party", "A text from Mom that just says \"Call me\"", "Being attractive only in bad lighting",
  "A dating profile where every photo has a dead fish", "Petting the dog at a party for three hours to avoid people", "Accidentally liking my ex's photo from 2014",
  "Starting a cult by accident", "A haunted vacation rental with a 4.9-star rating", "Sending a thumbs-up to \"Grandpa passed away\"",
  "A man who calls his car \"she\"", "A roommate who labels her eggs", "A 30-year-old man who still says \"rawr\"",
  "A cousin who's \"doing really well in Dubai\" and won't elaborate", "My mom describing her sex life in detail", "A dad joke that ended a marriage",
  "A marriage held together by a shared streaming password", "Gaslighting my houseplants", "An intervention, but for being annoying",
  "Therapy-speak used to dump someone", "A guy who's really, really into swords", "A podcast hosted by two men named Josh",
  "Mansplaining periods to someone on her period", "A gender reveal party that burned down a forest", "A self-help book written by a man with four divorces",
  "An emotional support alligator", "Men who describe themselves as \"sapiosexual\"", "A vegan who brings it up within four seconds",
  "Having a crush on the GPS voice", "Being the fun uncle, but with a warrant", "My inner child, who is also a disappointment",
  "Waving back at someone who was waving at the person behind me", "Telling the barista \"love you\" by accident", "A man who explains the movie while I'm watching it",
  "An influencer crying in her car about a brand deal", "A wellness influencer's coffee enema tutorial", "My uncle's opinions about women, served with the turkey",
  "My aunt arguing with a bot online for six hours", "My mom commenting \"beautiful!!\" on my nudes", "A 3 a.m. online order for a canoe",
  "My dad crying at a breastaurant", "A man who does CrossFit and hasn't told you yet, but will", "Getting stuck in a revolving door with my ex",
  "Being recognized by my therapist at a nightclub", "A karaoke song about cheating, sung while my partner watches", "A haircut that made me look like a disappointed lawyer",
  "Running into my high school bully, who is now my gynecologist", "A man with a fedora and strong opinions about the moon", "Clapping when the plane lands",
  "Getting a birthday card from my dentist and nobody else", "Meeting my girlfriend's parents while hungover", "The sex talk from my grandfather, with diagrams",
  "My dad using the eggplant emoji sincerely", "A family photo where everyone's lying", "A baby who looks exactly like the mailman",
  "A paternity test at the gender reveal", "Thanksgiving dinner with both of my exes", "Being the favorite child by process of elimination",
  "Mom's new boyfriend, who's younger than me", "Stepdad energy", "A couples' therapist who clearly takes sides",
  "Couples' therapy with my side piece", "A husband whose only hobby is the grill", "A wife who's \"just friends\" with her personal trainer",
  "An open relationship that's only open on one side", "Getting dumped via slide presentation", "An ex who kept the dog and my dignity",
  "My wife's boyfriend's jet ski", "A kid who calls the pool guy \"Dad\"", "Wedding vows with a non-disclosure agreement",
  "An engagement ring found during a colonoscopy", "A mother-in-law who brings her own knives", "A wedding DJ who only plays breakup songs",
  "The best man's speech about the groom's first three wives", "Loving my dog more than my husband and not hiding it", "A love triangle with my wife and the robot vacuum",
  "Grandma asking when I'm getting married, at my divorce party", "A prenup longer than the marriage", "Getting back with my ex for the third time, out of spite",
  "My brother-in-law's crypto pitch at Christmas", "The cousin who peaked at the family talent show", "A dad who fixes everything with duct tape and silence",
  "Mom's emotional support wine glass the size of a fishbowl", "A wedding where the bride's ex is the officiant", "A bachelor party in a small, unprepared town",
  "Being the rebound for someone's rebound", "Being baptized against my will at a pool party", "A megachurch with a fog machine",
  "A pastor with three Lamborghinis", "Satan's surprisingly good skincare routine", "An exorcism that's mostly just yelling",
  "The Rapture, but I wasn't invited", "A haunted talking toy that only says my ex's name", "A Victorian ghost who's extremely horny",
  "The Tooth Fairy's crippling debt", "The Easter Bunny's second family", "A vampire who faints at the sight of blood",
  "A werewolf going through menopause", "Cupid, drunk, with a crossbow", "Bigfoot's dick pic",
  "A dragon hoarding Tupperware lids", "Death's LinkedIn profile", "The Loch Ness Monster's OnlyFans",
  "A unicorn with erectile dysfunction", "An alien abduction with a surprisingly thorough probe", "A genie who only grants passive-aggressive wishes",
  "A fairy godmother on her third DUI", "Mermaid pubes", "A sexy stepbrother from a very low-budget movie",
  "A demon who just wants to be told he's doing a good job", "A psychic who only predicts yeast infections", "A tarot card that says \"No, babe\"",
  "A prayer circle that turned into a pyramid scheme", "Confessing my sins to a priest who's taking notes for his novel", "Holy water that's just tap water and a guy named Gary",
  "A cursed mirror that only shows my bank balance", "A time traveler who came back just to laugh at my haircut", "Getting reincarnated as a public bench",
  "A séance where Grandpa just complains about the thermostat", "Seventeen hot dogs and a dream", "A foot-long sub with an actual foot in it",
  "Ranch dressing as a lifestyle", "A charcuterie board of regrets", "A casserole made with love and 40% mayonnaise",
  "My aunt's potato salad, left out since noon", "A single, sad string cheese", "The back room of the all-you-can-eat buffet",
  "A birthday cake shaped like my dad's colon", "Eating mayonnaise straight from the jar at a funeral", "Eating an entire rotisserie chicken alone in my car",
  "Licking a sandwich so no one else will eat it", "The last slice of pizza, and the violence that followed", "A bucket of lukewarm shrimp",
  "A burrito that changed my life, then ruined it", "A spoonful of lard, for courage", "A pigeon with a gambling problem",
  "A raccoon wearing my underwear", "A dolphin with a restraining order against me", "A mysterious wet spot on the bus seat",
  "A catfish who turned out to be my dad", "A clown doing his taxes and weeping", "Grandpa's war stories, which are all about a woman named Trish",
  "An ice sculpture of my genitals at the office party", "A mattress from the side of the road", "A Renaissance faire orgy",
  "Two raccoons in a trench coat applying for a mortgage", "A garbage bag full of wigs", "A tattoo of my ex's name, covered up with a worse ex's name",
  "A lower-back tattoo of a dolphin jumping through a heart", "A tramp stamp that says \"Exit Only\"", "A horse that's been through a divorce",
  "A pirate with an ankle monitor", "A centaur's awkward first date", "A guy in a hot dog costume, weeping",
  "A seagull that stole my engagement ring", "A squirrel on cocaine", "A goat that ate my passport",
  "A mall kiosk guy who won't let me leave", "An inflatable tube man with depression", "A shopping cart with one bad wheel and a vendetta",
  "A crow who's been following me since the funeral", "A duck that's clearly a cop", "A possum living in my ceiling, paying no rent",
  "A true-crime documentary narrated by the killer's mom", "A cooking competition where the secret ingredient is sadness", "A superhero whose only power is making it weird",
  "A boy band made of divorced dads", "A Christmas movie where the hot lawyer quits her job to marry a lumberjack", "A cult with a really good merch table",
  "Getting canceled for something I posted in 2009", "Being mildly famous in Belgium", "A celebrity perfume that smells like a lawsuit",
  "A motivational speaker who lives in a van", "A male stripper named Officer Dave who's actually a cop", "A stripper with a better retirement plan than mine",
  "A reality show where the prize is a divorce", "A sex scene in a movie I'm watching with my parents", "A gaming chair that costs more than my car",
  "A crypto wallet with a password I wrote on a napkin in Cancún", "A man who's \"not like other guys\" and is exactly like other guys", "A life coach who's 22 and lives with his parents",
  "A billionaire's space trip that nobody watched", "A smart fridge that's disappointed in me", "A dating app that keeps showing me my ex, but older",
  "My phone's screen time report, read aloud at my wedding", "The middle seat between two honeymooners", "Losing my luggage and my virginity in the same airport",
  "A norovirus conga line on a cruise ship", "A backpacker who found himself and won't shut up about it", "A hostel bunk bed that squeaks in rhythm",
  "Pulling a muscle while sneezing", "Grandpa's new girlfriend, who's 31 and loves him for his personality", "A retirement home with a thriving drug trade",
  "A retirement home orgy with mandatory hydration breaks", "A cat that knows what I did", "My dog humping the priest's leg",
  "A cat that leaves dead birds on my pillow as a performance review", "A gym membership I've paid for since 2019 and used twice", "Protein shakes for dinner and tears for dessert",
  "A softball team of divorced dads with something to prove", "An Advent calendar full of tequila shots", "Valentine's Day alone with a family-size lasagna",
  "A New Year's resolution that lasted until 12:04", "A sexy Halloween costume of a tax form", "A baby shower with a stripper",
  "Sitting at the kids' table at thirty-five", "My doctor googling my symptoms in front of me", "A prostate exam with way too much eye contact",
  "A thrift store couch with a history", "A pool noodle used for something it was never designed for", "A cheap motel hot tub with a mysterious film on top",
  "A bouncy castle full of drunk adults", "A reverse mortgage on my self-respect", "A tiny house that ended my marriage",
  "A stripper pole in the living room of a very normal family", "A home security camera that caught everything", "A neighbor who mows his lawn in a thong",
  "An HOA president with a god complex", "A road trip with my ex and her new husband", "Road head in a car wash",
  "An AI girlfriend who left me for a smarter user", "An ex who got hot the second we broke up", "A burner account for watching my ex's new girlfriend",
  "A therapist who says \"hmm\" and nothing else", "A wellness retreat that takes your phone and your savings", "A sound bath that ended in a fistfight",
  "A tattoo artist who misspelled \"regret\"", "A pregnancy scare at a retirement home",
];

const HAND_SIZE = 7;
const WIN_SCORE = 5;

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) { r = { snapshot: null, peers: new Map() }; rooms.set(code, r); }
  if (!r.afterdark) {
    r.afterdark = {
      phase: "lobby", // lobby | submitting | judging | reveal | ended
      players: new Map(), // id -> { id, name, socketId, rejoinToken, hand:[], score }
      order: [],
      judgeIdx: 0,
      round: 0,
      promptDeck: [], promptPos: 0, prompt: null,
      responseDeck: [], responsePos: 0,
      submissions: new Map(), // playerId -> [texts]
      revealed: [], // [{ i, pid, cards }] built at judging (pid hidden until reveal)
      winner: null, // { name, cards }
      config: { handSize: HAND_SIZE, winScore: WIN_SCORE },
    };
  }
  return r.afterdark;
}

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const judgeId = (m) => m.order[m.judgeIdx] ?? null;
const nonJudges = (m) => [...m.players.values()].filter((p) => p.id !== judgeId(m));

// Fewest players the game works with. The judge does not play a card, so three is two cards to
// choose between -- below that there is no contest to judge.
export const AD_MIN_PLAYERS = 3;

// Take a player out and leave the room PLAYABLE.
//
// Deleting from the Map is the easy part. The player also holds a slot in the judge rotation
// (m.order, indexed by m.judgeIdx), may be the judge right now, and may have a card already face
// down on the table. Miss any of those and the room survives in a state it can never leave.
function removePlayer(m, id) {
  if (!m.players.has(id)) return false;

  const idx = m.order.indexOf(id);
  if (idx !== -1) {
    m.order.splice(idx, 1);
    // Keep judgeIdx pointing at the player it already pointed at. If the judge is the one leaving,
    // the slot naturally falls to whoever moved up, which is the next judge anyway.
    if (idx < m.judgeIdx) m.judgeIdx -= 1;
  }
  m.judgeIdx = m.order.length ? ((m.judgeIdx % m.order.length) + m.order.length) % m.order.length : 0;

  m.submissions.delete(id);
  // Re-index, because `i` is what the judge taps to pick a card.
  m.revealed = m.revealed.filter((r) => r.pid !== id).map((r, i) => ({ ...r, i }));
  m.players.delete(id);
  return true;
}

// Move the room on if a departure just unblocked it, or back to the lobby if it cannot continue.
//
// THE BUG THIS FIXES: a round advances when every non-judge WITH A socketId has submitted. Nothing
// cleared socketId when a phone vanished, so a player who left the bar counted as active forever
// and the round waited on a card that was never coming. ca:next only works in "reveal", so the host
// could not skip past it either -- the game was simply stuck.
function repairPhase(m) {
  if (m.phase === "lobby" || m.phase === "ended") return;

  if (m.players.size < AD_MIN_PLAYERS) {
    m.phase = "lobby"; m.round = 0; m.prompt = null;
    m.submissions = new Map(); m.revealed = []; m.winner = null;
    for (const p of m.players.values()) p.hand = [];
    return;
  }

  if (m.phase === "submitting") {
    const active = nonJudges(m).filter((x) => x.socketId);
    if (active.length > 0 && active.every((x) => m.submissions.has(x.id))) {
      m.revealed = shuffle([...m.submissions.entries()].map(([pid, cs]) => ({ pid, cards: cs }))).map((r, i) => ({ i, ...r }));
      m.phase = "judging";
    }
    return;
  }

  // Everyone whose card was on the table has gone. Deal the round again rather than strand the
  // judge in front of an empty table with nothing to pick.
  if (m.phase === "judging" && m.revealed.length === 0) { m.phase = "submitting"; newPrompt(m); }
}

function drawResponses(m, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    if (m.responsePos >= m.responseDeck.length) { m.responseDeck = shuffle(AD_RESPONSES); m.responsePos = 0; }
    out.push(m.responseDeck[m.responsePos++]);
  }
  return out;
}

function publicState(m) {
  const showCards = m.phase === "judging" || m.phase === "reveal";
  return {
    phase: m.phase,
    round: m.round,
    judgeId: judgeId(m),
    prompt: m.phase === "lobby" ? null : m.prompt,
    config: m.config,
    players: [...m.players.values()].map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, connected: !!p.socketId, score: p.score,
      handCount: p.hand.length, submitted: m.submissions.has(p.id), isJudge: p.id === judgeId(m),
    })),
    revealed: showCards ? m.revealed.map((r) => ({ i: r.i, cards: r.cards, by: m.phase === "reveal" ? (m.players.get(r.pid)?.name || "?") : null })) : [],
    winner: m.phase === "reveal" ? m.winner : null,
  };
}

export function afterdarkPublicState(rooms, code) { const m = rooms.get(code)?.afterdark; return m ? publicState(m) : null; }

export function registerAfterDarkHandlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase()) {
  const broadcast = (code) => io.to(code).emit("ca:state", publicState(rooms.get(code).afterdark));
  const err = (msg) => socket.emit("ca:error", msg);
  const sendYou = (m, p) => { if (p.socketId) io.to(p.socketId).emit("ca:you", { id: p.id, name: p.name, avatar: p.avatar, rejoinToken: p.rejoinToken, hand: p.hand, isJudge: p.id === judgeId(m) }); };
  const sendYouAll = (m) => { for (const p of m.players.values()) sendYou(m, p); };
  const push = (code) => { const m = rooms.get(code).afterdark; broadcast(code); sendYouAll(m); };

  socket.on("ca:sync", ({ room }) => { if (!room) return; const code = roomKey(room); socket.join(code); socket.data.caCode = code; socket.emit("ca:state", publicState(ensure(rooms, code))); });

  socket.on("ca:join", ({ room, name, avatar, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room); socket.join(code); socket.data.caCode = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) { if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player."); p.socketId = socket.id; p.name = name; if (avatar) p.avatar = avatar; }
    else { const id = "a" + Math.random().toString(36).slice(2, 8); p = { id, name, avatar, socketId: socket.id, rejoinToken: randomBytes(24).toString("hex"), hand: [], score: 0 }; m.players.set(id, p); }
    socket.data.caPlayerId = p.id;
    sendYou(m, p); broadcast(code);
  });

  const hostCode = () => socket.data.caCode || socket.data.code;
  const isHost = () => socket.data.role === "host";

  function newPrompt(m) {
    if (m.promptPos >= m.promptDeck.length) { m.promptDeck = shuffle(AD_PROMPTS); m.promptPos = 0; }
    m.prompt = m.promptDeck[m.promptPos++];
    m.submissions = new Map();
    m.revealed = [];
    m.winner = null;
  }

  socket.on("ca:start", () => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "lobby") return;
    if (m.players.size < AD_MIN_PLAYERS) return err(`Need at least ${AD_MIN_PLAYERS} players.`);
    m.order = shuffle([...m.players.keys()]);
    m.responseDeck = shuffle(AD_RESPONSES); m.responsePos = 0;
    m.promptDeck = shuffle(AD_PROMPTS); m.promptPos = 0;
    m.judgeIdx = 0; m.round = 1;
    for (const p of m.players.values()) { p.score = 0; p.hand = drawResponses(m, m.config.handSize); }
    m.phase = "submitting"; newPrompt(m);
    push(code);
  });

  // Host removes a player who has left. Bar reality: people wander off mid-round and the game
  // should not be held hostage by an empty chair.
  socket.on("ca:kick", ({ id }) => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m) return;
    if (!isHost()) return err("Only the host can remove a player.");
    const p = m.players.get(id);
    if (!p) return err("That player has already gone.");
    const { name, socketId } = p;
    removePlayer(m, id);
    repairPhase(m);
    // Tell their phone, so a device still sitting on the table does not silently rejoin.
    if (socketId) io.to(socketId).emit("ca:kicked", { name });
    push(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.caCode; const m = code && rooms.get(code)?.afterdark;
    const pid = socket.data.caPlayerId;
    if (!m || !pid) return;
    const p = m.players.get(pid);
    // Ignore a stale socket belonging to a player who has already reconnected on a new one.
    if (!p || p.socketId !== socket.id) return;
    p.socketId = null;
    repairPhase(m);
    push(code);
  });

  socket.on("ca:submit", ({ cards }) => {
    const code = socket.data.caCode; const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "submitting") return;
    const p = m.players.get(socket.data.caPlayerId);
    if (!p || p.id === judgeId(m)) return err("The judge doesn't play a card.");
    if (m.submissions.has(p.id)) return;
    if (!Array.isArray(cards) || cards.length !== m.prompt.pick) return err(`Play ${m.prompt.pick} card(s).`);
    if (!cards.every((c) => p.hand.includes(c))) return err("Play cards from your hand.");
    for (const c of cards) p.hand.splice(p.hand.indexOf(c), 1);
    m.submissions.set(p.id, cards);
    const active = nonJudges(m).filter((x) => x.socketId);
    if (active.length > 0 && active.every((x) => m.submissions.has(x.id))) {
      m.revealed = shuffle([...m.submissions.entries()].map(([pid, cs]) => ({ pid, cards: cs }))).map((r, i) => ({ i, ...r }));
      m.phase = "judging";
    }
    push(code);
  });

  socket.on("ca:pick", ({ i }) => {
    const code = socket.data.caCode; const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "judging") return;
    if (socket.data.caPlayerId !== judgeId(m) && !isHost()) return err("Only the judge picks.");
    const chosen = m.revealed.find((r) => r.i === (i | 0));
    if (!chosen) return;
    const winner = m.players.get(chosen.pid);
    if (winner) winner.score += 1;
    m.winner = { name: winner?.name || "?", cards: chosen.cards };
    // refill everyone to hand size
    for (const p of m.players.values()) { const need = m.config.handSize - p.hand.length; if (need > 0) p.hand.push(...drawResponses(m, need)); }
    m.phase = "reveal";
    push(code);
  });

  socket.on("ca:next", () => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "reveal") return;
    if (socket.data.caPlayerId !== judgeId(m) && !isHost()) return;
    const top = [...m.players.values()].sort((a, b) => b.score - a.score)[0];
    if (top && top.score >= m.config.winScore) { m.phase = "ended"; return push(code); }
    m.judgeIdx = (m.judgeIdx + 1) % m.order.length;
    m.round += 1;
    m.phase = "submitting";
    newPrompt(m);
    push(code);
  });

  socket.on("ca:reset", () => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m) return;
    m.phase = "lobby"; m.round = 0; m.prompt = null; m.submissions = new Map(); m.revealed = []; m.winner = null;
    for (const p of m.players.values()) { p.hand = []; p.score = 0; }
    push(code);
  });
}
