<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## このアプリについて

キャラクターデザインシート、コマ割りのレイアウト画像、文章による制作指示を入力し、Gemini API で4コマ漫画の画像を生成・修正するブラウザアプリです。React・TypeScript・Viteで構成され、[App.tsx](App.tsx) が画面と制作フロー、[services/geminiService.ts](services/geminiService.ts) がAPI呼び出しを担当します。

## 用語と制作例

- **Character Sheet**：キャラクターの外見を示す参照画像。
- **Layout Reference**：コマ、吹き出し、人物の配置を示す参照画像。
- **Production Prompt**：各コマの内容や描き方を伝える指示。
- **Edit & Refine**：生成画像を選び、「3コマ目に猫を追加する」などの追加指示で修正する操作。

これらは画面・コードにある入力の説明です。参照画像と指示を与えて生成し、結果を選択して修正し、ダウンロードする流れを想定しています。指示どおりの構図・サイズ・人物の一貫性は、生成後に人が確認します。

## 設計の背景と現在地

[App.tsx の初期プロンプト](App.tsx)では、参照デザインとレイアウトへの忠実さ、主役Aikoの視認性、後から文字を入れるための空白の吹き出しを重視しています。人が制作指示と参照素材を用意し、生成結果を修正する構成です。成立時の経緯や公開運用の履歴はリポジトリ内資料からは確認できません。

実装には生成・編集・保存の導線がありますが、本番利用やAPI接続の検証済みを意味しません。画像と指示は外部APIに送られるため、利用できる素材だけを入力し、APIキーの扱いは [SECURITY_GUIDE.md](SECURITY_GUIDE.md) を確認してください。

## 展開

キャラクターやレイアウトの参照素材を替えて、別エピソードの制作案を試せます。セリフの組版、最終的なページ調整、公開判断は別の制作工程です。自動連載や完成原稿の品質保証までを提供するものではありません。

