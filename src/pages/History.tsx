import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, History as HistoryIcon, Loader2, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CefrLevel } from '@/components/VocabularyCard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LANGUAGES, getLanguage } from '@/lib/languages';
import { HistoryEntry, clearHistory, deleteHistoryEntry, fetchHistory } from '@/lib/lookupHistory';
import { cn } from '@/lib/utils';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const DIFFICULTY_STYLES: Record<CefrLevel, string> = {
  A1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  B1: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  B2: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  C1: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  C2: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const History = () => {
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<CefrLevel | 'all'>('all');
  const [languageCode, setLanguageCode] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Word history — Lexicon';
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setEntries(await fetchHistory({ difficulty, languageCode, search }));
    } catch (err) {
      toast({
        title: 'Could not load history',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [session, difficulty, languageCode, search, toast]);

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, session, search]);

  const handleDelete = async (id: string, word: string) => {
    try {
      await deleteHistoryEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast({ title: 'Removed', description: `“${word}” was removed from your history.` });
    } catch {
      toast({ title: 'Could not remove entry', variant: 'destructive' });
    }
  };

  const handleClear = async () => {
    try {
      await clearHistory();
      setEntries([]);
      toast({ title: 'History cleared' });
    } catch {
      toast({ title: 'Could not clear history', variant: 'destructive' });
    }
  };

  const usedLanguages = useMemo(() => {
    const codes = new Set(entries.map((e) => e.languageCode).filter(Boolean) as string[]);
    return LANGUAGES.filter((l) => codes.has(l.code));
  }, [entries]);

  return (
    <div className="min-h-screen bg-gradient-paper">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <HistoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-display font-bold text-foreground truncate">
                Word history
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground">
                Every word you've looked up
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button asChild variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Extractor</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
              <Link to="/library">
                <BookOpenCheck className="w-4 h-4" /> <span className="hidden sm:inline">Library</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {!session && !authLoading ? (
          <div className="card-paper max-w-md mx-auto p-8 text-center space-y-4">
            <HistoryIcon className="w-10 h-10 text-primary mx-auto" />
            <h2 className="font-display text-2xl font-bold text-foreground">Sign in to see your history</h2>
            <p className="text-sm text-muted-foreground">
              Your word lookups are saved to your account, so they follow you across devices.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {/* Filters */}
            <div className="card-paper p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search words…"
                    className="pl-9"
                  />
                </div>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  aria-label="Filter by mother tongue"
                >
                  <option value="all">All languages</option>
                  {(usedLanguages.length > 0 ? usedLanguages : LANGUAGES).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDifficulty('all')}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                    difficulty === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-border hover:text-foreground',
                  )}
                >
                  All levels
                </button>
                {CEFR_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(difficulty === level ? 'all' : level)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                      difficulty === level
                        ? DIFFICULTY_STYLES[level]
                        : 'bg-secondary/50 text-muted-foreground border-border hover:text-foreground',
                    )}
                  >
                    {level}
                  </button>
                ))}
                {entries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto gap-2 text-muted-foreground hover:text-destructive"
                    onClick={handleClear}
                  >
                    <Trash2 className="w-4 h-4" /> Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Entries */}
            {loading || authLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading your history…
              </div>
            ) : entries.length === 0 ? (
              <div className="card-paper p-10 text-center space-y-3">
                <p className="font-display text-lg text-foreground">No words found</p>
                <p className="text-sm text-muted-foreground">
                  {search || difficulty !== 'all' || languageCode !== 'all'
                    ? 'Try widening your filters.'
                    : 'Look words up on the interactive page and they will appear here.'}
                </p>
                <Button asChild variant="outline">
                  <Link to="/interactive">Open the interactive reader</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {entries.map((entry) => {
                  const lang = entry.languageCode ? getLanguage(entry.languageCode) : null;
                  return (
                    <li key={entry.id} className="card-paper p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                              {entry.word}
                            </h3>
                            {entry.pronunciation && (
                              <span className="text-xs font-mono text-muted-foreground">
                                {entry.pronunciation}
                              </span>
                            )}
                            {entry.difficulty && (
                              <span
                                className={cn(
                                  'text-xs font-semibold px-2 py-0.5 rounded-full border',
                                  DIFFICULTY_STYLES[entry.difficulty],
                                )}
                              >
                                {entry.difficulty}
                              </span>
                            )}
                            {lang && (
                              <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-secondary/50 text-muted-foreground">
                                {lang.name}
                              </span>
                            )}
                          </div>
                          {entry.translation && (
                            <p dir={lang?.rtl ? 'rtl' : 'ltr'} className="text-base text-primary">
                              {entry.translation}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {entry.definition}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Looked up {entry.lookups} {entry.lookups === 1 ? 'time' : 'times'} ·{' '}
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry.id, entry.word)}
                          aria-label={`Remove ${entry.word} from history`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
