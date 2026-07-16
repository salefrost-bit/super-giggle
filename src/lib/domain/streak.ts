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

// DST-safe: build the previous/next calendar day via the Date constructor,
// never by adding/subtracting 24h of milliseconds (DST days aren't 24h long).
function previousDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

function nextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
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

// Historical maximum streak (Profile "LONGEST STREAK ever") — same freeze
// mechanic as calculateStreak, but walked FORWARD from the oldest workout to
// the newest, with no "now" reference: there's no in-progress "today" to
// special-case, so every day in range either has a workout or doesn't.
export function longestStreak(completedAtIso: string[]): number {
  const workoutDays = new Set(completedAtIso.map((iso) => localDayKey(new Date(iso))));
  if (workoutDays.size === 0) return 0;

  const dayDates = Array.from(workoutDays)
    .map((key) => {
      const [y, m, d] = key.split('-').map(Number);
      return new Date(y, m - 1, d);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  let cursor = dayDates[0];
  const end = dayDates[dayDates.length - 1];
  const freezesUsed = new Map<string, number>();
  let currentRun = 0;
  let best = 0;

  while (cursor.getTime() <= end.getTime()) {
    const key = localDayKey(cursor);
    if (workoutDays.has(key)) {
      currentRun += 1;
    } else {
      const week = isoWeekKey(cursor);
      const used = freezesUsed.get(week) ?? 0;
      if (used < FREEZES_PER_WEEK) {
        freezesUsed.set(week, used + 1);
        currentRun += 1; // frozen day preserves the chain
      } else {
        currentRun = 0; // third miss in one ISO week: chain broken
      }
    }
    best = Math.max(best, currentRun);
    cursor = nextDay(cursor);
  }
  return best;
}
