import type { Genre } from "./types";

/**
 * THE dial panel. Every balance constant in the game lives here — formulas
 * import from this file and nowhere else. Tune with `npm run sim`.
 */
export const TUNING = {
  // ------------------------------------------------------------- economy
  startingCash: 60, // $M
  overheadPerSeason: 2.5, // $M, +0.5 per extra production slot
  overheadPerExtraSlot: 0.5,
  /** studio share of theatrical box office */
  theatricalShare: 0.5,
  /** library-sale lifeline: lump sum and the permanent streaming haircut */
  lifelineCash: 35,
  lifelineStreamingCut: 0.9,
  /** min released films before the lifeline is offered */
  lifelineMinFilms: 3,

  // ------------------------------------------------------------- vision
  vpStart: 100,
  vpDenyPerWeight: 6, // deny demand: -6 × weight
  vpRewrite: [0, -6, -12] as const, // pass 1, 2, 3+ (3+ repeats)
  vpFixerExtra: -6,
  vpNotesMinor: -8,
  vpNotesMajor: -18,
  vpStudioReshoots: -12,
  vpFocusMarketing: -5,
  vpStreamingDump: -6,
  vpFinalCutHonoured: 5,
  vpPassionBuffer: 10,
  /** the hard gate: below this at release, Legacy is 0 forever */
  vpEligibleAt: 50,

  // ------------------------------------------------------------- rewrites
  rewriteCoherence: [8, -5, -12, -18] as const, // pass 1..4+ (4+ repeats)
  rewriteHook: [5, 4, 3, 1] as const,
  fixerCoherenceMult: 1.5,
  highVoiceThreshold: 70,
  highVoiceExtraMult: 1.25,
  /** fixer converts ambition into hook */
  fixerAmbitionToHook: 4,

  // ------------------------------------------------------------- quality
  // E = execution (money CAN buy), A = ambition (money CANNOT), X = accessibility
  eWeights: { craft: 0.35, cast: 0.2, coherence: 0.2, budget: 0.15, schedule: 0.1 },
  budgetAdequacy: { min: 0.4, max: 1.3 },
  scheduleAdequacy: { min: 0.5, max: 1.15 },
  synergyCrewEach: 4,
  synergyCrewMax: 8,
  synergyWriterDirector: 6,
  synergyDeniedCrew: -4,
  aWeights: { script: 0.4, vision: 0.3, writer: 0.2, againstType: 0.1 },
  againstTypeBonusValue: 60,
  xWeights: { hook: 0.35, crowdLean: 0.25, appeal: 0.25, familiar: 0.15 },
  /** X bonus for implementing test-screening notes (minor/major) */
  notesXBonus: { minor: 4, major: 8 },

  // ------------------------------------------------------------- release roll
  sigmaBase: 15,
  sigmaMin: 5,
  sigmaMax: 30,
  sigmaPerMajorDemand: 2,
  sigmaVolatilityMax: 6,
  sigmaAgainstType: 4, // acclaim axes only
  sigmaNotes: -3,
  sigmaReshoots: -2,
  sigmaFocusMoney: -2, // money axis only
  sigmaPlatformMoney: -3, // money axis only
  ceilingBase: 92,
  ceilingPerDemand: 2, // granted major +2 (cap 100), denied major -2 (floor 80)
  ceilingMax: 100,
  ceilingMin: 80,
  crowdRoll: { x: 0.45, e: 0.35, a: 0.05, crossPenalty: 0.1, sigmaScale: 0.8 },
  criticRoll: { a: 0.4, e: 0.35, cred: 0.1, crossPenalty: 0.1 },
  fallCriticBonus: 5,

  // ------------------------------------------------------------- money roll
  budgetExponent: 0.5,
  appealMult: { base: 0.6, scale: 1.1 },
  marketingMult: { base: 0.7, scale: 0.6, cap: 1.6 },
  competitionPerRival: 0.12,
  seasonMult: [0.95, 0.85, 1.35, 1.0] as const, // Winter Spring Summer Fall
  legsBase: 1.6,
  legsCrowdScale: 2.2,
  moneySigmaDiv: 40,
  streamingBase: 5,
  streamingAppeal: 0.25,
  streamingCrowd: 0.1,
  platformOpeningCap: 0.45, // platform release: opening capped to this × norm
  platformCriticBonus: 3,
  streamingSaleMult: 1.1, // guaranteed revenue = 1.1 × budget
  /** ancillary = ancillaryRate × boxOffice for franchise-y genres */
  ancillaryRate: { action: 0.18, family: 0.22, scifi: 0.15, horror: 0.06 } as Partial<
    Record<Genre, number>
  >,

  // ------------------------------------------------------------- legacy
  legacySeed: { a: 0.4, e: 0.2, critic: 0.15, divisive: 0.1, vision: 0.15 },
  divisivenessCap: 25,
  legacySignalHalfWidth: 15,
  legacySignalNoise: 8,
  legacyYears: 8,
  /** P(event) by years-since-release (index 1..8) */
  legacyEventP: [0, 0.15, 0.3, 0.35, 0.35, 0.3, 0.2, 0.15, 0.1] as const,
  legacyFinalSigma: 15, // FIXED — no tool touches this
  legacyThresholds: { masterpiece: 85, classic: 70, cult: 55, fine: 40 },
  legacyPoints: { masterpiece: 30, classic: 18, cult: 8, fine: 3 },

  // ------------------------------------------------------------- development costs
  rewriteCostOriginal: 0.8, // $M per pass by the original writer
  rewriteCostFixer: 2, // $M per pass by a brought-in fixer

  // ------------------------------------------------------------- de-risking costs
  testScreeningCost: 0.3,
  notesCost: { minor: 1, major: 4 },
  reshootsBudgetPct: 0.08,
  focusMarketingPct: 0.2,
  completionBondPct: 0.03,

  // ------------------------------------------------------------- people market
  marketSize: { directors: 14, writers: 10, actors: 22, scripts: 8 },
  poolSize: { directors: 40, writers: 30, actors: 60 },
  newPerYear: { directors: 2, writers: 2, actors: 4, scripts: 10 },
  highBothActorRate: 0.04,
  highBothSalaryMult: 2.5,
  heatDecay: 0.75, // per year multiplier

  // ------------------------------------------------------------- progression
  tierThresholds: [0, 25, 60, 120, 220] as const, // legacyPoints for tier 1..5
  slotsByTier: [1, 1, 2, 2, 3] as const,
  repRollingWindow: 6,

  // ------------------------------------------------------------- awards
  awardCampaignMax: 5, // $M
  awardWinLegacyPoints: 2,
  awardStreamingBonus: 1.08,

  // ------------------------------------------------------------- campaign
  campaignYears: 25,
  scoreWeights: { profit: 0.3, prestige: 0.25, legacy: 0.35, awards: 0.1 },
} as const;

export interface GenreNorm {
  /** typical production budget $M */
  budget: number;
  /** typical opening weekend $M at that budget */
  opening: number;
  /** typical shooting days */
  days: number;
  /** streaming revenue multiplier */
  stream: number;
  /** ambition cap for generated scripts (auteur attachment can exceed) */
  ambitionCap: number;
  /** seasons in production (1 or 2) */
  prodSeasons: 1 | 2;
}

export const GENRE_NORMS: Record<Genre, GenreNorm> = {
  drama: { budget: 20, opening: 12, days: 45, stream: 1.1, ambitionCap: 95, prodSeasons: 1 },
  comedy: { budget: 30, opening: 22, days: 50, stream: 1.2, ambitionCap: 70, prodSeasons: 1 },
  horror: { budget: 12, opening: 18, days: 35, stream: 1.3, ambitionCap: 75, prodSeasons: 1 },
  thriller: { budget: 35, opening: 25, days: 55, stream: 1.2, ambitionCap: 80, prodSeasons: 1 },
  romance: { budget: 18, opening: 14, days: 40, stream: 1.1, ambitionCap: 75, prodSeasons: 1 },
  crime: { budget: 30, opening: 18, days: 55, stream: 1.1, ambitionCap: 85, prodSeasons: 1 },
  family: { budget: 60, opening: 40, days: 70, stream: 1.4, ambitionCap: 60, prodSeasons: 2 },
  musical: { budget: 45, opening: 25, days: 65, stream: 1.0, ambitionCap: 80, prodSeasons: 2 },
  war: { budget: 55, opening: 25, days: 75, stream: 0.9, ambitionCap: 90, prodSeasons: 2 },
  scifi: { budget: 90, opening: 55, days: 85, stream: 1.2, ambitionCap: 85, prodSeasons: 2 },
  action: { budget: 110, opening: 70, days: 90, stream: 1.1, ambitionCap: 55, prodSeasons: 2 },
};

export const GENRE_LABELS: Record<Genre, string> = {
  drama: "Drama",
  comedy: "Comedy",
  thriller: "Thriller",
  horror: "Horror",
  action: "Action",
  scifi: "Sci-Fi",
  romance: "Romance",
  crime: "Crime",
  family: "Family",
  war: "War",
  musical: "Musical",
};
