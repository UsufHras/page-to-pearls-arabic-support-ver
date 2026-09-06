CREATE TABLE public.lookup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  word TEXT NOT NULL,
  pronunciation TEXT,
  definition TEXT NOT NULL DEFAULT '',
  translation TEXT,
  difficulty TEXT,
  language_code TEXT,
  examples TEXT[] NOT NULL DEFAULT '{}',
  context_sentence TEXT,
  lookups INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lookup_history TO authenticated;
GRANT ALL ON public.lookup_history TO service_role;

ALTER TABLE public.lookup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lookup history"
  ON public.lookup_history FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX lookup_history_user_word_lang_idx
  ON public.lookup_history (user_id, lower(word), coalesce(language_code, ''));

CREATE INDEX lookup_history_user_created_idx
  ON public.lookup_history (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lookup_history_updated_at
  BEFORE UPDATE ON public.lookup_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();