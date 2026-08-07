import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, X, Plus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  isProcessing: boolean;
}

export function ImageUpload({ images, onImagesChange, isProcessing }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      onImagesChange([...images, ...results]);
    });
  }, [images, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  }, [images, onImagesChange]);

  return (
    <div className="w-full space-y-4">
      <AnimatePresence mode="wait">
        {images.length === 0 ? (
          <motion.label
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-80 cursor-pointer",
              "card-paper transition-all duration-300",
              "border-2 border-dashed",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />

            <motion.div
              animate={{ y: isDragging ? -5 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4 p-8"
            >
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  Drop your book pages here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse — select multiple pages at once
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  PNG, JPG up to 10MB each
                </span>
              </div>
            </motion.div>
          </motion.label>
        ) : null}
      </AnimatePresence>

      {images.length === 0 && !isProcessing && (
        <label className="flex items-center justify-center gap-2 w-full py-3 rounded-lg cursor-pointer card-paper border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
          />
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Take a photo with your camera</span>
        </label>
      )}

      <AnimatePresence mode="wait">
        {images.length > 0 ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative space-y-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((src, index) => (
                <div key={index} className="relative card-paper overflow-hidden group">
                  <img
                    src={src}
                    alt={`Book page ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-background/90 border border-border text-xs text-muted-foreground">
                    Page {index + 1}
                  </span>
                  {!isProcessing && (
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      aria-label={`Remove page ${index + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {!isProcessing && (
                <>
                  <label className="relative flex flex-col items-center justify-center h-40 cursor-pointer card-paper border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <span className="mt-2 text-sm text-muted-foreground">Add page</span>
                  </label>

                  <label className="relative flex flex-col items-center justify-center h-40 cursor-pointer card-paper border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="mt-2 text-sm text-muted-foreground">Take photo</span>
                  </label>
                </>
              )}
            </div>

            {isProcessing && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse-soft">
                  Extracting vocabulary from {images.length} page{images.length !== 1 ? 's' : ''}...
                </p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
