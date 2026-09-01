import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelect } from '@/components/LanguageSelect';
import { FlashcardMode } from '@/components/FlashcardMode';
import { VocabularyWord, CefrLevel, getWordTranslation } from '@/components/VocabularyCard';
import { getLanguage, loadStoredLanguageCode, LANGUAGE_STORAGE_KEY } from '@/lib/languages';
import { addToDeck, loadDeck, removeFromDeck } from '@/lib/flashcardDeck';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DIFFICULTY_STYLES: Record<CefrLevel, string> = {
  A1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  B1: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  B2: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  C1: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  C2: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const WORD_RE = /[A-Za-z][A-Za-z'’-]*/;

function splitParagraph(paragraph: string) {
  return paragraph.split(/(\s+)/);
}

function sentenceAround(text: string, index: number) {
  const start = Math.max(
    text.lastIndexOf('.', index),
    text.lastIndexOf('!', index),
    text.lastIndexOf('?', index),
  );
  const rest = text.slice(index);
  const endMatch = rest.search(/[.!?]/);
  const end = endMatch === -1 ? text.length : index + endMatch + 1;
  return text.slice(start + 1, end).trim();
}

const Interactive = () => {
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [pageText, setPageText] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [languageCode, setLanguageCode] = useState<string>(() => loadStoredLanguageCode());
  const language = getLanguage(languageCode);

  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [lookup, setLookup] = useState<VocabularyWord | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [deck, setDeck] = useState<VocabularyWord[]>(() => loadDeck());
  const [isStudying, setIsStudying] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  }, [languageCode]);

  const paragraphs = useMemo(
    () => (pageText ? pageText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : []),
    [pageText],
  );

  const inDeck = (w: string) => deck.some((d) => d.word.toLowerCase() === w.toLowerCase());

  const handleRead = async () => {
    if (images.length === 0) return;
    setIsReading(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-page', {
        body: { imageBase64: images[0] },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to read the page');
      setPageText(data.text as string);
    } catch (error) {
      toast({
        title: 'Could not read the page',
        description: error instanceof Error ? error.message : 'Please try another photo.',
        variant: 'destructive',
      });
    } finally {
      setIsReading(false);
    }
  };

  const handleWordClick = async (raw: string, sentence: string) => {
    const clean = raw.match(WORD_RE)?.[0];
    if (!clean) return;
    setActiveWord(clean);
    setLookup(null);
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-word', {
        body: { word: clean, sentence, targetLanguage: language.name, targetLanguageCode: language.code },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Lookup failed');
      const entry = data.entry as VocabularyWord;
      setLookup({
        ...entry,
        word: entry.word || clean,
        examples: entry.examples ?? [],
        synonyms: entry.synonyms ?? [],
        antonyms: entry.antonyms ?? [],
      });
    } catch (error) {
      toast({
        title: 'Lookup failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setActiveWord(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAdd = () => {
    if (!lookup) return;
    setDeck(addToDeck(lookup));
    toast({ title: 'Added to flashcards', description: `“${lookup.word}” is in your deck.` });
  };

  const handlePronounce = async () => {
    if (!lookup || playing) return;
    setPlaying(true);
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
          body: JSON.stringify({ word: lookup.word, accent: 'us' }),
        }
      );
      if (!response.ok) throw new Error('Failed to get pronunciation');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => { setPlaying(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setPlaying(false); URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch {
      toast({ title: 'Audio unavailable', variant: 'destructive' });
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Interactive Page</h1>
              <p className="text-xs text-muted-foreground">Tap any word to learn it</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" /> Extractor
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        {!pageText ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Read any page, <span className="text-primary">interactively</span>
              </h2>
              <p className="text-muted-foreground">
                Upload a page and it becomes live text — click a word for its meaning, translation and
                examples, then add it to your flashcard deck.
              </p>
            </div>

            <div className="card-paper p-5">
              <LanguageSelect value={languageCode} onChange={setLanguageCode} disabled={isReading} />
            </div>

            <ImageUpload
              images={images}
              onImagesChange={(next) => setImages(next.slice(-1))}
              isProcessing={isReading}
            />

            {images.length > 0 && (
              <div className="flex justify-center">
                <Button size="lg" className="gap-2 px-8" onClick={handleRead} disabled={isReading}>
                  {isReading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Reading page…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Make it interactive
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
            <div className="card-paper p-6 md:p-8">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-muted-foreground">Click any word for its meaning</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPageText(null);
                    setImages([]);
                    setActiveWord(null);
                    setLookup(null);
                  }}
                >
                  New page
                </Button>
              </div>
              <div className="space-y-4 font-body text-lg leading-loose text-foreground">
                {paragraphs.map((paragraph, pi) => (
                  <p key={pi}>
                    {splitParagraph(paragraph).map((token, ti) => {
                      const match = token.match(WORD_RE);
                      if (!match) return <span key={ti}>{token}</span>;
                      const clean = match[0];
                      const isActive = activeWord?.toLowerCase() === clean.toLowerCase();
                      return (
                        <button
                          key={ti}
                          type="button"
                          onClick={() =>
                            handleWordClick(clean, sentenceAround(paragraph, paragraph.indexOf(token)))
                          }
                          className={cn(
                            'rounded px-0.5 transition-colors hover:bg-primary/15 hover:text-primary',
                            isActive && 'bg-primary/20 text-primary font-semibold',
                            inDeck(clean) && 'underline decoration-accent decoration-2 underline-offset-4',
                          )}
                        >
                          {token}
                        </button>
                      );
                    })}
                  </p>
                ))}
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 space-y-4">
              <div className="card-paper p-5 min-h-[12rem]">
                {isLookingUp ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Looking up “{activeWord}”…
                  </div>
                ) : lookup ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-2xl font-bold text-foreground">{lookup.word}</h3>
                        {lookup.pronunciation && (
                          <p className="text-sm font-mono text-muted-foreground">{lookup.pronunciation}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handlePronounce}
                          disabled={playing}
                          aria-label="Play pronunciation"
                        >
                          {playing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setLookup(null);
                            setActiveWord(null);
                          }}
                          aria-label="Close"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {lookup.difficulty && (
                      <span
                        className={cn(
                          'inline-block text-xs font-semibold px-2.5 py-1 rounded-full border',
                          DIFFICULTY_STYLES[lookup.difficulty],
                        )}
                      >
                        {lookup.difficulty}
                      </span>
                    )}

                    {getWordTranslation(lookup) && (
                      <p dir={language.rtl ? 'rtl' : 'ltr'} className="text-xl text-primary">
                        {getWordTranslation(lookup)}
                      </p>
                    )}

                    <p className="text-sm text-foreground leading-relaxed">{lookup.definition}</p>

                    {lookup.examples?.length > 0 && (
                      <ul className="space-y-1.5 border-l-2 border-primary/30 pl-3">
                        {lookup.examples.slice(0, 2).map((ex, i) => (
                          <li key={i} className="text-sm italic text-muted-foreground">
                            “{ex}”
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className="w-full gap-2"
                      onClick={handleAdd}
                      disabled={inDeck(lookup.word)}
                    >
                      {inDeck(lookup.word) ? (
                        <>
                          <Check className="w-4 h-4" /> In your deck
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Add to flashcards
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click a word in the page to see its definition, translation and examples here.
                  </p>
                )}
              </div>

              <div className="card-paper p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold text-foreground">
                    My deck ({deck.length})
                  </h4>
                  {deck.length > 0 && (
                    <Button size="sm" className="gap-2" onClick={() => setIsStudying(true)}>
                      <GraduationCap className="w-4 h-4" /> Study
                    </Button>
                  )}
                </div>
                {deck.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved words yet.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                    {deck.map((w) => (
                      <li
                        key={w.word}
                        className="flex items-center justify-between gap-2 text-sm text-foreground"
                      >
                        <span className="truncate">{w.word}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeck(removeFromDeck(w.word))}
                          aria-label={`Remove ${w.word}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {isStudying && deck.length > 0 && (
        <FlashcardMode
          vocabulary={deck}
          language={language}
          onClose={() => setIsStudying(false)}
        />
      )}
    </div>
  );
};

export default Interactive;
