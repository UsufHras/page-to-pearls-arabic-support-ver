import { useState } from 'react';
import { Library, Plus } from 'lucide-react';
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
import { addWordsToCourse, countNewWords, Course, createCourse, loadCourses } from '@/lib/library';
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
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [newName, setNewName] = useState('');

  const refresh = (next?: Course[]) => setCourses(next ?? loadCourses());

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      refresh();
      setNewName('');
    }
  };

  const saveInto = (course: Course) => {
    const added = countNewWords(course, words);
    addWordsToCourse(course.id, words);
    setOpen(false);
    toast({
      title: added > 0 ? `Saved to ${course.name}` : 'Nothing new to add',
      description:
        added > 0
          ? `${added} word${added !== 1 ? 's' : ''} added to your library.`
          : 'These words are already in that course.',
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const course = createCourse(newName, { languageCode });
    saveInto(course);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <div className="space-y-4">
          {courses.length > 0 && (
            <div className="space-y-2">
              <Label>Existing courses</Label>
              <ul className="max-h-52 overflow-y-auto space-y-2">
                {courses.map((course) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => saveInto(course)}
                      className="w-full text-left rounded-lg border border-border bg-card px-3 py-2 hover:border-primary transition-colors"
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
                  if (e.key === 'Enter') handleCreate();
                }}
              />
              <Button onClick={handleCreate} disabled={!newName.trim()} className="gap-2">
                <Plus className="w-4 h-4" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
