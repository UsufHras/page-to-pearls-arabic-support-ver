import { supabase } from '@/integrations/supabase/client';
import { VocabularyWord, CefrLevel } from '@/components/VocabularyCard';
import { computeNextReview, Grade, NEW_REVIEW_STATE, ReviewState } from '@/lib/spacedRepetition';

/** Legacy browser-only keys, kept so old local data can be imported once. */
export const LEGACY_LIBRARY_KEY = 'lexicon-library-courses';
export const LEGACY_SRS_KEY = 'lexicon-srs-schedule';

export interface LibraryWord extends VocabularyWord {
  id: string;
  review: ReviewState;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  languageCode?: string;
  createdAt: string;
  updatedAt: string;
  words: LibraryWord[];
}

type WordRow = {
  id: string;
  word: string;
  pronunciation: string | null;
  definition: string;
  translation: string | null;
  difficulty: string | null;
  examples: string[] | null;
  collocations: string[] | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  position: number;
  streak: number;
  interval_days: number;
  ease: number;
  due_at: string | null;
  last_reviewed_at: string | null;
  reviews: number;
  lapses: number;
};

function mapWord(row: WordRow): LibraryWord {
  return {
    id: row.id,
    word: row.word,
    pronunciation: row.pronunciation ?? undefined,
    definition: row.definition ?? '',
    translation: row.translation ?? undefined,
    difficulty: (row.difficulty as CefrLevel | null) ?? undefined,
    examples: row.examples ?? [],
    collocations: row.collocations ?? [],
    synonyms: row.synonyms ?? [],
    antonyms: row.antonyms ?? [],
    review: {
      streak: row.streak,
      intervalDays: row.interval_days,
      ease: Number(row.ease),
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
      reviews: row.reviews,
      lapses: row.lapses,
    },
  };
}

function wordInsert(courseId: string, userId: string, word: VocabularyWord, position: number) {
  return {
    course_id: courseId,
    user_id: userId,
    word: word.word,
    pronunciation: word.pronunciation ?? null,
    definition: word.definition ?? '',
    translation: word.translation ?? word.arabicTranslation ?? null,
    difficulty: word.difficulty ?? null,
    examples: word.examples ?? [],
    collocations: word.collocations ?? [],
    synonyms: word.synonyms ?? [],
    antonyms: word.antonyms ?? [],
    position,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('You need to be signed in to use your library.');
  return data.user.id;
}

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, name, description, language_code, created_at, updated_at, course_words(id, word, pronunciation, definition, translation, difficulty, examples, collocations, synonyms, antonyms, position, streak, interval_days, ease, due_at, last_reviewed_at, reviews, lapses)',
    )
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    languageCode: c.language_code ?? undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    words: ((c.course_words ?? []) as WordRow[])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(mapWord),
  }));
}

export async function createCourse(
  name: string,
  options?: { description?: string; languageCode?: string },
): Promise<Course> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: userId,
      name: name.trim() || 'Untitled course',
      description: options?.description?.trim() || null,
      language_code: options?.languageCode ?? null,
    })
    .select('id, name, description, language_code, created_at, updated_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    languageCode: data.language_code ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    words: [],
  };
}

export async function renameCourse(id: string, name: string) {
  const { error } = await supabase.from('courses').update({ name: name.trim() }).eq('id', id);
  if (error) throw error;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
}

/** Adds words to a course, skipping duplicates (case-insensitive). Returns how many were added. */
export async function addWordsToCourse(
  courseId: string,
  words: VocabularyWord[],
): Promise<number> {
  const userId = await requireUserId();
  const { data: existing, error: readError } = await supabase
    .from('course_words')
    .select('word, position')
    .eq('course_id', courseId);
  if (readError) throw readError;

  const seen = new Set((existing ?? []).map((w) => w.word.toLowerCase()));
  let position = (existing ?? []).reduce((max, w) => Math.max(max, w.position), -1) + 1;

  const rows = words
    .filter((w) => {
      const key = w.word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((w) => wordInsert(courseId, userId, w, position++));

  if (rows.length === 0) return 0;
  const { error } = await supabase.from('course_words').insert(rows);
  if (error) throw error;
  await supabase.from('courses').update({ updated_at: new Date().toISOString() }).eq('id', courseId);
  return rows.length;
}

export async function removeWord(wordId: string) {
  const { error } = await supabase.from('course_words').delete().eq('id', wordId);
  if (error) throw error;
}

export async function updateWord(wordId: string, word: VocabularyWord) {
  const { error } = await supabase
    .from('course_words')
    .update({
      word: word.word,
      pronunciation: word.pronunciation ?? null,
      definition: word.definition ?? '',
      translation: word.translation ?? word.arabicTranslation ?? null,
      difficulty: word.difficulty ?? null,
      examples: word.examples ?? [],
      collocations: word.collocations ?? [],
      synonyms: word.synonyms ?? [],
      antonyms: word.antonyms ?? [],
    })
    .eq('id', wordId);
  if (error) throw error;
}

export async function gradeWord(
  wordId: string,
  current: ReviewState,
  grade: Grade,
): Promise<ReviewState> {
  const next = computeNextReview(current, grade);
  const { error } = await supabase
    .from('course_words')
    .update({
      streak: next.streak,
      interval_days: next.intervalDays,
      ease: next.ease,
      due_at: next.dueAt,
      last_reviewed_at: next.lastReviewedAt,
      reviews: next.reviews,
      lapses: next.lapses,
    })
    .eq('id', wordId);
  if (error) throw error;
  return next;
}

export async function resetCourseProgress(courseId: string) {
  const { error } = await supabase
    .from('course_words')
    .update({
      streak: NEW_REVIEW_STATE.streak,
      interval_days: NEW_REVIEW_STATE.intervalDays,
      ease: NEW_REVIEW_STATE.ease,
      due_at: null,
      last_reviewed_at: null,
      reviews: 0,
      lapses: 0,
    })
    .eq('course_id', courseId);
  if (error) throw error;
}

export function countNewWords(course: Course, words: VocabularyWord[]) {
  const existing = new Set(course.words.map((w) => w.word.toLowerCase()));
  const unique = new Set(words.map((w) => w.word.toLowerCase()));
  return [...unique].filter((w) => !existing.has(w)).length;
}

/**
 * One-time import of courses that were previously stored in the browser only.
 * Returns the number of courses imported.
 */
export async function importLegacyLocalLibrary(): Promise<number> {
  let legacy: {
    id?: string;
    name?: string;
    description?: string;
    languageCode?: string;
    words?: VocabularyWord[];
  }[];
  try {
    const raw = localStorage.getItem(LEGACY_LIBRARY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    legacy = Array.isArray(parsed) ? parsed : [];
  } catch {
    return 0;
  }
  if (legacy.length === 0) {
    localStorage.removeItem(LEGACY_LIBRARY_KEY);
    return 0;
  }

  let imported = 0;
  for (const course of legacy) {
    try {
      const created = await createCourse(course.name || 'Imported course', {
        description: course.description,
        languageCode: course.languageCode,
      });
      if (Array.isArray(course.words) && course.words.length > 0) {
        await addWordsToCourse(created.id, course.words);
      }
      imported += 1;
    } catch {
      /* skip broken entries */
    }
  }

  localStorage.removeItem(LEGACY_LIBRARY_KEY);
  localStorage.removeItem(LEGACY_SRS_KEY);
  return imported;
}

export function hasLegacyLocalLibrary() {
  try {
    const raw = localStorage.getItem(LEGACY_LIBRARY_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
