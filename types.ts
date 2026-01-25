export interface GeneratedImage {
  id: string;
  data: string; // base64
  mimeType: string;
  timestamp: number;
}

export enum AppMode {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT'
}

export interface GenerationConfig {
  prompt: string;
  characterSheet: File | null;
  layoutReference: File | null;
  aspectRatio: string;
}

export interface EditConfig {
  instruction: string;
  sourceImageId: string | null;
}
