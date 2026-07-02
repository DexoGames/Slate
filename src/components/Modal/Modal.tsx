import type { ReactNode } from "react";
import { IconClose } from "../../icons";
import styles from "./Modal.module.css";

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
}) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={wide ? styles.boxWide : styles.box}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          {onClose && (
            <button className={styles.close} onClick={onClose} aria-label="Close">
              <IconClose size={16} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
