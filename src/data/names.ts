/**
 * Parody-adjacent name pools. Evocative of industry archetypes, never real
 * celebrity full names. Generators combine first+last randomly, so keep both
 * pools generic enough that no real person's full name can be assembled.
 */

export const FIRST_NAMES = [
  "Marla", "Dov", "Cassidy", "Werner", "Juno", "Sterling", "Paloma", "Ezekiel",
  "Bree", "Anders", "Octavia", "Lazlo", "Wren", "Domingo", "Sable", "Iris",
  "Roscoe", "Vada", "Caspian", "Lux", "Homer", "Delphine", "Buck", "Noor",
  "Fitz", "Ramona", "Silas", "Petra", "Ike", "Zelda", "Monty", "Anouk",
  "Gable", "Sunny", "Ivo", "Coral", "Dashiell", "Mercy", "Hollis", "Tova",
  "Rex", "Odile", "Barnaby", "Ingrid", "Clete", "Fable", "Jonas", "Vesper",
] as const;

export const LAST_NAMES = [
  "Vantage", "Okafor", "Bellwether", "Cruz", "Halloran", "Moreau", "Stitch",
  "Kowalczyk", "Vane", "Amaro", "Fenwick", "Osei", "Lindqvist", "Marsh",
  "Castellano", "Byrd", "Ashworth", "Nakagawa", "Petrov", "Quill", "Solano",
  "Trask", "Umber", "Villanueva", "Wexler", "Yun", "Zamora", "Blackwood",
  "Carraway", "Draper", "Ellison", "Farrow-Smythe", "Grimaldi", "Huxtable",
  "Ivory", "Jubilee", "Kessler", "Loach", "Merchant", "Nightingale",
  "Oleander", "Palomino", "Rook", "Silverstein", "Thorn", "Vau", "Winslet-Cragg",
] as const;

export const CREW_FIRST = [
  "Bogdan", "Ute", "Chesley", "Marisol", "Tobias", "Greta", "Linus", "Prue",
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
