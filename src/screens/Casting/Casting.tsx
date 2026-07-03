import { useMemo, useState } from "react";
import { TRAIT_LABELS } from "../../data/archetypes";
import { DualBar, Panel, SectionTitle, StatChip } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { Commitments } from "../../components/Commitments/Commitments";
import { DistributionPanel } from "../../components/DistributionPanel/DistributionPanel";
import { canAfford } from "../../engine/economy";
import { estimateOutcomes } from "../../engine/distribution";
import { franchiseOf } from "../../engine/franchise";
import { castChemistry, makeCastSlot } from "../../engine/negotiation";
import { careerPhase } from "../../engine/generate/people";
import { perceivedDirector } from "../../engine/perception";
import { directorOf } from "../../engine/season";
import { GENRE_LABELS } from "../../engine/tuning";
import type { CastRole, CastSlot, Film, GameState } from "../../engine/types";
import { IconDice, IconHandshake, IconMoney } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./Casting.module.css";

const ROLES: CastRole[] = ["lead", "colead", "support"];

export function Casting({
  game,
  film,
  onCast,
  onBack,
}: {
  game: GameState;
  film: Film;
  onCast: (cast: CastSlot[], contractActorIds: string[]) => void;
  onBack: () => void;
}) {
  const [picks, setPicks] = useState<Record<string, CastRole>>({});
  const [backendPct, setBackendPct] = useState<Record<string, number>>({});
  const [contractIds, setContractIds] = useState<Set<string>>(new Set());

  const attachedDemand = film.demands.find(
    (d) => d.granted && d.demand.kind === "attached-actor",
  )?.demand.actorId;

  const cast: CastSlot[] = useMemo(() => {
    return Object.entries(picks)
      .map(([actorId, role]) => {
        const actor = game.market.actors.find((a) => a.id === actorId);
        if (!actor) return null;
        return makeCastSlot(actor, film, role, backendPct[actorId] ?? 0);
      })
      .filter((c): c is CastSlot => c !== null);
  }, [picks, backendPct, game.market.actors, film]);

  // chemistry reveals itself once two names are on the call sheet
  const chemistry = useMemo(() => castChemistry(game.seed, cast), [game.seed, cast]);
  const draft: Film = useMemo(
    () => ({ ...film, cast, castChemistry: chemistry }),
    [film, cast, chemistry],
  );
  const director = perceivedDirector(game, directorOf(game, film));
  const estimate = useMemo(
    () => estimateOutcomes(draft, director, game.rivals, game.trends, franchiseOf(game, film)),
    [draft, director, game, film],
  );

  const totalSalary = cast.reduce((s, c) => s + c.deal.salary, 0);
  const hasLead = cast.some((c) => c.role === "lead");
  const attachedSatisfied = !attachedDemand || cast.some((c) => c.actorId === attachedDemand);
  const roleTaken = (role: CastRole) =>
    role !== "support" && Object.values(picks).includes(role);

  const sorted = [...game.market.actors].sort((a, b) => b.fame - a.fame);

  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <div className={styles.head}>
          <SectionTitle>
            CASTING “{film.title.toUpperCase()}” · {GENRE_LABELS[film.genre].toUpperCase()}
          </SectionTitle>
          <Button variant="secondary" onClick={onBack}>
            ← Film
          </Button>
        </div>
        {attachedDemand && !attachedSatisfied && (
          <Panel tone="danger" className={styles.warn}>
            You promised {game.market.actors.find((a) => a.id === attachedDemand)?.name ?? "someone"} a
            role. Cast them, or this deal collapses.
          </Panel>
        )}
        <div className={styles.actors}>
          {sorted.map((a) => {
            const picked = picks[a.id];
            const against = !a.typecast.includes(film.genre) && !a.traits.includes("chameleon");
            const backend = backendPct[a.id] ?? 0;
            const isAttached = a.id === attachedDemand;
            return (
              <Panel key={a.id} className={cx(styles.card, picked && styles.picked)}>
                <div className={styles.cardHead}>
                  <div>
                    <h4 className={styles.name}>
                      {a.name}
                      {isAttached && <span className={styles.attached}> · ATTACHED</span>}
                      {game.studio.contracts[a.id] && (
                        <span className={styles.attached}> · UNDER CONTRACT</span>
                      )}
                    </h4>
                    <span className={styles.arch}>{a.archetype}</span>
                  </div>
                  <span className={styles.salary}>
                    {fmtMoney(game.studio.contracts[a.id]?.salary ?? a.salary)}
                  </span>
                </div>
                <DualBar a={a.appeal} b={a.craft} aLabel="Appeal" bLabel="Craft" />
                <div className={styles.metaRow}>
                  <span className={styles.typecast}>
                    {a.typecast.map((g) => GENRE_LABELS[g]).join(" · ")}
                  </span>
                  <span className={styles.fanChip} title={`Fanbase: ${a.fanbase} · career: ${careerPhase(a)}`}>
                    {a.fanbase.toUpperCase()} · {careerPhase(a).toUpperCase()}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.rangeChip} title="Range — how well they play against type">
                    RANGE {a.range}
                  </span>
                  {against && (
                    <span
                      className={styles.against}
                      title={`Against type: wider outcomes; payoff scales with range (${a.range})`}
                    >
                      <IconDice size={11} /> AGAINST TYPE
                    </span>
                  )}
                </div>
                {a.traits.length > 0 && (
                  <div className={styles.traits}>
                    {a.traits.map((t) => (
                      <span key={t} title={TRAIT_LABELS[t].blurb}>
                        {TRAIT_LABELS[t].label}
                      </span>
                    ))}
                  </div>
                )}
                {picked ? (
                  <>
                    {!game.studio.contracts[a.id] && (
                      <label className={styles.contract}>
                        <input
                          type="checkbox"
                          checked={contractIds.has(a.id)}
                          onChange={(e) => {
                            const next = new Set(contractIds);
                            if (e.target.checked) next.add(a.id);
                            else next.delete(a.id);
                            setContractIds(next);
                          }}
                        />
                        2-FILM DEAL · −10% now, rate locked, rivals locked out
                      </label>
                    )}
                    <div className={styles.dealRow}>
                      <span className={styles.dealLabel}>
                        <IconHandshake size={12} /> DEAL
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.min(80, a.backendAppetite)}
                        step={10}
                        value={backend}
                        onChange={(e) =>
                          setBackendPct({ ...backendPct, [a.id]: Number(e.target.value) })
                        }
                        className={styles.slider}
                      />
                    </div>
                    <div className={styles.dealSplit}>
                      <span>
                        {fmtMoney(a.salary * (1 - backend / 100))} <em>now</em>
                      </span>
                      <span>
                        {Math.round((backend / 100) * (a.salary / 2) * 10) / 10} <em>backend pts</em>
                      </span>
                    </div>
                    <div className={styles.roleBtns}>
                      <button
                        className={styles.unpick}
                        onClick={() => {
                          const next = { ...picks };
                          delete next[a.id];
                          setPicks(next);
                        }}
                      >
                        DROP · {picked.toUpperCase()}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.roleBtns}>
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        className={styles.roleBtn}
                        disabled={roleTaken(role) || !canAfford(game, totalSalary + a.salary)}
                        onClick={() => setPicks({ ...picks, [a.id]: role })}
                      >
                        {role.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
        <Panel className={styles.footer}>
          <StatChip
            icon={<IconMoney size={13} />}
            value={fmtMoney(totalSalary)}
            label="total salaries"
            color="var(--stat-money)"
          />
          {cast.length >= 2 && (
            <StatChip
              icon={<IconHandshake size={13} />}
              value={chemistry > 0 ? `+${chemistry}` : chemistry}
              label="chemistry"
              color={chemistry >= 0 ? "var(--stat-money)" : "var(--danger)"}
              title="How these people read together on screen — you only learn it once they're cast"
            />
          )}
          <Button
            onClick={() => onCast(cast, [...contractIds])}
            disabled={!hasLead || !attachedSatisfied || !canAfford(game, totalSalary)}
          >
            LOCK THE CAST ({cast.length})
          </Button>
        </Panel>
      </div>
      <div className={styles.right}>
        <DistributionPanel estimate={estimate} />
        <Commitments game={game} film={draft} overrides={{ extraTalent: totalSalary }} />
      </div>
    </div>
  );
}
