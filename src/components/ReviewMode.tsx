import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CefrLevel, getWordTranslation } from './VocabularyCard';
import { getLanguage, TargetLanguage } from '@/lib/languages';
import { LibraryWord } from '@/lib/library';
import { Grade, formatDueLabel, masteryOf } from '@/lib/spacedRepetition';
import { cn } from '@/lib/utils';

const DIFFICULTY_STYLES: Record<CefrLevel, string> = {
  A1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  B1: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  B2: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  C1: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  C2: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const GRADES: { grade: Grade; label: string; hint: string; className: string; key: string }[] = [
  {
    grade: 'again',
    label: 'Again',
    hint: 'Forgot it',
    className: 'border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-500/10',
    key: '1',
  },
  {
    grade: 'hard',
    label: 'Hard',
    hint: 'Barely recalled',
    className: 'border-orange-500/40 text-orange-700 dark:text-orange-300 hover:bg-orange-500/10',
    key: '2',
  },
  {
    grade: 'good',
    label: 'Good',
    hint: 'Recalled it',
    className:
      'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10',
    key: '3',
  },
  {
    grade: 'easy',
    label: 'Easy',
    hint: 'Instant',
    className: 'border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10',
    key: '4',
  },
];

interface ReviewModeProps {
  courseName: string;
  words: LibraryWord[];
  onClose: () => void;
  /** Persists the grade; resolves once saved. */
  onGrade: (word: LibraryWord, grade: Grade) => Promise<void> | void;
  language?: TargetLanguage;
}

export function ReviewMode({ courseName, words, onClose, onGrade, language }: ReviewModeProps) {
  const lang = language ?? getLanguage(undefined);
  const [queue, setQueue] = useState<LibraryWord[]>(() => words);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const total = useMemo(() => words.length, [words]);

  const word = queue[0];
  const state = word?.review;

  const handleGrade = (grade: Grade) => {
    if (!word) return;
    void onGrade(word, grade);
    setRevealed(false);
    setQueue((q) => (grade === 'again' ? [...q.slice(1), q[0]] : q.slice(1)));
    if (grade !== 'again') setDone((d) => d + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const match = GRADES.find((g) => g.key === e.key);
        if (match) handleGrade(match.grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Review · {courseName}</h2>
          <p className="text-sm text-muted-foreground">
            {queue.length > 0
              ? `${done} of ${total} done · space to reveal, 1–4 to grade`
              : 'Session complete'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close review">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${total ? (done / total) * 100 : 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        {!word ? (
          <div className="text-center space-y-4 max-w-md">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h3 className="font-display text-2xl font-bold text-foreground">All caught up</h3>
            <p className="text-muted-foreground">
              You reviewed {done} word{done !== 1 ? 's' : ''}. They'll resurface automatically when
              they're due again.
            </p>
            <Button onClick={onClose}>Back to library</Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${word.id}-${revealed}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full min-h-[20rem] rounded-2xl border border-border bg-card shadow-lg p-8 flex flex-col justify-center gap-5"
              >
                <div className="text-center space-y-3">
                  <h3 className="font-display text-4xl font-bold text-foreground">{word.word}</h3>
                  {word.pronunciation && (
                    <p className="text-muted-foreground font-mono">{word.pronunciation}</p>
                  )}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {word.difficulty && (
                      <span
                        className={cn(
                          'inline-block text-xs font-semibold px-2.5 py-1 rounded-full border',
                          DIFFICULTY_STYLES[word.difficulty],
                        )}
                      >
                        {word.difficulty}
                      </span>
                    )}
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                      {masteryOf(state)} · {formatDueLabel(state)}
                    </span>
                  </div>
                </div>

                {revealed ? (
                  <div className="space-y-4 border-t border-border pt-5">
                    {getWordTranslation(word) && (
                      <p dir={lang.rtl ? 'rtl' : 'ltr'} className="text-2xl text-primary">
                        {getWordTranslation(word)}
                      </p>
                    )}
                    <p className="text-foreground leading-relaxed">{word.definition}</p>
                    {word.examples?.length > 0 && (
                      <ul className="space-y-2 border-l-2 border-primary/30 pl-4">
                        {word.examples.slice(0, 2).map((ex, i) => (
                          <li key={i} className="text-sm italic text-muted-foreground">
                            “{ex}”
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Recall the meaning, then reveal.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6">
              {!revealed ? (
                <Button className="w-full" size="lg" onClick={() => setRevealed(true)}>
                  Reveal meaning
                </Button>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <Button
                      key={g.grade}
                      variant="outline"
                      className={cn('flex-col h-auto py-3 gap-0.5', g.className)}
                      onClick={() => handleGrade(g.grade)}
                    >
                      <span className="font-semibold">{g.label}</span>
                      <span className="text-[11px] opacity-70">{g.hint}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
