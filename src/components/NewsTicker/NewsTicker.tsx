import type { NewsItem } from "../../engine/types";
import styles from "./NewsTicker.module.css";

export function NewsTicker({ news }: { news: NewsItem[] }) {
  const latest = news[news.length - 1];
  if (!latest) return null;
  return (
    <footer className={styles.ticker}>
      <span className={styles.tag}>THE TRADES</span>
      <span className={styles.text} key={news.length}>
        {latest.text}
      </span>
    </footer>
  );
}
