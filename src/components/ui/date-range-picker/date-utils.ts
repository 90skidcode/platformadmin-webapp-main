import type { DateRangePreset } from "./types";

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : startOfDay(date);
  }
  if (typeof date === "string") {
    // If YYYY-MM-DD format, construct directly to avoid UTC timezone offsets
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : startOfDay(d);
  }
  return null;
}

export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(date: Date): string {
  const months = [
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
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function isSameDay(
  a: Date | null | undefined,
  b: Date | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBeforeDay(a: Date, b: Date): boolean {
  const aNorm = startOfDay(a).getTime();
  const bNorm = startOfDay(b).getTime();
  return aNorm < bNorm;
}

export function isAfterDay(a: Date, b: Date): boolean {
  const aNorm = startOfDay(a).getTime();
  const bNorm = startOfDay(b).getTime();
  return aNorm > bNorm;
}

export function isWithinRange(date: Date, from: Date, to: Date): boolean {
  const d = startOfDay(date).getTime();
  const f = startOfDay(from).getTime();
  const t = startOfDay(to).getTime();
  return d >= f && d <= t;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOffset(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 0,
): number {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
  if (weekStartsOn === 1) {
    return (firstDay + 6) % 7;
  }
  return firstDay;
}

export function getMonthDays(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 0,
): (number | null)[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOffset(year, month, weekStartsOn);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  return days;
}

export function addMonths(date: Date, count: number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + count);
  return d;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_NAMES_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const WEEKDAY_NAMES_MON = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function isDateUnavailable({
  date,
  today,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  isDateDisabled,
}: {
  date: Date;
  today: Date;
  minDate?: Date | null;
  maxDate?: Date | null;
  disablePast?: boolean;
  disableFuture?: boolean;
  isDateDisabled?: (date: Date) => boolean;
}): boolean {
  if (disablePast && isBeforeDay(date, today)) return true;
  if (disableFuture && isAfterDay(date, today)) return true;
  if (minDate && isBeforeDay(date, minDate)) return true;
  if (maxDate && isAfterDay(date, maxDate)) return true;
  if (isDateDisabled && isDateDisabled(date)) return true;
  return false;
}

export function isDateHiddenHelper(
  date: Date,
  today: Date,
  hidePastDates?: boolean,
): boolean {
  return Boolean(hidePastDates && isBeforeDay(date, today));
}

export function getWeekdays(weekStartsOn: 0 | 1 = 0): string[] {
  return weekStartsOn === 1 ? WEEKDAY_NAMES_MON : WEEKDAY_NAMES_SUN;
}

export function isMonthAfter(a: Date, b: Date): boolean {
  if (a.getFullYear() > b.getFullYear()) return true;
  if (a.getFullYear() === b.getFullYear() && a.getMonth() > b.getMonth())
    return true;
  return false;
}

export function getDefaultPresets(): DateRangePreset[] {
  const today = startOfDay(new Date());

  return [
    {
      id: "today",
      label: "Today",
      range: () => ({ from: today, to: today }),
    },
    {
      id: "yesterday",
      label: "Yesterday",
      range: () => {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { from: y, to: y };
      },
    },
    {
      id: "last7Days",
      label: "Last 7 Days",
      range: () => {
        const from = new Date(today);
        from.setDate(from.getDate() - 6);
        return { from, to: today };
      },
    },
    {
      id: "last30Days",
      label: "Last 30 Days",
      range: () => {
        const from = new Date(today);
        from.setDate(from.getDate() - 29);
        return { from, to: today };
      },
    },
    {
      id: "thisMonth",
      label: "This Month",
      range: () => {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from, to };
      },
    },
    {
      id: "lastMonth",
      label: "Last Month",
      range: () => {
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const to = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from, to };
      },
    },
    {
      id: "thisYear",
      label: "This Year",
      range: () => {
        const from = new Date(today.getFullYear(), 0, 1);
        const to = new Date(today.getFullYear(), 11, 31);
        return { from, to };
      },
    },
  ];
}
