import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VocabularyWord, CefrLevel } from './VocabularyCard';
import { cn } from '@/lib/utils';

const DIFFICULTY_STYLES: Record<CefrLevel, string> = {
  A1: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  A2: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  B1: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  B2: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  C1: 'bg-red-500/15 text-red-700 border-red-500/30',
  C2: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
};

interface FlashcardModeProps {
  vocabulary: VocabularyWord[];
  onClose: () => void;
}

export function FlashcardMode({ vocabulary, onClose }: FlashcardModeProps) {
  const [order, setOrder] = useState<number[]>(() => vocabulary.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const total = order.length;
  const word = vocabulary[order[position]];

  const next = useCallback(() => {
    setFlipped(false);
    setPosition((p) => (p + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setFlipped(false);
    setPosition((p) => (p - 1 + total) % total);
  }, [total]);

  const shuffle = () => {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setPosition(0);
    setFlipped(false);
  };

  const restart = () => {
    setOrder(vocabulary.map((_, i) => i));
    setPosition(0);
    setFlipped(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  if (!word) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Flashcards</h2>
          <p className="text-sm text-muted-foreground">
            Card {position + 1} of {total} · space to flip, arrows to navigate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={shuffle} className="gap-2">
            <Shuffle className="w-4 h-4" /> Shuffle
          </Button>
          <Button variant="outline" size="sm" onClick={restart} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Restart
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close flashcards">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((position + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.button
              key={`${position}-${flipped}`}
              type="button"
              onClick={() => setFlipped((f) => !f)}
              initial={{ rotateX: flipped ? -90 : 0, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full min-h-[22rem] rounded-2xl border border-border bg-card shadow-lg p-8 text-left flex flex-col justify-center gap-5"
            >
              {!flipped ? (
                <div className="text-center space-y-4">
                  <h3 className="font-display text-4xl font-bold text-foreground">{word.word}</h3>
                  {word.pronunciation && (
                    <p className="text-muted-foreground font-mono">{word.pronunciation}</p>
                  )}
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
                  <p className="text-sm text-muted-foreground pt-4">Tap to reveal meaning</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">{word.word}</h3>
                    {word.arabicTranslation && (
                      <p dir="rtl" className="text-2xl text-primary mt-1">
                        {word.arabicTranslation}
                      </p>
                    )}
                  </div>
                  <p className="text-foreground leading-relaxed">{word.definition}</p>
                  {word.examples?.length > 0 && (
                    <ul className="space-y-2 border-l-2 border-primary/30 pl-4">
                      {word.examples.slice(0, 3).map((ex, i) => (
                        <li key={i} className="text-sm italic text-muted-foreground">
                          “{ex}”
                        </li>
                      ))}
                    </ul>
                  )}
                  {word.synonyms?.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Synonyms: </span>
                      {word.synonyms.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </motion.button>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={prev} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="ghost" onClick={() => setFlipped((f) => !f)}>
              {flipped ? 'Show word' : 'Show meaning'}
            </Button>
            <Button onClick={next} className="gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
