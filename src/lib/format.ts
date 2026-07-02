/** $M formatting: 1234 -> "$1.23B", 87.5 -> "$88M", 0.3 -> "$300K" */
export function fmtMoney(m: number): string {
  const sign = m < 0 ? "-" : "";
  const abs = Math.abs(m);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
  if (abs >= 10) return `${sign}$${Math.round(abs)}M`;
  if (abs >= 1) return `${sign}$${abs.toFixed(1)}M`;
  return `${sign}$${Math.round(abs * 1000)}K`;
}

export const SEASON_NAMES = ["Winter", "Spring", "Summer", "Fall"] as const;

export function fmtSeason(clock: { year: number; season: number }): string {
  return `${SEASON_NAMES[clock.season]} ’${String(clock.year).padStart(2, "0")}`;
}

export function fmtScore(n: number): string {
  return String(Math.round(n));
}
