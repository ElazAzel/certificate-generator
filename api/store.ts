/**
 * In-memory store replacing SQLite for Vercel serverless.
 * Data lives for the lifetime of the function instance.
 */

export interface FontRecord {
  id: string;
  fileName: string;
  fontName: string;
  fileBytes: Uint8Array;
}

export interface TemplateRecord {
  id: string;
  originalFileName: string;
  type: 'pdf' | 'png' | 'jpg' | 'jpeg';
  width: number;
  height: number;
  fileBytes: Uint8Array;
}

export interface GenerationRecord {
  id: string;
  templateId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  exportMode: string;
  createdAt: string;
  files: string[];
  errors: { row: number; message: string }[];
}

class InMemoryStore {
  fonts = new Map<string, FontRecord>();
  templates = new Map<string, TemplateRecord>();
  generations: GenerationRecord[] = [];
}

let store: InMemoryStore;

export function getStore(): InMemoryStore {
  if (!store) {
    store = new InMemoryStore();
  }
  return store;
}
