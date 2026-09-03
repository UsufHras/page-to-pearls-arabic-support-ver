export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewState {
  /** consecutive successful reviews */
  streak: number;
  /** current interval in days */
  intervalDays: number;
  /** ease factor, 1.3 - 3.0 */
  ease: number;
  /** ISO date of next due review (null = never reviewed) */
  dueAt: string | null;
  lastReviewedAt: string | null;
  reviews: number;
  lapses: number;
}

export const NEW_REVIEW_STATE: ReviewState = {
  streak: 0,
  intervalDays: 0,
  ease: 2.5,
  dueAt: null,
  lastReviewedAt: null,
  reviews: 0,
  lapses: 0,
};

export const MASTERY_STEPS = ['New', 'Learning', 'Familiar', 'Known', 'Mastered'] as const;
export type Mastery = (typeof MASTERY_STEPS)[number];

function startOfDayInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** SM-2 inspired scheduling with four grades. Pure — persistence is the caller's job. */
export function computeNextReview(prev: ReviewState, grade: Grade): ReviewState {
  let { streak, intervalDays, ease, lapses } = prev;

  if (grade === 'again') {
    streak = 0;
    lapses += 1;
    intervalDays = 0; // same-day retry
    ease = Math.max(1.3, ease - 0.2);
  } else {
    const easeDelta = grade === 'hard' ? -0.15 : grade === 'easy' ? 0.15 : 0;
    ease = Math.min(3, Math.max(1.3, ease + easeDelta));
    streak += 1;
    if (streak === 1) intervalDays = grade === 'easy' ? 3 : 1;
    else if (streak === 2) intervalDays = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6;
    else {
      const mult = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
      intervalDays = Math.max(1, Math.round(intervalDays * mult));
    }
    intervalDays = Math.min(intervalDays, 365);
  }

  return {
    streak,
    intervalDays,
    ease,
    lapses,
    reviews: prev.reviews + 1,
    lastReviewedAt: new Date().toISOString(),
    dueAt: intervalDays === 0 ? new Date().toISOString() : startOfDayInDays(intervalDays),
  };
}

export function isDue(state: ReviewState | undefined, now = new Date()) {
  if (!state || !state.dueAt) return true; // never reviewed → always due
  return new Date(state.dueAt).getTime() <= now.getTime();
}

export function masteryOf(state: ReviewState | undefined): Mastery {
  if (!state || state.reviews === 0) return 'New';
  if (state.streak === 0) return 'Learning';
  if (state.intervalDays >= 60) return 'Mastered';
  if (state.intervalDays >= 21) return 'Known';
  if (state.intervalDays >= 3) return 'Familiar';
  return 'Learning';
}

export function formatDueLabel(state: ReviewState | undefined): string {
  if (!state || !state.dueAt) return 'New';
  const ms = new Date(state.dueAt).getTime() - Date.now();
  if (ms <= 0) return 'Due now';
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 1) return 'Due tomorrow';
  if (days < 30) return `Due in ${days} days`;
  const months = Math.round(days / 30);
  return `Due in ${months} month${months !== 1 ? 's' : ''}`;
}

export interface CourseProgress {
  total: number;
  due: number;
  newCount: number;
  byMastery: Record<Mastery, number>;
  nextDueAt?: string;
}

export function summariseProgress(items: { review: ReviewState }[]): CourseProgress {
  const byMastery: Record<Mastery, number> = {
    New: 0,
    Learning: 0,
    Familiar: 0,
    Known: 0,
    Mastered: 0,
  };
  let due = 0;
  let newCount = 0;
  let nextDue: number | undefined;

  for (const item of items) {
    const state = item.review;
    byMastery[masteryOf(state)] += 1;
    if (state.reviews === 0) newCount += 1;
    if (isDue(state)) due += 1;
    else if (state.dueAt) {
      const t = new Date(state.dueAt).getTime();
      if (nextDue === undefined || t < nextDue) nextDue = t;
    }
  }

  return {
    total: items.length,
    due,
    newCount,
    byMastery,
    nextDueAt: nextDue ? new Date(nextDue).toISOString() : undefined,
  };
}

export function selectDue<T extends { review: ReviewState }>(items: T[]): T[] {
  return items
    .filter((i) => isDue(i.review))
    .sort((a, b) => {
      const ta = a.review.dueAt ? new Date(a.review.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.review.dueAt ? new Date(b.review.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
}
