import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Library, MousePointerClick, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/ImageUpload';
import { VocabularyResults } from '@/components/VocabularyResults';
import { VocabularyWord } from '@/components/VocabularyCard';
import { generateVocabularyPdf } from '@/lib/generatePdf';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelect } from '@/components/LanguageSelect';
import { getLanguage, loadStoredLanguageCode, LANGUAGE_STORAGE_KEY } from '@/lib/languages';

const Index = () => {
  const [vocabulary, setVocabulary] = useState<VocabularyWord[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [languageCode, setLanguageCode] = useState<string>(() => loadStoredLanguageCode());
  const language = getLanguage(languageCode);

  const handleLanguageChange = (code: string) => {
    setLanguageCode(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  };
  const { toast } = useToast();

  const handleImagesChange = (images: string[]) => {
    setSelectedImages(images);
    setVocabulary(null);
  };

  const handleExtract = async () => {
    if (selectedImages.length === 0) return;

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('extract-vocabulary', {
        body: {
          imagesBase64: selectedImages,
          targetLanguage: language.name,
          targetLanguageCode: language.code,
        }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.vocabulary) {
        setVocabulary(data.vocabulary);
        toast({
          title: 'Success!',
          description: `Extracted ${data.vocabulary.length} vocabulary words from ${selectedImages.length} page${selectedImages.length !== 1 ? 's' : ''}.`,
        });
      } else {
        throw new Error(data.error || 'Failed to extract vocabulary');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Failed to process images',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!vocabulary) return;
    setIsGeneratingPdf(true);
    
    try {
      await generateVocabularyPdf(vocabulary, language);
      toast({
        title: 'PDF Generated!',
        description: 'Your vocabulary document has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'PDF Generation Failed',
        description: 'Could not generate the PDF document.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleReset = () => {
    setVocabulary(null);
    setSelectedImages([]);
  };

  const handleUpdateWord = (index: number, updated: VocabularyWord) => {
    setVocabulary((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">Lexicon</h1>
                <p className="text-xs text-muted-foreground">Vocabulary Extraction</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to="/interactive">
                  <MousePointerClick className="w-4 h-4" />
                  Interactive Reader
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to="/library">
                  <Library className="w-4 h-4" />
                  Library
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        {!vocabulary ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Hero Section */}
            <div className="text-center space-y-4 py-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 text-accent border border-accent/25"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Powered Extraction</span>
              </motion.div>
              
              <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                Turn Highlights into
                <span className="text-primary"> Knowledge</span>
              </h2>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload one or more pages from your book with highlighted words, pick your mother
                tongue, and let AI extract definitions, translations, examples, synonyms, and
                antonyms—all in a beautiful PDF.
              </p>
            </div>

            {/* Upload Section */}
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="card-paper p-5">
                <LanguageSelect
                  value={languageCode}
                  onChange={handleLanguageChange}
                  disabled={isProcessing}
                />
              </div>

              <ImageUpload
                images={selectedImages}
                onImagesChange={handleImagesChange}
                isProcessing={isProcessing}
              />

              {selectedImages.length > 0 && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <Button
                    size="lg"
                    onClick={handleExtract}
                    className="gap-2 px-8"
                  >
                    <Sparkles className="w-4 h-4" />
                    Extract Vocabulary
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              {[
                {
                  title: 'Smart Detection',
                  description: 'AI identifies highlighted words in your book pages automatically.'
                },
                {
                  title: 'Rich Context',
                  description: 'Get definitions, usage examples, synonyms, and antonyms for each word.'
                },
                {
                  title: 'Beautiful PDFs',
                  description: 'Download organized, print-ready vocabulary documents.'
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="card-paper p-6 text-center"
                >
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <VocabularyResults
            vocabulary={vocabulary}
            onGeneratePdf={handleGeneratePdf}
            onReset={handleReset}
            onUpdateWord={handleUpdateWord}
            isGeneratingPdf={isGeneratingPdf}
            language={language}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Built with AI • Extract vocabulary from any book page
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;