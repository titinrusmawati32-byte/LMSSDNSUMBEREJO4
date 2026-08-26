/**
 * IndexedDB helper for storing and retrieving high-capacity PDF and document blobs
 * IndexedDB can store hundreds of Megabytes in the browser reliably, bypassing Firestore/localStorage size limits.
 */

const DB_NAME = 'edusmart_pdf_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_documents';

interface StoredPdfRecord {
  id: string;
  blob: Blob;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  uploadedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      resolve((e.target as IDBOpenDBRequest).result);
    };

    request.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save a PDF File/Blob into local IndexedDB
 */
export async function savePdfBlob(id: string, file: File | Blob, fileName: string): Promise<string> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: StoredPdfRecord = {
      id,
      blob: file,
      fileName,
      fileType: file.type || 'application/pdf',
      sizeBytes: file.size,
      uploadedAt: Date.now(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      // Create an active blob URL
      const blobUrl = URL.createObjectURL(file);
      resolve(blobUrl);
    };

    request.onerror = (e) => {
      reject((e.target as IDBRequest).error);
    };
  });
}

/**
 * Get the raw PDF Blob from IndexedDB
 */
export async function getPdfBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as StoredPdfRecord | undefined;
        if (record && record.blob) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('getPdfBlob error:', err);
    return null;
  }
}

/**
 * Get PDF as ArrayBuffer for PDF.js direct rendering
 */
export async function getPdfArrayBuffer(id: string): Promise<ArrayBuffer | null> {
  const blob = await getPdfBlob(id);
  if (!blob) return null;
  return await blob.arrayBuffer();
}

/**
 * Get a PDF Blob and return an object URL for preview/reading
 */
export async function getPdfBlobUrl(id: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as StoredPdfRecord | undefined;
        if (record && record.blob) {
          const blobUrl = URL.createObjectURL(record.blob);
          resolve(blobUrl);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('getPdfBlobUrl error:', err);
    return null;
  }
}

/**
 * Delete a PDF from storage
 */
export async function deletePdfBlob(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch (err) {
    console.warn('deletePdfBlob error:', err);
  }
}
