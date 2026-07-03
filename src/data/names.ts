import type { Genre } from "../engine/types";

/**
 * Parody-adjacent name pools. Evocative of industry archetypes, never real
 * celebrity full names. Generators combine first+last randomly, so keep both
 * pools generic enough that no real person's full name can be assembled.
 */

export const FIRST_NAMES = [
  "Miles", "Josephine", "Desmond", "Priya", "Julian", "Naomi", "Theo", "Camille",
  "Elliot", "Simone", "August", "Nadia", "Weston", "Imogen", "Reuben", "Talia",
  "Graham", "Selene", "Marcus", "Piper", "Vivienne", "Callum", "Odette", "Grier",
  "Emory", "Rosalind", "Dean", "Farrah", "Malcolm", "Josie", "Beau", "Adaeze",
  "Trevor", "Marlowe", "Idris", "Colette", "Ansel", "Bianca", "Rafael", "Wren",
  "Holland", "Zora", "Warren", "Delphine", "Kingsley", "Marisol", "Emeric", "Faye",
  "Dashiell", "Ingrid", "Cyrus", "Lena", "Barrett", "Odalys", "Gideon", "Ruby",
  "Tobias", "Anaïs", "Preston", "Vada",
  // a few who clearly believe the name is doing some of the work
  "Oscar", "Sundance", "Indio", "Legend", "True", "Journey", "Apple", "North",
] as const;

export const LAST_NAMES = [
  "Whitfield", "Callahan", "Delacroix", "Okonkwo", "Reyes", "Sinclair", "Bishop",
  "Hale", "Kwan", "Alvarado", "Sterling", "Voss", "Marchetti", "Doyle",
  "Abernathy", "Castellano", "Whitlock", "Faraday", "Osei", "Beaumont",
  "Nakamura", "Kessler", "Mbeki", "Larsson", "Okafor", "Winslow", "Devereux",
  "Cabrera", "Whitaker", "Ellery", "Marsh", "Farrow", "Ashcroft", "Delgado",
  "Kowalski", "Lindqvist", "Petrov", "Villanueva", "Byrd", "Cruz", "Moreau",
  "Halloran", "Amaro", "Zamora", "Yun", "Solano", "Wexler", "Draper", "Ellison",
  "Grimaldi", "Nightingale", "Silverstein", "Prescott", "Kirkland", "Bellamy",
  "Sorensen", "Fairweather",
  // industry in-jokes wearing a straight face
  "Klapper", "Reel", "Marquee", "Bankable", "Wrapp", "Greenroom",
] as const;

export const CREW_FIRST = [
  "Bogdan", "Ute", "Chesley", "Marisol", "Tobias", "Greta", "Linus", "Prue",
  "Amir", "Sofia", "Declan", "Yara",
] as const;

/**
 * Occasionally a film is just titled after its hero (or villain) — the
 * one-name-does-all-the-marketing school. Parody-adjacent, never an exact
 * match for a real character.
 */
export const CHARACTER_NAMES: Record<Genre, readonly string[]> = {
  action: [
    "Colt Steele", "Jax Diesel", "Sarge Bullet", "Duke Ironside",
    "Trace Havoc", "Reno Blaze", "Ghost Hawke", "Chief Thunder",
  ],
  horror: [
    "Sister Agony", "Mother Marrow", "Uncle Formaldehyde", "Old Man Renfield",
    "Nanny Nightshade", "Dr. Marrow",
  ],
  comedy: [
    "Big Gary", "Uncle Dooley", "Coach Fumbles", "Deputy Doofus",
    "Nana Ruckus", "Cousin Chaos",
  ],
  romance: [
    "Harmony Vale", "Lovejoy Sweet", "Wesley Truelove", "Autumn Hartley",
    "Valentina Sparks", "Christian Sweetwater",
  ],
  drama: [
    "Judge Ezra Vance", "Senator Marlowe Gray", "Dr. Eleanor Graves",
    "Coach Willoughby",
  ],
  thriller: [
    "Agent Nova Cross", "Inspector Rhodes", "Dr. Rune Ashcroft", "The Analyst",
  ],
  crime: [
    "Vinnie Two-Times", "Frankie No-Nose", "Sal the Ledger", "Lucky Manzo",
    "Dutch Callahan", "Icepick Nguyen",
  ],
  scifi: [
    "Captain Nova Vega", "Cadet Orion Steele", "Zenith Vega",
    "Commander Ryza Kline", "Dr. Axiom Chen",
  ],
  family: [
    "Sir Waggington", "Grandpa Bumble", "Pip Marvel", "Nanny Sparkle",
    "Widget Higgins", "Great-Aunt Marvella",
  ],
  war: [
    "Sergeant Ironwolf", "Major Steel Harmon", "Corporal Doyle",
    "Captain Ashgrove", "Colonel Winter",
  ],
  musical: [
    "Bobby Starlight", "Sunny Marquee", "Frankie Falsetto", "Ginger Vale",
    "Lola Sequin", "Marvin Melody",
  ],
};

/** an occasional bolt-on for any title, character-named or otherwise */
export const TITLE_SUFFIXES = [
  "Jr.", "& Son", "& Daughter", "Goes to Space", "Part Two", "Returns",
  "Rides Again", "vs. Everything", "on Ice", "Forever", "in 3D",
  "at Christmas", "Begins", "The Musical", "One More Time",
] as const;

// --- film title grammar pieces, per register -------------------------------

export const TITLE_NOUNS = [
  "Orchard", "Reckoning", "Vermilion", "Hollow", "Cartographer", "Ledger",
  "Meridian", "Saltwater", "Furnace", "Understudy", "Parallax", "Vigil",
  "Masquerade", "Perimeter", "Archipelago", "Static", "Chorus", "Ballast",
  "Ossuary", "Junction", "Ricochet", "Halcyon", "Tremor", "Monolith",
] as const;

export const TITLE_ADJS = [
  "Last", "Silent", "Crimson", "Forgotten", "Eleventh", "Restless", "Hollow",
  "Burning", "Midnight", "Broken", "Savage", "Quiet", "Golden", "Feral",
  "Endless", "Little", "Perfect", "American", "Foreign", "Electric",
] as const;

export const TITLE_PLACES = [
  "Aberdeen", "the Flats", "Palomar", "Ninth Street", "the Interior",
  "Cape Solace", "Redwater", "the Meridian", "Old Harbour", "the Valley",
  "Kestrel County", "the Border", "Union Falls", "the Deep",
  "St Albans", "Slough", "Eastleigh", "Towecester",
] as const;

export const ACTION_NOUNS = [
  "Protocol", "Vendetta", "Extraction", "Overdrive", "Killzone", "Payload",
  "Standoff", "Blacksite", "Crossfire", "Manhunt", "Bloodline", "Fallout",
] as const;

export const HORROR_NOUNS = [
  "Cellar", "Whisper", "Harvest", "Séance", "Basement", "Lullaby", "Marrow",
  "Attic", "Ritual", "Hunger", "Nursery", "Reflection",
] as const;

/** one-word prestige titles for dramas */
export const PRESTIGE_WORDS = [
  "Fathom", "Tether", "Alluvium", "Vespers", "Cinder", "Meadowland",
  "Sonder", "August", "Threshold", "Palimpsest", "Estuary", "Kindling",
] as const;

/** fallback pool for genres without a bespoke set, and for odd blends */
export const LOGLINE_PROTAGONISTS = [
  "a disgraced cartographer", "an ageing stunt double", "a small-town coroner",
  "a night-shift translator", "an excommunicated nun", "a counterfeit sommelier",
  "a widowed demolitions expert", "a former child star", "a lighthouse inspector",
  "an amnesiac census-taker", "a retired getaway driver", "a debt-ridden puppeteer",
] as const;

export const LOGLINE_GOALS = [
  "must bury the truth along with the body",
  "returns home to a town that voted them out",
  "has one weekend to undo a lifetime",
  "discovers the map was of somewhere else entirely",
  "takes the one job they swore they'd never take",
  "learns the ransom was never about the money",
  "inherits an enemy instead of a fortune",
  "finds the signal everyone stopped listening for",
  "races a flood, a family, and the past",
  "must forge one last masterpiece to expose a fake",
] as const;

/**
 * Genre-cliché loglines. Every genre gets its own well-worn protagonists and
 * well-worn fates — the market is supposed to read as shamelessly familiar.
 */
export const GENRE_LOGLINES: Record<Genre, { protagonists: readonly string[]; goals: readonly string[] }> = {
  action: {
    protagonists: [
      "a burnt-out demolitions expert", "an ex-Delta Force bodyguard",
      "a rookie SWAT sniper", "a wrongly disavowed CIA asset",
      "a getaway driver two jobs from retirement", "a one-armed bounty hunter",
    ],
    goals: [
      "must defuse a bomb with a suspiciously generous countdown",
      "has twenty-four hours to clear their name",
      "takes one last job before the wedding",
      "must get the briefcase across the border by sundown",
      "discovers the terrorist is an old army buddy",
      "blows up an oil rig to save democracy",
    ],
  },
  horror: {
    protagonists: [
      "a babysitter who really should quit", "a paranormal investigator with a drinking problem",
      "a family who just moved into a house that was too cheap",
      "a camp counselor on the one night nobody should be alone",
      "a priest who's lost his faith and possibly his mind",
      "a podcast host investigating a town that doesn't want visitors",
    ],
    goals: [
      "hears something in the walls that shouldn't be there",
      "really shouldn't have read the incantation out loud",
      "learns the call is coming from inside the house",
      "moves in despite the realtor's very specific silence",
      "wakes the thing that was sleeping under the lake",
      "finds the found footage was never meant to be found",
    ],
  },
  comedy: {
    protagonists: [
      "a maid of honor determined to sabotage the wedding",
      "a fake fiancé hired for the holidays",
      "an office temp mistaken for the new CEO",
      "a food-truck owner locked in a turf war with the truck across the street",
      "a groom who wakes up in Vegas married to the wrong person",
      "a disgraced substitute teacher",
    ],
    goals: [
      "must survive one disastrous weekend with the in-laws",
      "falls for the person they were paid to keep away",
      "cannot admit the mix-up before the merger closes",
      "discovers the food-truck rivalry was actually true love",
      "has 48 hours to get the marriage annulled before the real wedding",
      "accidentally becomes the school's most beloved teacher",
    ],
  },
  romance: {
    protagonists: [
      "a bakery owner locked in a rivalry with the shop across the street",
      "a big-city lawyer forced to spend Christmas in her hometown",
      "a childhood sweetheart back in town for the class reunion",
      "a wedding planner who has sworn off love",
      "an inn owner suspicious of the guest who won't check out",
      "a pen pal who has never actually met the person on the other end of the letters",
    ],
    goals: [
      "falls for the competition, frosting and all",
      "remembers why they left, and why they came back",
      "can't stop comparing everyone to the one that got away",
      "starts planning a wedding nobody wants to end",
      "keeps extending the reservation for reasons that have nothing to do with the room",
      "finally meets the person behind the letters, three towns too late",
    ],
  },
  drama: {
    protagonists: [
      "an estranged daughter settling her mother's estate",
      "a small-town doctor with a secret", "a disbarred lawyer taking one last case",
      "a former athlete facing a diagnosis",
      "a father estranged from his son for a decade",
      "a teacher whose favourite student won't stop disappearing",
    ],
    goals: [
      "must forgive a decade of silence in a single weekend",
      "discovers the secret was protecting someone else entirely",
      "takes the case nobody else will touch",
      "finds out what's left when the trophies don't matter anymore",
      "learns the silence was never really about them",
      "goes looking for a student the system already gave up on",
    ],
  },
  thriller: {
    protagonists: [
      "a therapist who starts to believe her patient",
      "an insomniac who may have witnessed a murder",
      "a woman convinced her husband isn't who he says he is",
      "a detective haunted by the one case he never closed",
      "an identical twin nobody remembers being told about",
      "a journalist whose source keeps changing the story",
    ],
    goals: [
      "can't tell anymore what's memory and what's manipulation",
      "realizes the only witness might be the killer",
      "starts investigating the man she married",
      "reopens the case that ended his career",
      "discovers the twin has been living her life for months",
      "learns the story was true, just not about who they thought",
    ],
  },
  crime: {
    protagonists: [
      "a retired safecracker pulled back for one last job",
      "an undercover cop in too deep with the family",
      "a cartel boss forced into an uneasy truce with an old rival",
      "a getaway driver who wants out after tonight",
      "a disgraced detective working off the books",
      "a low-level bagman who saw too much",
    ],
    goals: [
      "gets pulled into a heist that was never as simple as promised",
      "can't remember which side he's actually on anymore",
      "watches the truce collapse over something nobody saw coming",
      "takes one score too many",
      "chases a case the department told him to close",
      "has forty-eight hours before the family finds out what he saw",
    ],
  },
  scifi: {
    protagonists: [
      "a maintenance engineer on a colony ship with a mind of its own",
      "a scientist who wakes up ten years into the wrong timeline",
      "an AI assistant developing something like feelings",
      "the last human on a station full of clones",
      "a signal operator who starts receiving messages from tomorrow",
      "a terraforming crew that isn't alone on the planet",
    ],
    goals: [
      "must convince the ship's AI it isn't actually in control",
      "has to warn the past before the timeline collapses for good",
      "starts to wonder if the feelings are real or just very good code",
      "discovers which clone was actually the original",
      "must decide whether to answer a signal from next Tuesday",
      "realizes the planet was never uninhabited to begin with",
    ],
  },
  family: {
    protagonists: [
      "a talking dog with opinions about the divorce",
      "a kid inventor whose gadget works a little too well",
      "a workaholic dad who gets zapped into his daughter's video game",
      "a girl who won't give up the orphaned elephant she isn't allowed to keep",
      "a grumpy grandfather who turns out to be magic",
      "a group of misfit pets left home alone for the holidays",
    ],
    goals: [
      "must save Christmas, the family, and possibly the mall",
      "accidentally shrinks the whole neighbourhood",
      "has one week to beat the final boss and get home for the recital",
      "runs away to the one place nobody will look for an elephant",
      "reveals a wish-granting talent at the worst possible reunion",
      "defends the house from burglars with the power of teamwork",
    ],
  },
  war: {
    protagonists: [
      "a soldier separated from his brother on the first day of the landing",
      "a field medic who's run out of morphine and miracles",
      "a reluctant radio operator carrying the last message home",
      "a pilot grounded by guilt after the mission that didn't come back",
      "a nurse running a hospital that's out of everything but time",
      "a platoon of strangers who become the only family that's left",
    ],
    goals: [
      "must cross enemy lines carrying nothing but a photograph",
      "keeps every promise except the ones that matter",
      "delivers the message long after it stops mattering to anyone but her",
      "flies one more mission to bring the rest of them home",
      "holds the line with bandages and borrowed time",
      "learns that surviving the war was never the hard part",
    ],
  },
  musical: {
    protagonists: [
      "a small-town waitress with a voice nobody's heard yet",
      "an a cappella captain one trophy from her biggest rival",
      "a Broadway understudy who finally gets the call",
      "a jukebox radio DJ living entirely in the wrong decade",
      "a shy songwriter who ghostwrites for everyone but herself",
      "a community theatre director staging one impossible show",
    ],
    goals: [
      "gets discovered the week she'd finally given up",
      "settles the rivalry the only way this town knows how: a sing-off",
      "goes on for the star and never wants to go back to the understudy dressing room",
      "falls for someone who still believes in vinyl and slow dances",
      "finally sings the song she wrote for herself",
      "somehow gets the whole cast to opening night in one piece",
    ],
  },
};

export const STUDIO_NAME = "your studio"; // replaced by player-chosen name at new game

export const RIVAL_STUDIOS = [
  { name: "Titan Pictures", personality: "blockbuster" as const },
  { name: "Maison Lumière", personality: "prestige" as const },
  { name: "Screamworks", personality: "genre-factory" as const },
];

export const PLAYER_STUDIO_NAMES = [
  "Marquee Pictures", "Halfmoon Studios", "Late Reel", "Argent Films",
  "Papercut Pictures", "First Slate", "Golden Hour", "Fadeout Features",
] as const;
