import { TUNING } from "./tuning";
import type { CampaignScore, Film, GameState } from "./types";
import { clamp } from "./rng";

export function prestigeTier(legacyPoints: number): number {
  const t = TUNING.tierThresholds;
  let tier = 1;
  for (let i = 0; i < t.length; i++) {
    if (legacyPoints >= t[i]) tier = i + 1;
  }
  return tier;
}

export function productionSlots(legacyPoints: number): number {
  return TUNING.slotsByTier[prestigeTier(legacyPoints) - 1];
}

const GRADES: { min: number; grade: string }[] = [
  { min: 85, grade: "A DREAM FACTORY" },
  { min: 70, grade: "A GREAT HOUSE" },
  { min: 55, grade: "A RESPECTABLE HOUSE" },
  { min: 40, grade: "A WORKING STUDIO" },
  { min: 25, grade: "A CONTENT MILL" },
  { min: 0, grade: "A CAUTIONARY TALE" },
];

export function computeCampaignScore(state: GameState): CampaignScore {
  const t = TUNING;
  const films = state.studio.filmIds
    .map((id) => state.films[id])
    .filter((f): f is Film => !!f && f.stage === "released");

  const lifetimeProfit = films.reduce((s, f) => s + (f.result?.profit ?? 0), 0);
  // ~$600M lifetime profit ≈ a perfect money grade over 25 years
  const profitScore = clamp((lifetimeProfit / 600) * 100);
  const prestigeScore = clamp(state.studio.reputation.prestige);
  // ~150 legacy points ≈ perfect legacy grade
  const legacyScore = clamp((state.studio.legacyPoints / 150) * 100);
  const awardsWon = films.reduce((s, f) => s + f.awards.length, 0);
  const awardsScore = clamp(awardsWon * 12);

  const total = Math.round(
    t.scoreWeights.profit * profitScore +
      t.scoreWeights.prestige * prestigeScore +
      t.scoreWeights.legacy * legacyScore +
      t.scoreWeights.awards * awardsScore,
  );
  const grade = GRADES.find((g) => total >= g.min)?.grade ?? "A CAUTIONARY TALE";

  return {
    total,
    grade,
    parts: {
      profit: Math.round(profitScore),
      prestige: Math.round(prestigeScore),
      legacy: Math.round(legacyScore),
      awards: Math.round(awardsScore),
    },
    obituary: writeObituary(state, films, lifetimeProfit),
  };
}

function writeObituary(state: GameState, films: Film[], lifetimeProfit: number): string {
  const name = state.studio.name;
  const n = films.length;
  if (n === 0) {
    return `${name} closed its doors having released nothing at all. Historians agree this was, in a sense, a flawless filmography.`;
  }
  const classics = films.filter((f) => (f.legacy?.finalScore ?? 0) >= TUNING.legacyThresholds.classic);
  const masterpieces = films.filter((f) => (f.legacy?.finalScore ?? 0) >= TUNING.legacyThresholds.masterpiece);
  const compromised = films.filter((f) => f.legacy && !f.legacy.eligible);
  const biggestHit = films.reduce((a, b) => ((a.result?.profit ?? -Infinity) > (b.result?.profit ?? -Infinity) ? a : b));
  const bestLoved = films.reduce((a, b) => ((a.legacy?.finalScore ?? 0) > (b.legacy?.finalScore ?? 0) ? a : b));

  const lines: string[] = [];
  lines.push(`${name} released ${n} film${n === 1 ? "" : "s"} and ${lifetimeProfit >= 0 ? `banked $${Math.round(lifetimeProfit)}M` : `lost $${Math.abs(Math.round(lifetimeProfit))}M`} doing it.`);
  if (masterpieces.length > 0) {
    lines.push(`“${masterpieces[0].title}” will outlive everyone who greenlit it. That is the whole job, and ${name} did it.`);
  } else if (classics.length > 0) {
    lines.push(`“${classics[0].title}” is still screening somewhere tonight, which is more than money ever bought anyone.`);
  } else if ((bestLoved.legacy?.finalScore ?? 0) >= TUNING.legacyThresholds.cult) {
    lines.push(`“${bestLoved.title}” found its people eventually. Small congregation; true believers.`);
  } else {
    lines.push(`Nothing in the vault aged into greatness — though “${biggestHit.title}” paid for a lot of very sincere attempts.`);
  }
  if (compromised.length >= Math.max(2, n / 3)) {
    lines.push(`The trades noted that ${compromised.length} of its films were recut toward safety. Audiences noticed too, in their way: they forgot them.`);
  }
  return lines.join(" ");
}
