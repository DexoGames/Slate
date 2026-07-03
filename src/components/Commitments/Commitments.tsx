import { estimateCommitments, creditLeft } from "../../engine/economy";
import type { Film, GameState } from "../../engine/types";
import { fmtMoney } from "../../lib/format";
import { cx } from "../../lib/cx";
import styles from "./Commitments.module.css";

/**
 * The all-in ledger: what this film has cost, what it will still cost, and
 * where that leaves the bank account — visible BEFORE money is committed.
 */
export function Commitments({
  game,
  film,
  overrides,
}: {
  game: GameState;
  film: Film;
  overrides?: { budget?: number; marketing?: number; extraTalent?: number };
}) {
  const c = estimateCommitments(game, film, overrides);
  const intoCredit = c.cashAfter < 0;
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>ALL-IN</h3>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span>Committed</span>
          <b>{fmtMoney(c.committed)}</b>
        </div>
        <div className={styles.row}>
          <span>Still to pay</span>
          <b>~{fmtMoney(c.stillToPay)}</b>
        </div>
        <div className={cx(styles.row, styles.total)}>
          <span>All-in</span>
          <b>~{fmtMoney(c.allIn)}</b>
        </div>
        <div className={cx(styles.row, intoCredit && styles.credit)}>
          <span>Cash after</span>
          <b>
            {fmtMoney(c.cashAfter)}
            {intoCredit && <em> credit</em>}
          </b>
        </div>
        {intoCredit && (
          <div className={styles.creditLine}>
            {fmtMoney(creditLeft(game))} of credit available
          </div>
        )}
      </div>
    </div>
  );
}
