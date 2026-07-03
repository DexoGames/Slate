import { useState } from "react";
import { Panel, SectionTitle } from "../../components/Bits/Bits";
import { Button } from "../../components/Button/Button";
import { VisionMeter } from "../../components/VisionMeter/VisionMeter";
import { legacyTierLabel } from "../../engine/legacy";
import { VERDICT_LABELS } from "../../engine/release";
import { GENRE_LABELS, TUNING } from "../../engine/tuning";
import type { Film, GameState } from "../../engine/types";
import { filmVision } from "../../engine/vision";
import { IconCritic, IconCrowd, IconLegacy, IconLock, IconMoney, IconTrophy } from "../../icons";
import { fmtMoney } from "../../lib/format";
import { genreColor } from "../../lib/genreColor";
import { cx } from "../../lib/cx";
import styles from "./Vault.module.css";

export function Vault({
  game,
  onBack,
  onDevelopSequel,
}: {
  game: GameState;
  onBack: () => void;
  onDevelopSequel: (franchiseId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const released = game.studio.filmIds
    .map((id) => game.films[id])
    .filter((f): f is Film => !!f && f.stage === "released")
    .reverse();

  const open = openId ? game.films[openId] : null;

  return (
    <div>
      <div className={styles.head}>
        <SectionTitle>THE VAULT · {released.length} FILMS</SectionTitle>
        <Button variant="secondary" onClick={onBack}>
          ← Slate
        </Button>
      </div>
      {game.studio.franchises.length > 0 && (
        <Panel className={styles.franchises}>
          <SectionTitle>FRANCHISES</SectionTitle>
          <div className={styles.ipGrid}>
            {game.studio.franchises.map((ip) => (
              <div key={ip.id} className={styles.ip}>
                <b className={styles.ipName} style={{ color: genreColor(ip.genre) }}>
                  {ip.name}
                </b>
                <span className={styles.ipMeta}>
                  {ip.kind === "original-hit" ? `${ip.instalments.length} film${ip.instalments.length === 1 ? "" : "s"}` : ip.kind}
                </span>
                <IpBar label="AWARENESS" value={ip.awareness} color="var(--stat-money)" />
                <IpBar label="EXPECTATION" value={ip.expectation} color="var(--stat-crowd)" />
                <IpBar label="FATIGUE" value={ip.fatigue} color="var(--danger)" />
                <Button
                  variant="secondary"
                  onClick={() => onDevelopSequel(ip.id)}
                  disabled={game.studio.cash < TUNING.franchise.sequelScriptCost - 25}
                >
                  DEVELOP INSTALMENT · {fmtMoney(TUNING.franchise.sequelScriptCost)}
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {released.length === 0 && (
        <Panel>
          <p className={styles.empty}>Nothing released yet. The shelf waits.</p>
        </Panel>
      )}
      <div className={styles.shelf}>
        {released.map((f) => {
          const compromised = f.legacy && !f.legacy.eligible;
          return (
            <button
              key={f.id}
              className={cx(styles.poster, compromised && styles.posterCompromised)}
              onClick={() => setOpenId(f.id)}
            >
              <span className={styles.year}>
                ’{String(f.release?.season.year ?? 0).padStart(2, "0")} ·{" "}
                <b style={{ color: genreColor(f.genre) }}>{GENRE_LABELS[f.genre].toUpperCase()}</b>
              </span>
              <span className={styles.posterTitle}>{f.title}</span>
              {f.awards.length > 0 && (
                <span className={styles.awards}>
                  <IconTrophy size={11} /> {f.awards.length}
                </span>
              )}
              <div className={styles.dots}>
                <Dot color="var(--stat-money)" ok={(f.result?.profit ?? 0) > 0} label={fmtMoney(f.result?.profit ?? 0)} />
                <Dot color="var(--stat-crowd)" ok={(f.result?.crowdScore ?? 0) >= 65} label={`crowd ${f.result?.crowdScore}`} />
                <Dot color="var(--stat-critic)" ok={(f.result?.criticScore ?? 0) >= 65} label={`critics ${f.result?.criticScore}`} />
                <LegacyDot film={f} year={game.clock.year} />
              </div>
              {compromised && <span className={styles.stampSmall}>COMPROMISED</span>}
            </button>
          );
        })}
      </div>
      {open && <PostMortem film={open} year={game.clock.year} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function IpBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.ipBar}>
      <span>{label}</span>
      <div className={styles.ipTrack}>
        <div style={{ width: `${value}%`, background: color }} />
      </div>
      <b>{Math.round(value)}</b>
    </div>
  );
}

function Dot({ color, ok, label }: { color: string; ok: boolean; label: string }) {
  return (
    <span
      className={styles.dot}
      style={{ background: ok ? color : "var(--black-soft-2)", borderColor: color }}
      title={label}
    />
  );
}

function LegacyDot({ film, year }: { film: Film; year: number }) {
  const l = film.legacy;
  if (!l || !l.eligible) {
    return <span className={styles.dot} style={{ borderColor: "var(--danger)", background: "transparent" }} title="Legacy: compromised" />;
  }
  if (l.locked) {
    const tier = legacyTierLabel(l.finalScore ?? 0);
    return (
      <span
        className={styles.dot}
        style={{
          background: (l.finalScore ?? 0) >= TUNING.legacyThresholds.cult ? "var(--stat-legacy)" : "var(--black-soft-2)",
          borderColor: "var(--stat-legacy)",
        }}
        title={`Legacy locked: ${l.finalScore} ${tier ? `(${tier})` : ""}`}
      />
    );
  }
  const yearsLeft = TUNING.legacyYears - (year - l.releasedYear);
  return (
    <span
      className={cx(styles.dot, styles.dotPending)}
      style={{ borderColor: "var(--stat-legacy)" }}
      title={`Legacy resolving — locks in ${yearsLeft} year${yearsLeft === 1 ? "" : "s"}`}
    />
  );
}

function PostMortem({ film, year, onClose }: { film: Film; year: number; onClose: () => void }) {
  const r = film.result!;
  const l = film.legacy;
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHead}>
          <div>
            <h3 className={styles.sheetTitle}>{film.title}</h3>
            <span className={styles.sheetMeta}>
              dir. {film.directorName} · {GENRE_LABELS[film.genre]} · {VERDICT_LABELS[r.verdict]}
            </span>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className={styles.statGrid}>
          <span>
            <IconMoney size={13} /> {fmtMoney(r.profit)} <em>net</em>
          </span>
          <span>
            <IconCrowd size={13} /> {r.crowdScore} <em>crowd</em>
          </span>
          <span>
            <IconCritic size={13} /> {r.criticScore} <em>critics</em>
          </span>
          <span>
            <IconLegacy size={13} />{" "}
            {l?.locked ? (
              <>
                {l.finalScore} <em>{legacyTierLabel(l.finalScore ?? 0) ?? "legacy"}</em> <IconLock size={11} />
              </>
            ) : l?.eligible ? (
              <em>resolving · locks in {TUNING.legacyYears - (year - l.releasedYear)}y</em>
            ) : (
              <em style={{ color: "var(--danger)" }}>compromised</em>
            )}
          </span>
        </div>
        {l && l.events.length > 0 && (
          <ul className={styles.legacyEvents}>
            {l.events.map((e, i) => (
              <li key={i}>
                <span>Year {e.year}</span>
                <span>{e.label}</span>
                <b style={{ color: e.delta > 0 ? "var(--stat-legacy)" : "var(--danger)" }}>
                  {e.delta > 0 ? "+" : ""}
                  {e.delta}
                </b>
              </li>
            ))}
          </ul>
        )}
        <VisionMeter
          value={filmVision(film)}
          threshold={TUNING.vpEligibleAt}
          ledger={film.visionLedger}
          big
        />
        {film.awards.length > 0 && (
          <p className={styles.awardsLine}>
            <IconTrophy size={13} /> {film.awards.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
