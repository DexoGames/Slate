import { useMemo, useState } from "react";
import { TRAIT_LABELS } from "../../data/archetypes";
import { DualBar, Panel, SectionTitle, StatChip } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { DistributionPanel } from "../../components/DistributionPanel/DistributionPanel";
import { estimateOutcomes } from "../../engine/distribution";
import { makeCastSlot } from "../../engine/negotiation";
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
  onCast: (cast: CastSlot[]) => void;
  onBack: () => void;
}) {
  const [picks, setPicks] = useState<Record<string, CastRole>>({});
  const [backendPct, setBackendPct] = useState<Record<string, number>>({});

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

  const draft: Film = useMemo(() => ({ ...film, cast }), [film, cast]);
  const director = directorOf(game, film);
  const estimate = useMemo(
    () => estimateOutcomes(draft, director, game.rivals),
    [draft, director, game.rivals],
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
        <p className={styles.hint}>
          <b style={{ color: "var(--stat-money)" }}>APPEAL</b> sells tickets no matter
          what's on screen. <b style={{ color: "var(--stat-critic)" }}>CRAFT</b> is what
          critics remember. Almost nobody has both — those who do know what they're worth.
        </p>
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
                    </h4>
                    <span className={styles.arch}>{a.archetype}</span>
                  </div>
                  <span className={styles.salary}>{fmtMoney(a.salary)}</span>
                </div>
                <DualBar a={a.appeal} b={a.craft} aLabel="Appeal" bLabel="Craft" />
                <div className={styles.metaRow}>
                  <span className={styles.typecast}>
                    {a.typecast.map((g) => GENRE_LABELS[g]).join(" · ")}
                  </span>
                  {against && (
                    <span className={styles.against} title="Against type: wider acclaim outcomes">
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
                        disabled={roleTaken(role) || game.studio.cash < totalSalary + a.salary}
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
          <Button
            onClick={() => onCast(cast)}
            disabled={!hasLead || !attachedSatisfied || game.studio.cash < totalSalary}
          >
            LOCK THE CAST ({cast.length})
          </Button>
        </Panel>
      </div>
      <div className={styles.right}>
        <DistributionPanel estimate={estimate} />
      </div>
    </div>
  );
}
