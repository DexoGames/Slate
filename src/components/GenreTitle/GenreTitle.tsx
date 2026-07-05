import type { ElementType, HTMLAttributes, ReactNode } from "react";
import type { Genre } from "../../engine/types";
import { cx } from "../../lib/cx";
import styles from "./GenreTitle.module.css";

/**
 * A film's title, typeset with a per-genre treatment so genres read differently
 * at a glance — a dripping horror face, a flowing romance script, a military
 * stencil for war. Each genre gets its own self-hosted display face (SIL OFL,
 * same-origin) reshaped further with CSS. Callers own size/colour via
 * `className`; this owns family / spacing / slant.
 */
export function GenreTitle({
  genre,
  children,
  className,
  as: Tag = "span",
  ...rest
}: {
  genre: Genre;
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cx(styles.title, styles[genre], className)} {...rest}>
      {children}
    </Tag>
  );
}
