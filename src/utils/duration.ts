function normalizeTotalMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  // Keep minute calculations stable and deterministic for UI rendering.
  return Math.trunc(value);
}

export function formatDurationFromMinutes(totalMinutes: number): string {
  const normalized = normalizeTotalMinutes(totalMinutes);
  const absolute = Math.abs(normalized);

  if (absolute < 60) {
    return `${absolute} menit`;
  }

  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  if (minutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${minutes} menit`;
}

export function formatSignedDurationFromMinutes(totalMinutes: number): string {
  const normalized = normalizeTotalMinutes(totalMinutes);
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";

  return `${sign}${formatDurationFromMinutes(normalized)}`;
}

function parseMinuteTextToNumber(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.trunc(parsed);
}

export function formatMinutePhrasesInText(text: string): string {
  return text.replace(
    /(-?\d+(?:[.,]\d+)?)\s*(minutes?|menit)\b/gi,
    (_, minuteValue: string) =>
      formatDurationFromMinutes(parseMinuteTextToNumber(minuteValue)),
  );
}
