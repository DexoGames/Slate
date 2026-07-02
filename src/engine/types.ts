/**
 * All game data as plain serialisable objects. Everything in src/engine is pure —
 * no React, no side effects; randomness flows through the RNG state carried in
 * GameState so saves are deterministic and replayable.
 *
 * Scales: person/film stats 0–100 unless noted; money is $M.
 */

export type Genre =
  | "drama"
  | "comedy"
  | "thriller"
  | "horror"
  | "action"
  | "scifi"
  | "romance"
  | "crime"
  | "family"
  | "war"
  | "musical";

export type TraitId =
  | "perfectionist"
  | "one-take-wonder"
  | "festival-darling"
  | "crowd-whisperer"
  | "over-budget"
  | "actors-director"
  | "franchise-friendly"
  | "feuds"
  | "method"
  | "box-office-poison"
  | "chameleon"
  | "tabloid-magnet"
  | "cheap-date"
  | "night-shoots-only"
  | "never-watches-cuts"
  | "punch-up-artist"
  | "slow-writer"
  | "genre-tourist"
  | "old-reliable"
  | "enfant-terrible";

export interface Person {
  id: string;
  name: string;
  archetype: string;
  age: number;
  fame: number;
  /** -50..+50 career trajectory; decays toward 0, moves on results. */
  heat: number;
  /** current asking price, $M */
  salary: number;
  traits: TraitId[];
}

export interface CrewMate {
  id: string;
  name: string;
  role: "dp" | "editor" | "composer";
}

export interface FilmOutcomeSummary {
  title: string;
  year: number;
  money: -1 | 0 | 1; // flop / wash / hit
  critic: number;
  crowd: number;
  legacy: number; // 0 if unresolved/none
}

export interface Director extends Person {
  kind: "director";
  craft: number;
  /** distinctiveness of voice → Ambition and Legacy seed */
  vision: number;
  /** -100 crowd-pleaser .. +100 auteur */
  style: number;
  /** widens this director's outcome noise */
  volatility: number;
  genres: Partial<Record<Genre, number>>;
  collaborators: CrewMate[];
  trackRecord: FilmOutcomeSummary[];
  /** min prestige tier of studio they'll work with (1–5) */
  minTier: number;
}

export interface Writer extends Person {
  kind: "writer";
  craft: number;
  ambitionStat: number;
  /** distinctive scripts degrade faster under other writers' rewrites */
  voice: number;
  genres: Partial<Record<Genre, number>>;
  isWriterDirector: boolean;
}

export interface Actor extends Person {
  kind: "actor";
  /** box-office draw — inflates Money regardless of performance */
  appeal: number;
  /** performance quality — feeds Execution and critical acclaim */
  craft: number;
  typecast: Genre[];
  temperament: number;
  backendAppetite: number;
}

export type AnyPerson = Director | Writer | Actor;

// ---------------------------------------------------------------------------
// Scripts

export interface RewritePass {
  /** 1-based pass number */
  pass: number;
  byFixer: boolean;
  coherenceDelta: number;
  hookDelta: number;
  ambitionDelta: number;
}

export interface Script {
  id: string;
  title: string;
  logline: string;
  genre: Genre;
  hook: number;
  ambition: number;
  coherence: number;
  buzz: number;
  writerId: string;
  writerName: string;
  rewrites: RewritePass[];
  passionOf?: string;
  askingPrice: number;
}

// ---------------------------------------------------------------------------
// Negotiation

export type DemandKind =
  | "budget-floor"
  | "shooting-days"
  | "final-cut"
  | "attached-actor"
  | "crew"
  | "no-test-screenings"
  | "backend-points"
  | "passion-project";

export interface Demand {
  id: string;
  kind: DemandKind;
  /** how much the director cares: 1 nicety, 2 serious, 3 dealbreaker-adjacent */
  weight: 1 | 2 | 3;
  label: string;
  detail: string;
  /** kind-specific payload */
  budgetFloor?: number;
  days?: number;
  actorId?: string;
  crewId?: string;
  points?: number;
}

export interface DemandDecision {
  demand: Demand;
  granted: boolean;
}

// ---------------------------------------------------------------------------
// Films

export type FilmStage =
  | "development"
  | "production"
  | "post"
  | "scheduled"
  | "released";

export type CastRole = "lead" | "colead" | "support";

export interface Deal {
  salary: number;
  /** % of studio net receipts */
  backendPoints: number;
}

export interface CastSlot {
  role: CastRole;
  actorId: string;
  actorName: string;
  deal: Deal;
  againstType: boolean;
  /** appeal/craft snapshotted at signing (people age/change) */
  appeal: number;
  craft: number;
}

export interface VisionEntry {
  label: string;
  delta: number;
}

export interface DeRiskingState {
  testScreeningHeld: boolean;
  /** none = held but ignored notes */
  notesImplemented: "none" | "minor" | "major";
  studioReshoots: boolean;
  focusMarketing: boolean;
  completionBond: boolean;
}

export type ReleaseStrategy = "wide" | "platform" | "streaming";

export interface SeasonStamp {
  year: number;
  season: 0 | 1 | 2 | 3; // Winter, Spring, Summer, Fall
}

export interface RollModifier {
  name: string;
  value: number;
}

export interface RollBreakdown {
  label: string;
  base: number;
  modifiers: RollModifier[];
  noise: number;
  final: number;
}

export type Verdict =
  | "smash"
  | "hit"
  | "sleeper"
  | "wash"
  | "flop"
  | "bomb"
  | "succes-de-scandale";

export interface ReleaseResult {
  opening: number;
  boxOffice: number;
  streaming: number;
  ancillary: number;
  /** studio net after budget+marketing+backend */
  profit: number;
  crowdScore: number;
  criticScore: number;
  verdict: Verdict;
  breakdown: RollBreakdown[];
}

export interface LegacyEvent {
  year: number;
  label: string;
  delta: number;
  /** re-releases pay a little real money */
  cash?: number;
}

export interface LegacyState {
  eligible: boolean;
  /** hidden true seed — UI must only show signalBand */
  seed: number;
  signalBand: [number, number];
  events: LegacyEvent[];
  locked: boolean;
  finalScore?: number;
  releasedYear: number;
}

export interface ProductionEventRecord {
  eventId: string;
  label: string;
  choice: "trust" | "protect";
  effect: string;
}

export interface Film {
  id: string;
  title: string;
  genre: Genre;
  script: Script; // snapshot at greenlight (market copy is removed)
  directorId: string;
  directorName: string;
  cast: CastSlot[];
  budget: number;
  marketing: number;
  shootingDays: number;
  demands: DemandDecision[];
  /** director + cast salaries + script price, $M — sunk at signing/greenlight */
  talentCost: number;
  visionLedger: VisionEntry[];
  deRisking: DeRiskingState;
  release: { season: SeasonStamp; strategy: ReleaseStrategy } | null;
  stage: FilmStage;
  /** seasons remaining in current stage */
  stageSeasonsLeft: number;
  /** running penalties from production events, applied to E at post */
  productionPenalty: number;
  productionBonus: number;
  /** extra release-roll sigma accrued from production events */
  eventSigma: number;
  eventHistory: ProductionEventRecord[];
  /** extra money already sunk beyond budget (overruns, granted extensions) */
  overruns: number;
  greenlitAt: SeasonStamp;
  latent?: { E: number; A: number; X: number };
  result?: ReleaseResult;
  legacy?: LegacyState;
  /** awards won, for the vault */
  awards: string[];
}

// ---------------------------------------------------------------------------
// Studio / world

export interface Studio {
  name: string;
  cash: number;
  reputation: { crowd: number; prestige: number };
  legacyPoints: number;
  lifelineUsed: boolean;
  /** permanent multiplier after the library sale */
  streamingCut: number;
  filmIds: string[];
  relationships: Record<string, number>;
}

export type RivalPersonality = "blockbuster" | "prestige" | "genre-factory";

export interface RivalFilm {
  title: string;
  genre: Genre;
  size: "small" | "mid" | "tentpole";
  releaseSeason: SeasonStamp;
  released: boolean;
  crowdScore?: number;
  criticScore?: number;
  profit?: number;
}

export interface RivalStudio {
  id: string;
  name: string;
  personality: RivalPersonality;
  aggression: number;
  slate: RivalFilm[];
  score: { money: number; acclaim: number; legacy: number };
}

export interface NewsItem {
  stamp: SeasonStamp;
  text: string;
  kind: "release" | "market" | "rival" | "legacy" | "awards" | "studio";
}

export interface AwardsCeremony {
  year: number;
  categories: {
    name: string;
    nominees: { filmTitle: string; studio: string }[];
    winner: { filmTitle: string; studio: string };
    playerWon: boolean;
  }[];
}

export type ScreenId =
  | "title"
  | "dashboard"
  | "market"
  | "negotiation"
  | "casting"
  | "production"
  | "post"
  | "release-night"
  | "vault"
  | "year-end"
  | "game-over";

export type GameMode =
  | { kind: "campaign"; lengthYears: number }
  | { kind: "endless" }
  | { kind: "scenario"; scenarioId: string; lengthYears: number };

export interface Market {
  scripts: Script[];
  directors: Director[];
  writers: Writer[];
  actors: Actor[];
}

/** A production event awaiting the player's trust/protect choice. */
export interface PendingEvent {
  filmId: string;
  eventId: string;
  title: string;
  body: string;
  trustLabel: string;
  trustEffect: string;
  protectLabel: string;
  protectEffect: string;
}

export interface YearEndReport {
  year: number;
  awards: AwardsCeremony | null;
  legacyNews: NewsItem[];
  revenue: number;
  costs: number;
  rivalStandings: { name: string; money: number; acclaim: number; isPlayer: boolean }[];
}

export interface GameState {
  version: number;
  mode: GameMode;
  clock: { year: number; season: 0 | 1 | 2 | 3 };
  rngState: number;
  seed: number;
  studio: Studio;
  rivals: RivalStudio[];
  market: Market;
  films: Record<string, Film>;
  newsLog: NewsItem[];
  screen: ScreenId;
  /** production events waiting on the player before the season can finish */
  pendingEvents: PendingEvent[];
  /** films released this tick, queued for the release-night ceremony */
  releaseQueue: string[];
  /** last year-end report for the year-end screen */
  yearEnd: YearEndReport | null;
  /** id counter for ULID-ish ids */
  idCounter: number;
  gameOver: null | { reason: "bankrupt" | "campaign-complete"; score?: CampaignScore };
  /** onboarding hints shown */
  hintsSeen: string[];
}

export interface CampaignScore {
  total: number;
  grade: string;
  parts: { profit: number; prestige: number; legacy: number; awards: number };
  obituary: string;
}
