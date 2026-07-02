import { motion } from 'framer-motion';
import { VocabularyCard, VocabularyWord } from './VocabularyCard';
import { Button } from '@/components/ui/button';
import { FileDown, RotateCcw } from 'lucide-react';

interface VocabularyResultsProps {
  vocabulary: VocabularyWord[];
  onGeneratePdf: () => void;
  onReset: () => void;
  onUpdateWord: (index: number, updated: VocabularyWord) => void;
  isGeneratingPdf: boolean;
}

export function VocabularyResults({
  vocabulary,
  onGeneratePdf,
  onReset,
  onUpdateWord,
  isGeneratingPdf,
}: VocabularyResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Extracted Vocabulary
          </h2>
          <p className="text-muted-foreground mt-1">
            {vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''} found · tap the pencil to edit before export
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            New Page
          </Button>
          <Button
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Vocabulary Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {vocabulary.map((word, index) => (
          <VocabularyCard
            key={index}
            vocabulary={word}
            index={index}
            onUpdate={(updated) => onUpdateWord(index, updated)}
          />
        ))}
      </div>
    </motion.div>
  );
}
