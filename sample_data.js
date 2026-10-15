/**
 * sample_data.js - サンプルデータおよび自動車整備実習の模範解答マスタ
 */

export const SAMPLE_STUDENTS_TEXT = `スミス・ジョン
アリ・ハサン
ワン・ウェイ
キム・ミンソク
山田 太郎
佐藤 花子
チェン・リー
グエン・ティ・ホア`;

// ① 自動車整備 24か月点検＋継続検査 実習 学科 解答用紙マスタ (35点満点)
export const AUTOMOTIVE_24M_SECTIONS = [
  {
    id: 'sec_1',
    title: '問題1【数値・記号】',
    questions: [
      { id: 'q1_イ', number: 'イ', type: 'symbol', points: 1, correctAnswer: '8', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ロ', number: 'ロ', type: 'symbol', points: 1, correctAnswer: '3', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ハ', number: 'ハ', type: 'symbol', points: 1, correctAnswer: '4', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ニ', number: 'ニ', type: 'symbol', points: 1, correctAnswer: '6', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ホ', number: 'ホ', type: 'symbol', points: 1, correctAnswer: '1', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヘ', number: 'ヘ', type: 'symbol', points: 1, correctAnswer: '9', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ト', number: 'ト', type: 'symbol', points: 1, correctAnswer: '12', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_チ', number: 'チ', type: 'symbol', points: 1, correctAnswer: '13', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_リ', number: 'リ', type: 'symbol', points: 1, correctAnswer: '15', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヌ', number: 'ヌ', type: 'symbol', points: 1, correctAnswer: '16', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ル', number: 'ル', type: 'symbol', points: 1, correctAnswer: '14', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヲ', number: 'ヲ', type: 'symbol', points: 1, correctAnswer: '17', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ワ', number: 'ワ', type: 'symbol', points: 1, correctAnswer: '17', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_カ', number: 'カ', type: 'symbol', points: 1, correctAnswer: '18', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヨ', number: 'ヨ', type: 'symbol', points: 1, correctAnswer: '3', scoringMode: 'exact', criteria: '完全一致' }
    ]
  },
  {
    id: 'sec_2',
    title: '問題2【〇×判定】',
    questions: [
      { id: 'q2_1', number: '1', type: 'symbol', points: 1, correctAnswer: '〇', scoringMode: 'exact', criteria: '〇または○' },
      { id: 'q2_2', number: '2', type: 'symbol', points: 1, correctAnswer: '〇', scoringMode: 'exact', criteria: '〇または○' },
      { id: 'q2_3', number: '3', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q2_4', number: '4', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q2_5', number: '5', type: 'symbol', points: 1, correctAnswer: '〇', scoringMode: 'exact', criteria: '〇または○' },
      { id: 'q2_6', number: '6', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' }
    ]
  },
  {
    id: 'sec_3',
    title: '問題3【記号 A〜H】',
    questions: [
      { id: 'q3_A', number: 'A', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_B', number: 'B', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_C', number: 'C', type: 'symbol', points: 1, correctAnswer: '〇', scoringMode: 'exact', criteria: '〇または○' },
      { id: 'q3_D', number: 'D', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_E', number: 'E', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_F', number: 'F', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_G', number: 'G', type: 'symbol', points: 1, correctAnswer: '〇', scoringMode: 'exact', criteria: '〇または○' },
      { id: 'q3_H', number: 'H', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' }
    ]
  },
  {
    id: 'sec_4',
    title: '問題4【選択肢 1〜6】',
    questions: [
      { id: 'q4_1', number: '1', type: 'symbol', points: 1, correctAnswer: 'C', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_2', number: '2', type: 'symbol', points: 1, correctAnswer: 'A', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_3', number: '3', type: 'symbol', points: 1, correctAnswer: 'D', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_4', number: '4', type: 'symbol', points: 1, correctAnswer: 'B', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_5', number: '5', type: 'symbol', points: 1, correctAnswer: 'A', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_6', number: '6', type: 'symbol', points: 1, correctAnswer: 'E', scoringMode: 'exact', criteria: '大文字/小文字許容' }
    ]
  }
];

// ② 自動車整備 12ヶ月点検 実習 学科試験 解答用紙マスタ (43点満点)
export const AUTOMOTIVE_12M_SECTIONS = [
  {
    id: 'sec_1',
    title: '問題1【数値・記号 イ〜レ】(計17点)',
    questions: [
      { id: 'q1_イ', number: 'イ', type: 'symbol', points: 1, correctAnswer: '3', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ロ', number: 'ロ', type: 'symbol', points: 1, correctAnswer: '4', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ハ', number: 'ハ', type: 'symbol', points: 1, correctAnswer: '5', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ニ', number: 'ニ', type: 'symbol', points: 1, correctAnswer: '1', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ホ', number: 'ホ', type: 'symbol', points: 1, correctAnswer: '7', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヘ', number: 'ヘ', type: 'symbol', points: 1, correctAnswer: '6', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ト', number: 'ト', type: 'symbol', points: 1, correctAnswer: '9', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_チ', number: 'チ', type: 'symbol', points: 1, correctAnswer: '10', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_リ', number: 'リ', type: 'symbol', points: 1, correctAnswer: '8', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヌ', number: 'ヌ', type: 'symbol', points: 1, correctAnswer: '8', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ル', number: 'ル', type: 'symbol', points: 1, correctAnswer: '14', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヲ', number: 'ヲ', type: 'symbol', points: 1, correctAnswer: '13', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ワ', number: 'ワ', type: 'symbol', points: 1, correctAnswer: '13', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_カ', number: 'カ', type: 'symbol', points: 1, correctAnswer: '14', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_ヨ', number: 'ヨ', type: 'symbol', points: 1, correctAnswer: '20', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_タ', number: 'タ', type: 'symbol', points: 1, correctAnswer: '17', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q1_レ', number: 'レ', type: 'symbol', points: 1, correctAnswer: '21', scoringMode: 'exact', criteria: '完全一致' }
    ]
  },
  {
    id: 'sec_2',
    title: '問題2【別表第1〜8】(計8点)',
    questions: [
      { id: 'q2_1', number: '別表第1', type: 'symbol', points: 1, correctAnswer: 'エ', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_2', number: '別表第2', type: 'symbol', points: 1, correctAnswer: 'カ', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_3', number: '別表第3', type: 'symbol', points: 1, correctAnswer: 'キ', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_4', number: '別表第4', type: 'symbol', points: 1, correctAnswer: 'オ', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_5', number: '別表第5', type: 'symbol', points: 1, correctAnswer: 'ウ', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_6', number: '別表第6', type: 'symbol', points: 1, correctAnswer: 'イ', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_7', number: '別表第7', type: 'symbol', points: 1, correctAnswer: 'ア', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q2_8', number: '別表第8', type: 'symbol', points: 1, correctAnswer: 'ク', scoringMode: 'exact', criteria: '完全一致' }
    ]
  },
  {
    id: 'sec_3',
    title: '問題3【〇×判定 1〜5】(計5点)',
    questions: [
      { id: 'q3_1', number: '1', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_2', number: '2', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_3', number: '3', type: 'symbol', points: 1, correctAnswer: '○', scoringMode: 'exact', criteria: '○または〇' },
      { id: 'q3_4', number: '4', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' },
      { id: 'q3_5', number: '5', type: 'symbol', points: 1, correctAnswer: '×', scoringMode: 'exact', criteria: '×またはX' }
    ]
  },
  {
    id: 'sec_4',
    title: '問題4【点検項目記号】(計8点)',
    questions: [
      { id: 'q4_1', number: 'ドライブ・ベルト', type: 'symbol', points: 1, correctAnswer: '✓', scoringMode: 'flexible', criteria: '✓またはチェック印' },
      { id: 'q4_2', number: 'スパーク・プラグの状態', type: 'symbol', points: 1, correctAnswer: 'P', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_3', number: 'エア・クリーナ・エレメント', type: 'symbol', points: 1, correctAnswer: 'C', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_4', number: 'ブレーキ・パッドの摩耗', type: 'symbol', points: 1, correctAnswer: '⊗', scoringMode: 'flexible', criteria: '⊗または丸バツ印' },
      { id: 'q4_5', number: 'エンジン・オイルの量', type: 'symbol', points: 1, correctAnswer: 'L', scoringMode: 'exact', criteria: '大文字/小文字許容' },
      { id: 'q4_6', number: 'OBD診断の結果', type: 'symbol', points: 1, correctAnswer: '✓', scoringMode: 'flexible', criteria: '✓またはチェック印' },
      { id: 'q4_7', number: 'クラッチ・ペダル', type: 'symbol', points: 1, correctAnswer: '／', scoringMode: 'flexible', criteria: '／またはスラッシュ' },
      { id: 'q4_8', number: 'エキゾースト・パイプ、マフラー', type: 'symbol', points: 1, correctAnswer: '△', scoringMode: 'exact', criteria: '△または三角印' }
    ]
  },
  {
    id: 'sec_5',
    title: '問題5【記述・数値 問1〜5】(計5点)',
    questions: [
      { id: 'q5_1', number: '問1', type: 'text', points: 1, correctAnswer: '陸運支局名', scoringMode: 'flexible', criteria: '支局名等の同義語許容' },
      { id: 'q5_2', number: '問2', type: 'text', points: 1, correctAnswer: '左側', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q5_3', number: '問3', type: 'text', points: 1, correctAnswer: '40 400～499', scoringMode: 'flexible', criteria: 'スペース有無許容' },
      { id: 'q5_4', number: '問4', type: 'text', points: 1, correctAnswer: '54-14', scoringMode: 'exact', criteria: '完全一致' },
      { id: 'q5_5', number: '問5', type: 'text', points: 1, correctAnswer: 'わ・れ', scoringMode: 'flexible', criteria: 'わ、れ など' }
    ]
  }
];

export const AUTOMOTIVE_SECTIONS = AUTOMOTIVE_12M_SECTIONS;
export const SAMPLE_SECTIONS = AUTOMOTIVE_12M_SECTIONS;
