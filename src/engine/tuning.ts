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
  /** the credit facility: the industry lends against reputation */
  credit: {
    base: 25, // $M limit at tier 1
    perTier: 10, // +$M per prestige tier above 1
    scheduledCollateral: 10, // +$M while a film is scheduled (it's collateral)
    interest: 0.025, // per season, on the drawn amount
  },

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
  eWeights: { craft: 0.4, cast: 0.2, coherence: 0.15, budget: 0.15, schedule: 0.1 },
  budgetAdequacy: { min: 0.5, max: 1.3 },
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
  sigmaPerMajorDemand: 4,
  /** denying a major demand actively narrows the roll — denial IS a safety tool */
  sigmaPerDeniedMajor: -1,
  sigmaVolatilityMax: 10,
  sigmaAgainstType: 4, // acclaim axes only
  sigmaNotes: -3,
  sigmaReshoots: -2,
  sigmaFocusMoney: -2, // money axis only
  sigmaPlatformMoney: -3, // money axis only
  ceilingBase: 92,
  /**
   * Granted major: ceiling bonus scales with the director's TRUE craft
   * (hidden) — final cut in a master's hands raises the ceiling, in a hack's
   * hands it only buys variance. Denied major: -2 flat.
   */
  ceilingPerDemand: 2,
  ceilingCraftPivot: 70, // bonus = ceilingPerDemand × trueCraft / pivot
  ceilingMax: 100,
  ceilingMin: 80,
  crowdRoll: { x: 0.45, e: 0.35, a: 0.05, crossPenalty: 0.15, sigmaScale: 0.8 },
  criticRoll: { a: 0.4, e: 0.35, cred: 0.1, crossPenalty: 0.15 },
  fallCriticBonus: 5,

  // ------------------------------------------------------------- money roll
  budgetExponent: 0.5,
  appealMult: { base: 0.5, scale: 1.4 },
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

  // ------------------------------------------------------------- perception
  /** how far the industry's read on an unknown is pulled toward the default */
  perceptionAnchor: 55,
  perceptionAnchorWeight: 0.4,
  /** reputation-band half-width at familiarity 0, shrinking to ~2 at 1 */
  perceptionBandWidth: 14,
  familiarityPerFilm: 0.35, // they direct for YOU
  familiarityPerYear: 0.05, // ambient industry knowledge, all directors

  // ------------------------------------------------------------- people market
  marketSize: { directors: 14, writers: 10, actors: 22, scripts: 8 },
  poolSize: { directors: 40, writers: 30, actors: 60 },
  newPerYear: { directors: 2, writers: 2, actors: 4, scripts: 10 },
  highBothActorRate: 0.04,
  highBothSalaryMult: 2.5,
  heatDecay: 0.75, // per year multiplier

  // ------------------------------------------------------------- genre trends
  trend: {
    hotMult: 1.25,
    coldMult: 0.8,
    /** chance an existing trend persists another year */
    momentum: 0.6,
    /** asking-price scaling for scripts in hot/cold genres */
    hotPriceMult: 1.5,
    coldPriceMult: 0.65,
  },

  // ------------------------------------------------------------- actors v2
  /** how much of an actor's appeal applies, by fanbase & in/out of type */
  fanbase: {
    broad: { inType: 0.9, outType: 0.85 },
    genre: { inType: 1.0, outType: 0.55 },
    arthouse: { inType: 0.55, outType: 0.45 }, // openings, but they add critic
    teen: { inType: 1.05, outType: 0.8 },
    nostalgia: { inType: 0.8, outType: 0.65 },
  },
  arthouseLeadCriticBonus: 3,
  teenLegsPenalty: 0.9,
  nostalgiaLegsBonus: 1.12,
  nostalgiaStreamBonus: 1.2,
  /** chemistry between billed pairs: hash-based, −range..+range into E and X */
  chemistryRange: 8,
  chemistryReadCost: 0.3,
  /** against-type: ambition bonus and accessibility risk scale with range */
  rangePivot: 60,

  // ------------------------------------------------------------- franchises
  franchise: {
    mintCrowdMin: 70, // your own smash mints an IP…
    mintProfitOverBudget: 1.0, // …if profit ≥ budget
    sigmaDiv: 250, // money σ × (1 − awareness/250): awareness IS safety
    openingBoost: 0.45, // opening × (1 + awareness/100 × 0.45)
    marketingEff: 0.85, // P&A goes 15% further on a known name
    ambitionCap: 60, // sequels rarely get to be art
    expectationMissTol: 8,
    missLegsMult: 0.7,
    missFatigue: 25,
    missAwareness: -15,
    meetAwareness: 10,
    expectationRatchet: 3, // succeed and the bar rises
    fatiguePerInstalment: 12,
    fatigueRecoveryPerYear: 8,
    fatigueOpeningDiv: 150, // opening × (1 − fatigue/150)
    legacySeedMult: 0.5, // unless critic ≥ expectation (a worthy successor)
    sequelScriptCost: 1.5, // $M to develop an instalment script
    /** auteurs (style above this) refuse franchise work — unless promised a passion project */
    auteurRefusalStyle: 30,
    /** "I'll do your sequel, you greenlight my weird thing within N years" */
    passionDeadlineYears: 2,
    passionBreakRelationship: -40, // break your word and their camp never forgets
    passionKeepRelationship: 15,
  },

  // ------------------------------------------------------------- hype
  hype: {
    /** opening × (0.8 + hype/250) */
    openingBase: 0.8,
    openingDiv: 250,
    /** the judgment baseline: crowd is compared to 45 + hype/2 */
    expectationBase: 45,
    expectationDiv: 2,
    missTol: 10,
    missLegsMult: 0.75,
    beatLegsMult: 1.25, // low-hype over-delivery = the sleeper path
    beatHypeMax: 40,
    posture: { quiet: -20, standard: 0, event: 25 }, // hype shifts
    postureCost: { quiet: 0.85, standard: 1, event: 1.25 }, // P&A cost multiplier
  },

  // ------------------------------------------------------------- festival
  festival: {
    entryCost: 0.5,
    goldenCritic: 8,
    goldenHype: 25,
    goldenPrestige: 5,
    divisiveHype: 15,
    divisiveDivisive: 15,
    divisiveCrowd: -5,
  },

  // ------------------------------------------------------------- contracts & market heat
  contracts: {
    /** multi-film deal: locked salary, this discount per completed film */
    filmCount: 2,
    signingDiscount: 0.9, // they trade rate for security
    troupeEBonus: 2, // familiarity > threshold → the set just works
    troupeFamiliarity: 0.6,
    /** unsigned hot talent gets bid up at year-end */
    poachChance: 0.18,
    poachHeatMin: 22,
    poachSalaryMult: 1.5,
    /** signed cheap, blew up: market rate ≥ ratio × locked salary → holdout */
    holdoutRatio: 1.5,
    holdoutChance: 0.35, // per production season once eligible
    holdoutEPenalty: 4, // held to the contract, they sleepwalk through it
    holdoutHoldRelationship: -15,
    holdoutPayRelationship: 8,
  },

  // ------------------------------------------------------------- studio brand
  brand: {
    window: 6, // releases considered
    threshold: 0.5, // share of window in one genre → named brand
    inBrandMarketing: 0.85, // P&A goes further where you're known
    inBrandOpening: 1.08,
    offBrandOpening: 0.92,
    offBrandCritic: 4, // novelty
  },

  // ------------------------------------------------------------- scandals
  scandal: {
    /** per season, per scheduled/production film with a risky star */
    chance: 0.06,
    riskMin: 55,
    standByCrowd: -6,
    standByHype: -10,
    standByLoyalty: 12,
    recastBudgetPct: 0.12,
    recastRelationship: -20,
    marketValueMult: 0.55, // the scandal-hit actor's price craters
  },

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
  /**
   * the genre's box-office SHAPE: sigmaMult scales money variance (horror is
   * a lottery ticket, family is an annuity); legsProfile scales word-of-mouth
   * legs (horror front-loaded, drama leggy). The forecast bar shows it.
   */
  sigmaMult: number;
  legsProfile: number;
}

export const GENRE_NORMS: Record<Genre, GenreNorm> = {
  drama: { budget: 20, opening: 12, days: 45, stream: 1.1, ambitionCap: 95, prodSeasons: 1, sigmaMult: 1.1, legsProfile: 1.4 },
  comedy: { budget: 30, opening: 22, days: 50, stream: 1.2, ambitionCap: 70, prodSeasons: 1, sigmaMult: 1.0, legsProfile: 1.1 },
  horror: { budget: 12, opening: 18, days: 35, stream: 1.3, ambitionCap: 75, prodSeasons: 1, sigmaMult: 1.6, legsProfile: 0.6 },
  thriller: { budget: 35, opening: 25, days: 55, stream: 1.2, ambitionCap: 80, prodSeasons: 1, sigmaMult: 1.1, legsProfile: 0.95 },
  romance: { budget: 18, opening: 14, days: 40, stream: 1.1, ambitionCap: 75, prodSeasons: 1, sigmaMult: 0.9, legsProfile: 1.2 },
  crime: { budget: 30, opening: 18, days: 55, stream: 1.1, ambitionCap: 85, prodSeasons: 1, sigmaMult: 1.05, legsProfile: 1.0 },
  family: { budget: 60, opening: 40, days: 70, stream: 1.4, ambitionCap: 60, prodSeasons: 2, sigmaMult: 0.65, legsProfile: 1.35 },
  musical: { budget: 45, opening: 25, days: 65, stream: 1.0, ambitionCap: 80, prodSeasons: 2, sigmaMult: 1.3, legsProfile: 1.15 },
  war: { budget: 55, opening: 25, days: 75, stream: 0.9, ambitionCap: 90, prodSeasons: 2, sigmaMult: 1.15, legsProfile: 1.05 },
  scifi: { budget: 90, opening: 55, days: 85, stream: 1.2, ambitionCap: 85, prodSeasons: 2, sigmaMult: 1.2, legsProfile: 0.95 },
  action: { budget: 110, opening: 70, days: 90, stream: 1.1, ambitionCap: 55, prodSeasons: 2, sigmaMult: 0.85, legsProfile: 0.9 },
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
