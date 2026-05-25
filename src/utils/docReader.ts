import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Use the unpkg CDN for the worker to avoid complex build setups
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extracts text from PDF files
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `[Page ${i}]\n${pageText}\n\n`;
  }
  
  // Clean the text to check if it actually has content (remove page markers and spaces)
  const cleanText = fullText.replace(/\[Page \d+\]/g, '').replace(/\s+/g, '').trim();
  if (cleanText.length < 20) {
    return "[SCANNED_OR_EMPTY]";
  }
  
  return fullText;
}

/**
 * Extracts text from Word (.docx) files using mammoth
 */
export async function extractTextFromWord(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting Word text:", error);
    throw new Error("Failed to parse Word document.");
  }
}

/**
 * Universal document reader helper
 */
export async function extractTextFromDoc(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return await extractTextFromPDF(file);
  } else if (extension === 'docx') {
    return await extractTextFromWord(file);
  } else if (['txt', 'md', 'csv', 'json', 'py', 'js', 'ts', 'jsx', 'tsx'].includes(extension || '')) {
    return await file.text();
  }
  
  throw new Error(`Unsupported document type: .${extension}`);
}

// Simple text chunker for RAG
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.substring(i, end));
    if (end === text.length) break;
    i += chunkSize - overlap;
  }
  return chunks;
}

// Simple keyword-based scoring for basic RAG (BM25 lite)
export function findRelevantChunks(query: string, chunks: string[], topK: number = 3): string[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) return chunks.slice(0, topK);

  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    const lowerChunk = chunk.toLowerCase();
    for (const kw of keywords) {
      if (lowerChunk.includes(kw)) {
        score += 1;
        // Boost score if keyword appears multiple times
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = lowerChunk.match(regex);
        if (matches) score += matches.length * 0.1;
      }
    }
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK).map(c => c.chunk);
}
