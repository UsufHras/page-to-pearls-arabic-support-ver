import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, X, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VocabularyWord } from './VocabularyCard';
import { toast } from 'sonner';

interface FlashcardStudyModeProps {
  vocabulary: VocabularyWord[];
  onClose: () => void;
}

export function FlashcardStudyMode({ vocabulary, onClose }: FlashcardStudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null);

  const currentWord = vocabulary[currentIndex];

  const goToNext = () => {
    if (currentIndex < vocabulary.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  const resetCards = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(0), 150);
  };

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
          body: JSON.stringify({ word: currentWord.word, accent }),
        }
      );

      if (!response.ok) throw new Error('Failed to get pronunciation');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingAccent(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setPlayingAccent(null);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio');
      };
      
      await audio.play();
    } catch (error) {
      console.error('Pronunciation error:', error);
      toast.error('Failed to play pronunciation');
      setPlayingAccent(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
    >
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Card {currentIndex + 1} of {vocabulary.length}
          </span>
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / vocabulary.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative w-full aspect-[3/4] cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              className="absolute inset-0 w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of card - Word */}
              <div
                className="absolute inset-0 w-full h-full card-paper rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                  Tap to reveal
                </span>
                <h2 className="text-4xl md:text-5xl font-display font-bold text-primary text-center capitalize">
                  {currentWord.word}
                </h2>
                {currentWord.arabicTranslation && (
                  <p className="text-xl text-muted-foreground font-arabic mt-4" dir="rtl">
                    {currentWord.arabicTranslation}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-6">
                  <button
                    onClick={(e) => { e.stopPropagation(); playPronunciation('us'); }}
                    disabled={playingAccent !== null}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors text-primary disabled:opacity-50 text-sm font-medium"
                  >
                    {playingAccent === 'us' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                    <span>US</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); playPronunciation('uk'); }}
                    disabled={playingAccent !== null}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors text-primary disabled:opacity-50 text-sm font-medium"
                  >
                    {playingAccent === 'uk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                    <span>UK</span>
                  </button>
                </div>
              </div>

              {/* Back of card - Definition & Examples */}
              <div
                className="absolute inset-0 w-full h-full card-paper rounded-2xl p-6 flex flex-col overflow-y-auto"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Definition
                </span>
                <p className="text-lg text-foreground leading-relaxed mb-4">
                  {currentWord.definition}
                </p>

                {currentWord.examples.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Examples
                    </span>
                    <div className="space-y-2 mb-4">
                      {currentWord.examples.slice(0, 2).map((example, i) => (
                        <p key={i} className="text-sm text-foreground/90 italic border-l-2 border-accent pl-3">
                          {example}
                        </p>
                      ))}
                    </div>
                  </>
                )}

                {currentWord.collocations && currentWord.collocations.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Often used with
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {currentWord.collocations.map((col, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent text-accent-foreground">
                          {col}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-auto grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Synonyms
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentWord.synonyms.slice(0, 3).map((syn, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Antonyms
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentWord.antonyms.length > 0 && currentWord.antonyms[0] !== 'N/A' ? (
                        currentWord.antonyms.slice(0, 3).map((ant, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
                            {ant}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="h-12 w-12 rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={resetCards}
          className="h-10 w-10 rounded-full"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex === vocabulary.length - 1}
          className="h-12 w-12 rounded-full"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        Tap card to flip • Use arrows to navigate
      </p>
    </motion.div>
  );
}
