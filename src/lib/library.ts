import { VocabularyWord } from '@/components/VocabularyCard';

export const LIBRARY_STORAGE_KEY = 'lexicon-library-courses';

export interface Course {
  id: string;
  name: string;
  description?: string;
  languageCode?: string;
  createdAt: string;
  updatedAt: string;
  words: VocabularyWord[];
}

function newId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is Course => !!c && typeof c.id === 'string' && Array.isArray(c.words));
  } catch {
    return [];
  }
}

export function saveCourses(courses: Course[]): Course[] {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(courses));
  } catch {
    /* storage unavailable */
  }
  return courses;
}

export function createCourse(name: string, options?: { description?: string; languageCode?: string }): Course {
  const now = new Date().toISOString();
  const course: Course = {
    id: newId(),
    name: name.trim() || 'Untitled course',
    description: options?.description?.trim() || undefined,
    languageCode: options?.languageCode,
    createdAt: now,
    updatedAt: now,
    words: [],
  };
  saveCourses([...loadCourses(), course]);
  return course;
}

export function updateCourse(id: string, patch: Partial<Omit<Course, 'id' | 'createdAt'>>): Course[] {
  return saveCourses(
    loadCourses().map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    ),
  );
}

export function deleteCourse(id: string): Course[] {
  return saveCourses(loadCourses().filter((c) => c.id !== id));
}

/** Adds words to a course, skipping duplicates (case-insensitive). Returns updated courses. */
export function addWordsToCourse(id: string, words: VocabularyWord[]): Course[] {
  return saveCourses(
    loadCourses().map((c) => {
      if (c.id !== id) return c;
      const seen = new Set(c.words.map((w) => w.word.toLowerCase()));
      const additions = words.filter((w) => {
        const key = w.word.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (additions.length === 0) return c;
      return { ...c, words: [...c.words, ...additions], updatedAt: new Date().toISOString() };
    }),
  );
}

export function countNewWords(course: Course, words: VocabularyWord[]) {
  const existing = new Set(course.words.map((w) => w.word.toLowerCase()));
  const unique = new Set(words.map((w) => w.word.toLowerCase()));
  return [...unique].filter((w) => !existing.has(w)).length;
}

export function removeWordFromCourse(id: string, wordText: string): Course[] {
  return saveCourses(
    loadCourses().map((c) =>
      c.id === id
        ? {
            ...c,
            words: c.words.filter((w) => w.word.toLowerCase() !== wordText.toLowerCase()),
            updatedAt: new Date().toISOString(),
          }
        : c,
    ),
  );
}
