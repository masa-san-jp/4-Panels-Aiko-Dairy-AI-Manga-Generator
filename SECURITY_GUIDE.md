# セキュリティ修正ガイド

## 概要

このドキュメントでは、`4-Panels-Aiko-Dary-AI-Manga-Generetor` リポジトリで発見されたセキュリティ上の問題と、その修正方法について説明します。

---

## 発見された問題

### 🔴 重大度: 高

#### 1. APIキーの平文保存
**ファイル**: `services/geminiService.ts`

**問題**:
```typescript
// 修正前（問題あり）
export const saveApiKey = (key: string) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, key);
};
```

APIキーがLocalStorageに平文で保存されており、XSS攻撃により盗まれる可能性があります。

**修正後**:
```typescript
// 修正後（暗号化保存）
export const saveApiKey = async (key: string): Promise<void> => {
  if (!validateApiKeyFormat(key)) {
    throw new Error('無効なAPIキー形式です');
  }
  const encryptedKey = await encryptApiKey(key.trim());
  localStorage.setItem(LOCAL_STORAGE_KEY, encryptedKey);
};
```

---

### 🟡 重大度: 中

#### 2. エラーメッセージの詳細露出
**ファイル**: `services/geminiService.ts`

**問題**:
```typescript
// 修正前（問題あり）
} catch (error) {
  console.error("Generation error:", error);
  throw error;
}
```

詳細なエラー情報がユーザーやコンソールに表示され、システムの内部情報が漏洩する可能性があります。

**修正後**:
```typescript
// 修正後（エラーメッセージのサニタイズ）
} catch (error) {
  const safeMessage = sanitizeErrorMessage(error);
  if (import.meta.env?.DEV) {
    console.error("Generation error:", error);
  }
  throw new Error(safeMessage);
}
```

#### 3. 入力バリデーションの欠如
**問題**: ファイルアップロードやプロンプト入力に対するバリデーションがありませんでした。

**修正後**: ファイルサイズ制限、MIMEタイプチェック、プロンプト長制限を追加。

---

## 修正ファイル一覧

以下のファイルを対応するディレクトリにコピーしてください：

```
security-fixes/
├── services/
│   ├── geminiService.ts      # 修正版メインサービス
│   └── securityUtils.ts      # 新規: セキュリティユーティリティ
├── components/
│   └── ApiKeyModal.tsx       # 修正版APIキー設定モーダル
└── SECURITY_GUIDE.md         # このドキュメント
```

---

## 適用手順

### 1. 新しいファイルの追加

```bash
# セキュリティユーティリティを追加
cp security-fixes/services/securityUtils.ts your-project/services/
```

### 2. 既存ファイルの置き換え

```bash
# geminiService.tsを置き換え
cp security-fixes/services/geminiService.ts your-project/services/

# ApiKeyModal.tsxを置き換え
cp security-fixes/components/ApiKeyModal.tsx your-project/components/
```

### 3. 依存関係の確認

修正版は標準のWeb Crypto APIを使用するため、追加のパッケージインストールは不要です。

---

## 追加の推奨事項

### 🔐 本番環境向けの追加対策

#### A. バックエンドプロキシの導入（強く推奨）

クライアントサイドでAPIキーを扱う現在の設計は、本質的にリスクがあります。
本番環境では、以下のようなバックエンドプロキシを導入することを強く推奨します：

```
[ブラウザ] → [あなたのサーバー] → [Gemini API]
              (APIキーはここで管理)
```

**実装例（Node.js/Express）**:

```typescript
// server.ts
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] }
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Generation failed' });
  }
});
```

#### B. Content Security Policy (CSP) の設定

`index.html` に以下を追加：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.tailwindcss.com https://esm.sh;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src 'self' https://generativelanguage.googleapis.com;
  img-src 'self' data: blob:;
">
```

#### C. Rate Limiting の実装

クライアントサイドでの簡易的なレート制限：

```typescript
const rateLimiter = {
  lastCall: 0,
  minInterval: 2000, // 2秒間隔

  canProceed(): boolean {
    const now = Date.now();
    if (now - this.lastCall < this.minInterval) {
      return false;
    }
    this.lastCall = now;
    return true;
  }
};
```

---

## セキュリティチェックリスト

修正適用後、以下を確認してください：

- [ ] `localStorage` に保存されるAPIキーが暗号化されている
- [ ] ブラウザのコンソールに機密情報が出力されていない
- [ ] エラーメッセージがユーザーフレンドリーで、内部情報を含まない
- [ ] ファイルアップロードにサイズ・タイプ制限がある
- [ ] `.gitignore` に `.env` が含まれている（確認済み✓）

---

## 問い合わせ

セキュリティに関する質問や懸念がある場合は、Issueを作成してください。

---

*Last updated: 2026-01-25*
