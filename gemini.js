/**
 * gemini.js - Google Gemini API 連携モジュール
 * 答案画像（Base64）と模範解答・配点基準を照合し、設問ごとの採点とフィードバックを取得します。
 */

export class GeminiGrader {
  constructor(apiKey = '', model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
  }

  setModel(modelName) {
    this.model = modelName;
  }

  /**
   * 単一の生徒の答案を採点する
   * @param {Array<string>} pageImagesBase64 - 答案各ページのBase64画像文字列（data:image/jpeg;base64,...）
   * @param {Array<object>} sections - セクションおよび問題定義リスト
   * @param {object} studentInfo - 生徒情報 { examNumber, name }
   * @returns {Promise<object>} - 採点結果オブジェクト
   */
  async gradeStudent(pageImagesBase64, sections, studentInfo = {}) {
    if (!this.apiKey) {
      // APIキー未設定時は警告を表示し、未採点状態（空欄）として返す
      return this._mockGrade(sections, studentInfo);
    }

    // 採点対象の設問リストを平坦化
    const questionsList = [];
    sections.forEach(sec => {
      sec.questions.forEach(q => {
        questionsList.push({
          sectionId: sec.id,
          sectionTitle: sec.title,
          questionId: q.id,
          number: q.number,
          type: q.type, // 'symbol' | 'math' | 'text'
          points: q.points,
          correctAnswer: q.correctAnswer,
          scoringMode: q.scoringMode || 'flexible', // 'exact' | 'flexible' | 'custom'
          criteria: q.criteria || '特になし'
        });
      });
    });

    const prompt = `
あなたは厳格かつ公平な試験採点官AIです。
添付された生徒の解答用紙画像（${pageImagesBase64.length}枚）を注意深く読み取り、提示された模範解答・配点マスタと照合して、設問ごとに正確に採点してください。

### 対象生徒情報:
- 受験番号: ${studentInfo.examNumber || '不明'}
- 氏名: ${studentInfo.name || '不明'}

### 設問および模範解答・配点マスタ:
${JSON.stringify(questionsList, null, 2)}

### 採点ルール・採点基準（scoringMode）の適用方法:
各設問の "scoringMode" および "criteria" に従い、次のように判定してください：

【最重要：赤ペンの丸付け・採点跡の無視ルール】
- 答案用紙上に、先生や採点者が後から記入した「赤ペン・朱書きの〇・✕・チェック印・引き出し線・赤字の小計点数（例: 0, 4, 6など）」が存在する場合があります。
- これらは生徒が書いた回答ではなく採点者のメモですので、**絶対に無視し、生徒の回答として読み取らないでください**。
- 必ず【生徒本人が黒鉛筆や黒/青ペンで解答枠内に記入した手書き文字・記号・数値のみ】を読み取って照合・採点してください。

1. 【完全一致 (exact)】:
   - 記号選択（ア, イ, ウ等）や厳密な数値・単語。
   - 模範解答と表記が完全に一致している場合のみ満点。少しでも異なる場合は0点。
   - ただし、生徒の筆跡の癖（1と7、0と6など）は慎重に文脈から読み取ってください。

2. 【部分一致・同値許容 (flexible)】:
   - 数学の数式、分数、根号、展開式、因数分解、同義語など。
   - 同値な数式変形（例: 1/√2 と √2/2、(x-2)(x+5) と (x+5)(x-2)、x = (1±√5)/2 など）は正解（満点）として扱ってください。
   - 記述式やキーワード問題では、模範解答の要点が含まれていれば部分点または満点を付与してください。

3. 【カスタム入力 (custom)】:
   - "criteria" に記載された個別の採点基準・指示に厳密に従ってください。
   - 例: 「有理化していなくても可」「〜という理由が書かれていれば部分点3点」「符号ミスは減点2点」など。

4. 【無回答・空白】:
   - 何も書かれていない設問は 0点、判定は "incorrect"、コメントに「無回答」と記載。

### 出力形式:
必ず以下の構造のJSONオブジェクトのみを出力してください（Markdownのバッククォート等も不要）:
{
  "studentExamNumber": "${studentInfo.examNumber || ''}",
  "studentName": "${studentInfo.name || ''}",
  "results": [
    {
      "sectionId": "大問ID",
      "questionId": "小問ID",
      "number": "問番号",
      "recognizedAnswer": "AIが読み取った生徒の回答文字列",
      "status": "correct" または "partial" または "incorrect",
      "awardedPoints": 獲得点数（数値）,
      "maxPoints": 配点（数値）,
      "reason": "採点理由や減点理由の簡潔な説明（日本語）"
    }
  ]
}
`;

    // Gemini API リクエスト用パートの作成
    const parts = [{ text: prompt }];

    pageImagesBase64.forEach((base64Data, idx) => {
      // "data:image/jpeg;base64,..." から純粋なbase64文字列とMIMEタイプを取り出す
      const match = base64Data.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const data = match ? match[2] : base64Data;

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: data
        }
      });
    });

    let currentModel = this.model;
    const requestBody = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errText = await response.text();
          // 404 (Model not found) の場合、標準の gemini-2.0-flash へ自動フォールバック
          if (response.status === 404 && currentModel !== 'gemini-2.0-flash' && attempt < maxRetries) {
            console.warn(`モデル ${currentModel} が404(未対応)のため、標準の gemini-2.0-flash へ自動切り替えして再試行します...`);
            currentModel = 'gemini-2.0-flash';
            this.model = 'gemini-2.0-flash';
            continue;
          }
          // 429 (Rate Limit) または 503 (Overloaded) の場合は待機して自動リトライ
          if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
            const waitTime = (attempt + 1) * 2000;
            console.warn(`Gemini API (${response.status}) 混雑/レート制限を検知。${waitTime}ms 後に再試行します... (試行 ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, waitTime));
            continue;
          }
          throw new Error(`Gemini API エラー (${response.status}): ${errText}`);
        }

        const resJson = await response.json();
        const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error('Gemini API からの応答が空でした');
        }

        // 堅牢なJSONパース（Markdownブロック・不完全なエスケープの救済）
        let parsed = null;
        try {
          parsed = JSON.parse(candidateText.trim());
        } catch (e1) {
          const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              // LaTeX数式等の生バックスラッシュ (\pm, \frac, \sqrt 等) を安全にエスケープ
              const sanitized = jsonMatch[0].replace(/\\(?![/u"bfnrt\\])/g, '\\\\');
              parsed = JSON.parse(sanitized);
            }
          } else {
            throw e1;
          }
        }

        return parsed;

      } catch (err) {
        if (attempt >= maxRetries) {
          console.error(`Gemini 採点呼び出し失敗 (最大リトライ超過・生徒: ${studentInfo.examNumber}):`, err);
          throw err;
        }
      }
    }
  }

  /**
   * 模範解答PDF（画像Base64）から大問・小問・配点・解答・基準をAI解析して抽出
   * @param {Array<string>} pageImagesBase64 
   * @param {string} extractedText - OCRまたはPDF.jsで抽出したテキスト（任意）
   * @returns {Promise<Array<object>>} - セクション定義リスト
   */
  async extractAnswerKeyFromPdf(pageImagesBase64, extractedText = '') {
    if (!this.apiKey) {
      // APIキーがない場合のフォールバック（デモ用）
      await new Promise(r => setTimeout(r, 800));
      return null;
    }

    const prompt = `
あなたは試験の模範解答・配点基準表を読み取る専門AIです。
添付された模範解答用紙の画像（${pageImagesBase64.length}枚）および抽出テキストから、
各大問（セクション）のタイトル、小問番号、問題種別、配点、模範解答、および推奨される採点基準（完全一致 / 部分一致 / カスタム）を抽出して構造化JSONを作成してください。

${extractedText ? `### PDF抽出テキスト情報:\n${extractedText.substring(0, 3000)}\n` : ''}

### 問題種別の判定ガイド:
- 'symbol': 記号選択（ア・イ・ウ・エ等）や単純な数字単答
- 'math': 数式、方程式の解、分数、平方根、因数分解、座標など
- 'text': 記述式、論述、理由説明

### 採点方式 (scoringMode) の判定ガイド:
- 'exact': 記号選択など厳密に完全一致すべきもの
- 'flexible': 数式（同値変形を許容するもの）や部分一致を認めるもの
- 'custom': 特別な注記や部分点ルールがあるもの

### 出力形式（必ずこのJSON形式のみを出力してください）:
[
  {
    "id": "sec_1",
    "title": "大問1 (タイトル)",
    "questions": [
      {
        "id": "q1_1",
        "number": "問1(1)",
        "type": "symbol",
        "points": 5,
        "correctAnswer": "模範解答の文字列",
        "scoringMode": "exact",
        "criteria": "採点基準のメモ（あれば）"
      }
    ]
  }
]
`;

    const parts = [{ text: prompt }];
    pageImagesBase64.forEach((base64Data) => {
      const match = base64Data.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const data = match ? match[2] : base64Data;
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: data
        }
      });
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const requestBody = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API エラー (${response.status})`);
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }

  /**
   * APIキーが未入力の場合の処理（勝手な誤答を作らず、未入力状態として返す）
   */
  _mockGrade(sections, studentInfo) {
    const results = [];
    sections.forEach(sec => {
      sec.questions.forEach(q => {
        results.push({
          sectionId: sec.id,
          questionId: q.id,
          number: q.number,
          recognizedAnswer: '（APIキー未設定）',
          status: 'incorrect',
          awardedPoints: 0,
          maxPoints: q.points,
          reason: '画面右上にGemini APIキーを入力して本番採点を実行してください'
        });
      });
    });

    return {
      studentExamNumber: studentInfo.examNumber,
      studentName: studentInfo.name,
      results: results
    };
  }
}
