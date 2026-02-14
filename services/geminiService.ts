/**
 * Gemini API サービス（セキュリティ強化版）
 *
 * 変更点:
 * 1. APIキーの暗号化保存
 * 2. 入力値のバリデーション
 * 3. エラーメッセージのサニタイズ
 * 4. セキュリティログの追加
 */

import { GoogleGenAI } from "@google/genai";
import { GeneratedImage } from "../types";
import {
  encryptApiKey,
  decryptApiKey,
  validateApiKeyFormat,
  sanitizeErrorMessage,
} from "./securityUtils";

const LOCAL_STORAGE_KEY = 'gemini_api_key_encrypted';

// APIキーのキャッシュ（メモリ内のみ、セッション中のみ有効）
let cachedApiKey: string | null = null;

/**
 * Helper to convert File to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // ファイルの存在チェック
    if (!file) {
      reject(new Error('ファイルが指定されていません'));
      return;
    }

    // ファイルサイズの制限（10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('ファイルサイズが大きすぎます（最大10MB）'));
      return;
    }

    // 空ファイルのチェック
    if (file.size === 0) {
      reject(new Error('ファイルが空です'));
      return;
    }

    // 許可されるMIMEタイプ
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      reject(new Error('サポートされていないファイル形式です（PNG, JPEG, GIF, WebPのみ対応）'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('ファイルの読み込み結果が空です'));
        return;
      }
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Base64への変換に失敗しました'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    reader.onabort = () => {
      reject(new Error('ファイルの読み込みがキャンセルされました'));
    };
  });
};

/**
 * Gemini APIクライアントを取得（セキュリティ強化版）
 */
export const getGeminiClient = async () => {
  // 1. Check for AI Studio API key selection (specific for preview environments)
  try {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await win.aistudio.openSelectKey();
      }
    }
  } catch (error) {
    if ((import.meta as any).env?.DEV) {
      console.warn('AI Studio key selection failed:', error);
    }
    // AI Studioが利用できない場合は他の方法を試す
  }

  // 2. Check process.env (for deployments where secrets are injected)
  try {
    if (process.env.API_KEY) {
      return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  } catch (error) {
    if ((import.meta as any).env?.DEV) {
      console.warn('Environment API key access failed:', error);
    }
  }

  // 3. Check cached key (memory only)
  if (cachedApiKey) {
    try {
      return new GoogleGenAI({ apiKey: cachedApiKey });
    } catch (error) {
      cachedApiKey = null;
      throw new Error('APIクライアントの初期化に失敗しました');
    }
  }

  // 4. Check encrypted LocalStorage (for users running the app locally/static)
  try {
    const encryptedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (encryptedKey) {
      try {
        const decryptedKey = await decryptApiKey(encryptedKey);
        if (validateApiKeyFormat(decryptedKey)) {
          cachedApiKey = decryptedKey;
          return new GoogleGenAI({ apiKey: decryptedKey });
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          throw new Error('保存されたAPIキーの形式が無効です。再設定してください。');
        }
      } catch (decryptError) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        if ((import.meta as any).env?.DEV) {
          console.warn('Stored API key could not be decrypted:', decryptError);
        }
        throw new Error('APIキーの復号化に失敗しました。再設定してください。');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('APIキー')) {
      throw error;
    }
    if ((import.meta as any).env?.DEV) {
      console.warn('LocalStorage access failed:', error);
    }
    // localStorageが利用できない環境（プライベートブラウジング等）
  }

  throw new Error("APIキーが見つかりません。設定画面でAPIキーを設定してください。");
};

/**
 * APIキーを安全に保存する（暗号化）
 */
export const saveApiKey = async (key: string): Promise<void> => {
  // 入力バリデーション
  if (!validateApiKeyFormat(key)) {
    throw new Error('無効なAPIキー形式です');
  }

  const trimmedKey = key.trim();

  try {
    // 暗号化して保存
    const encryptedKey = await encryptApiKey(trimmedKey);
    localStorage.setItem(LOCAL_STORAGE_KEY, encryptedKey);

    // メモリキャッシュも更新
    cachedApiKey = trimmedKey;

    // セキュリティログ（開発環境のみ）
    if ((import.meta as any).env?.DEV) {
      console.log('API key saved securely');
    }
  } catch (error) {
    throw new Error('APIキーの保存に失敗しました');
  }
};

/**
 * APIキーを削除する
 */
export const removeApiKey = (): void => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    if ((import.meta as any).env?.DEV) {
      console.warn('Failed to remove API key from localStorage:', error);
    }
  }
  cachedApiKey = null;
};

/**
 * 保存されたAPIキーがあるかチェック（キー自体は返さない）
 */
export const hasStoredApiKey = (): boolean => {
  if (cachedApiKey !== null) {
    return true;
  }
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) !== null;
  } catch (error) {
    if ((import.meta as any).env?.DEV) {
      console.warn('Failed to check localStorage for API key:', error);
    }
    return false;
  }
};

/**
 * 保存されたAPIキーを取得（マスク済み）
 * セキュリティのため、完全なキーは返さない
 */
export const getStoredApiKeyMasked = async (): Promise<string | null> => {
  if (cachedApiKey) {
    return maskApiKey(cachedApiKey);
  }

  try {
    const encryptedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!encryptedKey) return null;

    const decryptedKey = await decryptApiKey(encryptedKey);
    return maskApiKey(decryptedKey);
  } catch (error) {
    if ((import.meta as any).env?.DEV) {
      console.warn('Failed to get masked API key:', error);
    }
    return null;
  }
};

/**
 * APIキーをマスクする（最初と最後の数文字のみ表示）
 */
const maskApiKey = (key: string): string => {
  if (key.length <= 8) {
    return '****';
  }
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
};

/**
 * APIエラーを分類してユーザーフレンドリーなメッセージを返す
 */
const classifyApiError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return '予期せぬエラーが発生しました';
  }

  const message = error.message.toLowerCase();
  const errorName = error.name?.toLowerCase() || '';

  // ネットワークエラー
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    errorName === 'typeerror'
  ) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  }

  // レート制限
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('429')
  ) {
    return 'リクエスト制限に達しました。しばらく待ってから再試行してください。';
  }

  // 認証エラー
  if (
    message.includes('api key') ||
    message.includes('unauthorized') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return 'APIキーが無効です。設定画面でAPIキーを確認してください。';
  }

  // コンテンツポリシー違反
  if (
    message.includes('safety') ||
    message.includes('blocked') ||
    message.includes('content policy')
  ) {
    return 'コンテンツポリシーに違反する可能性があります。プロンプトを変更してください。';
  }

  // サーバーエラー
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('server')
  ) {
    return 'サーバーエラーが発生しました。しばらく待ってから再試行してください。';
  }

  // タイムアウト
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'リクエストがタイムアウトしました。再試行してください。';
  }

  // デフォルト
  return sanitizeErrorMessage(error);
};

/**
 * 4コマ漫画を生成する
 */
export const generateComic = async (
  prompt: string,
  charSheet: File | null,
  layoutRef: File | null,
  aspectRatio: string = "4:3"
): Promise<GeneratedImage> => {
  // 入力バリデーション
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('プロンプトを入力してください');
  }

  // プロンプトの長さ制限
  const MAX_PROMPT_LENGTH = 10000;
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`プロンプトが長すぎます（最大${MAX_PROMPT_LENGTH}文字）`);
  }

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
    // 開発環境のみ詳細ログ
    if ((import.meta as any).env?.DEV) {
      console.error("Generation error:", error);
    }

    // エラーを分類してユーザーフレンドリーなメッセージを返す
    throw new Error(classifyApiError(error));
  }
};

/**
 * 画像を編集する
 */
export const editImage = async (
  sourceBase64: string,
  sourceMimeType: string,
  instruction: string
): Promise<GeneratedImage> => {
  // 入力バリデーション
  if (!sourceBase64 || !instruction) {
    throw new Error('画像と編集指示を入力してください');
  }

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
    // 開発環境のみ詳細ログ
    if ((import.meta as any).env?.DEV) {
      console.error("Edit error:", error);
    }

    // エラーを分類してユーザーフレンドリーなメッセージを返す
    throw new Error(classifyApiError(error));
  }
};
