import { motion } from 'framer-motion';
import { BookOpen, Quote, ArrowRightLeft } from 'lucide-react';

export interface VocabularyWord {
  word: string;
  pronunciation?: string;
  definition: string;
  arabicTranslation?: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

interface VocabularyCardProps {
  vocabulary: VocabularyWord;
  index: number;
}

export function VocabularyCard({ vocabulary, index }: VocabularyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="card-paper p-6 space-y-5"
    >
      {/* Word Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-2xl font-display font-bold text-primary capitalize">
              {vocabulary.word}
            </h3>
            {vocabulary.pronunciation && (
              <span className="text-sm text-muted-foreground font-mono">
                {vocabulary.pronunciation}
              </span>
            )}
          </div>
          {vocabulary.arabicTranslation && (
            <p className="text-lg text-muted-foreground font-arabic mt-1" dir="rtl">
              {vocabulary.arabicTranslation}
            </p>
          )}
        </div>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
          #{index + 1}
        </span>
      </div>

      {/* Definition */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>Definition</span>
        </div>
        <p className="text-foreground leading-relaxed pl-6">
          {vocabulary.definition}
        </p>
      </div>

      {/* Examples */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Quote className="w-4 h-4" />
          <span>Used like this</span>
        </div>
        <div className="space-y-2 pl-6">
          {vocabulary.examples.map((example, i) => (
            <p key={i} className="text-foreground/90 italic text-sm leading-relaxed border-l-2 border-accent pl-3">
              {example}
            </p>
          ))}
        </div>
      </div>

      {/* Synonyms & Antonyms */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Synonyms</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {vocabulary.synonyms.map((syn, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
              >
                {syn}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowRightLeft className="w-4 h-4 rotate-90" />
            <span>Antonyms</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {vocabulary.antonyms.length > 0 && vocabulary.antonyms[0] !== 'N/A' ? (
              vocabulary.antonyms.map((ant, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive"
                >
                  {ant}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">None applicable</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}