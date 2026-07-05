import { useMemo, useState } from "react";
import { TRAIT_LABELS } from "../../data/archetypes";
import { BandBar, Panel, SectionTitle, StatChip } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { Commitments } from "../../components/Commitments/Commitments";
import { DistributionPanel } from "../../components/DistributionPanel/DistributionPanel";
import { canAfford } from "../../engine/economy";
import { estimateOutcomes } from "../../engine/distribution";
import { franchiseOf } from "../../engine/franchise";
import {
  castChemistry,
  isPairKnown,
  makeCastSlot,
  pairChemistryValue,
  pitchOutcome,
} from "../../engine/negotiation";
import { careerPhase, starTier } from "../../engine/generate/people";
import { actorReputationOf, perceivedDirector, perceivedFilm } from "../../engine/perception";
import { filmsTogether } from "../../engine/roster";
import { directorOf } from "../../engine/season";
import { GENRE_LABELS, TUNING } from "../../engine/tuning";
import type { CastRole, CastSlot, Film, GameState } from "../../engine/types";
import { IconDice, IconFlame, IconMoney } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./Casting.module.css";

const ROLES: CastRole[] = ["lead", "colead", "support"];
const ROLE_W = (r: CastRole) => (r === "lead" ? 0.6 : r === "colead" ? 0.25 : 0.15);

export function Casting({
  game,
  film,
  onCast,
  onBack,
  onScreenTest,
  onChemistryRead,
}: {
  game: GameState;
  film: Film;
  onCast: (cast: CastSlot[], contractActorIds: string[]) => void;
  onBack: () => void;
  onScreenTest: (actorId: string) => void;
  onChemistryRead: (aId: string, bId: string) => void;
}) {
  const [picks, setPicks] = useState<Record<string, CastRole>>({});
  const [contractIds, setContractIds] = useState<Set<string>>(new Set());
  const [pitched, setPitched] = useState<Record<string, boolean>>({});
  const [overpay, setOverpay] = useState<Record<string, boolean>>({});

  const attachedDemand = film.demands.find(
    (d) => d.granted && d.demand.kind === "attached-actor",
  )?.demand.actorId;

  const cast: CastSlot[] = useMemo(() => {
    return Object.entries(picks)
      .map(([actorId, role]) => {
        const actor = game.market.actors.find((a) => a.id === actorId);
        if (!actor) return null;
        // backend points are retired from the casting flow — you pay cash now (§UI)
        return makeCastSlot(actor, film, role, 0, {
          state: game,
          pitched: pitched[actorId],
          overpay: overpay[actorId],
        });
      })
      .filter((c): c is CastSlot => c !== null);
  }, [picks, pitched, overpay, game, film]);

  // the forecast sees PERCEIVED craft — the gap to the true roll is the payoff
  const chemistry = useMemo(() => castChemistry(game, cast), [game, cast]);
  const draft: Film = useMemo(
    () => ({ ...film, cast, castChemistry: chemistry }),
    [film, cast, chemistry],
  );
  const director = perceivedDirector(game, directorOf(game, film));
  const estimate = useMemo(
    () => estimateOutcomes(perceivedFilm(game, draft), director, game.rivals, game.trends, franchiseOf(game, film)),
    [draft, director, game],
  );

  const totalSalary = cast.reduce((s, c) => s + c.deal.salary, 0);
  const hasLead = cast.some((c) => c.role === "lead");
  const attachedSatisfied = !attachedDemand || cast.some((c) => c.actorId === attachedDemand);
  const roleTaken = (role: CastRole) =>
    role !== "support" && Object.values(picks).includes(role);

  const passionAvg = useMemo(() => {
    if (cast.length === 0) return 0;
    let ws = 0;
    let wt = 0;
    for (const c of cast) {
      ws += c.passion * ROLE_W(c.role);
      wt += ROLE_W(c.role);
    }
    return Math.round(ws / wt);
  }, [cast]);

  // billed pairs among the picked cast, with their (possibly hidden) chemistry
  const pickedPairs = useMemo(() => {
    const out: { aId: string; bId: string; aName: string; bName: string; value: number; known: boolean }[] = [];
    for (let i = 0; i < cast.length; i++) {
      for (let j = i + 1; j < cast.length; j++) {
        out.push({
          aId: cast[i].actorId,
          bId: cast[j].actorId,
          aName: cast[i].actorName,
          bName: cast[j].actorName,
          value: pairChemistryValue(game, cast[i].actorId, cast[j].actorId),
          known: isPairKnown(game, cast[i].actorId, cast[j].actorId),
        });
      }
    }
    return out;
  }, [cast, game]);

  const genre = film.genre;
  const scored = game.market.actors
    .map((a) => {
      const attached = a.id === attachedDemand;
      const contracted = !!game.studio.contracts[a.id];
      const suited = a.typecast.includes(genre);
      return {
        a,
        attached,
        contracted,
        suited,
        marquee: a.fame >= 75,
        score:
          (attached ? 10000 : 0) +
          (contracted ? 4000 : 0) +
          (suited ? 1500 : 0) +
          a.fame * 5 +
          a.appeal,
      };
    })
    .sort((x, y) => y.score - x.score);

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
        <p className={styles.hint}>
          Appeal is public; <b>craft is an estimate</b> until you've worked with them
          (or paid for a screen test). The narrower the band, the better you know them.
        </p>
        <div className={styles.actors}>
          {scored.map(({ a, attached, contracted, suited, marquee }) => {
            const picked = picks[a.id];
            const against = !suited && !a.traits.includes("chameleon");
            const stars = starTier(a.appeal);
            const rep = actorReputationOf(game, a);
            const rel = game.studio.relationships[a.id] ?? 0;
            const together = filmsTogether(game, a.id);
            const prospect = (a.growth ?? 0) >= 60 && a.age <= TUNING.growth.youngAge;
            // a known-good partner already on the call sheet
            const clicksWith = cast.find(
              (c) => c.actorId !== a.id && isPairKnown(game, a.id, c.actorId) && pairChemistryValue(game, a.id, c.actorId) > TUNING.chemistry.deadZone,
            );
            const pitchWon = pitchOutcome(game.seed, film.id, a.id);
            const slot = cast.find((c) => c.actorId === a.id);
            return (
              <Panel
                key={a.id}
                className={cx(
                  styles.card,
                  marquee && styles.marquee,
                  attached && styles.attachedCard,
                  picked && styles.picked,
                )}
              >
                {(attached || contracted || suited || prospect) && (
                  <span
                    className={cx(
                      styles.ribbon,
                      attached
                        ? styles.ribbonWanted
                        : contracted
                          ? styles.ribbonOwned
                          : prospect
                            ? styles.ribbonProspect
                            : styles.ribbonSuit,
                    )}
                  >
                    {attached
                      ? "★ WANTED"
                      : contracted
                        ? "UNDER CONTRACT"
                        : prospect
                          ? "PROSPECT"
                          : `SUITS ${GENRE_LABELS[genre].toUpperCase()}`}
                  </span>
                )}
                <div className={styles.cardHead}>
                  <div className={styles.headMain}>
                    <h4 className={styles.name}>{a.name}</h4>
                    <span className={styles.arch}>{a.archetype}</span>
                  </div>
                  <div className={styles.headRight}>
                    <span
                      className={styles.starPips}
                      title={`Star power ${stars}/5 — box-office draw (appeal is public)`}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <i key={i} className={cx(styles.starPip, i < stars && styles.starPipOn)} />
                      ))}
                    </span>
                    <span className={styles.salary}>
                      {fmtMoney(game.studio.contracts[a.id]?.salary ?? a.salary)}
                    </span>
                  </div>
                </div>
                <BandBar
                  label="Craft"
                  est={rep.craftEst}
                  band={rep.band}
                  color="var(--stat-critic)"
                  hint={rep.knowledge >= 1 ? "Craft (known)" : "Craft, as the town estimates it"}
                />
                <div className={styles.miniRow}>
                  <span
                    className={styles.expMeter}
                    title={`Experience ${a.experience}/100 — the more experienced, the tighter the read on their hidden stats (star power is always public)`}
                  >
                    <span className={styles.expLabel}>EXP</span>
                    <span className={styles.expTrack}>
                      <i style={{ width: `${a.experience}%` }} />
                    </span>
                  </span>
                  <span className={styles.rangeChip} title="Range: how well they play against type">
                    RANGE {rep.knowledge >= 1 ? a.range : `~${rep.rangeEst}`}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.typecast}>
                    {a.typecast.map((g) => GENRE_LABELS[g]).join(" · ")}
                  </span>
                  <span className={styles.fanTag}>
                    {a.fanbase.toUpperCase()} · {careerPhase(a).toUpperCase()}
                  </span>
                </div>
                {(rel > 0 || together > 0 || clicksWith || against) && (
                  <div className={styles.tagRow}>
                    {(rel > 0 || together > 0) && (
                      <span className={styles.rapport} title="Your rapport / films together">
                        <span className={styles.heart}>♥{rel > 0 ? `+${rel}` : rel}</span>
                        {together > 0 && ` ${together}f`}
                      </span>
                    )}
                    {clicksWith && (
                      <span className={styles.clicksTag} title={`Clicks with ${clicksWith.actorName}`}>
                        ⚡ {clicksWith.actorName.split(" ")[0]}
                      </span>
                    )}
                    {against && (
                      <span className={styles.against} title="Against type: wider results, payoff scales with range">
                        <IconDice size={10} /> AGAINST
                      </span>
                    )}
                  </div>
                )}
                {a.traits.length > 0 && (
                  <div className={styles.traits}>
                    {a.traits.map((t) => (
                      <span key={t} title={TRAIT_LABELS[t].blurb}>
                        {TRAIT_LABELS[t].label}
                      </span>
                    ))}
                  </div>
                )}
                {/* fixed-height action area: the ONLY thing that changes on select,
                    and its height is reserved so picking never shifts the row (§UI) */}
                <div className={styles.actionArea}>
                  {picked ? (
                    <>
                      <div className={styles.passionRow}>
                        <span className={styles.passionLabel}>
                          <IconFlame size={11} /> PASSION
                        </span>
                        <span className={styles.passionPips}>
                          {Array.from({ length: 5 }, (_, i) => {
                            const pv = slot?.passion ?? 20;
                            return (
                              <i
                                key={i}
                                className={cx(styles.passionPip, i < Math.round(pv / 20) && styles.passionPipOn)}
                              />
                            );
                          })}
                        </span>
                        <label className={cx(styles.sweeten, overpay[a.id] && styles.sweetenOn)} title="Overpay 15% to buy their passion">
                          <input
                            type="checkbox"
                            checked={!!overpay[a.id]}
                            onChange={(e) => setOverpay({ ...overpay, [a.id]: e.target.checked })}
                          />
                          +15%
                        </label>
                      </div>
                      <div className={styles.pickedBtns}>
                        {!pitched[a.id] ? (
                          <button
                            className={styles.pitchBtn}
                            onClick={() => setPitched({ ...pitched, [a.id]: true })}
                            title="Make your case — a gamble on their passion"
                          >
                            PITCH
                          </button>
                        ) : (
                          <span className={cx(styles.pitchResult, pitchWon ? styles.pitchWon : styles.pitchLost)}>
                            {pitchWon ? `+${TUNING.passion.pitchWin}` : `−${TUNING.passion.pitchLose}`}
                          </span>
                        )}
                        {!game.studio.contracts[a.id] && (
                          <label className={cx(styles.contract, contractIds.has(a.id) && styles.contractOn)} title="2-film deal: −10% now, rate locked, rivals locked out">
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
                            2-FILM
                          </label>
                        )}
                        <button
                          className={styles.unpick}
                          onClick={() => {
                            const next = { ...picks };
                            delete next[a.id];
                            setPicks(next);
                          }}
                        >
                          DROP
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {rep.knowledge < 0.5 && (
                        <Button
                          variant="spendMinor"
                          className={styles.screenTest}
                          onClick={() => onScreenTest(a.id)}
                          disabled={!canAfford(game, TUNING.screenTestCost)}
                        >
                          SCREEN TEST · {fmtMoney(TUNING.screenTestCost)}
                        </Button>
                      )}
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
                    </>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
      <div className={styles.right}>
        <Panel className={styles.summary}>
          <SectionTitle>THE CAST</SectionTitle>
          {cast.length === 0 ? (
            <p className={styles.summaryEmpty}>Pick a lead to begin. The forecast updates live.</p>
          ) : (
            <ul className={styles.summaryList}>
              {cast.map((c) => (
                <li key={c.actorId}>
                  <b>{c.actorName}</b> <em>{c.role}</em>
                  <span className={styles.summarySalary}>{fmtMoney(c.deal.salary)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.summaryChips}>
            <StatChip
              icon={<IconMoney size={13} />}
              value={fmtMoney(totalSalary)}
              label="salaries"
              color="var(--stat-money)"
            />
            {cast.length > 0 && (
              <StatChip
                icon={<IconFlame size={13} />}
                value={passionAvg}
                label="passion"
                color="var(--gold)"
                title="Weighted cast passion. Passion raises the ceiling — what's possible, never guaranteed."
              />
            )}
          </div>
          {pickedPairs.length > 0 && (
            <div className={styles.chemPanel}>
              <span className={styles.chemHead}>CHEMISTRY</span>
              {pickedPairs.map((p) => {
                const badge = !p.known
                  ? { label: "? UNTESTED", cls: styles.chemUntested }
                  : p.value > TUNING.chemistry.deadZone
                    ? { label: `⚡ ELECTRIC +${p.value}`, cls: styles.chemGood }
                    : p.value < -TUNING.chemistry.deadZone
                      ? { label: `💥 OIL & WATER ${p.value}`, cls: styles.chemBad }
                      : { label: "— PROFESSIONAL", cls: styles.chemPro };
                return (
                  <div key={`${p.aId}|${p.bId}`} className={styles.chemPair}>
                    <span className={styles.chemNames}>
                      {p.aName.split(" ")[0]} + {p.bName.split(" ")[0]}
                    </span>
                    <span className={cx(styles.chemBadge, badge.cls)}>{badge.label}</span>
                    {!p.known && (
                      <button
                        className={styles.chemRead}
                        disabled={!canAfford(game, TUNING.chemistryReadCost)}
                        onClick={() => onChemistryRead(p.aId, p.bId)}
                      >
                        READ · {fmtMoney(TUNING.chemistryReadCost)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Button
            variant="spend"
            className={styles.lockBtn}
            onClick={() => onCast(cast, [...contractIds])}
            disabled={!hasLead || !attachedSatisfied || !canAfford(game, totalSalary)}
          >
            LOCK THE CAST ({cast.length})
          </Button>
        </Panel>
        <DistributionPanel estimate={estimate} />
        <Commitments game={game} film={draft} overrides={{ extraTalent: totalSalary }} />
      </div>
    </div>
  );
}
