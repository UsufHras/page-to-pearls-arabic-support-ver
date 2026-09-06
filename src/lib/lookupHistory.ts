import { supabase } from '@/integrations/supabase/client';
import type { VocabularyWord, CefrLevel } from '@/components/VocabularyCard';

export interface HistoryEntry {
  id: string;
  word: string;
  pronunciation?: string;
  definition: string;
  translation?: string;
  difficulty?: CefrLevel;
  languageCode?: string;
  examples: string[];
  contextSentence?: string;
  lookups: number;
  createdAt: string;
  updatedAt: string;
}

type HistoryRow = {
  id: string;
  word: string;
  pronunciation: string | null;
  definition: string;
  translation: string | null;
  difficulty: string | null;
  language_code: string | null;
  examples: string[] | null;
  context_sentence: string | null;
  lookups: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    word: row.word,
    pronunciation: row.pronunciation ?? undefined,
    definition: row.definition ?? '',
    translation: row.translation ?? undefined,
    difficulty: (row.difficulty as CefrLevel | null) ?? undefined,
    languageCode: row.language_code ?? undefined,
    examples: row.examples ?? [],
    contextSentence: row.context_sentence ?? undefined,
    lookups: row.lookups,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// lookup_history was added after the generated types file; use an untyped handle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from('lookup_history');

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Records a lookup for the signed-in user. Re-looking up the same word bumps its counter. */
export async function recordLookup(
  word: VocabularyWord,
  languageCode: string,
  contextSentence?: string,
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return; // anonymous visitors: nothing to save against

  const { data: existing } = await table()
    .select('id, lookups')
    .eq('user_id', userId)
    .ilike('word', word.word)
    .eq('language_code', languageCode)
    .maybeSingle();

  if (existing) {
    await table()
      .update({
        lookups: existing.lookups + 1,
        definition: word.definition ?? '',
        translation: word.translation ?? word.arabicTranslation ?? null,
        pronunciation: word.pronunciation ?? null,
        difficulty: word.difficulty ?? null,
        examples: word.examples ?? [],
        context_sentence: contextSentence ?? null,
      })
      .eq('id', existing.id);
    return;
  }

  await table().insert({
    user_id: userId,
    word: word.word,
    pronunciation: word.pronunciation ?? null,
    definition: word.definition ?? '',
    translation: word.translation ?? word.arabicTranslation ?? null,
    difficulty: word.difficulty ?? null,
    language_code: languageCode,
    examples: word.examples ?? [],
    context_sentence: contextSentence ?? null,
  });
}

export interface HistoryFilters {
  difficulty?: CefrLevel | 'all';
  languageCode?: string | 'all';
  search?: string;
}

export async function fetchHistory(filters: HistoryFilters = {}): Promise<HistoryEntry[]> {
  let query = table()
    .select(
      'id, word, pronunciation, definition, translation, difficulty, language_code, examples, context_sentence, lookups, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  if (filters.difficulty && filters.difficulty !== 'all') {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters.languageCode && filters.languageCode !== 'all') {
    query = query.eq('language_code', filters.languageCode);
  }
  if (filters.search?.trim()) {
    query = query.ilike('word', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as HistoryRow[]).map(mapRow);
}

export async function deleteHistoryEntry(id: string) {
  const { error } = await table().delete().eq('id', id);
  if (error) throw error;
}

export async function clearHistory() {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await table().delete().eq('user_id', userId);
  if (error) throw error;
}
