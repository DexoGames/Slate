const NS = "slate:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* non-fatal */
  }
}
