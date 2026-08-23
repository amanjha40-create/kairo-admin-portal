export function formatNumber(n: number, format: "integer" | "compact" = "integer"): string {
  if (format === "compact") {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en").format(n);
}

export function formatSignedPct(pct: number): string {
  const sign = pct > 0 ? "+" : pct < 0 ? "" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Unavailable";

  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  const future = diffSec < 0;
  const absoluteSeconds = Math.abs(diffSec);

  let value: string;
  if (absoluteSeconds < 60) {
    value = `${absoluteSeconds}s`;
  } else {
    const minutes = Math.round(absoluteSeconds / 60);
    if (minutes < 60) {
      value = `${minutes}m`;
    } else {
      const hours = Math.round(minutes / 60);
      value = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
    }
  }

  return future ? `in ${value}` : `${value} ago`;
}

export function formatAge(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}
