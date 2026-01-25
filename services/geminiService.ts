import { GoogleGenAI } from "@google/genai";
import { GeneratedImage } from "../types";

const LOCAL_STORAGE_KEY = 'gemini_api_key';

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getGeminiClient = async () => {
  // 1. Check for AI Studio API key selection (specific for preview environments)
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
     const hasKey = await win.aistudio.hasSelectedApiKey();
     if (!hasKey) {
       await win.aistudio.openSelectKey();
     }
     // AI Studio handles the key injection internally when this passes
     // However, we still instantiate with a placeholder or env if needed, 
     // but usually AI Studio wraps the fetch. 
     // For the SDK, we still need a key if not proxied.
     // In the AI Studio preview environment, process.env.API_KEY is usually populated automatically after selection.
  }

  // 2. Check process.env (for deployments where secrets are injected)
  if (process.env.API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // 3. Check LocalStorage (for users running the app locally/static)
  const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedKey) {
    return new GoogleGenAI({ apiKey: storedKey });
  }

  throw new Error("API Key not found. Please set your API Key in the settings.");
};

export const saveApiKey = (key: string) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, key);
};

export const removeApiKey = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const getStoredApiKey = () => {
  return localStorage.getItem(LOCAL_STORAGE_KEY);
};

export const generateComic = async (
  prompt: string,
  charSheet: File | null,
  layoutRef: File | null,
  aspectRatio: string = "4:3"
): Promise<GeneratedImage> => {
  const ai = await getGeminiClient();
  
  const parts: any[] = [
    { text: prompt }
  ];

  if (charSheet) {
    const base64Char = await fileToBase64(charSheet);
    parts.push({
      inlineData: {
        data: base64Char,
        mimeType: charSheet.type
      }
    });
  }

  if (layoutRef) {
    const base64Layout = await fileToBase64(layoutRef);
    parts.push({
      inlineData: {
        data: base64Layout,
        mimeType: layoutRef.type
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          id: crypto.randomUUID(),
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
          timestamp: Date.now()
        };
      }
    }

    throw new Error("No image generated.");
  } catch (error) {
    console.error("Generation error:", error);
    throw error;
  }
};

export const editImage = async (
  sourceBase64: string,
  sourceMimeType: string,
  instruction: string
): Promise<GeneratedImage> => {
  const ai = await getGeminiClient();

  const parts = [
    { text: instruction },
    {
      inlineData: {
        data: sourceBase64,
        mimeType: sourceMimeType
      }
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          id: crypto.randomUUID(),
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
          timestamp: Date.now()
        };
      }
    }
     throw new Error("No image generated from edit.");

  } catch (error) {
    console.error("Edit error:", error);
    throw error;
  }
};