import type { Fanbase, Genre, TraitId } from "../engine/types";

/**
 * Archetype templates fix stat correlations for generated people. Ranges are
 * [min, max]; style is the crowd(-100)..auteur(+100) axis.
 */

export interface DirectorArchetype {
  label: string;
  craft: [number, number];
  vision: [number, number];
  style: [number, number];
  volatility: [number, number];
  genres: Genre[];
  traits: TraitId[];
  minTier: number;
}

export const DIRECTOR_ARCHETYPES: DirectorArchetype[] = [
  { label: "The Moody Auteur", craft: [65, 90], vision: [80, 98], style: [60, 95], volatility: [55, 85], genres: ["drama", "crime"], traits: ["festival-darling", "perfectionist", "enfant-terrible"], minTier: 3 },
  { label: "The Vulgar Auteurist", craft: [70, 90], vision: [70, 92], style: [30, 70], volatility: [50, 80], genres: ["horror", "action", "crime"], traits: ["enfant-terrible", "genre-tourist"], minTier: 2 },
  { label: "The Safe Pair of Hands", craft: [60, 80], vision: [25, 45], style: [-70, -30], volatility: [10, 30], genres: ["comedy", "family", "thriller"], traits: ["old-reliable", "one-take-wonder"], minTier: 1 },
  { label: "The Spectacle Merchant", craft: [65, 88], vision: [30, 55], style: [-90, -50], volatility: [25, 50], genres: ["action", "scifi"], traits: ["over-budget", "crowd-whisperer"], minTier: 2 },
  { label: "The Festival Ghost", craft: [55, 78], vision: [75, 95], style: [70, 100], volatility: [60, 90], genres: ["drama", "romance"], traits: ["festival-darling", "slow-writer"], minTier: 2 },
  { label: "The Journeyman", craft: [45, 65], vision: [20, 40], style: [-40, 0], volatility: [10, 25], genres: ["thriller", "crime", "comedy"], traits: ["cheap-date", "old-reliable"], minTier: 1 },
  { label: "The Wunderkind", craft: [55, 85], vision: [60, 90], style: [10, 60], volatility: [65, 95], genres: ["scifi", "horror"], traits: ["enfant-terrible", "night-shoots-only"], minTier: 1 },
  { label: "The Actor's Director", craft: [70, 90], vision: [55, 75], style: [20, 60], volatility: [20, 45], genres: ["drama", "war"], traits: ["actors-director", "perfectionist"], minTier: 2 },
  { label: "The Reformed Ad-Man", craft: [60, 80], vision: [35, 60], style: [-60, -20], volatility: [15, 40], genres: ["comedy", "romance", "musical"], traits: ["crowd-whisperer"], minTier: 1 },
  { label: "The Blood-and-Thunder Vet", craft: [72, 92], vision: [50, 75], style: [-20, 30], volatility: [30, 55], genres: ["war", "action", "crime"], traits: ["over-budget", "old-reliable"], minTier: 3 },
  { label: "The Miniaturist", craft: [68, 88], vision: [70, 92], style: [50, 85], volatility: [35, 60], genres: ["romance", "drama", "musical"], traits: ["perfectionist", "slow-writer"], minTier: 2 },
  { label: "The Schlock Economist", craft: [40, 62], vision: [25, 50], style: [-50, 0], volatility: [40, 70], genres: ["horror", "scifi"], traits: ["cheap-date", "one-take-wonder"], minTier: 1 },
  { label: "The Prestige Machine", craft: [78, 95], vision: [55, 78], style: [10, 50], volatility: [15, 35], genres: ["drama", "war", "crime"], traits: ["old-reliable", "actors-director"], minTier: 4 },
  { label: "The Genre Alchemist", craft: [62, 85], vision: [65, 88], style: [20, 65], volatility: [45, 75], genres: ["horror", "thriller", "scifi"], traits: ["genre-tourist", "festival-darling"], minTier: 2 },
];

export interface WriterArchetype {
  label: string;
  craft: [number, number];
  ambition: [number, number];
  voice: [number, number];
  genres: Genre[];
  traits: TraitId[];
  writerDirector: boolean;
}

export const WRITER_ARCHETYPES: WriterArchetype[] = [
  { label: "The Playwright in Exile", craft: [70, 90], ambition: [75, 95], voice: [80, 98], genres: ["drama", "romance"], traits: ["slow-writer"], writerDirector: false },
  { label: "The Punch-Up King", craft: [60, 80], ambition: [20, 40], voice: [30, 50], genres: ["comedy", "action"], traits: ["punch-up-artist"], writerDirector: false },
  { label: "The Airport-Novel Adapter", craft: [55, 75], ambition: [30, 55], voice: [25, 45], genres: ["thriller", "crime"], traits: ["old-reliable"], writerDirector: false },
  { label: "The Sad-Genius Hyphenate", craft: [65, 88], ambition: [70, 95], voice: [75, 95], genres: ["drama", "scifi"], traits: ["never-watches-cuts", "slow-writer"], writerDirector: true },
  { label: "The Structure Surgeon", craft: [80, 95], ambition: [40, 60], voice: [35, 55], genres: ["thriller", "action", "scifi"], traits: ["punch-up-artist"], writerDirector: false },
  { label: "The Folk Horrorist", craft: [60, 82], ambition: [65, 88], voice: [70, 92], genres: ["horror", "war"], traits: ["genre-tourist"], writerDirector: true },
  { label: "The Rom-Com Whisperer", craft: [62, 82], ambition: [35, 55], voice: [45, 65], genres: ["romance", "comedy", "musical"], traits: ["crowd-whisperer"], writerDirector: false },
  { label: "The True-Crime Obsessive", craft: [58, 80], ambition: [55, 80], voice: [55, 78], genres: ["crime", "drama"], traits: [], writerDirector: false },
  { label: "The Uncredited Legend", craft: [75, 92], ambition: [45, 65], voice: [40, 60], genres: ["action", "thriller", "family"], traits: ["punch-up-artist", "old-reliable"], writerDirector: false },
  { label: "The Difficult Second Novelist", craft: [55, 78], ambition: [70, 92], voice: [72, 94], genres: ["drama", "romance", "musical"], traits: ["slow-writer", "enfant-terrible"], writerDirector: false },
];

export interface ActorArchetype {
  label: string;
  appealBias: number; // shifts the appeal/craft anti-correlated draw
  temperament: [number, number];
  typecast: Genre[];
  traits: TraitId[];
  fanbase: Fanbase;
  range: [number, number];
}

export const ACTOR_ARCHETYPES: ActorArchetype[] = [
  { label: "The Ageing Action Star", appealBias: 20, temperament: [30, 60], typecast: ["action", "thriller"], traits: ["franchise-friendly"], fanbase: "nostalgia", range: [15, 40] },
  { label: "The Twee Indie Darling", appealBias: -15, temperament: [20, 45], typecast: ["drama", "romance"], traits: ["festival-darling"], fanbase: "arthouse", range: [40, 70] },
  { label: "The Method Volcano", appealBias: -10, temperament: [65, 95], typecast: ["drama", "war", "crime"], traits: ["method", "feuds"], fanbase: "arthouse", range: [60, 90] },
  { label: "The Charm Offensive", appealBias: 25, temperament: [10, 30], typecast: ["comedy", "romance"], traits: ["crowd-whisperer"], fanbase: "broad", range: [25, 55] },
  { label: "The Scream Queen/King", appealBias: 5, temperament: [15, 40], typecast: ["horror", "thriller"], traits: ["cheap-date"], fanbase: "genre", range: [30, 60] },
  { label: "The Franchise Face", appealBias: 30, temperament: [25, 55], typecast: ["action", "scifi", "family"], traits: ["franchise-friendly", "tabloid-magnet"], fanbase: "broad", range: [15, 45] },
  { label: "The Chameleon", appealBias: -20, temperament: [15, 40], typecast: ["drama", "crime"], traits: ["chameleon"], fanbase: "arthouse", range: [80, 98] },
  { label: "The Fallen A-Lister", appealBias: 10, temperament: [50, 85], typecast: ["thriller", "crime"], traits: ["box-office-poison", "tabloid-magnet"], fanbase: "nostalgia", range: [35, 65] },
  { label: "The Musical Theatre Escapee", appealBias: -5, temperament: [20, 50], typecast: ["musical", "romance", "comedy"], traits: [], fanbase: "genre", range: [45, 75] },
  { label: "The Stoic Prestige Anchor", appealBias: -8, temperament: [5, 25], typecast: ["war", "drama"], traits: ["old-reliable"], fanbase: "broad", range: [50, 75] },
  { label: "The Internet's Boyfriend/Girlfriend", appealBias: 22, temperament: [20, 50], typecast: ["romance", "comedy", "scifi"], traits: ["tabloid-magnet"], fanbase: "teen", range: [20, 50] },
  { label: "The Character Great", appealBias: -25, temperament: [10, 35], typecast: ["crime", "drama", "horror"], traits: ["chameleon", "cheap-date"], fanbase: "arthouse", range: [75, 95] },
  { label: "The Kid-Movie Money Printer", appealBias: 28, temperament: [10, 35], typecast: ["family", "comedy"], traits: ["franchise-friendly"], fanbase: "broad", range: [10, 35] },
  { label: "The Comeback Story", appealBias: 0, temperament: [35, 70], typecast: ["drama", "action"], traits: ["tabloid-magnet"], fanbase: "nostalgia", range: [40, 70] },
  { label: "The Festival Muse", appealBias: -18, temperament: [25, 55], typecast: ["drama", "romance", "musical"], traits: ["festival-darling", "method"], fanbase: "arthouse", range: [55, 85] },
  { label: "The Reliable Second Lead", appealBias: -5, temperament: [5, 25], typecast: ["comedy", "thriller", "family"], traits: ["old-reliable", "cheap-date"], fanbase: "broad", range: [40, 65] },
  { label: "The Algorithm's Choice", appealBias: 18, temperament: [10, 30], typecast: ["thriller", "scifi", "romance"], traits: [], fanbase: "teen", range: [20, 45] },
  { label: "The Foreign Auteur Muse", appealBias: -12, temperament: [20, 45], typecast: ["drama", "crime", "war"], traits: ["festival-darling"], fanbase: "arthouse", range: [60, 88] },
  { label: "The Stunt Legend", appealBias: 8, temperament: [10, 30], typecast: ["action", "war"], traits: ["cheap-date", "old-reliable"], fanbase: "genre", range: [10, 30] },
  { label: "The Nepo Baby", appealBias: 12, temperament: [30, 60], typecast: ["drama", "romance", "thriller"], traits: ["tabloid-magnet"], fanbase: "teen", range: [25, 60] },
  { label: "The Sitcom Graduate", appealBias: 15, temperament: [10, 35], typecast: ["comedy", "family", "romance"], traits: ["crowd-whisperer"], fanbase: "broad", range: [30, 60] },
  { label: "The Genre Cult Icon", appealBias: -2, temperament: [20, 50], typecast: ["horror", "scifi"], traits: ["franchise-friendly", "cheap-date"], fanbase: "genre", range: [35, 65] },
  { label: "The Serious Comedian", appealBias: 8, temperament: [25, 55], typecast: ["comedy", "drama"], traits: [], fanbase: "broad", range: [55, 85] },
  { label: "The Action Sweetheart", appealBias: 20, temperament: [15, 40], typecast: ["action", "comedy"], traits: ["franchise-friendly"], fanbase: "broad", range: [25, 50] },
];

export const TRAIT_LABELS: Record<TraitId, { label: string; blurb: string }> = {
  "perfectionist": { label: "Perfectionist", blurb: "+execution, but shoots run long" },
  "one-take-wonder": { label: "One-Take Wonder", blurb: "needs fewer days, capped highs" },
  "festival-darling": { label: "Festival Darling", blurb: "+critic score in the Fall window" },
  "crowd-whisperer": { label: "Crowd Whisperer", blurb: "+crowd score" },
  "over-budget": { label: "Over Budget", blurb: "overrun events more likely" },
  "actors-director": { label: "Actors' Director", blurb: "cast performs above its craft" },
  "franchise-friendly": { label: "Franchise Friendly", blurb: "+ancillary revenue" },
  "feuds": { label: "Feuds", blurb: "on-set drama twice as likely" },
  "method": { label: "Method", blurb: "+craft in heavy genres, +drama" },
  "box-office-poison": { label: "Box-Office Poison", blurb: "famous, cheap, and cursed" },
  "chameleon": { label: "Chameleon", blurb: "no against-type penalty" },
  "tabloid-magnet": { label: "Tabloid Magnet", blurb: "press events, good and bad" },
  "cheap-date": { label: "Cheap Date", blurb: "asks 30% under the salary curve" },
  "night-shoots-only": { label: "Night Shoots Only", blurb: "+schedule pressure" },
  "never-watches-cuts": { label: "Never Watches Cuts", blurb: "doesn't care about rewrites" },
  "punch-up-artist": { label: "Punch-Up Artist", blurb: "their rewrite passes cost less coherence" },
  "slow-writer": { label: "Slow Writer", blurb: "scripts arrive late but deeper" },
  "genre-tourist": { label: "Genre Tourist", blurb: "no genre-fit penalty" },
  "old-reliable": { label: "Old Reliable", blurb: "narrower outcomes" },
  "enfant-terrible": { label: "Enfant Terrible", blurb: "wider outcomes, walks if crossed" },
};
