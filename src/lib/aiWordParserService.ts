import { QuizExam, QuizQuestion, LearningMaterial } from '../types';

export interface ParseWordQuizResult {
  title: string;
  subject: string;
  type: 'quiz' | 'ujian';
  durationMinutes: number;
  totalQuestions: number;
  questions: QuizQuestion[];
}

export interface ParseWordMaterialResult {
  title: string;
  subject: string;
  fileType: 'DOCX' | 'PDF' | 'PPT';
  description: string;
  summaryKeyPoints: string[];
}

export interface ParseResponse<T> {
  success: boolean;
  source: 'gemini_ai' | 'local_parser';
  notice?: string;
  rawTextSample?: string;
  data: T;
}

/**
 * Convert a File object to base64 string with optional image downscaling/compression
 * to ensure blazing fast uploads and AI vision parsing (reduces 10MB phone camera photos to ~150KB)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an image, compress and downscale if too large
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200; // max dimension in px (crystal clear for OCR and diagrams)
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressedDataUrl);
            return;
          }
          resolve(e.target?.result as string);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Service to parse uploaded Word Document (.docx) into structured Quiz questions schema
 */
export async function parseWordDocumentToQuiz(
  file: File,
  customInstruction?: string
): Promise<ParseResponse<ParseWordQuizResult>> {
  const base64 = await fileToBase64(file);

  const response = await fetch('/api/parse-word-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: base64,
      fileName: file.name,
      targetSchema: 'quiz',
      customInstruction,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || `Gagal memproses file Word (${response.status})`);
  }

  const result = await response.json();
  return result;
}

/**
 * Service to parse uploaded Word Document (.docx) into structured Learning Material schema
 */
export async function parseWordDocumentToMaterial(
  file: File,
  customInstruction?: string
): Promise<ParseResponse<ParseWordMaterialResult>> {
  const base64 = await fileToBase64(file);

  const response = await fetch('/api/parse-word-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64: base64,
      fileName: file.name,
      targetSchema: 'material',
      customInstruction,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || `Gagal memproses file Word (${response.status})`);
  }

  const result = await response.json();
  return result;
}

/**
 * Parse raw text (e.g. pasted from Word or notes) directly with Gemini AI
 */
export async function parseRawTextToQuiz(
  rawText: string,
  quizTitle?: string,
  customInstruction?: string
): Promise<ParseResponse<ParseWordQuizResult>> {
  const response = await fetch('/api/parse-word-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawText,
      fileName: quizTitle || 'Soal Ujian Teks',
      targetSchema: 'quiz',
      customInstruction,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || `Gagal memproses teks soal (${response.status})`);
  }

  const result = await response.json();
  return result;
}

/**
 * Service to parse uploaded images (photo of exam sheet, diagram, scanned questions) using Gemini Vision AI
 */
export async function parseImageToQuiz(
  file: File,
  customInstruction?: string
): Promise<ParseResponse<ParseWordQuizResult>> {
  const base64 = await fileToBase64(file);

  const response = await fetch('/api/parse-image-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: 'image/jpeg',
      fileName: file.name,
      customInstruction,
      attachImage: true,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || `Gagal memproses gambar soal (${response.status})`);
  }

  const result = await response.json();
  return result;
}

/**
 * Parse multiple question images simultaneously
 */
export async function parseMultipleImagesToQuiz(
  files: File[],
  customInstruction?: string
): Promise<ParseResponse<ParseWordQuizResult>> {
  const imagesPayload = await Promise.all(
    files.map(async (f) => ({
      base64: await fileToBase64(f),
      mimeType: 'image/jpeg',
      fileName: f.name,
    }))
  );

  const response = await fetch('/api/parse-image-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: imagesPayload,
      fileName: files[0]?.name ? `${files[0].name.replace(/\.[^/.]+$/, '')} (+${files.length - 1} gambar)` : 'Soal Bergambar',
      customInstruction,
      attachImage: true,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || `Gagal memproses gambar-gambar soal (${response.status})`);
  }

  const result = await response.json();
  return result;
}
