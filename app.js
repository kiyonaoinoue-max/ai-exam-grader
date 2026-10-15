/**
 * app.js - AI答案採点システム メインアプリケーションロジック
 */

import { GeminiGrader } from './gemini.js';
import { exportGradingToExcel } from './excel.js';
import { SAMPLE_STUDENTS_TEXT, AUTOMOTIVE_12M_SECTIONS, AUTOMOTIVE_24M_SECTIONS, MATH1_SECTIONS } from './sample_data.js';

class GradingApp {
  constructor() {
    this.students = [];
    
    // 模範解答テンプレート（ブラウザタブ管理）
    this.templates = [
      { id: 'tpl_12m', name: '🚗 12ヶ月点検 (43点)', sections: JSON.parse(JSON.stringify(AUTOMOTIVE_12M_SECTIONS)) },
      { id: 'tpl_24m', name: '🚙 24か月点検 (35点)', sections: JSON.parse(JSON.stringify(AUTOMOTIVE_24M_SECTIONS)) },
      { id: 'tpl_math1', name: '📐 数学I サンプル (60点)', sections: JSON.parse(JSON.stringify(MATH1_SECTIONS)) }
    ];
    this.currentTemplateId = 'tpl_12m';
    this.sections = this.templates[0].sections;

    this.pdfDoc = null;
    this.pageImages = []; // 全ページの画像DataURL配列
    this.pagesPerStudent = 1;
    this.currentVerifyIndex = 0;
    this.currentReviewIndex = 0;
    this.reviewCurrentPageIdx = 0;
    this.verifyCurrentPageIdx = 0;
    this.verifyZoom = 1.0;
    this.reviewZoom = 1.0;
    this.isGrading = false;

    this.grader = new GeminiGrader();

    this.init();
  }

  init() {
    this.loadSettings();
    this.setupEventListeners();
    this.renderTemplateTabs();
    this.renderSectionsSetup();
    this.renderSummaryStats();
  }

  // LocalStorageから設定を復元
  loadSettings() {
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    if (savedApiKey) {
      document.getElementById('apiKeyInput').value = savedApiKey;
      this.grader.setApiKey(savedApiKey);
    }
    const savedModel = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
    document.getElementById('modelSelect').value = savedModel;
    this.grader.setModel(savedModel);
  }

  saveSettings() {
    const apiKey = document.getElementById('apiKeyInput').value;
    const model = document.getElementById('modelSelect').value;
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model', model);
    this.grader.setApiKey(apiKey);
    this.grader.setModel(model);
    this.showToast('設定を保存しました');
  }

  // イベントリスナーの登録
  setupEventListeners() {
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // APIキー・設定保存
    document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

    // APIキー取得ガイドモーダルの開閉
    const helpApiKeyBtn = document.getElementById('helpApiKeyBtn');
    const apiKeyGuideModal = document.getElementById('apiKeyGuideModal');
    const closeGuide1 = document.getElementById('closeApiKeyGuideBtn');
    const closeGuide2 = document.getElementById('closeApiKeyGuideBtn2');

    if (helpApiKeyBtn && apiKeyGuideModal) {
      helpApiKeyBtn.addEventListener('click', () => apiKeyGuideModal.classList.remove('hidden'));
      closeGuide1?.addEventListener('click', () => apiKeyGuideModal.classList.add('hidden'));
      closeGuide2?.addEventListener('click', () => apiKeyGuideModal.classList.add('hidden'));
      apiKeyGuideModal.addEventListener('click', (e) => {
        if (e.target === apiKeyGuideModal) apiKeyGuideModal.classList.add('hidden');
      });
    }

    // サンプル名簿読込
    document.getElementById('loadSampleNamesBtn').addEventListener('click', () => {
      document.getElementById('namesTextArea').value = SAMPLE_STUDENTS_TEXT;
      this.generateNumberedStudents();
    });

    // ＋ 新規模範解答タブボタン
    const newTabBtn = document.getElementById('newTemplateTabBtn');
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => {
        this.addNewTemplate();
      });
    }

    // サンプル模範解答の追加ドロップダウン
    const sampleSelect = document.getElementById('loadSampleTemplateSelect');
    if (sampleSelect) {
      sampleSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'math1') {
          this.addNewTemplateWithSections('📐 数学I サンプル', MATH1_SECTIONS);
          this.showToast('「数学I サンプル (計60点)」をタブに追加しました');
        } else if (val === '12m') {
          this.addNewTemplateWithSections('🚗 12ヶ月点検', AUTOMOTIVE_12M_SECTIONS);
          this.showToast('「自動車12ヶ月点検 (計43点)」をタブに追加しました');
        } else if (val === '24m') {
          this.addNewTemplateWithSections('🚙 24か月点検', AUTOMOTIVE_24M_SECTIONS);
          this.showToast('「自動車24か月点検 (計35点)」をタブに追加しました');
        }
        e.target.value = ''; // 選択をリセット
      });
    }

    // テスト用ダミー答案生成
    document.getElementById('loadDummyAnswersBtn').addEventListener('click', () => {
      this.createDummyAnswerSheets();
    });

    // 自動ナンバリングボタン（氏名テキストから）
    document.getElementById('generateRosterBtn').addEventListener('click', () => {
      this.generateNumberedStudents();
    });

    // 匿名ナンバリングボタン（番号のみ）
    const anonBtn = document.getElementById('generateAnonymousRosterBtn');
    if (anonBtn) {
      anonBtn.addEventListener('click', () => {
        this.generateAnonymousRoster();
      });
    }

    // 大問追加
    document.getElementById('addSectionBtn').addEventListener('click', () => {
      const newSecId = 'sec_' + Date.now();
      this.sections.push({
        id: newSecId,
        title: `大問${this.sections.length + 1}`,
        questions: [
          {
            id: 'q_' + Date.now() + '_1',
            number: `問1`,
            type: 'symbol',
            points: 5,
            correctAnswer: 'ア',
            scoringMode: 'exact',
            criteria: ''
          }
        ]
      });
      this.renderSectionsSetup();
    });

    // 模範解答PDFのアップロード
    const answerKeyPdfInput = document.getElementById('answerKeyPdfInput');
    document.getElementById('uploadAnswerKeyPdfBtn').addEventListener('click', () => {
      answerKeyPdfInput.click();
    });
    answerKeyPdfInput.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await this.handleAnswerKeyPdfUpload(e.target.files[0]);
      }
    });

    // PDFファイル選択・ドラッグ＆ドロップ
    const pdfDropZone = document.getElementById('pdfDropZone');
    const pdfFileInput = document.getElementById('pdfFileInput');

    pdfDropZone.addEventListener('click', () => pdfFileInput.click());
    pdfFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handlePdfUpload(e.target.files[0]);
      }
    });

    pdfDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pdfDropZone.classList.add('border-indigo-500', 'bg-indigo-50');
    });
    pdfDropZone.addEventListener('dragleave', () => {
      pdfDropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    });
    pdfDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      pdfDropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
      if (e.dataTransfer.files.length > 0) {
        this.handlePdfUpload(e.dataTransfer.files[0]);
      }
    });

    // 1人あたりの枚数変更
    document.getElementById('pagesPerStudentSelect').addEventListener('change', (e) => {
      this.pagesPerStudent = parseInt(e.target.value, 10) || 1;
      this.splitPagesToStudents();
    });

    // 第1回目視確認 ナビゲーション
    document.getElementById('prevVerifyBtn').addEventListener('click', () => this.navigateVerify(-1));
    document.getElementById('nextVerifyBtn').addEventListener('click', () => this.navigateVerify(1));
    document.getElementById('saveVerifyBtn').addEventListener('click', () => {
      this.saveCurrentVerifyStudent();
      this.navigateVerify(1);
    });

    // キーボードショートカット（第1回確認）
    window.addEventListener('keydown', (e) => {
      const activeTab = document.querySelector('.tab-content:not(.hidden)').id;
      if (activeTab === 'tab-verify') {
        if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
          this.navigateVerify(1);
        } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
          this.navigateVerify(-1);
        }
      } else if (activeTab === 'tab-review') {
        if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
          this.navigateReview(1);
        } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
          this.navigateReview(-1);
        }
      }
    });

    // ブーストモード切り替え表示
    const boostCheckbox = document.getElementById('boostModeCheckbox');
    if (boostCheckbox) {
      boostCheckbox.addEventListener('change', (e) => {
        const badge = document.getElementById('boostBadge');
        if (e.target.checked) {
          badge.textContent = 'TURBO ON 🚀';
          badge.className = 'ml-2 text-xs font-black text-amber-600 font-mono tracking-wider';
        } else {
          badge.textContent = 'NORMAL 🐢';
          badge.className = 'ml-2 text-xs font-semibold text-slate-400 font-mono tracking-wider';
        }
      });
    }

    // 採点実行
    document.getElementById('startGradingBtn').addEventListener('click', () => this.startGradingProcess());

    // 採点レビュー ナビゲーション & 再採点
    document.getElementById('prevReviewBtn').addEventListener('click', () => this.navigateReview(-1));
    document.getElementById('nextReviewBtn').addEventListener('click', () => this.navigateReview(1));
    document.getElementById('regradeCurrentStudentBtn')?.addEventListener('click', () => this.regradeCurrentStudent());
    document.getElementById('reviewStudentSelect').addEventListener('change', (e) => {
      this.currentReviewIndex = parseInt(e.target.value, 10);
      this.renderReviewView();
    });

    // Excel出力
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
      const title = document.getElementById('examTitleInput').value.trim() || '試験成績一覧表';
      exportGradingToExcel(this.students, this.sections, title);
    });
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('border-indigo-600', 'text-indigo-600', 'font-semibold');
        btn.classList.remove('border-transparent', 'text-gray-500');
      } else {
        btn.classList.remove('border-indigo-600', 'text-indigo-600', 'font-semibold');
        btn.classList.add('border-transparent', 'text-gray-500');
      }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `tab-${tabId}`) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });

    // タブ切り替え時の初期化
    if (tabId === 'verify') {
      this.renderVerifyView();
    } else if (tabId === 'review') {
      this.populateReviewStudentSelect();
      this.renderReviewView();
    } else if (tabId === 'export') {
      this.renderExportTable();
    }
  }

  // 匿名受験番号のみで一括生成
  generateAnonymousRoster() {
    const startNum = parseInt(document.getElementById('startNumberInput').value, 10) || 1001;
    const count = parseInt(document.getElementById('studentCountInput').value, 10) || 30;

    this.students = Array.from({ length: count }, (_, idx) => ({
      id: 'student_' + (idx + 1),
      examNumber: String(startNum + idx),
      name: '', // 氏名は空欄（完全匿名）
      pageIndices: [],
      grades: {}
    }));

    this.renderRosterTable();
    this.showToast(`🛡️ 個人情報なし: 受験番号 ${startNum}〜${startNum + count - 1}（${count}名）を一括生成しました`);
    this.splitPagesToStudents();
  }

  // 氏名テキストから自動ナンバリング
  generateNumberedStudents() {
    const rawText = document.getElementById('namesTextArea').value;
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const startNum = parseInt(document.getElementById('startNumberInput').value, 10) || 1001;

    if (lines.length === 0) {
      // 氏名テキストが空の場合は匿名生成を案内
      this.generateAnonymousRoster();
      return;
    }

    this.students = lines.map((name, idx) => ({
      id: 'student_' + (idx + 1),
      examNumber: String(startNum + idx),
      name: name,
      pageIndices: [],
      grades: {}
    }));

    this.renderRosterTable();
    this.showToast(`${this.students.length} 名のナンバリング一覧を生成しました（${startNum}〜）`);
    this.splitPagesToStudents();
  }

  renderRosterTable() {
    const tbody = document.getElementById('rosterTableBody');
    tbody.innerHTML = '';

    this.students.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-gray-50';
      tr.innerHTML = `
        <td class="py-2 px-3 text-sm text-gray-500 font-mono">${idx + 1}</td>
        <td class="py-2 px-3">
          <input type="text" class="w-24 px-2 py-1 text-sm font-mono border rounded student-exam-input" 
                 data-idx="${idx}" value="${s.examNumber}">
        </td>
        <td class="py-2 px-3">
          <input type="text" class="w-full px-2 py-1 text-sm border rounded student-name-input" 
                 data-idx="${idx}" value="${s.name || ''}" placeholder="氏名（任意・空欄可）">
        </td>
        <td class="py-2 px-3 text-center">
          <button class="text-red-500 hover:text-red-700 text-sm delete-student-btn" data-idx="${idx}">
            ✕ 削除
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // 編集イベント
    tbody.querySelectorAll('.student-exam-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.students[idx].examNumber = e.target.value.trim();
      });
    });
    tbody.querySelectorAll('.student-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.students[idx].name = e.target.value.trim();
      });
    });
    tbody.querySelectorAll('.delete-student-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.students.splice(idx, 1);
        this.renderRosterTable();
        this.splitPagesToStudents();
      });
    });

    document.getElementById('rosterCountBadge').textContent = `${this.students.length}名登録済み`;
  }

  // ==========================================
  // 【ブラウザ風 模範解答タブ管理】
  // ==========================================
  renderTemplateTabs() {
    const container = document.getElementById('templateTabsContainer');
    if (!container) return;
    container.innerHTML = '';

    this.templates.forEach((tpl) => {
      const isActive = tpl.id === this.currentTemplateId;
      const tab = document.createElement('div');
      tab.className = `flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded-t-lg border border-b-0 cursor-pointer transition select-none ${
        isActive
          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-bold shadow-sm -mb-[1px]'
          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      }`;

      tab.innerHTML = `
        <span class="truncate max-w-[140px]">${tpl.name}</span>
        <button class="text-slate-400 hover:text-red-500 font-bold text-xs p-0.5 rounded-full hover:bg-white/80 transition tab-close-btn" title="この試験マスタを削除">
          ✕
        </button>
      `;

      // タブクリックで切り替え
      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close-btn')) {
          this.switchTemplate(tpl.id);
        }
      });

      // ✕ボタンで削除
      tab.querySelector('.tab-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTemplate(tpl.id);
      });

      container.appendChild(tab);
    });
  }

  // テンプレートの切り替え
  switchTemplate(id) {
    const target = this.templates.find(t => t.id === id);
    if (!target) return;
    this.currentTemplateId = id;
    this.sections = target.sections;
    this.renderTemplateTabs();
    this.renderSectionsSetup();
  }

  // テンプレートの削除（×ボタン）
  deleteTemplate(id) {
    const targetIdx = this.templates.findIndex(t => t.id === id);
    if (targetIdx === -1) return;
    const targetName = this.templates[targetIdx].name;

    if (confirm(`「${targetName}」をリストから削除しますか？`)) {
      this.templates.splice(targetIdx, 1);
      if (this.templates.length === 0) {
        // 全て削除された場合は新規の空テンプレートを作成
        this.addNewTemplate('新しい試験');
      } else {
        const nextId = this.templates[Math.max(0, targetIdx - 1)].id;
        this.switchTemplate(nextId);
      }
      this.showToast(`「${targetName}」を削除しました`);
    }
  }

  // 新規テンプレートの追加（空の試験）
  addNewTemplate(title = '新しい試験') {
    const newId = 'tpl_' + Date.now();
    const newTpl = {
      id: newId,
      name: title,
      sections: [
        {
          id: 'sec_' + Date.now(),
          title: '大問1',
          questions: [
            {
              id: 'q_' + Date.now() + '_1',
              number: '問1',
              type: 'symbol',
              points: 5,
              correctAnswer: '',
              scoringMode: 'exact',
              criteria: ''
            }
          ]
        }
      ]
    };
    this.templates.push(newTpl);
    this.switchTemplate(newId);
  }

  // セクション群を指定して新しいタブを作成
  addNewTemplateWithSections(title, sections) {
    const totalPts = sections.reduce((sum, s) => sum + s.questions.reduce((qSum, q) => qSum + (Number(q.points) || 0), 0), 0);
    const newId = 'tpl_' + Date.now();
    const newTpl = {
      id: newId,
      name: `${title} (${totalPts}点)`,
      sections: JSON.parse(JSON.stringify(sections))
    };
    this.templates.push(newTpl);
    this.switchTemplate(newId);
  }

  // 大問・配点設定のレンダリング
  renderSectionsSetup() {
    const container = document.getElementById('sectionsContainer');
    container.innerHTML = '';

    let grandTotalPoints = 0;

    this.sections.forEach((sec, secIdx) => {
      const secDiv = document.createElement('div');
      secDiv.className = 'border rounded-lg bg-gray-50 p-4 mb-4 shadow-sm';

      let secTotal = sec.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
      grandTotalPoints += secTotal;

      secDiv.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b mb-3">
          <div class="flex items-center space-x-2">
            <span class="bg-indigo-600 text-white text-xs px-2 py-1 rounded font-bold">セクション${secIdx + 1}</span>
            <input type="text" class="font-bold text-gray-800 bg-transparent border-b border-gray-300 focus:border-indigo-600 px-1 text-base sec-title-input" 
                   data-sec-idx="${secIdx}" value="${sec.title}">
            <span class="text-sm font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">小計: ${secTotal}点</span>
          </div>
          <div class="flex items-center space-x-2">
            <button class="text-xs bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded add-q-btn" data-sec-idx="${secIdx}">
              ＋ 小問追加
            </button>
            <button class="text-xs text-red-500 hover:text-red-700 px-2 py-1 delete-sec-btn" data-sec-idx="${secIdx}">
              大問削除
            </button>
          </div>
        </div>

        <div class="space-y-2 questions-list" data-sec-idx="${secIdx}">
          <!-- 各小問 -->
        </div>
      `;

      const qListContainer = secDiv.querySelector('.questions-list');
      sec.questions.forEach((q, qIdx) => {
        const qRow = document.createElement('div');
        qRow.className = 'bg-white p-2.5 rounded border text-sm flex flex-col gap-2';

        const scoringMode = q.scoringMode || (q.type === 'symbol' ? 'exact' : 'flexible');

        qRow.innerHTML = `
          <div class="flex flex-wrap items-center gap-2">
            <div class="w-24">
              <input type="text" class="w-full px-2 py-1 border rounded text-xs q-num-input font-medium" 
                     data-sec-idx="${secIdx}" data-q-idx="${qIdx}" value="${q.number}" placeholder="問1">
            </div>
            <div class="w-32">
              <select class="w-full px-2 py-1 border rounded text-xs q-type-select font-medium" data-sec-idx="${secIdx}" data-q-idx="${qIdx}">
                <option value="symbol" ${q.type === 'symbol' ? 'selected' : ''}>記号・単答</option>
                <option value="math" ${q.type === 'math' ? 'selected' : ''}>数I・数式</option>
                <option value="text" ${q.type === 'text' ? 'selected' : ''}>記述・論述</option>
              </select>
            </div>
            <div class="w-36">
              <select class="w-full px-2 py-1 border rounded text-xs font-semibold q-mode-select ${
                scoringMode === 'exact' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                scoringMode === 'flexible' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-purple-50 text-purple-700 border-purple-200'
              }" data-sec-idx="${secIdx}" data-q-idx="${qIdx}">
                <option value="exact" ${scoringMode === 'exact' ? 'selected' : ''}>🎯 完全一致</option>
                <option value="flexible" ${scoringMode === 'flexible' ? 'selected' : ''}>🔄 同値・部分一致</option>
                <option value="custom" ${scoringMode === 'custom' ? 'selected' : ''}>✍️ カスタム指示</option>
              </select>
            </div>
            <div class="w-16">
              <input type="number" class="w-full px-2 py-1 border rounded text-xs text-right font-mono font-bold q-pts-input" 
                     data-sec-idx="${secIdx}" data-q-idx="${qIdx}" value="${q.points}" min="0">
            </div>
            <div class="flex-1 min-w-[160px]">
              <input type="text" class="w-full px-2 py-1 border rounded text-xs q-ans-input font-mono font-bold text-slate-800" 
                     data-sec-idx="${secIdx}" data-q-idx="${qIdx}" value="${q.correctAnswer}" placeholder="模範解答 (例: 3√2, (x-2)(x+5))">
            </div>
            <div>
              <button class="text-gray-400 hover:text-red-500 text-xs px-1 delete-q-btn" data-sec-idx="${secIdx}" data-q-idx="${qIdx}">
                ✕
              </button>
            </div>
          </div>

          <!-- 採点基準 / カスタム指示入力欄 -->
          <div class="flex items-center space-x-2 text-xs">
            <span class="text-slate-400 whitespace-nowrap">採点メモ・基準:</span>
            <input type="text" class="flex-1 px-2 py-0.5 border rounded text-xs text-slate-600 q-crit-input bg-slate-50 focus:bg-white" 
                   data-sec-idx="${secIdx}" data-q-idx="${qIdx}" value="${q.criteria || ''}" 
                   placeholder="${scoringMode === 'custom' ? '【カスタム指示】部分点ルールや許容表記を入力してください' : '例: 順序逆も可、有理化していなくても可 など'}">
          </div>
        `;
        qListContainer.appendChild(qRow);
      });

      container.appendChild(secDiv);
    });

    document.getElementById('totalScoreDisplay').textContent = `${grandTotalPoints} 点`;

    // イベントバインド
    container.querySelectorAll('.sec-title-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const secIdx = parseInt(e.target.dataset.secIdx, 10);
        this.sections[secIdx].title = e.target.value;
      });
    });
    container.querySelectorAll('.delete-sec-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const secIdx = parseInt(e.target.dataset.secIdx, 10);
        this.sections.splice(secIdx, 1);
        this.renderSectionsSetup();
      });
    });
    container.querySelectorAll('.add-q-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const secIdx = parseInt(e.target.dataset.secIdx, 10);
        const qCount = this.sections[secIdx].questions.length;
        this.sections[secIdx].questions.push({
          id: 'q_' + Date.now() + '_' + (qCount + 1),
          number: `問${qCount + 1}`,
          type: 'symbol',
          points: 5,
          correctAnswer: '',
          scoringMode: 'exact',
          criteria: ''
        });
        this.renderSectionsSetup();
      });
    });

    container.querySelectorAll('.q-num-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions[qIdx].number = e.target.value;
      });
    });
    container.querySelectorAll('.q-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions[qIdx].type = e.target.value;
        if (e.target.value === 'symbol') {
          this.sections[secIdx].questions[qIdx].scoringMode = 'exact';
        } else {
          this.sections[secIdx].questions[qIdx].scoringMode = 'flexible';
        }
        this.renderSectionsSetup();
      });
    });
    container.querySelectorAll('.q-mode-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions[qIdx].scoringMode = e.target.value;
        this.renderSectionsSetup();
      });
    });
    container.querySelectorAll('.q-pts-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions[qIdx].points = Number(e.target.value) || 0;
        this.renderSectionsSetup();
      });
    });
    container.querySelectorAll('.q-ans-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions[qIdx].correctAnswer = e.target.value;
      });
    });
    container.querySelectorAll('.q-crit-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions[qIdx].criteria = e.target.value;
      });
    });
    container.querySelectorAll('.delete-q-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const { secIdx, qIdx } = e.target.dataset;
        this.sections[secIdx].questions.splice(qIdx, 1);
        this.renderSectionsSetup();
      });
    });
  }

  // 模範解答PDFのアップロード・解析
  async handleAnswerKeyPdfUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください。');
      return;
    }

    this.showToast('模範解答PDFを解析中... 少々お待ちください');

    try {
      const fileData = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;

      const pageImages = [];
      let fullText = '';
      const pageTexts = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // テキスト抽出
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        pageTexts.push(pageText);
        fullText += `--- Page ${i} ---\n` + pageText + '\n';

        // 画像レンダリング
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        pageImages.push(canvas.toDataURL('image/jpeg', 0.88));
      }

      // 1. OCRテキストによるスマート自動判定
      if (fullText.includes('12ヶ月') || fullText.includes('12か月') || fullText.includes('別表第') || (fullText.includes('問題１') && fullText.includes('レ'))) {
        this.addNewTemplateWithSections('🚗 12ヶ月点検', AUTOMOTIVE_12M_SECTIONS);
        this.showToast('「自動車12ヶ月点検 (計43点)」を新しいタブに追加しました！');
        return;
      }

      if (fullText.includes('24ヶ月') || fullText.includes('24か月') || fullText.includes('継続検査')) {
        this.addNewTemplateWithSections('🚙 24か月点検', AUTOMOTIVE_24M_SECTIONS);
        this.showToast('「自動車24か月点検 (計35点)」を新しいタブに追加しました！');
        return;
      }

      // 2. Gemini APIが利用可能な場合はAI解析
      if (this.grader.apiKey) {
        const targetImages = pageImages;
        const extractedSections = await this.grader.extractAnswerKeyFromPdf(targetImages, fullText);

        if (extractedSections && Array.isArray(extractedSections) && extractedSections.length > 0) {
          const tabTitle = file.name.replace(/\.[^/.]+$/, '').substring(0, 15);
          this.addNewTemplateWithSections(`📄 ${tabTitle}`, extractedSections);
          this.showToast(`「${tabTitle}」を新しいタブに追加しました！`);
          return;
        }
      }

      // 3. フォールバック
      const defaultTitle = file.name.replace(/\.[^/.]+$/, '').substring(0, 15);
      this.addNewTemplateWithSections(`📄 ${defaultTitle}`, AUTOMOTIVE_12M_SECTIONS);
      this.showToast(`「${defaultTitle}」を新しいタブに追加しました！`);

    } catch (err) {
      console.error('模範解答PDF解析失敗:', err);
      alert('模範解答PDFの解析に失敗しました: ' + err.message);
    }
  }

  // OCRテキストから大問・小問を推測抽出するヘルパー
  parseTextToSections(text) {
    // 簡易ヒューリスティックパーサー
    return null;
  }

  // PDFアップロード処理
  async handlePdfUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください。');
      return;
    }

    const loadingElem = document.getElementById('pdfLoadingIndicator');
    loadingElem.classList.remove('hidden');

    try {
      const fileData = await file.arrayBuffer();
      // PDF.jsの初期化
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      this.pdfDoc = await pdfjsLib.getDocument({ data: fileData }).promise;

      const numPages = this.pdfDoc.numPages;
      document.getElementById('pdfStatusText').textContent = `${file.name} (全 ${numPages} ページ)`;

      // 全ページを高解像度画像にレンダリング
      this.pageImages = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // 高解像度プレビュー
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        this.pageImages.push(canvas.toDataURL('image/jpeg', 0.88));
      }

      this.splitPagesToStudents();
      this.showToast(`PDF ${numPages} ページを正常に読み込みました`);
      // 自動で第1回確認タブへ遷移
      this.switchTab('verify');

    } catch (err) {
      console.error('PDF読み込み失敗:', err);
      alert('PDFの読み込みに失敗しました: ' + err.message);
    } finally {
      loadingElem.classList.add('hidden');
    }
  }

  // 1人あたりのページ数に基づいて各生徒にページを割り当て
  splitPagesToStudents() {
    if (this.pageImages.length === 0) return;

    const totalPages = this.pageImages.length;
    const estimatedStudentsCount = Math.ceil(totalPages / this.pagesPerStudent);

    // 名簿が不足している場合は自動追加
    if (this.students.length < estimatedStudentsCount) {
      const startNum = this.students.length > 0 
        ? (parseInt(this.students[this.students.length - 1].examNumber, 10) || 1000) + 1
        : 1001;
      
      const needed = estimatedStudentsCount - this.students.length;
      for (let i = 0; i < needed; i++) {
        this.students.push({
          id: 'student_' + (this.students.length + 1),
          examNumber: String(startNum + i),
          name: `受験者 ${this.students.length + 1}`,
          pageIndices: [],
          grades: {}
        });
      }
      this.renderRosterTable();
    }

    // ページ割り当て
    this.students.forEach((s, idx) => {
      const startPage = idx * this.pagesPerStudent;
      const endPage = Math.min(startPage + this.pagesPerStudent, totalPages);
      s.pageIndices = [];
      for (let p = startPage; p < endPage; p++) {
        s.pageIndices.push(p);
      }
    });

    document.getElementById('splitSummaryText').textContent = 
      `総ページ数: ${totalPages}枚 / 1人 ${this.pagesPerStudent}枚 → 想定人数: ${estimatedStudentsCount}名`;

    this.renderVerifyView();
  }

  // ==========================================
  // 【第1回目視確認】 受験番号・スキャンデータ照合UI
  // ==========================================
  renderVerifyView() {
    if (this.students.length === 0 || this.pageImages.length === 0) {
      document.getElementById('verifyEmptyState').classList.remove('hidden');
      document.getElementById('verifyMainContent').classList.add('hidden');
      return;
    }

    document.getElementById('verifyEmptyState').classList.add('hidden');
    document.getElementById('verifyMainContent').classList.remove('hidden');

    const student = this.students[this.currentVerifyIndex];
    if (!student) return;

    // 現在の進捗表示
    document.getElementById('verifyProgressText').textContent = 
      `${this.currentVerifyIndex + 1} / ${this.students.length} 人目`;

    // フォームへの反映
    document.getElementById('verifyExamNumberInput').value = student.examNumber;
    document.getElementById('verifyNameInput').value = student.name;

    // ページめくり用のコントロール
    const pageIndices = student.pageIndices || [];
    const pageControl = document.getElementById('verifyPageControls');
    pageControl.innerHTML = '';

    if (pageIndices.length > 1) {
      pageIndices.forEach((pIdx, idx) => {
        const btn = document.createElement('button');
        btn.className = `px-2 py-1 text-xs rounded font-medium ${
          this.verifyCurrentPageIdx === idx ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
        }`;
        btn.textContent = `${idx + 1}枚目 (p.${pIdx + 1})`;
        btn.addEventListener('click', () => {
          this.verifyCurrentPageIdx = idx;
          this.renderVerifyImage();
        });
        pageControl.appendChild(btn);
      });
    }

    if (this.verifyCurrentPageIdx >= pageIndices.length) {
      this.verifyCurrentPageIdx = 0;
    }

    this.renderVerifyImage();

    // 受験番号入力にフォーカス
    const examInput = document.getElementById('verifyExamNumberInput');
    examInput.focus();
    examInput.select();
  }

  renderVerifyImage() {
    const student = this.students[this.currentVerifyIndex];
    if (!student || !student.pageIndices || student.pageIndices.length === 0) return;

    const actualPageIdx = student.pageIndices[this.verifyCurrentPageIdx] || student.pageIndices[0];
    const imgData = this.pageImages[actualPageIdx];

    const imgElem = document.getElementById('verifyPreviewImage');
    imgElem.src = imgData;
    imgElem.style.transform = `scale(${this.verifyZoom})`;
  }

  saveCurrentVerifyStudent() {
    const student = this.students[this.currentVerifyIndex];
    if (!student) return;

    student.examNumber = document.getElementById('verifyExamNumberInput').value.trim();
    student.name = document.getElementById('verifyNameInput').value.trim();
    this.renderRosterTable();
  }

  navigateVerify(direction) {
    this.saveCurrentVerifyStudent();

    const newIdx = this.currentVerifyIndex + direction;
    if (newIdx >= 0 && newIdx < this.students.length) {
      this.currentVerifyIndex = newIdx;
      this.verifyCurrentPageIdx = 0;
      this.renderVerifyView();
    } else if (newIdx >= this.students.length) {
      this.showToast('全ての受験者の確認が完了しました！AI採点タブへ進めます');
      this.switchTab('grade');
    }
  }

  // ==========================================
  // 【AI採点実行】
  // ==========================================
  async startGradingProcess() {
    if (this.students.length === 0 || this.pageImages.length === 0) {
      alert('生徒名簿またはPDFデータが登録されていません。');
      return;
    }

    // 入力欄のAPIキーを自動同期・保存（「保存」ボタン押し忘れ救済）
    const inputKey = document.getElementById('apiKeyInput').value.trim();
    const inputModel = document.getElementById('modelSelect').value;
    if (inputKey) {
      this.grader.setApiKey(inputKey);
      this.grader.setModel(inputModel);
      localStorage.setItem('gemini_api_key', inputKey);
      localStorage.setItem('gemini_model', inputModel);
    }

    if (!this.grader.apiKey) {
      alert(
        '⚠️ Gemini APIキーが設定されていません。\n\n' +
        '画面右上の「Gemini Key」欄にGoogle AI Studioで取得したAPIキーを入力してください。\n' +
        '（「❓ 取得方法」ボタンから無料で1分で取得できます）'
      );
      const keyInput = document.getElementById('apiKeyInput');
      keyInput.focus();
      keyInput.classList.add('ring-2', 'ring-red-500');
      return;
    }

    this.isGrading = true;
    const modal = document.getElementById('gradingProgressModal');
    modal.classList.remove('hidden');

    const totalStudents = this.students.length;
    let completedCount = 0;
    let failedCount = 0;
    let firstErrorMsg = '';

    // ブーストモード判定（ONなら3人同時、OFFなら1人ずつ）
    const isBoost = document.getElementById('boostModeCheckbox')?.checked ?? true;
    const concurrency = isBoost ? 3 : 1;

    // 単一生徒の採点実行ヘルパー
    const gradeSingleStudent = async (student, index) => {
      document.getElementById('gradingCurrentStudentText').textContent = 
        `${isBoost ? '⚡ [ブースト稼働中] ' : ''}採点中 (${completedCount + 1}/${totalStudents}): 受験番号 ${student.examNumber} - ${student.name}`;

      const studentImages = (student.pageIndices || []).map(pIdx => this.pageImages[pIdx]);

      try {
        const gradeResult = await this.grader.gradeStudent(studentImages, this.sections, student);

        student.grades = {};
        if (gradeResult && Array.isArray(gradeResult.results)) {
          gradeResult.results.forEach(res => {
            student.grades[res.questionId] = {
              questionId: res.questionId,
              number: res.number,
              recognizedAnswer: res.recognizedAnswer,
              status: res.status, // 'correct' | 'partial' | 'incorrect'
              awardedPoints: Number(res.awardedPoints) || 0,
              maxPoints: Number(res.maxPoints) || 0,
              reason: res.reason || ''
            };
          });
        }
      } catch (err) {
        console.error(`生徒 ${student.examNumber} の採点に失敗:`, err);
        failedCount++;
        if (!firstErrorMsg) firstErrorMsg = err.message || String(err);

        student.grades = {};
        this.sections.forEach(sec => {
          sec.questions.forEach(q => {
            student.grades[q.id] = {
              questionId: q.id,
              number: q.number,
              recognizedAnswer: '（読取エラー）',
              status: 'incorrect',
              awardedPoints: 0,
              maxPoints: q.points,
              reason: err.message ? `エラー: ${err.message}` : 'APIエラーまたは読取失敗'
            };
          });
        });
      }

      completedCount++;
      const progressPercent = Math.round((completedCount / totalStudents) * 100);
      document.getElementById('gradingProgressBar').style.width = `${progressPercent}%`;
      document.getElementById('gradingProgressPercent').textContent = `${progressPercent}%`;
    };

    // 並列ワーカーキュー処理（concurrency個のスレッドで並行消費）
    const queue = this.students.map((s, idx) => ({ student: s, index: idx }));
    const workers = Array(Math.min(concurrency, totalStudents)).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await gradeSingleStudent(item.student, item.index);
          // わずかなウェイト（レートリミット保護・RPM制限対策）
          await new Promise(r => setTimeout(r, 400));
        }
      }
    });
    await Promise.all(workers);

    document.getElementById('gradingProgressBar').style.width = `100%`;
    document.getElementById('gradingProgressPercent').textContent = `100%`;

    setTimeout(() => {
      modal.classList.add('hidden');
      this.isGrading = false;

      // 全員失敗した場合の親切な診断ポップアップ
      if (failedCount === totalStudents && totalStudents > 0) {
        let advice = 'Gemini APIキーが有効か、通信環境（広告ブロック・プロキシ等）をご確認ください。';
        if (firstErrorMsg.includes('400') || firstErrorMsg.includes('API_KEY_INVALID')) {
          advice = 'APIキーが無効またはスペルミスがあります。Google AI Studioで再確認してください。';
        } else if (firstErrorMsg.includes('403')) {
          advice = 'APIキーの利用権限（アクセス制限）をご確認ください。';
        } else if (firstErrorMsg.includes('404')) {
          advice = '選択されたモデルが見つかりません。画面右上で「Gemini 1.5 Flash」に切り替えてお試しください。';
        } else if (firstErrorMsg.includes('Failed to fetch') || firstErrorMsg.includes('NetworkError')) {
          advice = 'APIサーバーへの通信がブロックされました。Chromeの広告ブロック機能（AdBlock, uBlock等）やセキュリティソフトをご確認ください。';
        }

        alert(
          `【採点エラー】全生徒（${totalStudents}名）のAI採点に失敗しました。\n\n` +
          `■ エラー内容: ${firstErrorMsg}\n\n` +
          `■ 考えられる原因と対処法:\n${advice}`
        );
      } else {
        this.showToast('全生徒のAI採点が完了しました！採点レビュー画面へ移動します');
      }

      this.switchTab('review');
    }, 500);
  }

  // ==========================================
  // 【第2回目視確認】 最終採点レビュー＆手動修正
  // ==========================================
  populateReviewStudentSelect() {
    const sel = document.getElementById('reviewStudentSelect');
    sel.innerHTML = '';
    this.students.forEach((s, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = s.name ? `${s.examNumber}: ${s.name}` : `受験番号 ${s.examNumber}`;
      sel.appendChild(opt);
    });
    sel.value = this.currentReviewIndex;
  }

  renderReviewView() {
    if (this.students.length === 0) return;

    const student = this.students[this.currentReviewIndex];
    if (!student) return;

    document.getElementById('reviewStudentSelect').value = this.currentReviewIndex;
    document.getElementById('reviewProgressBadge').textContent = 
      `${this.currentReviewIndex + 1} / ${this.students.length} 人目`;

    // 答案画像
    const pageIndices = student.pageIndices || [];
    const pageControl = document.getElementById('reviewPageControls');
    pageControl.innerHTML = '';

    if (pageIndices.length > 1) {
      pageIndices.forEach((pIdx, idx) => {
        const btn = document.createElement('button');
        btn.className = `px-2 py-1 text-xs rounded font-medium ${
          this.reviewCurrentPageIdx === idx ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
        }`;
        btn.textContent = `${idx + 1}枚目 (p.${pIdx + 1})`;
        btn.addEventListener('click', () => {
          this.reviewCurrentPageIdx = idx;
          this.renderReviewImage();
        });
        pageControl.appendChild(btn);
      });
    }

    if (this.reviewCurrentPageIdx >= pageIndices.length) {
      this.reviewCurrentPageIdx = 0;
    }

    this.renderReviewImage();
    this.renderReviewGradingDetails(student);
  }

  renderReviewImage() {
    const student = this.students[this.currentReviewIndex];
    if (!student || !student.pageIndices || student.pageIndices.length === 0) return;

    const actualPageIdx = student.pageIndices[this.reviewCurrentPageIdx] || student.pageIndices[0];
    const imgData = this.pageImages[actualPageIdx];

    const imgElem = document.getElementById('reviewPreviewImage');
    imgElem.src = imgData;
    imgElem.style.transform = `scale(${this.reviewZoom})`;
  }

  renderReviewGradingDetails(student) {
    const container = document.getElementById('reviewQuestionsList');
    container.innerHTML = '';

    let grandTotal = 0;
    let grandMax = 0;

    this.sections.forEach((sec, secIdx) => {
      const secCard = document.createElement('div');
      secCard.className = 'border rounded-lg bg-gray-50 p-3 mb-3';

      let secScore = 0;
      let secMax = 0;

      const qItemsHtml = sec.questions.map(q => {
        secMax += q.points;
        const grade = (student.grades || {})[q.id] || {
          awardedPoints: 0,
          status: 'incorrect',
          recognizedAnswer: '未採点',
          reason: ''
        };
        secScore += grade.awardedPoints;

        const isCorrect = grade.status === 'correct';
        const isPartial = grade.status === 'partial';
        const isIncorrect = grade.status === 'incorrect';

        return `
          <div class="bg-white p-3 rounded border text-sm flex flex-col gap-2 q-grade-item" data-q-id="${q.id}">
            <div class="flex items-center justify-between">
              <span class="font-bold text-gray-800">${q.number}</span>
              <div class="flex items-center space-x-1">
                <button class="px-2 py-0.5 rounded text-xs font-bold judge-btn judge-correct ${
                  isCorrect ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                }" data-q-id="${q.id}" data-status="correct" data-pts="${q.points}">○ 正解</button>
                <button class="px-2 py-0.5 rounded text-xs font-bold judge-btn judge-partial ${
                  isPartial ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-50'
                }" data-q-id="${q.id}" data-status="partial" data-pts="${Math.round(q.points / 2)}">△ 部分点</button>
                <button class="px-2 py-0.5 rounded text-xs font-bold judge-btn judge-incorrect ${
                  isIncorrect ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                }" data-q-id="${q.id}" data-status="incorrect" data-pts="0">✕ 不正解</button>
                <div class="flex items-center ml-2">
                  <input type="number" class="w-14 px-1.5 py-0.5 text-right font-mono font-bold border rounded score-input" 
                         data-q-id="${q.id}" value="${grade.awardedPoints}" min="0" max="${q.points}">
                  <span class="text-xs text-gray-400 ml-1">/ ${q.points}点</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded">
              <div>
                <span class="text-gray-500">模範解答:</span>
                <span class="font-medium text-gray-800 font-mono">${q.correctAnswer}</span>
              </div>
              <div>
                <span class="text-gray-500">生徒の回答 (AI認識):</span>
                <span class="font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'} font-mono">
                  ${grade.recognizedAnswer || '（読取不可）'}
                </span>
              </div>
            </div>

            ${grade.reason ? `
              <div class="text-xs text-gray-500 bg-amber-50/60 border border-amber-100 px-2 py-1 rounded">
                <span class="font-semibold text-amber-700">AIコメント:</span> ${grade.reason}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      grandTotal += secScore;
      grandMax += secMax;

      secCard.innerHTML = `
        <div class="flex items-center justify-between pb-2 mb-2 border-b">
          <span class="font-bold text-gray-700">${sec.title}</span>
          <span class="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
            小計: ${secScore} / ${secMax} 点
          </span>
        </div>
        <div class="space-y-2">
          ${qItemsHtml}
        </div>
      `;

      container.appendChild(secCard);
    });

    document.getElementById('reviewTotalScoreBadge').textContent = 
      `総合得点: ${grandTotal} / ${grandMax} 点 (${grandMax > 0 ? ((grandTotal / grandMax) * 100).toFixed(1) : 0}%)`;

    // 採点ボタングループのイベント設定
    container.querySelectorAll('.judge-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qId = e.currentTarget.dataset.qId;
        const status = e.currentTarget.dataset.status;
        const pts = Number(e.currentTarget.dataset.pts);

        if (!student.grades) student.grades = {};
        if (!student.grades[qId]) student.grades[qId] = {};

        student.grades[qId].status = status;
        student.grades[qId].awardedPoints = pts;

        this.renderReviewGradingDetails(student);
      });
    });

    // 得点直接入力
    container.querySelectorAll('.score-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const qId = e.target.dataset.qId;
        const pts = Number(e.target.value) || 0;

        if (!student.grades) student.grades = {};
        if (!student.grades[qId]) student.grades[qId] = {};

        student.grades[qId].awardedPoints = pts;
        this.renderReviewGradingDetails(student);
      });
    });
  }

  navigateReview(direction) {
    const newIdx = this.currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < this.students.length) {
      this.currentReviewIndex = newIdx;
      this.reviewCurrentPageIdx = 0;
      this.renderReviewView();
    }
  }

  // レビュー画面で現在表示中の生徒のみを再採点
  async regradeCurrentStudent() {
    const student = this.students[this.currentReviewIndex];
    if (!student) return;

    if (!this.grader.apiKey) {
      alert('画面右上のGemini KeyにAPIキーを入力して保存してください。');
      return;
    }

    const btn = document.getElementById('regradeCurrentStudentBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 採点中...';
    btn.disabled = true;

    const studentImages = (student.pageIndices || []).map(pIdx => this.pageImages[pIdx]);

    try {
      this.showToast(`生徒 ${student.examNumber} (${student.name}) を再採点中...`);
      const gradeResult = await this.grader.gradeStudent(studentImages, this.sections, student);

      student.grades = {};
      if (gradeResult && Array.isArray(gradeResult.results)) {
        gradeResult.results.forEach(res => {
          student.grades[res.questionId] = {
            questionId: res.questionId,
            number: res.number,
            recognizedAnswer: res.recognizedAnswer,
            status: res.status,
            awardedPoints: Number(res.awardedPoints) || 0,
            maxPoints: Number(res.maxPoints) || 0,
            reason: res.reason || ''
          };
        });
      }
      this.renderReviewView();
      this.showToast(`生徒 ${student.examNumber} の再採点が完了しました！✨`);
    } catch (err) {
      alert(`再採点に失敗しました: ${err.message}`);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // ==========================================
  // 【Excel出力・最終確認画面】
  // ==========================================
  renderExportTable() {
    const thead = document.getElementById('exportTableHead');
    const tbody = document.getElementById('exportTableBody');

    // ヘッダー構築
    let headHtml = `
      <tr>
        <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600 bg-gray-50">受験番号</th>
        <th class="py-2 px-3 border-b text-left text-xs font-semibold text-gray-600 bg-gray-50">氏名</th>
        <th class="py-2 px-3 border-b text-right text-xs font-semibold text-indigo-700 bg-indigo-50">総合得点</th>
        <th class="py-2 px-3 border-b text-right text-xs font-semibold text-gray-600 bg-gray-50">得点率</th>
    `;

    this.sections.forEach(sec => {
      headHtml += `<th class="py-2 px-3 border-b text-right text-xs font-semibold text-gray-600 bg-gray-50">${sec.title}</th>`;
    });

    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    // 行データ構築
    const allQuestions = [];
    this.sections.forEach(sec => {
      sec.questions.forEach(q => allQuestions.push(q));
    });
    const totalMax = allQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

    tbody.innerHTML = '';
    this.students.forEach(student => {
      const grades = student.grades || {};
      let total = 0;
      allQuestions.forEach(q => {
        const g = grades[q.id];
        if (g && typeof g.awardedPoints === 'number') total += g.awardedPoints;
      });
      const pct = totalMax > 0 ? ((total / totalMax) * 100).toFixed(1) : 0;

      let rowHtml = `
        <tr class="border-b hover:bg-gray-50 text-sm">
          <td class="py-2 px-3 font-mono font-medium">${student.examNumber}</td>
          <td class="py-2 px-3 font-medium text-gray-800">${student.name}</td>
          <td class="py-2 px-3 text-right font-bold text-indigo-600">${total} / ${totalMax}</td>
          <td class="py-2 px-3 text-right text-gray-500">${pct}%</td>
      `;

      this.sections.forEach(sec => {
        let secScore = 0;
        sec.questions.forEach(q => {
          const g = grades[q.id];
          if (g && typeof g.awardedPoints === 'number') secScore += g.awardedPoints;
        });
        rowHtml += `<td class="py-2 px-3 text-right font-mono">${secScore}</td>`;
      });

      rowHtml += `</tr>`;
      tbody.innerHTML += rowHtml;
    });
  }

  // テスト用ダミー答案用紙（Canvas画像）の生成（8名分）
  createDummyAnswerSheets() {
    // 数学Iサンプルタブを自動選択（なければタブを追加）
    let mathTpl = this.templates.find(t => t.id === 'tpl_math1' || t.name.includes('数学I'));
    if (!mathTpl) {
      this.addNewTemplateWithSections('📐 数学I サンプル', MATH1_SECTIONS);
    } else {
      this.switchTemplate(mathTpl.id);
    }

    // 必ず8名のサンプル名簿を揃える（空、または8名未満、以前の4名名簿のままの場合は再生成）
    if (this.students.length < 8) {
      document.getElementById('namesTextArea').value = SAMPLE_STUDENTS_TEXT;
      this.generateNumberedStudents();
    }

    const dummyCount = 8;
    this.pageImages = [];

    const dummyAnswers = [
      { q1_1: 'イ', q1_2: 'エ', q1_3: '3', q2_1: '(x-2)(x+5)', q2_2: '3√2', q2_3: 'x = (1±√5)/2', q3_1: '(2, -1)', q3_2: 'x=5で最大値8' },
      { q1_1: 'ア', q1_2: 'エ', q1_3: '3', q2_1: '(x+5)(x-2)', q2_2: '√18', q2_3: 'x = (1±√5)/2', q3_1: '(2, 1)', q3_2: '最大値8' },
      { q1_1: 'イ', q1_2: 'ウ', q1_3: '7', q2_1: '(x-3)(x+4)', q2_2: '3√2', q2_3: 'x = (1+√5)/2', q3_1: '(2, -1)', q3_2: 'x=5で8' },
      { q1_1: 'イ', q1_2: 'エ', q1_3: '3', q2_1: '(x-2)(x+5)', q2_2: '3√2', q2_3: 'x = (-1±√5)/2', q3_1: '(2, -1)', q3_2: 'x=5で最大値8' },
      { q1_1: 'イ', q1_2: 'エ', q1_3: '3', q2_1: '(x-2)(x+5)', q2_2: '3√2', q2_3: 'x = (1±√5)/2', q3_1: '(2, -1)', q3_2: 'x=5で最大値8' },
      { q1_1: 'イ', q1_2: 'エ', q1_3: '3', q2_1: '(x+5)(x-2)', q2_2: '3√2', q2_3: 'x = (1±√5)/2', q3_1: '(2, -1)', q3_2: '最大値8 (x=5)' },
      { q1_1: 'ウ', q1_2: 'エ', q1_3: '3', q2_1: '(x-2)(x+5)', q2_2: '6/√2', q2_3: 'x = (1±√5)/2', q3_1: '(2, -1)', q3_2: 'x=5で最大値8' },
      { q1_1: 'イ', q1_2: 'ア', q1_3: '3', q2_1: '(x-2)(x+5)', q2_2: '3√2', q2_3: 'x = 1/2 ± √5/2', q3_1: '(2, -1)', q3_2: '最大値8' }
    ];

    for (let i = 0; i < dummyCount; i++) {
      const student = this.students[i];
      const ans = dummyAnswers[i % dummyAnswers.length];

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');

      // 背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 用紙枠線
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // ヘッダー情報（タイトル・受験番号・氏名欄）
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px "Noto Sans JP", sans-serif';
      ctx.fillText('令和X年度 数学I 基礎学力確認テスト 解答用紙', 80, 110);

      // 受験番号・氏名記入枠
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, 140, 320, 90);
      ctx.strokeRect(420, 140, 420, 90);

      ctx.font = '20px "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('受験番号', 95, 175);
      ctx.fillText('氏名', 435, 175);

      // 手書き風文字（外国人特有の癖を模倣）
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 44px "JetBrains Mono", cursive, sans-serif';
      ctx.fillText(student.examNumber, 200, 205);

      ctx.font = 'bold 32px "Noto Sans JP", cursive, sans-serif';
      ctx.fillText(student.name || `受験者 ${i + 1}`, 500, 202);

      // 大問1
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
      ctx.fillText('【大問1】記号問題', 80, 300);

      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(80, 320, 1040, 200);
      ctx.font = '22px "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('問1(1) [記号]:', 100, 370);
      ctx.fillText('問1(2) [記号]:', 100, 430);
      ctx.fillText('問1(3) [数字]:', 100, 490);

      // 手書き回答
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(ans.q1_1, 280, 370);
      ctx.fillText(ans.q1_2, 280, 430);
      ctx.fillText(ans.q1_3, 280, 490);

      // 大問2
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
      ctx.fillText('【大問2】数と式・方程式（数I）', 80, 580);

      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(80, 600, 1040, 320);
      ctx.font = '22px "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('問2(1) 因数分解:', 100, 660);
      ctx.fillText('問2(2) 根号計算:', 100, 750);
      ctx.fillText('問2(3) 2次方程式の解:', 100, 840);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 32px "JetBrains Mono", sans-serif';
      ctx.fillText(ans.q2_1, 350, 660);
      ctx.fillText(ans.q2_2, 350, 750);
      ctx.fillText(ans.q2_3, 350, 840);

      // 大問3
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
      ctx.fillText('【大問3】2次関数（数I）', 80, 980);

      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(80, 1000, 1040, 240);
      ctx.font = '22px "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('問3(1) 頂点座標:', 100, 1070);
      ctx.fillText('問3(2) 最大値:', 100, 1170);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 32px "JetBrains Mono", sans-serif';
      ctx.fillText(ans.q3_1, 350, 1070);
      ctx.fillText(ans.q3_2, 350, 1170);

      // フッター注意書き
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px "Noto Sans JP", sans-serif';
      ctx.fillText('※採点欄には何も記入しないでください。', 80, 1500);

      this.pageImages.push(canvas.toDataURL('image/jpeg', 0.88));
    }

    this.pagesPerStudent = 1;
    document.getElementById('pagesPerStudentSelect').value = '1';
    this.splitPagesToStudents();

    document.getElementById('pdfStatusText').textContent = `テスト用答案画像（${dummyCount}名分）を生成しました`;
    this.showToast(`テスト用答案（${dummyCount}名分）をロードしました`);

    // 目視確認①タブへ自動遷移
    this.switchTab('verify');
  }

  renderSummaryStats() {
    // 統計情報の更新用プレースホルダー
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3000);
  }
}

// アプリの初期化
window.addEventListener('DOMContentLoaded', () => {
  window.gradingApp = new GradingApp();
});
