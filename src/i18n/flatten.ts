/** Flatten nested dictionaries to dot keys ("nav.suites") and back. */
export function flatten(obj: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (typeof obj === "string") {
    out[prefix] = obj;
  }
  return out;
}

/** Returns a deep copy of `base` with string leaves replaced by overrides (unknown keys ignored). */
export function applyOverrides<T>(base: T, overrides: Record<string, string>): T {
  if (!Object.keys(overrides).length) return base;
  const copy = structuredClone(base) as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    const parts = key.split(".");
    let node: Record<string, unknown> = copy;
    for (let i = 0; i < parts.length - 1; i++) {
      const next = node[parts[i]];
      if (!next || typeof next !== "object") {
        node = undefined as never;
        break;
      }
      node = next as Record<string, unknown>;
    }
    const leaf = parts[parts.length - 1];
    if (node && typeof node[leaf] === "string" && value.trim()) node[leaf] = value;
  }
  return copy as T;
}
