import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as mammoth from "mammoth";

const PORT = 3000;

// Lazy initialization helper for Gemini
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Word parsing will use algorithmic fallback parser if Gemini fails.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Algorithmic parser as a robust fallback
function fallbackParseQuiz(rawText: string, fileName?: string) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions: Array<{
    id: string;
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
  }> = [];

  let currentQuestion: {
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
  } | null = null;

  // Detect title and subject from header lines
  let detectedTitle = (fileName || "Dokumen Soal Word")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]/g, " ");
  let detectedSubject = "Umum";

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i];
    const subjMatch = l.match(/(?:Mata\s*Pelajaran|Mapel|Subject)[\s\:\-]+([^\n,]+)/i);
    if (subjMatch) {
      detectedSubject = subjMatch[1].trim();
    }
    const titleMatch = l.match(/(?:UJIAN|PENILAIAN|ULANGAN|ASESMEN|KUIS|QUIZ|TRYOUT|PTS|PAS|PAT|US|LATIHAN)[^\n]*/i);
    if (titleMatch && !l.includes(":")) {
      detectedTitle = titleMatch[0].trim();
    }
  }

  // Check if there is an answer key table/list at the bottom (e.g. "KUNCI JAWABAN: 1.A 2.B 3.C...")
  const answerKeyMap = new Map<number, number>();
  const answerKeySectionRegex = /(?:KUNCI\s*JAWABAN|KUNCI\s*SOAL|ANSWER\s*KEY)[\s\:\n]+([\s\S]*)/i;
  const keySectionMatch = rawText.match(answerKeySectionRegex);
  if (keySectionMatch) {
    const keyPairs = keySectionMatch[1].matchAll(/(\d+)[\.\s\:\-\)]+([A-Ea-e])/g);
    for (const match of keyPairs) {
      const qNum = parseInt(match[1], 10);
      const optIdx = match[2].toUpperCase().charCodeAt(0) - 65;
      answerKeyMap.set(qNum, optIdx);
    }
  }

  const questionRegex = /^(\d+|No\.?\s*\d+|Soal\s*(?:No\.?)?\s*\d+|\(\d+\)|\[\d+\])[\.\)]\s*(.+)/i;
  const optionRegex = /^(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[\.\)\:\-])\s*(.+)/;
  const inlineKeyRegex = /^(?:Kunci|Jawaban|Kunci\s*Jawaban|Ans|Key)[\s\:\-\=]+([A-Ea-e])/i;

  let questionIndex = 0;

  for (const line of lines) {
    // Ignore answer key footer section from question parsing
    if (/^KUNCI\s*JAWABAN/i.test(line)) {
      if (currentQuestion && currentQuestion.options.length >= 2) {
        questions.push({
          id: `q-${Date.now()}-${questions.length + 1}`,
          ...currentQuestion,
        });
        currentQuestion = null;
      }
      break;
    }

    const keyMatch = line.match(inlineKeyRegex);
    if (keyMatch && currentQuestion) {
      const letter = keyMatch[1].toUpperCase();
      const idx = letter.charCodeAt(0) - 65; // 'A' -> 0
      if (idx >= 0 && idx < Math.max(currentQuestion.options.length, 5)) {
        currentQuestion.correctAnswerIndex = idx;
      }
      continue;
    }

    const qMatch = line.match(questionRegex);
    if (qMatch) {
      if (currentQuestion && currentQuestion.options.length >= 2) {
        questions.push({
          id: `q-${Date.now()}-${questions.length + 1}`,
          ...currentQuestion,
        });
      }
      questionIndex++;
      const bottomKey = answerKeyMap.get(questionIndex) ?? 0;

      currentQuestion = {
        questionText: qMatch[2].trim(),
        options: [],
        correctAnswerIndex: bottomKey,
      };
      continue;
    }

    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion) {
      const optText = (optMatch[4] || optMatch[2] || optMatch[1] || "").trim();
      if (optText) {
        currentQuestion.options.push(optText);
      }
      continue;
    }

    // Append multi-line question text or options
    if (currentQuestion) {
      if (currentQuestion.options.length === 0) {
        currentQuestion.questionText += ` ${line}`;
      } else if (currentQuestion.options.length > 0 && !line.match(/^(?:Kunci|Jawaban)/i)) {
        const lastIdx = currentQuestion.options.length - 1;
        currentQuestion.options[lastIdx] += ` ${line}`;
      }
    }
  }

  if (currentQuestion && currentQuestion.options.length >= 2) {
    questions.push({
      id: `q-${Date.now()}-${questions.length + 1}`,
      ...currentQuestion,
    });
  }

  // Ensure every question has at least some options and valid correctAnswerIndex
  const formattedQuestions = questions.map((q, idx) => {
    let opts = q.options;
    if (opts.length < 2) {
      opts = ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"];
    }
    const validKey = q.correctAnswerIndex >= 0 && q.correctAnswerIndex < opts.length 
      ? q.correctAnswerIndex 
      : 0;

    return {
      ...q,
      options: opts,
      correctAnswerIndex: validKey,
    };
  });

  return {
    title: detectedTitle || "Ujian / Quiz dari Dokumen Word",
    subject: detectedSubject || "Umum",
    type: "quiz" as const,
    durationMinutes: Math.max(15, Math.min(120, formattedQuestions.length * 2)),
    totalQuestions: formattedQuestions.length,
    questions: formattedQuestions,
  };
}

async function startServer() {
  const app = express();

  // Increase payload limit for base64 file uploads (supporting high-resolution digital books)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  // Ensure uploads directory exists and is statically served (supports Vercel / serverless ephemeral /tmp fallback)
  let uploadsDir = path.join(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // Test write permission
    fs.writeFileSync(path.join(uploadsDir, ".test"), "test");
    fs.unlinkSync(path.join(uploadsDir, ".test"));
  } catch (e) {
    uploadsDir = path.join("/tmp", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    console.warn("Filesystem root is read-only. Using /tmp/uploads for server uploads.");
  }
  app.use("/uploads", express.static(uploadsDir));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API: Upload PDF or other documents and return public static URL
  app.post("/api/upload-pdf", (req, res) => {
    try {
      const { fileBase64, fileName, id } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "Missing file data" });
      }
      
      const cleanB64 = fileBase64.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(cleanB64, "base64");
      
      const cleanId = id || `file-${Date.now()}`;
      const ext = path.extname(fileName || "document.pdf") || ".pdf";
      const savedFileName = `${cleanId}${ext}`;
      const filePath = path.join(uploadsDir, savedFileName);
      
      fs.writeFileSync(filePath, buffer);
      
      const fileUrl = `/uploads/${savedFileName}`;
      res.json({ success: true, fileUrl, fileName: savedFileName });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Gagal menyimpan file di server", details: err?.message || String(err) });
    }
  });

  // API: Parse Word Document using Google GenAI SDK
  app.post("/api/parse-word-document", async (req, res) => {
    try {
      const { fileBase64, rawText: providedText, fileName, targetSchema = "quiz", customInstruction } = req.body;

      let extractedText = providedText || "";

      // If fileBase64 is passed, extract raw text using mammoth
      if (fileBase64) {
        const base64Data = fileBase64.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const mammothResult = await mammoth.extractRawText({ buffer });
        extractedText = mammothResult.value;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          error: "Dokumen Word kosong atau teks tidak dapat diekstrak.",
        });
      }

      const ai = getGeminiClient();

      if (targetSchema === "quiz") {
        if (!ai) {
          // Fallback if no Gemini API Key is available
          const parsedFallback = fallbackParseQuiz(extractedText, fileName);
          return res.json({
            success: true,
            source: "local_parser",
            notice: "Diproses menggunakan Algoritma Parser Dokumen Lokal.",
            rawTextSample: extractedText.slice(0, 500),
            data: parsedFallback,
          });
        }

        const prompt = `Anda adalah asisten AI LMS pendidikan ahli ekstraksi dokumen soal ujian/quiz.
Tugas Anda adalah membaca dan menganalisis teks dokumen Word berikut dan mengekstrak seluruh butir soal pilihan ganda secara terstruktur dan tepat sesuai format.

INSTRUKSI KHUSUS:
1. Identifikasi judul ujian atau mata pelajaran dari teks atau nama file ("${fileName || 'Dokumen'}").
2. Ekstrak setiap butir soal, kalimat pertanyaan (questionText), daftar pilihan opsi jawaban (options), dan tentukan indeks kunci jawaban yang benar (correctAnswerIndex: 0 untuk A, 1 untuk B, 2 untuk C, 3 untuk D, 4 untuk E).
3. Jika pada dokumen tertulis kunci jawaban (misal "Kunci: B", "Jawaban: C", atau tabel kunci jawaban di bawah), gunakan kunci tersebut. Jika tidak tertulis secara eksplisit, pilihlah opsi jawaban yang secara akademis paling benar sebagai correctAnswerIndex.
4. Bersihkan prefiks huruf seperti "A.", "B.", "1.", "No. 1" dari teks pertanyaan dan isi opsi agar tampilan rapi.
5. Estimasi durasi pengerjaan yang wajar dalam menit (durationMinutes).
6. Tentukan jenis: "quiz" atau "ujian".

${customInstruction ? `Instruksi Tambahan Pengguna: ${customInstruction}` : ""}

TEKS DOKUMEN:
"""
${extractedText.slice(0, 30000)}
"""`;

        let parsedQuiz: any = null;
        let aiSuccess = false;

        // Use fast gemini-3.1-flash-lite as primary for rapid extraction, fallback to flash-latest and 3.7-flash
        const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Judul Quiz atau Ujian",
                    },
                    subject: {
                      type: Type.STRING,
                      description: "Mata Pelajaran (contoh: Matematika, Bahasa Indonesia, Biologi, IPA, IPS, dsb)",
                    },
                    type: {
                      type: Type.STRING,
                      description: "Tipe pelaksanaan: 'quiz' atau 'ujian'",
                    },
                    durationMinutes: {
                      type: Type.INTEGER,
                      description: "Estimasi durasi pengerjaan dalam menit",
                    },
                    questions: {
                      type: Type.ARRAY,
                      description: "Daftar butir soal pilihan ganda",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          questionText: {
                            type: Type.STRING,
                            description: "Isi teks pertanyaan soal",
                          },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Daftar pilihan jawaban (misal 4 atau 5 pilihan)",
                          },
                          correctAnswerIndex: {
                            type: Type.INTEGER,
                            description: "Indeks pilihan yang benar (0-based: 0 untuk A, 1 untuk B, dst)",
                          },
                        },
                        required: ["questionText", "options", "correctAnswerIndex"],
                      },
                    },
                  },
                  required: ["title", "subject", "type", "durationMinutes", "questions"],
                },
              },
            });

            const jsonText = response.text ? response.text.trim() : "{}";
            parsedQuiz = JSON.parse(jsonText);
            if (parsedQuiz && Array.isArray(parsedQuiz.questions) && parsedQuiz.questions.length > 0) {
              aiSuccess = true;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Model ${modelName} encountered an issue:`, modelErr?.message || modelErr);
          }
        }

        // If AI succeeded, format and return
        if (aiSuccess && parsedQuiz) {
          const formattedQuestions = (parsedQuiz.questions || []).map((q: any, idx: number) => ({
            id: `q-${Date.now()}-${idx + 1}`,
            questionText: q.questionText || `Pertanyaan ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
            correctAnswerIndex: typeof q.correctAnswerIndex === "number" && q.correctAnswerIndex >= 0 ? q.correctAnswerIndex : 0,
          }));

          return res.json({
            success: true,
            source: "gemini_ai",
            rawTextSample: extractedText.slice(0, 500),
            data: {
              title: parsedQuiz.title || (fileName || "Quiz dari Dokumen Word").replace(/\.[^/.]+$/, ""),
              subject: parsedQuiz.subject || "Umum",
              type: parsedQuiz.type === "ujian" ? "ujian" : "quiz",
              durationMinutes: parsedQuiz.durationMinutes || 45,
              totalQuestions: formattedQuestions.length,
              questions: formattedQuestions,
            },
          });
        }

        // Graceful automatic fallback: If Gemini AI was busy (e.g. 503 high demand), use smart regex parser
        console.info("Gemini AI busy or unavailable. Seamlessly using smart algorithmic parser fallback.");
        const fallbackData = fallbackParseQuiz(extractedText, fileName);
        return res.json({
          success: true,
          source: "local_parser",
          notice: "Server AI sedang mengalami lonjakan trafik; sistem otomatis mengekstrak butir soal menggunakan parser terstruktur lokal.",
          rawTextSample: extractedText.slice(0, 500),
          data: fallbackData,
        });
      } else {
        // Target schema: Material (Bahan Ajar)
        if (!ai) {
          return res.json({
            success: true,
            source: "local_parser",
            data: {
              title: (fileName || "Bahan Ajar Word").replace(/\.[^/.]+$/, ""),
              subject: "Umum",
              fileType: "DOCX",
              description: extractedText.slice(0, 300).trim() + "...",
              summaryKeyPoints: ["Materi diekstrak dari dokumen Word."],
            },
          });
        }

        const prompt = `Anda adalah asisten AI LMS untuk menganalisis dokumen bahan ajar Word (.docx).
Ekstrak judul materi, mata pelajaran, rangkuman deskripsi komprehensif, dan poin-poin pokok pembelajaran dari teks berikut:

TEKS DOKUMEN:
"""
${extractedText.slice(0, 25000)}
"""`;

        let parsedMaterial: any = null;
        const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Judul bahan ajar" },
                    subject: { type: Type.STRING, description: "Mata pelajaran terkait" },
                    description: { type: Type.STRING, description: "Ringkasan deskripsi isi materi" },
                    summaryKeyPoints: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Poin-poin utama materi pembelajaran",
                    },
                  },
                  required: ["title", "subject", "description", "summaryKeyPoints"],
                },
              },
            });

            const jsonText = response.text ? response.text.trim() : "{}";
            parsedMaterial = JSON.parse(jsonText);
            if (parsedMaterial && parsedMaterial.title) {
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Material extraction on ${modelName} issue:`, modelErr?.message || modelErr);
          }
        }

        if (parsedMaterial && parsedMaterial.title) {
          return res.json({
            success: true,
            source: "gemini_ai",
            data: {
              title: parsedMaterial.title || (fileName || "Bahan Ajar").replace(/\.[^/.]+$/, ""),
              subject: parsedMaterial.subject || "Umum",
              fileType: "DOCX",
              description: parsedMaterial.description || "",
              summaryKeyPoints: parsedMaterial.summaryKeyPoints || [],
            },
          });
        }

        // Fallback for material
        return res.json({
          success: true,
          source: "local_parser",
          data: {
            title: (fileName || "Bahan Ajar Word").replace(/\.[^/.]+$/, ""),
            subject: "Umum",
            fileType: "DOCX",
            description: extractedText.slice(0, 300).trim() + "...",
            summaryKeyPoints: ["Materi berhasil diimpor dari dokumen Word."],
          },
        });
      }
    } catch (err: any) {
      console.error("Error in /api/parse-word-document:", err);
      res.status(500).json({
        error: "Gagal memproses dokumen Word dengan AI.",
        details: err?.message || String(err),
      });
    }
  });

  // API: Parse Image-based Questions / Exam Sheets (Gemini Vision Multimodal)
  app.post("/api/parse-image-quiz", async (req, res) => {
    try {
      const { 
        images = [], 
        imageBase64, 
        mimeType = "image/jpeg", 
        fileName, 
        customInstruction,
        attachImage = true 
      } = req.body;

      // Normalize images list
      const imagesList: Array<{ base64: string; mimeType: string; fileName?: string }> = [];
      if (imageBase64) {
        imagesList.push({
          base64: imageBase64.replace(/^data:.*?;base64,/, ""),
          mimeType: mimeType || "image/jpeg",
          fileName: fileName || "Foto Soal",
        });
      } else if (Array.isArray(images) && images.length > 0) {
        images.forEach((img: any, idx: number) => {
          if (img.base64 || typeof img === "string") {
            const rawB64 = (img.base64 || img).replace(/^data:.*?;base64,/, "");
            imagesList.push({
              base64: rawB64,
              mimeType: img.mimeType || "image/jpeg",
              fileName: img.fileName || `Gambar Soal ${idx + 1}`,
            });
          }
        });
      }

      if (imagesList.length === 0) {
        return res.status(400).json({
          error: "Tidak ada gambar soal yang diunggah. Mohon pilih file gambar (.jpg, .png, .jpeg, .webp).",
        });
      }

      const ai = getGeminiClient();

      if (!ai) {
        // Simple manual skeleton fallback if AI key missing
        const manualQuestions = imagesList.map((img, idx) => ({
          id: `q-img-${Date.now()}-${idx + 1}`,
          questionText: `Perhatikan gambar nomor ${idx + 1} berikut. Pertanyaan: ...`,
          options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
          correctAnswerIndex: 0,
          imageUrl: `data:${img.mimeType};base64,${img.base64}`,
          imageCaption: img.fileName || `Gambar Soal ${idx + 1}`,
        }));

        return res.json({
          success: true,
          source: "local_parser",
          notice: "Gambar berhasil dimuat ke editor soal bergambar.",
          data: {
            title: (fileName || "Quiz Soal Bergambar").replace(/\.[^/.]+$/, ""),
            subject: "Umum",
            type: "quiz",
            durationMinutes: manualQuestions.length * 3,
            totalQuestions: manualQuestions.length,
            questions: manualQuestions,
          },
        });
      }

      const prompt = `Anda adalah asisten AI LMS pendidikan ahli penglihatan dokumen (Vision OCR & Soal Bergambar).
Tugas Anda adalah membaca gambar/foto naskah soal, diagram, tabel, grafik, atau lembar ujian yang dilampirkan dan mengekstrak seluruh butir soal bergambar pilihan ganda secara terstruktur.

INSTRUKSI KHUSUS:
1. Baca teks pertanyaan, simbol matematika/sains, diagram, grafik, atau gambar pendukung pada setiap butir soal.
2. Identifikasi judul ujian atau mata pelajaran dari konten gambar jika ada.
3. Ekstrak teks pertanyaan (questionText), daftar pilihan opsi (options: A, B, C, D, E), dan tentukan kunci jawaban (correctAnswerIndex: 0-based).
4. Bersihkan prefiks huruf seperti "A.", "B.", "1.", "No. 1" dari teks pertanyaan dan opsi agar rapi.
5. Berikan keterangan ringkas mengenai gambar/diagram pendukung pada butir soal (imageCaption, contoh: "Diagram Rangkaian Listrik Seri-Paralel", "Grafik Hubungan Kecepatan vs Waktu", "Struktur Sel Tumbuhan").
6. Tentukan imageIndex (indeks gambar ke berapa jika ada beberapa gambar, 0-based).
7. Estimasi durasi pengerjaan yang wajar dalam menit (durationMinutes).

${customInstruction ? `Instruksi Tambahan Guru: ${customInstruction}` : ""}`;

      // Prepare multimodal parts: inlineData parts + text prompt
      const contentParts: any[] = [];

      imagesList.forEach((img) => {
        contentParts.push({
          inlineData: {
            mimeType: img.mimeType.startsWith("image/") ? img.mimeType : "image/jpeg",
            data: img.base64,
          },
        });
      });

      contentParts.push({ text: prompt });

      let parsedQuiz: any = null;
      let aiSuccess = false;
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentParts,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Judul Quiz atau Ujian" },
                  subject: { type: Type.STRING, description: "Mata Pelajaran (contoh: IPA, Matematika, Fisika, Biologi, Geografi)" },
                  type: { type: Type.STRING, description: "'quiz' atau 'ujian'" },
                  durationMinutes: { type: Type.INTEGER, description: "Estimasi durasi pengerjaan dalam menit" },
                  questions: {
                    type: Type.ARRAY,
                    description: "Daftar butir soal yang diekstrak dari gambar",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionText: { type: Type.STRING, description: "Isi teks pertanyaan soal" },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Daftar opsi jawaban",
                        },
                        correctAnswerIndex: { type: Type.INTEGER, description: "Indeks kunci jawaban yang benar (0-based)" },
                        imageCaption: { type: Type.STRING, description: "Keterangan deskriptif gambar/diagram" },
                        imageIndex: { type: Type.INTEGER, description: "Indeks urutan gambar (0-based)" },
                      },
                      required: ["questionText", "options", "correctAnswerIndex"],
                    },
                  },
                },
                required: ["title", "subject", "type", "durationMinutes", "questions"],
              },
            },
          });

          const jsonText = response.text ? response.text.trim() : "{}";
          parsedQuiz = JSON.parse(jsonText);
          if (parsedQuiz && Array.isArray(parsedQuiz.questions) && parsedQuiz.questions.length > 0) {
            aiSuccess = true;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Vision model ${modelName} issue:`, modelErr?.message || modelErr);
        }
      }

      if (aiSuccess && parsedQuiz) {
        const formattedQuestions = (parsedQuiz.questions || []).map((q: any, idx: number) => {
          const imgIdx = typeof q.imageIndex === "number" && q.imageIndex >= 0 && q.imageIndex < imagesList.length
            ? q.imageIndex
            : 0;
          const targetImg = imagesList[imgIdx] || imagesList[0];

          return {
            id: `q-img-${Date.now()}-${idx + 1}`,
            questionText: q.questionText || `Pertanyaan ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
            correctAnswerIndex: typeof q.correctAnswerIndex === "number" && q.correctAnswerIndex >= 0 ? q.correctAnswerIndex : 0,
            imageUrl: attachImage ? `data:${targetImg.mimeType};base64,${targetImg.base64}` : undefined,
            imageCaption: q.imageCaption || targetImg.fileName || `Gambar Pendukung Soal ${idx + 1}`,
          };
        });

        return res.json({
          success: true,
          source: "gemini_ai",
          data: {
            title: parsedQuiz.title || (fileName || "Quiz Soal Bergambar").replace(/\.[^/.]+$/, ""),
            subject: parsedQuiz.subject || "Umum",
            type: parsedQuiz.type === "ujian" ? "ujian" : "quiz",
            durationMinutes: parsedQuiz.durationMinutes || Math.max(15, formattedQuestions.length * 3),
            totalQuestions: formattedQuestions.length,
            questions: formattedQuestions,
          },
        });
      }

      // Fallback if vision AI was not able to parse
      const fallbackQuestions = imagesList.map((img, idx) => ({
        id: `q-img-${Date.now()}-${idx + 1}`,
        questionText: `Perhatikan gambar berikut dan jawablah pertanyaan di bawah:`,
        options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
        correctAnswerIndex: 0,
        imageUrl: `data:${img.mimeType};base64,${img.base64}`,
        imageCaption: img.fileName || `Gambar Soal ${idx + 1}`,
      }));

      return res.json({
        success: true,
        source: "local_parser",
        notice: "Gambar berhasil diunggah ke editor soal. Silakan sesuaikan teks pertanyaan dan pilihan jawaban.",
        data: {
          title: (fileName || "Quiz Soal Bergambar").replace(/\.[^/.]+$/, ""),
          subject: "Umum",
          type: "quiz",
          durationMinutes: Math.max(15, fallbackQuestions.length * 3),
          totalQuestions: fallbackQuestions.length,
          questions: fallbackQuestions,
        },
      });

    } catch (err: any) {
      console.error("Error in /api/parse-image-quiz:", err);
      res.status(500).json({
        error: "Gagal memproses gambar soal dengan Google AI Vision.",
        details: err?.message || String(err),
      });
    }
  });

  // Vite middleware for development & static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 LMS Server + AI Word Document Parser running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
