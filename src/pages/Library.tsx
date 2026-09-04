import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CloudUpload,
  GraduationCap,
  Library as LibraryIcon,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlashcardMode } from '@/components/FlashcardMode';
import { ReviewMode } from '@/components/ReviewMode';
import { VocabularyCard, VocabularyWord } from '@/components/VocabularyCard';
import {
  Course,
  LibraryWord,
  createCourse,
  deleteCourse,
  fetchCourses,
  gradeWord,
  hasLegacyLocalLibrary,
  importLegacyLocalLibrary,
  removeWord,
  renameCourse,
  resetCourseProgress,
  updateWord,
} from '@/lib/library';
import {
  Grade,
  formatDueLabel,
  masteryOf,
  selectDue,
  summariseProgress,
} from '@/lib/spacedRepetition';
import { getLanguage, loadStoredLanguageCode } from '@/lib/languages';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Library = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, loading: authLoading, signOut } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isStudying, setIsStudying] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const language = useMemo(() => getLanguage(loadStoredLanguageCode()), []);
  const selected = courses.find((c) => c.id === selectedId) ?? null;
  const progress = selected ? summariseProgress(selected.words) : null;
  const due = selected ? selectDue(selected.words) : [];

  useEffect(() => {
    document.title = 'Vocabulary Library — Lexicon';
  }, []);

  useEffect(() => {
    if (!authLoading && !session) navigate('/auth', { replace: true });
  }, [authLoading, session, navigate]);

  const reload = useCallback(async () => {
    try {
      setCourses(await fetchCourses());
    } catch (err) {
      toast({
        title: 'Could not load your library',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!session) return;
    setShowImport(hasLegacyLocalLibrary());
    void reload();
  }, [session, reload]);

  const run = async (action: () => Promise<unknown>, errorTitle: string) => {
    try {
      await action();
      await reload();
    } catch (err) {
      toast({
        title: errorTitle,
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const name = newName.trim();
    setNewName('');
    try {
      const course = await createCourse(name, { languageCode: language.code });
      setSelectedId(course.id);
      await reload();
    } catch (err) {
      toast({
        title: 'Could not create course',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (course: Course) =>
    run(async () => {
      await deleteCourse(course.id);
      if (selectedId === course.id) setSelectedId(null);
      toast({ title: 'Course deleted', description: `“${course.name}” was removed.` });
    }, 'Could not delete course');

  const commitRename = () => {
    const id = renamingId;
    const value = renameValue.trim();
    setRenamingId(null);
    setRenameValue('');
    if (id && value) void run(() => renameCourse(id, value), 'Could not rename course');
  };

  const handleGrade = async (word: LibraryWord, grade: Grade) => {
    try {
      const next = await gradeWord(word.id, word.review, grade);
      setCourses((prev) =>
        prev.map((c) => ({
          ...c,
          words: c.words.map((w) => (w.id === word.id ? { ...w, review: next } : w)),
        })),
      );
    } catch (err) {
      toast({
        title: 'Could not save your review',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = () =>
    run(async () => {
      setImporting(true);
      try {
        const count = await importLegacyLocalLibrary();
        setShowImport(false);
        toast({
          title: count > 0 ? 'Library imported' : 'Nothing to import',
          description:
            count > 0
              ? `${count} course${count !== 1 ? 's' : ''} moved from this browser to your account.`
              : 'No browser-only courses were found.',
        });
      } finally {
        setImporting(false);
      }
    }, 'Could not import your old library');

  if (authLoading || (session && loading)) {
    return (
      <div className="min-h-screen bg-gradient-paper flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-paper">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LibraryIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">My Library</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[14rem]">
                {session?.user.email ?? 'Synced to your account'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                Extractor
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={async () => {
                await signOut();
                navigate('/auth', { replace: true });
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {showImport && (
          <div className="card-paper p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-foreground">
                Courses found in this browser
              </h2>
              <p className="text-sm text-muted-foreground">
                Move them into your account so they survive a browser reset.
              </p>
            </div>
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              Import to my account
            </Button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Courses list */}
          <aside className="space-y-4">
            <div className="card-paper p-5 space-y-3">
              <h2 className="font-display font-semibold text-foreground">New course</h2>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  placeholder="Course name"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleCreate();
                  }}
                />
                <Button
                  onClick={() => void handleCreate()}
                  disabled={!newName.trim()}
                  size="icon"
                  aria-label="Create course"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">
                  No courses yet. Create one here, or save extracted words from the extractor and
                  interactive reader.
                </p>
              ) : (
                courses.map((course) => {
                  const courseDue = selectDue(course.words).length;
                  return (
                    <motion.div
                      key={course.id}
                      layout
                      className={`card-paper p-4 cursor-pointer transition-colors ${
                        selectedId === course.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedId(course.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {renamingId === course.id ? (
                          <Input
                            autoFocus
                            value={renameValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                          />
                        ) : (
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{course.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {course.words.length} word{course.words.length !== 1 ? 's' : ''}
                              {courseDue > 0 && (
                                <span className="text-primary font-medium"> · {courseDue} due</span>
                              )}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            className="p-1.5 text-muted-foreground hover:text-primary"
                            aria-label={`Rename ${course.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingId(course.id);
                              setRenameValue(course.name);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${course.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(course);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Selected course */}
          <section>
            {!selected ? (
              <div className="card-paper p-10 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Select a course
                </h2>
                <p className="text-muted-foreground text-sm">
                  Pick a course on the left to review its words or study them as flashcards.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      {selected.name}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {selected.words.length} word{selected.words.length !== 1 ? 's' : ''} saved
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      className="gap-2"
                      disabled={due.length === 0}
                      onClick={() => setIsReviewing(true)}
                    >
                      <Brain className="w-4 h-4" />
                      Review {due.length > 0 ? `(${due.length} due)` : 'up to date'}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={selected.words.length === 0}
                      onClick={() => setIsStudying(true)}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Browse flashcards
                    </Button>
                  </div>
                </div>

                {progress && selected.words.length > 0 && (
                  <div className="card-paper p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">
                          Spaced repetition
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {progress.due > 0
                            ? `${progress.due} word${progress.due !== 1 ? 's' : ''} ready to review (${progress.newCount} new)`
                            : progress.nextDueAt
                              ? `Nothing due — next review ${new Date(progress.nextDueAt).toLocaleDateString()}`
                              : 'Nothing due right now'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground"
                        onClick={() =>
                          void run(async () => {
                            await resetCourseProgress(selected.id);
                            toast({
                              title: 'Schedule reset',
                              description: 'All words are due again.',
                            });
                          }, 'Could not reset progress')
                        }
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset progress
                      </Button>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      {(
                        [
                          ['Mastered', 'bg-primary'],
                          ['Known', 'bg-emerald-500'],
                          ['Familiar', 'bg-amber-500'],
                          ['Learning', 'bg-orange-500'],
                          ['New', 'bg-muted-foreground/30'],
                        ] as const
                      ).map(([key, color]) => (
                        <div
                          key={key}
                          className={color}
                          style={{
                            width: `${(progress.byMastery[key] / Math.max(1, progress.total)) * 100}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {(['New', 'Learning', 'Familiar', 'Known', 'Mastered'] as const).map((k) => (
                        <span key={k}>
                          {k}:{' '}
                          <span className="text-foreground font-medium">
                            {progress.byMastery[k]}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.words.length === 0 ? (
                  <div className="card-paper p-8 text-center text-sm text-muted-foreground">
                    This course is empty. Save words into it from the extractor or the interactive
                    reader.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {selected.words.map((word, index) => (
                      <div key={word.id} className="relative">
                        <VocabularyCard
                          vocabulary={word}
                          index={index}
                          language={language}
                          onUpdate={(updated: VocabularyWord) =>
                            void run(
                              () => updateWord(word.id, updated),
                              'Could not save your edit',
                            )
                          }
                        />
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border bg-card/90 text-muted-foreground">
                            {masteryOf(word.review)} · {formatDueLabel(word.review)}
                          </span>
                          <button
                            type="button"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive bg-card/80"
                            aria-label={`Remove ${word.word}`}
                            onClick={() =>
                              void run(() => removeWord(word.id), 'Could not remove word')
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {isStudying && selected && selected.words.length > 0 && (
        <FlashcardMode
          vocabulary={selected.words}
          language={language}
          onClose={() => setIsStudying(false)}
        />
      )}

      {isReviewing && selected && due.length > 0 && (
        <ReviewMode
          courseName={selected.name}
          words={due}
          language={language}
          onGrade={handleGrade}
          onClose={() => setIsReviewing(false)}
        />
      )}
    </div>
  );
};

export default Library;
