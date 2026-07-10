const FREEZES_PER_WEEK = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ISO-8601 week key, e.g. "2026-W28". Thursday-based algorithm.
function isoWeekKey(date: Date): string {
  const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = (tmp.getDay() + 6) % 7; // Mon=0..Sun=6
  tmp.setDate(tmp.getDate() - dayNum + 3); // nearest Thursday
  const isoYear = tmp.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7;
  const week1Thu = new Date(isoYear, 0, 4 - jan4DayNum + 3);
  const week = 1 + Math.round((tmp.getTime() - week1Thu.getTime()) / (7 * DAY_MS));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

// DST-safe: build the previous calendar day via the Date constructor,
// never by subtracting 24h of milliseconds (spring-forward days are 23h long).
function previousDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export function calculateStreak(
  completedAtIso: string[],
  now: Date
): { days: number; freezesLeftThisWeek: number } {
  const workoutDays = new Set(completedAtIso.map((iso) => localDayKey(new Date(iso))));
  if (workoutDays.size === 0) return { days: 0, freezesLeftThisWeek: FREEZES_PER_WEEK };

  const oldestKey = Array.from(workoutDays).sort()[0];
  const currentWeek = isoWeekKey(now);
  const freezesUsed = new Map<string, number>();

  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Today without a workout doesn't consume a freeze and doesn't break the chain.
  if (!workoutDays.has(localDayKey(cursor))) {
    cursor = previousDay(cursor);
  }

  let days = 0;
  let anchored = false; // a streak must contain at least one real workout
  for (;;) {
    const key = localDayKey(cursor);
    if (key < oldestKey) break; // never freeze days before the oldest workout
    if (workoutDays.has(key)) {
      days += 1;
      anchored = true;
    } else {
      const week = isoWeekKey(cursor);
      const used = freezesUsed.get(week) ?? 0;
      if (used >= FREEZES_PER_WEEK) break; // third miss in one ISO week: chain broken
      freezesUsed.set(week, used + 1);
      days += 1; // frozen day preserves the chain and counts toward it
    }
    cursor = previousDay(cursor);
  }

  if (!anchored) return { days: 0, freezesLeftThisWeek: FREEZES_PER_WEEK };
  return {
    days,
    freezesLeftThisWeek: FREEZES_PER_WEEK - (freezesUsed.get(currentWeek) ?? 0),
  };
}
