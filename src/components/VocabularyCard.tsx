import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Quote, ArrowRightLeft, Volume2, Loader2, Pencil, Check, X, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabularyWord {
  word: string;
  pronunciation?: string;
  definition: string;
  difficulty?: CefrLevel;
  arabicTranslation?: string;
  examples: string[];
  collocations?: string[];
  synonyms: string[];
  antonyms: string[];
}

interface VocabularyCardProps {
  vocabulary: VocabularyWord;
  index: number;
  onUpdate?: (updated: VocabularyWord) => void;
}

const DIFFICULTY_STYLES: Record<CefrLevel, string> = {
  A1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  B1: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  B2: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  C1: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  C2: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const DIFFICULTY_LABELS: Record<CefrLevel, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper-Int.',
  C1: 'Advanced',
  C2: 'Proficient',
};

export function VocabularyCard({ vocabulary, index, onUpdate }: VocabularyCardProps) {
  const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<VocabularyWord>(vocabulary);

  const playPronunciation = async (accent: 'us' | 'uk') => {
    if (playingAccent) return;
    setPlayingAccent(accent);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronounce-word`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ word: vocabulary.word, accent }),
        }
      );
      if (!response.ok) throw new Error('Failed to get pronunciation');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => { setPlayingAccent(null); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setPlayingAccent(null); URL.revokeObjectURL(audioUrl); toast.error('Failed to play audio'); };
      await audio.play();
    } catch (error) {
      console.error('Pronunciation error:', error);
      toast.error('Failed to play pronunciation');
      setPlayingAccent(null);
    }
  };

  const startEdit = () => {
    setDraft(vocabulary);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(vocabulary);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const cleaned: VocabularyWord = {
      ...draft,
      examples: draft.examples.map(e => e.trim()).filter(Boolean),
      synonyms: draft.synonyms.map(s => s.trim()).filter(Boolean),
      antonyms: draft.antonyms.map(a => a.trim()).filter(Boolean),
      collocations: draft.collocations?.map(c => c.trim()).filter(Boolean) ?? [],
    };
    onUpdate?.(cleaned);
    setIsEditing(false);
    toast.success('Word updated');
  };

  const updateListItem = (
    field: 'examples' | 'synonyms' | 'antonyms' | 'collocations',
    i: number,
    value: string
  ) => {
    setDraft(prev => {
      const arr = [...((prev[field] as string[]) ?? [])];
      arr[i] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addListItem = (field: 'examples' | 'synonyms' | 'antonyms' | 'collocations') => {
    setDraft(prev => ({
      ...prev,
      [field]: [...((prev[field] as string[]) ?? []), ''],
    }));
  };

  const removeListItem = (
    field: 'examples' | 'synonyms' | 'antonyms' | 'collocations',
    i: number
  ) => {
    setDraft(prev => {
      const arr = [...((prev[field] as string[]) ?? [])];
      arr.splice(i, 1);
      return { ...prev, [field]: arr };
    });
  };

  const difficulty = vocabulary.difficulty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="card-paper p-6 space-y-5"
    >
      {/* Word Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            {isEditing ? (
              <Input
                value={draft.word}
                onChange={(e) => setDraft({ ...draft, word: e.target.value })}
                className="text-2xl font-display font-bold text-primary h-auto py-1 max-w-xs"
              />
            ) : (
              <h3 className="text-2xl font-display font-bold text-primary capitalize">
                {vocabulary.word}
              </h3>
            )}
            {!isEditing && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => playPronunciation('us')}
                  disabled={playingAccent !== null}
                  className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-primary/10 transition-colors text-primary disabled:opacity-50 text-xs font-medium"
                  aria-label="Play American pronunciation"
                >
                  {playingAccent === 'us' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  <span>US</span>
                </button>
                <button
                  onClick={() => playPronunciation('uk')}
                  disabled={playingAccent !== null}
                  className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-primary/10 transition-colors text-primary disabled:opacity-50 text-xs font-medium"
                  aria-label="Play British pronunciation"
                >
                  {playingAccent === 'uk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  <span>UK</span>
                </button>
                <a
                  href={`https://youglish.com/pronounce/${encodeURIComponent(vocabulary.word)}/english`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-primary/10 transition-colors text-primary text-xs font-medium"
                  aria-label={`Watch real-world usage of ${vocabulary.word} on YouGlish`}
                >
                  <Youtube className="w-4 h-4" />
                  <span>YouGlish</span>
                </a>
              </div>
            )}
          </div>

          {/* Difficulty badge */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <select
                value={draft.difficulty ?? ''}
                onChange={(e) => setDraft({ ...draft, difficulty: (e.target.value || undefined) as CefrLevel | undefined })}
                className="text-xs px-2 py-1 rounded-full border border-border bg-background"
              >
                <option value="">No level</option>
                {(['A1','A2','B1','B2','C1','C2'] as CefrLevel[]).map(l => (
                  <option key={l} value={l}>{l} — {DIFFICULTY_LABELS[l]}</option>
                ))}
              </select>
            ) : (
              difficulty && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border',
                  DIFFICULTY_STYLES[difficulty]
                )}>
                  <span className="font-bold">{difficulty}</span>
                  <span className="opacity-75">·</span>
                  <span>{DIFFICULTY_LABELS[difficulty]}</span>
                </span>
              )
            )}
          </div>

          {isEditing ? (
            <Input
              dir="rtl"
              placeholder="Arabic translation"
              value={draft.arabicTranslation ?? ''}
              onChange={(e) => setDraft({ ...draft, arabicTranslation: e.target.value })}
              className="mt-2 text-lg font-arabic"
            />
          ) : (
            vocabulary.arabicTranslation && (
              <p className="text-lg text-muted-foreground font-arabic mt-1" dir="rtl">
                {vocabulary.arabicTranslation}
              </p>
            )
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
            #{index + 1}
          </span>
          {onUpdate && (
            isEditing ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={saveEdit}
                  className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  aria-label="Save changes"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEdit}
                className="p-1.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Edit word"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Definition */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>Definition</span>
        </div>
        {isEditing ? (
          <Textarea
            value={draft.definition}
            onChange={(e) => setDraft({ ...draft, definition: e.target.value })}
            className="ml-6"
            rows={2}
          />
        ) : (
          <p className="text-foreground leading-relaxed pl-6">
            {vocabulary.definition}
          </p>
        )}
      </div>

      {/* Examples */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Quote className="w-4 h-4" />
          <span>Used like this</span>
        </div>
        {isEditing ? (
          <div className="space-y-2 pl-6">
            {draft.examples.map((example, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Textarea
                  value={example}
                  onChange={(e) => updateListItem('examples', i, e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <button
                  onClick={() => removeListItem('examples', i)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-1"
                  aria-label="Remove example"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addListItem('examples')}
              className="text-xs text-primary hover:underline"
            >
              + Add example
            </button>
          </div>
        ) : (
          <div className="space-y-2 pl-6">
            {vocabulary.examples.map((example, i) => (
              <p key={i} className="text-foreground/90 italic text-sm leading-relaxed border-l-2 border-accent pl-3">
                {example}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Often Used With */}
      {(isEditing || (vocabulary.collocations && vocabulary.collocations.length > 0)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-accent text-accent-foreground uppercase">Often used with</span>
          </div>
          {isEditing ? (
            <div className="pl-6 space-y-2">
              {(draft.collocations ?? []).map((col, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={col}
                    onChange={(e) => updateListItem('collocations', i, e.target.value)}
                    className="text-sm"
                  />
                  <button
                    onClick={() => removeListItem('collocations', i)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove collocation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addListItem('collocations')}
                className="text-xs text-primary hover:underline"
              >
                + Add collocation
              </button>
            </div>
          ) : (
            <p className="text-foreground pl-6">
              {vocabulary.collocations!.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Synonyms & Antonyms */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Synonyms</span>
          </div>
          {isEditing ? (
            <div className="pl-6 space-y-2">
              {draft.synonyms.map((syn, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <Input
                    value={syn}
                    onChange={(e) => updateListItem('synonyms', i, e.target.value)}
                    className="text-xs h-8"
                  />
                  <button
                    onClick={() => removeListItem('synonyms', i)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Remove synonym"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addListItem('synonyms')}
                className="text-xs text-primary hover:underline"
              >
                + Add
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pl-6">
              {vocabulary.synonyms.map((syn, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                >
                  {syn}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowRightLeft className="w-4 h-4 rotate-90" />
            <span>Antonyms</span>
          </div>
          {isEditing ? (
            <div className="pl-6 space-y-2">
              {draft.antonyms.map((ant, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <Input
                    value={ant}
                    onChange={(e) => updateListItem('antonyms', i, e.target.value)}
                    className="text-xs h-8"
                  />
                  <button
                    onClick={() => removeListItem('antonyms', i)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Remove antonym"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addListItem('antonyms')}
                className="text-xs text-primary hover:underline"
              >
                + Add
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pl-6">
              {vocabulary.antonyms.length > 0 && vocabulary.antonyms[0] !== 'N/A' ? (
                vocabulary.antonyms.map((ant, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive"
                  >
                    {ant}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">None applicable</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
