import { VocabularyWord } from '@/components/VocabularyCard';

export const SRS_STORAGE_KEY = 'lexicon-srs-schedule';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewState {
  /** number of consecutive successful reviews */
  streak: number;
  /** current interval in days */
  intervalDays: number;
  /** ease factor, 1.3 - 3.0 */
  ease: number;
  /** ISO date of next due review */
  dueAt: string;
  lastReviewedAt?: string;
  reviews: number;
  lapses: number;
}

type Schedule = Record<string, ReviewState>;

export const MASTERY_STEPS = ['New', 'Learning', 'Familiar', 'Known', 'Mastered'] as const;
export type Mastery = (typeof MASTERY_STEPS)[number];

export function srsKey(courseId: string, word: string) {
  return `${courseId}::${word.toLowerCase()}`;
}

function loadSchedule(): Schedule {
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Schedule) : {};
  } catch {
    return {};
  }
}

function saveSchedule(schedule: Schedule) {
  try {
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    /* storage unavailable */
  }
}

export function getReviewState(courseId: string, word: string): ReviewState | undefined {
  return loadSchedule()[srsKey(courseId, word)];
}

export function getCourseSchedule(courseId: string): Schedule {
  const all = loadSchedule();
  const prefix = `${courseId}::`;
  return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith(prefix)));
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  // due at start of that day so reviews unlock in the morning
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** SM-2 inspired scheduling with four grades. */
export function gradeWord(courseId: string, word: string, grade: Grade): ReviewState {
  const all = loadSchedule();
  const key = srsKey(courseId, word);
  const prev: ReviewState = all[key] ?? {
    streak: 0,
    intervalDays: 0,
    ease: 2.5,
    dueAt: new Date().toISOString(),
    reviews: 0,
    lapses: 0,
  };

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
    if (streak === 1) intervalDays = grade === 'hard' ? 1 : grade === 'easy' ? 3 : 1;
    else if (streak === 2) intervalDays = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6;
    else {
      const mult = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
      intervalDays = Math.max(1, Math.round(intervalDays * mult));
    }
    intervalDays = Math.min(intervalDays, 365);
  }

  const next: ReviewState = {
    streak,
    intervalDays,
    ease,
    lapses,
    reviews: prev.reviews + 1,
    lastReviewedAt: new Date().toISOString(),
    dueAt: intervalDays === 0 ? new Date().toISOString() : addDays(intervalDays),
  };

  all[key] = next;
  saveSchedule(all);
  return next;
}

export function resetWordProgress(courseId: string, word: string) {
  const all = loadSchedule();
  delete all[srsKey(courseId, word)];
  saveSchedule(all);
}

export function resetCourseProgress(courseId: string) {
  const all = loadSchedule();
  const prefix = `${courseId}::`;
  for (const k of Object.keys(all)) if (k.startsWith(prefix)) delete all[k];
  saveSchedule(all);
}

export function isDue(state: ReviewState | undefined, now = new Date()) {
  if (!state) return true; // new words are always due
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

export interface CourseProgress {
  total: number;
  due: number;
  newCount: number;
  byMastery: Record<Mastery, number>;
  nextDueAt?: string;
}

export function courseProgress(courseId: string, words: VocabularyWord[]): CourseProgress {
  const schedule = getCourseSchedule(courseId);
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

  for (const w of words) {
    const state = schedule[srsKey(courseId, w.word)];
    byMastery[masteryOf(state)] += 1;
    if (!state) newCount += 1;
    if (isDue(state)) due += 1;
    else if (state) {
      const t = new Date(state.dueAt).getTime();
      if (nextDue === undefined || t < nextDue) nextDue = t;
    }
  }

  return {
    total: words.length,
    due,
    newCount,
    byMastery,
    nextDueAt: nextDue ? new Date(nextDue).toISOString() : undefined,
  };
}

export function dueWords(courseId: string, words: VocabularyWord[]): VocabularyWord[] {
  const schedule = getCourseSchedule(courseId);
  return words
    .filter((w) => isDue(schedule[srsKey(courseId, w.word)]))
    .sort((a, b) => {
      const sa = schedule[srsKey(courseId, a.word)];
      const sb = schedule[srsKey(courseId, b.word)];
      // overdue-most first, new words after lapsed ones
      const ta = sa ? new Date(sa.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = sb ? new Date(sb.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
}

export function formatDueLabel(state: ReviewState | undefined): string {
  if (!state) return 'New';
  const ms = new Date(state.dueAt).getTime() - Date.now();
  if (ms <= 0) return 'Due now';
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 1) return 'Due tomorrow';
  if (days < 30) return `Due in ${days} days`;
  const months = Math.round(days / 30);
  return `Due in ${months} month${months !== 1 ? 's' : ''}`;
}
