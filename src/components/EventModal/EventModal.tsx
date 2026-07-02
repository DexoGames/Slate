import { Modal } from "../Modal/Modal";
import type { Film, PendingEvent } from "../../engine/types";
import styles from "./EventModal.module.css";

/**
 * The explicit "trust the filmmaker vs protect the investment" fork. Both
 * branches show their full cost before the click.
 */
export function EventModal({
  event,
  film,
  onChoose,
}: {
  event: PendingEvent;
  film: Film;
  onChoose: (choice: "trust" | "protect") => void;
}) {
  return (
    <Modal title={event.title} wide>
      <p className={styles.filmLine}>
        ON THE SET OF “{film.title.toUpperCase()}”
      </p>
      <p className={styles.body}>{event.body}</p>
      <div className={styles.fork}>
        <button className={styles.trust} onClick={() => onChoose("trust")}>
          <span className={styles.choiceKicker}>TRUST THE FILMMAKER</span>
          <span className={styles.choiceLabel}>{event.trustLabel}</span>
          <span className={styles.choiceCost}>{event.trustEffect}</span>
        </button>
        <button className={styles.protect} onClick={() => onChoose("protect")}>
          <span className={styles.choiceKicker}>PROTECT THE INVESTMENT</span>
          <span className={styles.choiceLabel}>{event.protectLabel}</span>
          <span className={styles.choiceCost}>{event.protectEffect}</span>
        </button>
      </div>
    </Modal>
  );
}
