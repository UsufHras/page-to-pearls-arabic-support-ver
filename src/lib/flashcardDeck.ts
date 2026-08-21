import { VocabularyWord } from '@/components/VocabularyCard';

export const DECK_STORAGE_KEY = 'lexicon-flashcard-deck';

export function loadDeck(): VocabularyWord[] {
  try {
    const raw = localStorage.getItem(DECK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeck(deck: VocabularyWord[]) {
  try {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
  } catch {
    /* storage unavailable */
  }
}

export function addToDeck(word: VocabularyWord): VocabularyWord[] {
  const deck = loadDeck();
  const key = word.word.toLowerCase();
  const next = deck.some((w) => w.word.toLowerCase() === key) ? deck : [...deck, word];
  saveDeck(next);
  return next;
}

export function removeFromDeck(wordText: string): VocabularyWord[] {
  const next = loadDeck().filter((w) => w.word.toLowerCase() !== wordText.toLowerCase());
  saveDeck(next);
  return next;
}
