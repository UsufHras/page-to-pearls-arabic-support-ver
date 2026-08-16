import jsPDF from 'jspdf';
import { VocabularyWord, getWordTranslation } from '@/components/VocabularyCard';
import { getLanguage, TargetLanguage } from '@/lib/languages';


let amiriFontBase64: string | null = null;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font: ${res.status}`);

  const blob = await res.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read font blob'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(',')[1];
      if (!base64) return reject(new Error('Invalid font data URL'));
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

// Load and register Arabic font (for proper Arabic glyphs in PDF)
async function loadArabicFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!amiriFontBase64) {
      // Served from /public
      amiriFontBase64 = await fetchAsBase64('/fonts/Amiri-Regular.ttf');
    }

    doc.addFileToVFS('Amiri-Regular.ttf', amiriFontBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    return true;
  } catch (error) {
    console.warn('Failed to load Arabic font, falling back to default:', error);
    return false;
  }
}

export async function generateVocabularyPdf(
  vocabulary: VocabularyWord[],
  language: TargetLanguage = getLanguage(undefined)
): Promise<void> {
  const doc = new jsPDF();

  const needsArabicFont = language.script === 'arabic';
  const hasArabicFont = needsArabicFont ? await loadArabicFont(doc) : false;
  const canRenderTranslation = needsArabicFont ? hasArabicFont : true;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [46, 85, 64]; // Forest green
  const accentColor: [number, number, number] = [217, 150, 48]; // Amber
  const textColor: [number, number, number] = [45, 40, 35];
  const mutedColor: [number, number, number] = [120, 110, 100];

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title Page
  doc.setFillColor(250, 248, 245);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative top border
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...primaryColor);
  doc.text('Vocabulary', pageWidth / 2, 60, { align: 'center' });
  doc.text('Extraction', pageWidth / 2, 75, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(...mutedColor);
  doc.text(`${vocabulary.length} Words Extracted`, pageWidth / 2, 95, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`English - ${language.name}`, pageWidth / 2, 104, { align: 'center' });

  // Date
  doc.setFontSize(11);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(date, pageWidth / 2, 110, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(margin + 40, 125, pageWidth - margin - 40, 125);

  // Start vocabulary content on new page
  doc.addPage();
  yPos = margin;

  vocabulary.forEach((word, index) => {
    // Estimate card height (add extra for Arabic translation and collocations)
    const hasCollocations = word.collocations && word.collocations.length > 0;
    const cardHeight = 95 + (word.examples.length * 12) + (getWordTranslation(word) ? 8 : 0) + (hasCollocations ? 20 : 0);
    checkPageBreak(cardHeight);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(230, 225, 220);
    doc.roundedRect(margin - 5, yPos - 5, contentWidth + 10, cardHeight, 3, 3, 'FD');

    // Word number badge
    doc.setFillColor(...primaryColor);
    doc.circle(margin + 8, yPos + 8, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${index + 1}`, margin + 8, yPos + 10.5, { align: 'center' });

    // Word title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    const wordTitle = word.word.charAt(0).toUpperCase() + word.word.slice(1);
    doc.text(wordTitle, margin + 20, yPos + 12);

    // CEFR difficulty badge (right after the word title)
    if (word.difficulty) {
      const wordTitleWidth = doc.getTextWidth(wordTitle);
      const badgeX = margin + 20 + wordTitleWidth + 4;
      const badgeText = word.difficulty;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const badgeWidth = doc.getTextWidth(badgeText) + 6;
      doc.setFillColor(...accentColor);
      doc.roundedRect(badgeX, yPos + 6, badgeWidth, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(badgeText, badgeX + badgeWidth / 2, yPos + 11.5, { align: 'center' });
    }

    // Translation in the user's mother tongue
    const translation = getWordTranslation(word);
    if (translation && canRenderTranslation) {
      doc.setFont(needsArabicFont ? 'Amiri' : 'helvetica', 'normal');
      doc.setFontSize(needsArabicFont ? 14 : 12);
      doc.setTextColor(...mutedColor);
      doc.text(translation, pageWidth - margin - 5, yPos + 12, { align: 'right' });
      doc.setFont('helvetica', 'normal'); // Reset font
    }

    yPos += 22;

    // Definition section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('DEFINITION', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    const defLines = doc.splitTextToSize(word.definition, contentWidth);
    doc.text(defLines, margin, yPos);
    yPos += defLines.length * 5 + 8;

    // Examples section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('USED LIKE THIS', margin, yPos);
    yPos += 6;

    // Accent bar for examples
    doc.setFillColor(...accentColor);
    
    word.examples.forEach((example) => {
      doc.rect(margin, yPos - 3, 2, 10, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      const exampleLines = doc.splitTextToSize(example, contentWidth - 10);
      doc.text(exampleLines, margin + 6, yPos);
      yPos += exampleLines.length * 4 + 6;
    });

    yPos += 4;

    // Collocations section (Often Used With)
    if (hasCollocations) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...mutedColor);
      doc.text('OFTEN USED WITH', margin, yPos);
      yPos += 6;

      // Collocation pills
      let colX = margin;
      doc.setFontSize(8);
      word.collocations!.forEach((col) => {
        const colWidth = doc.getTextWidth(col) + 8;
        if (colX + colWidth > pageWidth - margin) {
          colX = margin;
          yPos += 8;
        }
        doc.setFillColor(245, 240, 230); // Warm beige background
        doc.roundedRect(colX, yPos - 4, colWidth, 7, 1.5, 1.5, 'F');
        doc.setTextColor(...accentColor);
        doc.text(col, colX + 4, yPos);
        colX += colWidth + 4;
      });

      yPos += 10;
    }

    // Synonyms & Antonyms row
    const halfWidth = (contentWidth - 10) / 2;
    
    // Synonyms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('SYNONYMS', margin, yPos);
    
    // Antonyms
    doc.text('ANTONYMS', margin + halfWidth + 10, yPos);
    yPos += 6;

    // Synonym pills
    let synX = margin;
    doc.setFontSize(8);
    word.synonyms.forEach((syn) => {
      const synWidth = doc.getTextWidth(syn) + 8;
      if (synX + synWidth > margin + halfWidth) {
        synX = margin;
        yPos += 8;
      }
      doc.setFillColor(230, 245, 238);
      doc.roundedRect(synX, yPos - 4, synWidth, 7, 1.5, 1.5, 'F');
      doc.setTextColor(...primaryColor);
      doc.text(syn, synX + 4, yPos);
      synX += synWidth + 4;
    });

    // Antonym pills
    let antX = margin + halfWidth + 10;
    const antonymsExist = word.antonyms.length > 0 && word.antonyms[0] !== 'N/A';
    if (antonymsExist) {
      word.antonyms.forEach((ant) => {
        const antWidth = doc.getTextWidth(ant) + 8;
        if (antX + antWidth > pageWidth - margin) {
          antX = margin + halfWidth + 10;
          yPos += 8;
        }
        doc.setFillColor(255, 235, 235);
        doc.roundedRect(antX, yPos - 4, antWidth, 7, 1.5, 1.5, 'F');
        doc.setTextColor(180, 60, 60);
        doc.text(ant, antX + 4, yPos);
        antX += antWidth + 4;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...mutedColor);
      doc.text('None applicable', margin + halfWidth + 10, yPos);
    }

    yPos += 20;
  });

  // Footer on last page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text('Generated by Lexicon', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save('vocabulary-extraction.pdf');
}
