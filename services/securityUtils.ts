/**
 * セキュリティユーティリティ
 * APIキーの暗号化・復号化とセキュアな保存を提供
 */

// カスタムエラークラス
export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly code: SecurityErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export type SecurityErrorCode =
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_API_KEY'
  | 'STORAGE_ERROR'
  | 'CRYPTO_UNAVAILABLE';

// 暗号化に使用するソルト（本番環境では環境変数から取得推奨）
const ENCRYPTION_SALT = 'manga-studio-ai-2024';

/**
 * 文字列を暗号化する（簡易的な難読化）
 * 注意: これは完全な暗号化ではなく、カジュアルな攻撃からの保護です
 * 本番環境ではWeb Crypto APIを使用した本格的な暗号化を推奨
 */
export const encryptApiKey = async (plainText: string): Promise<string> => {
  if (!plainText || typeof plainText !== 'string') {
    throw new SecurityError(
      '暗号化する文字列が無効です',
      'ENCRYPTION_FAILED'
    );
  }

  if (typeof crypto?.subtle === 'undefined') {
    throw new SecurityError(
      'Web Crypto APIが利用できません。HTTPSで接続してください。',
      'CRYPTO_UNAVAILABLE'
    );
  }

  try {
    // Web Crypto APIを使用した暗号化
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);

    // パスワードからキーを生成
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_SALT),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // AES-GCM用のキーを派生
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('static-salt-for-key'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // 初期化ベクトル（IV）を生成
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 暗号化
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // IVと暗号化データを結合してBase64エンコード
    const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    // フォールバック: 簡易的なBase64エンコード
    try {
      return btoa(unescape(encodeURIComponent(plainText + '::' + Date.now())));
    } catch (fallbackError) {
      throw new SecurityError(
        '暗号化に失敗しました',
        'ENCRYPTION_FAILED',
        error
      );
    }
  }
};

/**
 * 暗号化された文字列を復号化する
 */
export const decryptApiKey = async (encryptedText: string): Promise<string> => {
  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new SecurityError(
      '復号化する文字列が無効です',
      'DECRYPTION_FAILED'
    );
  }

  if (typeof crypto?.subtle === 'undefined') {
    throw new SecurityError(
      'Web Crypto APIが利用できません。HTTPSで接続してください。',
      'CRYPTO_UNAVAILABLE'
    );
  }

  try {
    const encoder = new TextEncoder();

    // Base64デコード
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

    // IVと暗号化データを分離
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // キーを再生成
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_SALT),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('static-salt-for-key'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // 復号化
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    // フォールバック: Base64デコード
    try {
      const decoded = decodeURIComponent(escape(atob(encryptedText)));
      return decoded.split('::')[0];
    } catch (fallbackError) {
      throw new SecurityError(
        'APIキーの復号化に失敗しました',
        'DECRYPTION_FAILED',
        error
      );
    }
  }
};

/**
 * APIキーの形式を検証する
 */
export const validateApiKeyFormat = (key: string): boolean => {
  // Google Gemini APIキーの一般的な形式をチェック
  // 通常は39文字のBase64風文字列
  if (!key || typeof key !== 'string') {
    return false;
  }

  const trimmedKey = key.trim();

  // 最低限の長さチェック
  if (trimmedKey.length < 20) {
    return false;
  }

  // 危険な文字列のチェック（XSS防止）
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedKey)) {
      return false;
    }
  }

  return true;
};

/**
 * エラーメッセージをサニタイズする（詳細情報の漏洩防止）
 */
export const sanitizeErrorMessage = (error: unknown): string => {
  // 開発環境では詳細を表示、本番環境では汎用メッセージ
  const isDevelopment = import.meta.env?.DEV ?? false;

  if (isDevelopment && error instanceof Error) {
    return error.message;
  }

  // SecurityErrorの場合はコードに基づいたメッセージを返す
  if (error instanceof SecurityError) {
    const securityErrorMessages: Record<SecurityErrorCode, string> = {
      'ENCRYPTION_FAILED': '暗号化処理に失敗しました。再度お試しください。',
      'DECRYPTION_FAILED': '復号化処理に失敗しました。APIキーを再設定してください。',
      'INVALID_API_KEY': 'APIキーの形式が無効です。正しいキーを入力してください。',
      'STORAGE_ERROR': 'ストレージへのアクセスに失敗しました。ブラウザの設定を確認してください。',
      'CRYPTO_UNAVAILABLE': 'セキュリティ機能が利用できません。HTTPSで接続してください。',
    };
    return securityErrorMessages[error.code];
  }

  // 本番環境用の汎用エラーメッセージ
  const errorMessages: Record<string, string> = {
    'API Key': 'APIキーが設定されていないか、無効です。設定を確認してください。',
    'network': 'ネットワークエラーが発生しました。接続を確認してください。',
    'timeout': 'リクエストがタイムアウトしました。再度お試しください。',
    'rate limit': 'APIの利用制限に達しました。しばらく待ってから再度お試しください。',
  };

  if (error instanceof Error) {
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
  }

  return '処理中にエラーが発生しました。再度お試しください。';
};

/**
 * セッションストレージを使用した一時的なキー保存（より安全）
 * ブラウザを閉じると削除される
 */
export const useSessionStorage = {
  set: async (key: string, value: string): Promise<void> => {
    try {
      const encrypted = await encryptApiKey(value);
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        'セッションストレージへの保存に失敗しました',
        'STORAGE_ERROR',
        error
      );
    }
  },

  get: async (key: string): Promise<string | null> => {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      return await decryptApiKey(encrypted);
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        'セッションストレージからの読み取りに失敗しました',
        'STORAGE_ERROR',
        error
      );
    }
  },

  remove: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      throw new SecurityError(
        'セッションストレージからの削除に失敗しました',
        'STORAGE_ERROR',
        error
      );
    }
  }
};
