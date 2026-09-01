import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Library as LibraryIcon,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlashcardMode } from '@/components/FlashcardMode';
import { VocabularyCard, VocabularyWord } from '@/components/VocabularyCard';
import {
  Course,
  createCourse,
  deleteCourse,
  loadCourses,
  removeWordFromCourse,
  updateCourse,
} from '@/lib/library';
import { getLanguage, loadStoredLanguageCode } from '@/lib/languages';
import { useToast } from '@/hooks/use-toast';

const Library = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isStudying, setIsStudying] = useState(false);

  const language = useMemo(() => getLanguage(loadStoredLanguageCode()), []);
  const selected = courses.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    document.title = 'Vocabulary Library — Lexicon';
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const course = createCourse(newName, { languageCode: language.code });
    setCourses(loadCourses());
    setSelectedId(course.id);
    setNewName('');
  };

  const handleDelete = (course: Course) => {
    setCourses(deleteCourse(course.id));
    if (selectedId === course.id) setSelectedId(null);
    toast({ title: 'Course deleted', description: `“${course.name}” was removed.` });
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      setCourses(updateCourse(renamingId, { name: renameValue.trim() }));
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRemoveWord = (course: Course, word: VocabularyWord) => {
    setCourses(removeWordFromCourse(course.id, word.word));
  };

  const handleUpdateWord = (course: Course, index: number, updated: VocabularyWord) => {
    const words = course.words.map((w, i) => (i === index ? updated : w));
    setCourses(updateCourse(course.id, { words }));
  };

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
              <p className="text-xs text-muted-foreground">Courses &amp; saved flashcards</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                Extractor
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
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
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
                <Button onClick={handleCreate} disabled={!newName.trim()} size="icon" aria-label="Create course">
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
                courses.map((course) => (
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
                            {course.words.length} word{course.words.length !== 1 ? 's' : ''} ·{' '}
                            {new Date(course.updatedAt).toLocaleDateString()}
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
                            handleDelete(course);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
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
                  <Button
                    className="gap-2"
                    disabled={selected.words.length === 0}
                    onClick={() => setIsStudying(true)}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Study course
                  </Button>
                </div>

                {selected.words.length === 0 ? (
                  <div className="card-paper p-8 text-center text-sm text-muted-foreground">
                    This course is empty. Save words into it from the extractor or the interactive
                    reader.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {selected.words.map((word, index) => (
                      <div key={`${word.word}-${index}`} className="relative">
                        <VocabularyCard
                          vocabulary={word}
                          index={index}
                          language={language}
                          onUpdate={(updated) => handleUpdateWord(selected, index, updated)}
                        />
                        <button
                          type="button"
                          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive bg-card/80"
                          aria-label={`Remove ${word.word}`}
                          onClick={() => handleRemoveWord(selected, word)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
    </div>
  );
};

export default Library;
