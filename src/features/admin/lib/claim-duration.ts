export type ClaimDatePrecision = "day" | "month" | "year";

interface ClaimDurationInput {
  startDate?: string | null;
  startDatePrecision?: ClaimDatePrecision | string | null;
  endDate?: string | null;
  endDatePrecision?: ClaimDatePrecision | string | null;
  isCurrent?: boolean;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatClaimDate(
  value: string | null | undefined,
  precision: ClaimDatePrecision | string | null | undefined,
): string | null {
  if (!value) return null;

  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(value);
  if (!match) return value;

  const [, year, monthText, dayText] = match;
  if (precision === "year") return year;

  const month = Number(monthText);
  if ((precision === "month" || precision === "day") && (month < 1 || month > 12)) {
    return value;
  }
  if (precision === "month") return `${MONTH_NAMES[month - 1]} ${year}`;

  const day = Number(dayText);
  if (precision === "day" && day >= 1 && day <= 31) {
    return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
  }

  // Without canonical precision metadata, preserve the backend value exactly.
  return value;
}

export function formatClaimDuration({
  startDate,
  startDatePrecision,
  endDate,
  endDatePrecision,
  isCurrent = false,
}: ClaimDurationInput): string {
  const start = formatClaimDate(startDate, startDatePrecision);
  const end = isCurrent ? "Present" : formatClaimDate(endDate, endDatePrecision);

  if (start && end) return `${start} - ${end}`;
  if (start) return isCurrent ? `${start} - Present` : `${start} - End date unavailable`;
  if (end) return `Start date unavailable - ${end}`;
  return "Unavailable";
}
