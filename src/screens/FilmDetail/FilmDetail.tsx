import { useMemo, useState } from "react";
import { Panel, SectionTitle, StatChip } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { Commitments } from "../../components/Commitments/Commitments";
import { DistributionPanel } from "../../components/DistributionPanel/DistributionPanel";
import { GenreTitle } from "../../components/GenreTitle/GenreTitle";
import { VisionMeter } from "../../components/VisionMeter/VisionMeter";
import { StagePips } from "../../components/StagePips/StagePips";
import { canAfford, estimateCommitments } from "../../engine/economy";
import { estimateOutcomes } from "../../engine/distribution";
import { franchiseOf } from "../../engine/franchise";
import { filmNeedsAction } from "../../engine/needs";
import { perceivedDirector } from "../../engine/perception";
import { directorOf } from "../../engine/season";
import { GENRE_LABELS, GENRE_NORMS, TUNING } from "../../engine/tuning";
import { computeHype } from "../../engine/publicity";
import type {
  DeRiskingState,
  Film,
  GameState,
  Posture,
  ReleaseStrategy,
  SeasonStamp,
} from "../../engine/types";
import { filmVision } from "../../engine/vision";
import {
  IconActor,
  IconCalendar,
  IconCamera,
  IconDirector,
  IconFlame,
  IconMegaphone,
  IconMoney,
  IconScissors,
  IconScript,
  IconShield,
  IconWriter,
} from "../../icons";
import { fmtMoney, SEASON_NAMES } from "../../lib/format";
import { genreColor } from "../../lib/genreColor";
import { cx } from "../../lib/cx";
import styles from "./FilmDetail.module.css";

interface Props {
  game: GameState;
  film: Film;
  onBack: () => void;
  onNegotiate: () => void;
  onCasting: () => void;
  onRewrite: (byFixer: boolean) => void;
  onAbandon: () => void;
  onGreenlight: (budget: number, days: number, bond: boolean) => void;
  onSchedule: (
    dr: DeRiskingState,
    marketing: number,
    season: SeasonStamp,
    strategy: ReleaseStrategy,
    posture: Posture,
  ) => void;
  onFestival: () => void;
}

export function FilmDetail(props: Props) {
  const { film } = props;
  if (film.stage === "development") return <Development {...props} />;
  if (film.stage === "post") return <Post {...props} />;
  return <Status {...props} />;
}

// ---------------------------------------------------------------- development

function Development({
  game,
  film,
  onBack,
  onNegotiate,
  onCasting,
  onRewrite,
  onAbandon,
  onGreenlight,
}: Props) {
  const norm = GENRE_NORMS[film.genre];
  const floor = film.demands.find((d) => d.granted && d.demand.kind === "budget-floor")
    ?.demand.budgetFloor;
  const minDays = film.demands.find((d) => d.granted && d.demand.kind === "shooting-days")
    ?.demand.days;
  const [budget, setBudget] = useState(() => Math.max(film.budget, floor ?? 0));
  const [days, setDays] = useState(() => Math.max(film.shootingDays, minDays ?? 0));
  const [bond, setBond] = useState(false);

  const draft = useMemo(
    () => ({ ...film, budget, shootingDays: days }),
    [film, budget, days],
  );
  const director = perceivedDirector(game, directorOf(game, film));
  const estimate = useMemo(
    () => estimateOutcomes(draft, director, game.rivals, game.trends, franchiseOf(game, film)),
    [draft, director, game.rivals, game.trends],
  );

  const bondCost = bond ? Math.round(budget * TUNING.completionBondPct * 10) / 10 : 0;
  const canGreenlight = !!film.directorId && film.cast.length > 0;
  const total = budget + bondCost;
  const commitments = estimateCommitments(game, film, {
    budget: budget + bondCost,
    marketing: Math.round(budget * 0.4),
  });
  const passes = film.script.rewrites.length;
  const nextPassIdx = Math.min(passes, TUNING.rewriteCoherence.length - 1);
  const nextCoh = TUNING.rewriteCoherence[nextPassIdx];

  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Header film={film} onBack={onBack} />
        <Panel className={styles.block}>
          <SectionTitle>
            <IconScript size={12} /> SCRIPT
          </SectionTitle>
          <p className={styles.logline}>{film.script.logline}</p>
          <div className={styles.chipRow}>
            <StatChip icon={<IconWriter size={13} />} value={film.script.writerName} />
            <StatChip icon={<span />} value={film.script.hook} label="hook" color="var(--stat-crowd)" />
            <StatChip icon={<span />} value={film.script.ambition} label="ambition" color="var(--stat-critic)" />
            <StatChip icon={<span />} value={film.script.coherence} label="coherence" />
          </div>
          <div className={styles.rewriteRow}>
            <Button
              variant="spendMinor"
              onClick={() => onRewrite(false)}
              disabled={!canAfford(game, TUNING.rewriteCostOriginal)}
            >
              NOTES PASS · {fmtMoney(TUNING.rewriteCostOriginal)}
            </Button>
            <Button
              variant="spendMinor"
              onClick={() => onRewrite(true)}
              disabled={!canAfford(game, TUNING.rewriteCostFixer)}
            >
              BRING A FIXER · {fmtMoney(TUNING.rewriteCostFixer)}
            </Button>
            <span className={styles.rewriteHint}>
              {passes === 0
                ? "A first pass usually sharpens (+coherence, +hook)."
                : `Pass ${passes + 1}: ${nextCoh > 0 ? "+" : ""}${nextCoh} coherence. The stack is the trap.`}
            </span>
          </div>
        </Panel>

        <div className={styles.pair}>
          <Panel className={cx(styles.block, !film.directorId && styles.todo)}>
            <SectionTitle>
              <IconDirector size={12} /> DIRECTOR
            </SectionTitle>
            {film.directorId ? (
              <p className={styles.slotName}>{film.directorName}</p>
            ) : (
              <Button onClick={onNegotiate}>FIND A DIRECTOR</Button>
            )}
            {film.demands.length > 0 && (
              <ul className={styles.demandList}>
                {film.demands.map((d) => (
                  <li key={d.demand.id} className={cx(!d.granted && styles.deniedLine)}>
                    {d.granted ? "✓" : "✗"} {d.demand.label}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel className={cx(styles.block, film.cast.length === 0 && styles.todo)}>
            <SectionTitle>
              <IconActor size={12} /> CAST
            </SectionTitle>
            {film.cast.length > 0 ? (
              <ul className={styles.castList}>
                {film.cast.map((c) => (
                  <li key={c.actorId}>
                    <b>{c.actorName}</b> <em>{c.role}</em>
                    {c.againstType && <span className={styles.againstTag}>AGAINST TYPE</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <Button onClick={onCasting} disabled={!film.directorId}>
                {film.directorId ? "CAST THE FILM" : "DIRECTOR FIRST"}
              </Button>
            )}
          </Panel>
        </div>

        <Panel className={styles.block}>
          <SectionTitle>
            <IconCamera size={12} /> THE NUMBERS
          </SectionTitle>
          <SliderRow
            label="BUDGET"
            value={budget}
            min={Math.max(2, Math.round(norm.budget * 0.3))}
            max={Math.round(norm.budget * 2.2)}
            step={1}
            onChange={setBudget}
            fmt={(v) => fmtMoney(v)}
            marks={[
              { at: norm.budget, label: "genre norm" },
              ...(floor ? [{ at: floor, label: "promised floor" }] : []),
            ]}
            floor={floor}
          />
          <SliderRow
            label="SHOOTING DAYS"
            value={days}
            min={Math.round(norm.days * 0.5)}
            max={Math.round(norm.days * 1.5)}
            step={1}
            onChange={setDays}
            fmt={(v) => `${v}d`}
            marks={[
              { at: norm.days, label: "genre norm" },
              ...(minDays ? [{ at: minDays, label: "promised days" }] : []),
            ]}
            floor={minDays}
          />
          <label className={styles.bond}>
            <input type="checkbox" checked={bond} onChange={(e) => setBond(e.target.checked)} />
            <IconShield size={13} />
            COMPLETION BOND · {fmtMoney(budget * TUNING.completionBondPct)} — the one hedge
            that costs no vision
          </label>
          <div className={styles.greenlightRow}>
            <StatChip
              icon={<IconMoney size={13} />}
              value={fmtMoney(total)}
              label="to greenlight"
              color="var(--stat-money)"
            />
            <Button
              variant="spend"
              onClick={() => onGreenlight(budget, days, bond)}
              disabled={!canGreenlight || !canAfford(game, total)}
            >
              GREENLIGHT ▸
            </Button>
          </div>
          <p
            className={cx(
              styles.greenlightProjection,
              commitments.cashAfter < 0 && styles.projectionWarn,
            )}
          >
            cash after release spend ≈ {fmtMoney(commitments.cashAfter)}
            {commitments.cashAfter < 0 && " (credit)"}
          </p>
          {!canGreenlight && (
            <p className={styles.greenlightHint}>Needs a director and a cast first.</p>
          )}
        </Panel>

        <button className={styles.abandon} onClick={onAbandon}>
          PUT “{film.title.toUpperCase()}” IN TURNAROUND (script cost is sunk)
        </button>
      </div>
      <div className={styles.right}>
        <DistributionPanel estimate={estimate} />
        <Commitments
          game={game}
          film={film}
          overrides={{ budget: budget + bondCost, marketing: Math.round(budget * 0.4) }}
        />
        <Panel>
          <VisionMeter
            value={filmVision(film)}
            threshold={TUNING.vpEligibleAt}
            ledger={film.visionLedger}
            big
          />
        </Panel>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
  marks,
  floor,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
  marks: { at: number; label: string }[];
  floor?: number;
}) {
  const belowFloor = floor !== undefined && value < floor;
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderHead}>
        <span className={styles.sliderLabel}>{label}</span>
        <b className={cx(belowFloor && styles.belowFloor)}>{fmt(value)}</b>
      </div>
      <div className={styles.sliderTrackWrap}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.marks}>
          {marks.map((m) => (
            <span
              key={m.label}
              className={styles.mark}
              style={{ left: `${((m.at - min) / (max - min)) * 100}%` }}
              title={m.label}
            />
          ))}
        </div>
      </div>
      <div className={styles.markLabels}>
        {marks.map((m) => (
          <span key={m.label}>
            ▲ {m.label}: {fmt(m.at)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- post & release

function Post({ game, film, onBack, onSchedule, onAbandon, onFestival }: Props) {
  const noTests = film.demands.some(
    (d) => d.granted && d.demand.kind === "no-test-screenings",
  );
  const [dr, setDr] = useState<DeRiskingState>(film.deRisking);
  const [marketing, setMarketing] = useState(Math.round(film.budget * 0.4));
  const [strategy, setStrategy] = useState<ReleaseStrategy>("wide");
  const [posture, setPosture] = useState<Posture>("standard");
  const [seasonOffset, setSeasonOffset] = useState(1);

  const windows: SeasonStamp[] = Array.from({ length: 4 }, (_, i) => {
    const idx = game.clock.year * 4 + game.clock.season + i + 1;
    return { year: Math.floor(idx / 4), season: (idx % 4) as 0 | 1 | 2 | 3 };
  });
  const chosen = windows[seasonOffset - 1];

  const draft: Film = useMemo(
    () => ({
      ...film,
      deRisking: dr,
      marketing,
      release: { season: chosen, strategy, posture },
    }),
    [film, dr, marketing, chosen, strategy, posture],
  );
  const hype = computeHype(draft, posture, marketing, franchiseOf(game, film));
  const director = perceivedDirector(game, directorOf(game, film));
  const estimate = useMemo(
    () => estimateOutcomes(draft, director, game.rivals, game.trends, franchiseOf(game, film)),
    [draft, director, game.rivals, game.trends],
  );

  const t = TUNING;
  let cost = marketing * t.hype.postureCost[posture];
  if (dr.testScreeningHeld) cost += t.testScreeningCost;
  if (dr.notesImplemented === "minor") cost += t.notesCost.minor;
  if (dr.notesImplemented === "major") cost += t.notesCost.major;
  if (dr.studioReshoots) cost += film.budget * t.reshootsBudgetPct;
  if (dr.focusMarketing) cost += marketing * t.focusMarketingPct;
  cost = Math.round(cost * 10) / 10;

  const competition = game.rivals.flatMap((r) =>
    r.slate.filter(
      (f) =>
        !f.released &&
        f.releaseSeason.year === chosen.year &&
        f.releaseSeason.season === chosen.season,
    ),
  );

  const tool = (
    label: string,
    desc: string,
    active: boolean,
    disabled: boolean,
    onToggle: () => void,
    vp: number,
    costLabel: string,
  ) => (
    <button
      className={cx(styles.tool, active && styles.toolOn, disabled && styles.toolDisabled)}
      onClick={onToggle}
      disabled={disabled}
    >
      <span className={styles.toolLabel}>
        <IconScissors size={12} /> {label}
      </span>
      <span className={styles.toolDesc}>{desc}</span>
      <span className={styles.toolCost}>
        {costLabel}
        {vp !== 0 && <b> · {vp} VISION</b>}
      </span>
    </button>
  );

  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Header film={film} onBack={onBack} />
        <Panel className={styles.block}>
          <SectionTitle>
            <IconScissors size={12} /> THE SAFETY TOOLBOX
          </SectionTitle>
          <p className={styles.hint}>
            Every tool narrows the release roll — and chips the film's vision. The
            legacy roll cannot be narrowed by anything.
          </p>
          {noTests && (
            <p className={styles.noTests}>
              You granted “no test screenings.” The toolbox is lighter here.
            </p>
          )}
          <div className={styles.tools}>
            {tool(
              "TEST SCREENING",
              "Watch a mall audience watch your film. Information only.",
              dr.testScreeningHeld,
              noTests,
              () =>
                setDr({
                  ...dr,
                  testScreeningHeld: !dr.testScreeningHeld,
                  notesImplemented: "none",
                }),
              0,
              fmtMoney(t.testScreeningCost),
            )}
            {dr.testScreeningHeld &&
              tool(
                "IMPLEMENT MINOR NOTES",
                "Trim what confused them.",
                dr.notesImplemented === "minor",
                noTests,
                () =>
                  setDr({
                    ...dr,
                    notesImplemented: dr.notesImplemented === "minor" ? "none" : "minor",
                  }),
                t.vpNotesMinor,
                fmtMoney(t.notesCost.minor),
              )}
            {dr.testScreeningHeld &&
              tool(
                "MAJOR RECUT",
                "New ending. The one they clapped for.",
                dr.notesImplemented === "major",
                noTests,
                () =>
                  setDr({
                    ...dr,
                    notesImplemented: dr.notesImplemented === "major" ? "none" : "major",
                  }),
                t.vpNotesMajor,
                fmtMoney(t.notesCost.major),
              )}
            {tool(
              "STUDIO RESHOOTS",
              "Fix it in more photography.",
              dr.studioReshoots,
              false,
              () => setDr({ ...dr, studioReshoots: !dr.studioReshoots }),
              t.vpStudioReshoots,
              fmtMoney(film.budget * t.reshootsBudgetPct),
            )}
            {tool(
              "FOCUS-GROUP MARKETING",
              "Sell the film a committee would have made.",
              dr.focusMarketing,
              false,
              () => setDr({ ...dr, focusMarketing: !dr.focusMarketing }),
              t.vpFocusMarketing,
              `+20% of P&A`,
            )}
          </div>
        </Panel>

        <Panel className={styles.block}>
          <SectionTitle>
            <IconMegaphone size={12} /> MARKETING & RELEASE
          </SectionTitle>
          <SliderRow
            label="P&A SPEND"
            value={marketing}
            min={1}
            max={Math.round(film.budget * 1.5) + 5}
            step={1}
            onChange={setMarketing}
            fmt={fmtMoney}
            marks={[{ at: Math.round(film.budget * 0.5), label: "half the budget" }]}
          />
          <div className={styles.strategies}>
            {(["wide", "platform", "streaming"] as const).map((s) => (
              <button
                key={s}
                className={cx(styles.strategy, strategy === s && styles.strategyOn)}
                onClick={() => setStrategy(s)}
              >
                <b>{s.toUpperCase()}</b>
                <span>
                  {s === "wide" && "Full theatrical swing. Highest ceiling, real floor."}
                  {s === "platform" && "Slow burn for critics. Capped opening, +critics."}
                  {s === "streaming" && `Flat sale ≈ ${fmtMoney(film.budget * t.streamingSaleMult)}. No upside. −${Math.abs(t.vpStreamingDump)} vision.`}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.strategies}>
            {(["quiet", "standard", "event"] as const).map((p) => (
              <button
                key={p}
                className={cx(styles.strategy, posture === p && styles.strategyOn)}
                onClick={() => setPosture(p)}
              >
                <b>{p.toUpperCase()}</b>
                <span>
                  {p === "quiet" && "Sneak it out. Cheap P&A, low bar — over-deliver and the legs are yours."}
                  {p === "standard" && "A normal campaign. The film is judged as itself."}
                  {p === "event" && "Promise the world (+25% P&A). Big opening — and a bar the film had better clear."}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.hypeRow}>
            <span className={styles.hypeLabel}>
              <IconFlame size={13} /> HYPE {hype}
            </span>
            <span className={styles.hypeBar}>
              <i style={{ width: `${hype}%` }} />
            </span>
            <span className={styles.hypeNote}>
              crowds will judge it against ≈{Math.round(t.hype.expectationBase + hype / t.hype.expectationDiv)}
            </span>
          </div>
          {game.clock.season === 0 && !film.festival && (
            <Button variant="spendMinor" onClick={onFestival}>
              SUBMIT TO THE MERIDIAN FESTIVAL · {fmtMoney(t.festival.entryCost)} (screens in spring)
            </Button>
          )}
          {film.festival && film.festival !== "submitted" && (
            <p className={styles.festivalLine}>
              MERIDIAN VERDICT: {film.festival === "golden" ? "GOLDEN MERIDIAN" : film.festival.toUpperCase()}
            </p>
          )}
          {film.festival === "submitted" && (
            <p className={styles.festivalLine}>SUBMITTED TO THE MERIDIAN — SCREENS IN SPRING</p>
          )}
          <div className={styles.windows}>
            {windows.map((w, i) => {
              const comp = game.rivals.flatMap((r) =>
                r.slate.filter(
                  (f) =>
                    !f.released &&
                    f.releaseSeason.year === w.year &&
                    f.releaseSeason.season === w.season,
                ),
              ).length;
              // projected opening in THIS window, all else equal
              const windowEst = estimateOutcomes(
                { ...draft, release: { season: w, strategy, posture } },
                director,
                game.rivals,
                game.trends,
                franchiseOf(game, film),
              );
              return (
                <button
                  key={i}
                  className={cx(styles.window, seasonOffset === i + 1 && styles.windowOn)}
                  onClick={() => setSeasonOffset(i + 1)}
                >
                  <b>
                    {SEASON_NAMES[w.season].toUpperCase()} ’{String(w.year).padStart(2, "0")}
                  </b>
                  <span>
                    ×{TUNING.seasonMult[w.season]} · median {fmtMoney(windowEst.money.median)}
                  </span>
                  <span className={cx(comp > 0 && styles.compWarn)}>
                    {comp === 0 ? "clear window" : `${comp} rival release${comp > 1 ? "s" : ""}`}
                  </span>
                  {w.season === 3 && <span className={styles.awardsTag}>awards window</span>}
                </button>
              );
            })}
          </div>
          <div className={styles.greenlightRow}>
            <StatChip
              icon={<IconMoney size={13} />}
              value={fmtMoney(cost)}
              label="total spend"
              color="var(--stat-money)"
            />
            {competition.length > 0 && (
              <StatChip
                icon={<IconCalendar size={13} />}
                value={competition.map((c) => c.title).join(", ")}
                label="vs"
              />
            )}
            <Button
              variant="spend"
              onClick={() => onSchedule(dr, marketing, chosen, strategy, posture)}
              disabled={!canAfford(game, cost)}
            >
              LOCK THE DATE ▸
            </Button>
          </div>
        </Panel>
        <button className={styles.abandon} onClick={onAbandon}>
          SHELVE IT — WRITE OFF {fmtMoney(film.talentCost + film.budget + film.overruns)}
        </button>
      </div>
      <div className={styles.right}>
        <DistributionPanel estimate={estimate} />
        <Commitments game={game} film={film} overrides={{ marketing: cost }} />
        <Panel>
          <VisionMeter
            value={filmVision(draft)}
            threshold={TUNING.vpEligibleAt}
            ledger={draft.visionLedger}
            big
          />
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- other stages

function Status({ game, film, onBack, onAbandon }: Props) {
  const director = perceivedDirector(game, directorOf(game, film));
  const estimate = useMemo(
    () => estimateOutcomes(film, director, game.rivals, game.trends, franchiseOf(game, film)),
    [film, director, game.rivals, game.trends],
  );
  return (
    <div className={styles.grid}>
      <div className={styles.left}>
        <Header film={film} onBack={onBack} />
        <Panel className={styles.block}>
          <SectionTitle>
            <IconCamera size={12} /> STATUS
          </SectionTitle>
          {film.stage === "production" && (
            <p className={styles.statusLine}>
              Shooting. {film.stageSeasonsLeft} season{film.stageSeasonsLeft > 1 ? "s" : ""} of
              principal photography left.
            </p>
          )}
          {film.stage === "scheduled" && film.release && (
            <p className={styles.statusLine}>
              In the can. Opens {SEASON_NAMES[film.release.season.season]} ’
              {String(film.release.season.year).padStart(2, "0")} ({film.release.strategy}).
            </p>
          )}
          {film.eventHistory.length > 0 && (
            <ul className={styles.eventLog}>
              {film.eventHistory.map((e, i) => (
                <li key={i}>
                  <b>{e.label}</b> — {e.choice === "trust" ? "trusted the filmmaker" : "protected the investment"}{" "}
                  <em>({e.effect})</em>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {(film.stage === "production" || film.stage === "post") && (
          <button className={styles.abandon} onClick={onAbandon}>
            SHUT IT DOWN — WRITE OFF {fmtMoney(film.talentCost + film.budget + film.overruns)}
          </button>
        )}
      </div>
      <div className={styles.right}>
        <DistributionPanel estimate={estimate} />
        <Panel>
          <VisionMeter
            value={filmVision(film)}
            threshold={TUNING.vpEligibleAt}
            ledger={film.visionLedger}
            big
          />
        </Panel>
      </div>
    </div>
  );
}

function Header({ film, onBack }: { film: Film; onBack: () => void }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.genre} style={{ color: genreColor(film.genre) }}>
          {GENRE_LABELS[film.genre].toUpperCase()}
        </span>
        <GenreTitle as="h2" genre={film.genre} className={styles.title}>
          {film.title}
        </GenreTitle>
        {film.directorName && <span className={styles.dirLine}>dir. {film.directorName}</span>}
        <div className={styles.headerPips}>
          <StagePips film={film} needsAction={!!filmNeedsAction(film)} />
        </div>
      </div>
      <Button variant="secondary" onClick={onBack}>
        ← Slate
      </Button>
    </div>
  );
}
