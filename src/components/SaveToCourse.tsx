import { useState } from 'react';
import { Library, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VocabularyWord } from '@/components/VocabularyCard';
import { addWordsToCourse, Course, createCourse, fetchCourses } from '@/lib/library';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SaveToCourseProps {
  words: VocabularyWord[];
  languageCode?: string;
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'secondary';
}

export function SaveToCourse({
  words,
  languageCode,
  label = 'Save to course',
  size = 'default',
  variant = 'outline',
}: SaveToCourseProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = async (value: boolean) => {
    setOpen(value);
    if (value) {
      setNewName('');
      if (!session) return;
      setLoading(true);
      try {
        setCourses(await fetchCourses());
      } catch (err) {
        toast({
          title: 'Could not load your courses',
          description: err instanceof Error ? err.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const saveInto = async (course: Course) => {
    setSaving(true);
    try {
      const added = await addWordsToCourse(course.id, words);
      setOpen(false);
      toast({
        title: added > 0 ? `Saved to ${course.name}` : 'Nothing new to add',
        description:
          added > 0
            ? `${added} word${added !== 1 ? 's' : ''} saved to your account.`
            : 'These words are already in that course.',
      });
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const course = await createCourse(newName, { languageCode });
      setSaving(false);
      await saveInto(course);
    } catch (err) {
      setSaving(false);
      toast({
        title: 'Could not create course',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => void handleOpenChange(v)}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2" disabled={words.length === 0}>
          <Library className="w-4 h-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Save to a course</DialogTitle>
          <DialogDescription>
            Add {words.length} word{words.length !== 1 ? 's' : ''} to a course in your library.
          </DialogDescription>
        </DialogHeader>

        {!session ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to save words to your account so your library is kept safe across devices.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Sign in or create an account</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading your courses…
              </div>
            ) : (
              courses.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing courses</Label>
                  <ul className="max-h-52 overflow-y-auto space-y-2">
                    {courses.map((course) => (
                      <li key={course.id}>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveInto(course)}
                          className="w-full text-left rounded-lg border border-border bg-card px-3 py-2 hover:border-primary transition-colors disabled:opacity-60"
                        >
                          <span className="block font-medium text-foreground">{course.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {course.words.length} word{course.words.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}

            <div className="space-y-2">
              <Label htmlFor="new-course-name">New course</Label>
              <div className="flex gap-2">
                <Input
                  id="new-course-name"
                  value={newName}
                  placeholder="e.g. Chapter 3 — Biology"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleCreate();
                  }}
                />
                <Button
                  onClick={() => void handleCreate()}
                  disabled={!newName.trim() || saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
