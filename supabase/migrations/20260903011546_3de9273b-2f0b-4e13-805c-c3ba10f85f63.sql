CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  language_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.course_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  word TEXT NOT NULL,
  pronunciation TEXT,
  definition TEXT NOT NULL DEFAULT '',
  translation TEXT,
  difficulty TEXT,
  examples TEXT[] NOT NULL DEFAULT '{}',
  collocations TEXT[] NOT NULL DEFAULT '{}',
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  antonyms TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease NUMERIC NOT NULL DEFAULT 2.5,
  due_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  reviews INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX course_words_unique_word ON public.course_words (course_id, lower(word));
CREATE INDEX course_words_course_idx ON public.course_words (course_id, position);
CREATE INDEX courses_user_idx ON public.courses (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_words TO authenticated;
GRANT ALL ON public.course_words TO service_role;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own courses" ON public.courses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own course words" ON public.course_words
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_course_words_updated_at BEFORE UPDATE ON public.course_words
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();