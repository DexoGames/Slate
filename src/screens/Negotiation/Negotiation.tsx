import { useMemo, useState } from "react";
import { TRAIT_LABELS } from "../../data/archetypes";
import { Panel, SectionTitle, StatChip, Weight } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { DistributionPanel } from "../../components/DistributionPanel/DistributionPanel";
import { estimateOutcomes } from "../../engine/distribution";
import { demandsFor, walkAwayRisk } from "../../engine/negotiation";
import { prestigeTier } from "../../engine/score";
import { GENRE_LABELS } from "../../engine/tuning";
import type { Demand, DemandDecision, Director, Film, GameState } from "../../engine/types";
import {
  IconDice,
  IconDirector,
  IconMoney,
  IconPalette,
  IconPopcorn,
  IconWarning,
} from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./Negotiation.module.css";

export function Negotiation({
  game,
  film,
  onHire,
  onBack,
}: {
  game: GameState;
  film: Film;
  onHire: (directorId: string, decisions: DemandDecision[]) => void;
  onBack: () => void;
}) {
  const [directorId, setDirectorId] = useState<string | null>(null);
  const director = game.market.directors.find((d) => d.id === directorId) ?? null;

  return director ? (
    <DemandSheet
      game={game}
      film={film}
      director={director}
      onSign={(decisions) => onHire(director.id, decisions)}
      onBack={() => setDirectorId(null)}
    />
  ) : (
    <DirectorList game={game} film={film} onPick={setDirectorId} onBack={onBack} />
  );
}

function StyleAxis({ style }: { style: number }) {
  return (
    <div className={styles.styleAxis} title="Crowd-pleaser ↔ auteur">
      <IconPopcorn size={14} />
      <div className={styles.styleTrack}>
        <div className={styles.styleDot} style={{ left: `${((style + 100) / 200) * 100}%` }} />
      </div>
      <IconPalette size={14} />
    </div>
  );
}

function DirectorList({
  game,
  film,
  onPick,
  onBack,
}: {
  game: GameState;
  film: Film;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  const tier = prestigeTier(game.studio.legacyPoints);
  const sorted = [...game.market.directors].sort(
    (a, b) => (b.genres[film.genre] ?? 0) - (a.genres[film.genre] ?? 0),
  );
  return (
    <div>
      <div className={styles.head}>
        <SectionTitle>
          A DIRECTOR FOR “{film.title.toUpperCase()}” · {GENRE_LABELS[film.genre].toUpperCase()}
        </SectionTitle>
        <Button variant="secondary" onClick={onBack}>
          ← Film
        </Button>
      </div>
      <div className={styles.grid}>
        {sorted.map((d) => {
          const locked = d.minTier > tier;
          return (
            <Panel key={d.id} className={cx(styles.card, locked && styles.locked)}>
              <div className={styles.cardHead}>
                <IconDirector size={16} />
                <div>
                  <h4 className={styles.name}>{d.name}</h4>
                  <span className={styles.arch}>{d.archetype}</span>
                </div>
                <span className={styles.salary}>{fmtMoney(d.salary)}</span>
              </div>
              <StyleAxis style={d.style} />
              <div className={styles.statRow}>
                <StatChip icon={<IconDirector size={12} />} value={d.craft} label="craft" />
                <StatChip icon={<IconPalette size={12} />} value={d.vision} label="vision" color="var(--stat-legacy)" />
                <StatChip icon={<IconDice size={12} />} value={d.volatility} label="chaos" />
                <StatChip
                  icon={<span className={styles.fit} />}
                  value={d.genres[film.genre] ?? 40}
                  label={GENRE_LABELS[film.genre]}
                  color={(d.genres[film.genre] ?? 40) >= 65 ? "var(--stat-money)" : undefined}
                />
              </div>
              {d.traits.length > 0 && (
                <div className={styles.traits}>
                  {d.traits.map((t) => (
                    <span key={t} title={TRAIT_LABELS[t].blurb}>
                      {TRAIT_LABELS[t].label}
                    </span>
                  ))}
                </div>
              )}
              {d.trackRecord.length > 0 && (
                <div className={styles.record}>
                  {d.trackRecord.slice(-4).map((r, i) => (
                    <span
                      key={i}
                      title={`${r.title} — crowd ${r.crowd}, critics ${r.critic}`}
                      className={styles.recordDot}
                    >
                      <i style={{ background: r.money > 0 ? "var(--stat-money)" : r.money < 0 ? "var(--danger)" : "var(--bone-dim)" }} />
                      <i style={{ background: r.critic >= 70 ? "var(--stat-critic)" : "var(--black-soft-2)" }} />
                    </span>
                  ))}
                </div>
              )}
              <Button
                className={styles.pickBtn}
                disabled={locked || game.studio.cash < d.salary}
                onClick={() => onPick(d.id)}
              >
                {locked ? `NEEDS TIER ${d.minTier} STUDIO` : "OPEN NEGOTIATIONS"}
              </Button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function DemandSheet({
  game,
  film,
  director,
  onSign,
  onBack,
}: {
  game: GameState;
  film: Film;
  director: Director;
  onSign: (decisions: DemandDecision[]) => void;
  onBack: () => void;
}) {
  // demands are deterministic per (seed, film, director) and never touch game RNG
  const demands = useMemo(() => demandsFor(game, film, director), [game, film, director]);

  const [granted, setGranted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(demands.map((d) => [d.id, true])),
  );

  const decisions: DemandDecision[] = demands.map((demand) => ({
    demand,
    granted: granted[demand.id] ?? true,
  }));
  const denied: Demand[] = decisions.filter((d) => !d.granted).map((d) => d.demand);
  const risk = walkAwayRisk(director, denied);

  const draft: Film = useMemo(() => {
    let ledger = film.visionLedger;
    for (const d of decisions) {
      if (!d.granted) {
        ledger = [...ledger, { label: `Denied: ${d.demand.label}`, delta: -6 * d.demand.weight }];
      }
    }
    const floor = decisions.find((d) => d.granted && d.demand.kind === "budget-floor")?.demand.budgetFloor;
    return {
      ...film,
      directorId: director.id,
      directorName: director.name,
      demands: decisions,
      budget: Math.max(film.budget, floor ?? 0),
      visionLedger: ledger,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film, director, JSON.stringify(granted), demands]);

  const estimate = useMemo(
    () => estimateOutcomes(draft, director, game.rivals),
    [draft, director, game.rivals],
  );

  const grantedCost =
    (decisions.find((d) => d.granted && d.demand.kind === "budget-floor")?.demand.budgetFloor ?? 0);

  return (
    <div className={styles.sheetGrid}>
      <div className={styles.sheetLeft}>
        <div className={styles.head}>
          <SectionTitle>
            {director.name.toUpperCase()} · THE DEMANDS
          </SectionTitle>
          <Button variant="secondary" onClick={onBack}>
            ← Directors
          </Button>
        </div>
        <p className={styles.hint}>
          Granting demands <b>widens</b> the outcome range and raises the ceiling.
          Denying them <b>narrows and caps</b> it — and chips the film's vision.
          Neither is free.
        </p>
        <div className={styles.demands}>
          {demands.length === 0 && (
            <Panel>
              <p className={styles.hint}>No demands. That's almost more worrying.</p>
            </Panel>
          )}
          {demands.map((d) => {
            const isGranted = granted[d.id] ?? true;
            return (
              <Panel key={d.id} className={cx(styles.demand, !isGranted && styles.deniedCard)}>
                <div className={styles.demandHead}>
                  <span className={styles.demandLabel}>{d.label}</span>
                  <Weight n={d.weight} />
                </div>
                <p className={styles.detail}>{d.detail}</p>
                <div className={styles.toggle}>
                  <button
                    className={cx(styles.toggleBtn, isGranted && styles.grantOn)}
                    onClick={() => setGranted({ ...granted, [d.id]: true })}
                  >
                    GRANT
                  </button>
                  <button
                    className={cx(styles.toggleBtn, !isGranted && styles.denyOn)}
                    onClick={() => setGranted({ ...granted, [d.id]: false })}
                  >
                    DENY · −{6 * d.weight} VISION
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
        <Panel tone={risk > 0.3 ? "danger" : "default"} className={styles.footerPanel}>
          <div className={styles.riskRow}>
            <span className={styles.riskLabel}>
              <IconWarning size={13} /> WALK-AWAY RISK
            </span>
            <div className={styles.riskTrack}>
              <div style={{ width: `${risk * 100}%` }} />
            </div>
            <b>{Math.round(risk * 100)}%</b>
          </div>
          <div className={styles.signRow}>
            <StatChip
              icon={<IconMoney size={13} />}
              value={fmtMoney(director.salary)}
              label="fee"
              color="var(--stat-money)"
            />
            {grantedCost > 0 && (
              <StatChip
                icon={<IconMoney size={13} />}
                value={`≥${fmtMoney(grantedCost)}`}
                label="budget floor"
              />
            )}
            <Button onClick={() => onSign(decisions)} disabled={game.studio.cash < director.salary}>
              SIGN {director.name.split(" ")[0].toUpperCase()}
            </Button>
          </div>
        </Panel>
      </div>
      <div className={styles.sheetRight}>
        <DistributionPanel estimate={estimate} />
      </div>
    </div>
  );
}
