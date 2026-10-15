/**
 * excel.js - 成績一覧 Excel (.xlsx) 出力モジュール
 * SheetJS (XLSX) を活用して、セクション小計・合計点・各問得点を含んだ帳票を生成・ダウンロードします。
 */

export function exportGradingToExcel(students, sections, examTitle = '試験成績一覧表') {
  if (typeof XLSX === 'undefined') {
    alert('SheetJS (XLSX) ライブラリがロードされていません。');
    return;
  }

  // 1. 全小問リストを平坦化
  const allQuestions = [];
  sections.forEach(sec => {
    sec.questions.forEach(q => {
      allQuestions.push({
        sectionId: sec.id,
        sectionTitle: sec.title,
        questionId: q.id,
        number: q.number,
        points: q.points
      });
    });
  });

  // 2. ヘッダー行の構築
  // 行1: メインヘッダー
  const headerRow1 = ['受験番号', '氏名', '総合得点', '総合満点', '得点率(%)'];
  
  // セクション列
  sections.forEach(sec => {
    const secMax = sec.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
    headerRow1.push(`${sec.title} (計${secMax}点)`);
  });

  // 小問列
  allQuestions.forEach(q => {
    headerRow1.push(`${q.number} (${q.points}点)`);
  });

  // 3. データ行の構築
  const totalMaxScore = allQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const rows = [headerRow1];

  students.forEach(student => {
    const grades = student.grades || {};
    
    // 総合得点計算
    let totalScore = 0;
    allQuestions.forEach(q => {
      const g = grades[q.questionId];
      if (g && typeof g.awardedPoints === 'number') {
        totalScore += g.awardedPoints;
      }
    });

    const percentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(1) : 0;

    const row = [
      student.examNumber || '',
      student.name || '',
      totalScore,
      totalMaxScore,
      `${percentage}%`
    ];

    // 各セクションの小計
    sections.forEach(sec => {
      let secScore = 0;
      sec.questions.forEach(q => {
        const g = grades[q.questionId];
        if (g && typeof g.awardedPoints === 'number') {
          secScore += g.awardedPoints;
        }
      });
      row.push(secScore);
    });

    // 各小問の得点
    allQuestions.forEach(q => {
      const g = grades[q.questionId];
      const pts = (g && typeof g.awardedPoints === 'number') ? g.awardedPoints : 0;
      row.push(pts);
    });

    rows.push(row);
  });

  // 4. 統計行（平均点など）の追加
  if (students.length > 0) {
    const avgRow = ['【平均】', '-', 0, totalMaxScore, '-'];
    
    // 総合平均
    const totalAvg = (students.reduce((acc, s) => {
      let sc = 0;
      allQuestions.forEach(q => {
        const g = (s.grades || {})[q.questionId];
        if (g && typeof g.awardedPoints === 'number') sc += g.awardedPoints;
      });
      return acc + sc;
    }, 0) / students.length).toFixed(1);
    avgRow[2] = Number(totalAvg);
    avgRow[4] = totalMaxScore > 0 ? `${((totalAvg / totalMaxScore) * 100).toFixed(1)}%` : '-';

    // セクション平均
    sections.forEach(sec => {
      const secAvg = (students.reduce((acc, s) => {
        let sc = 0;
        sec.questions.forEach(q => {
          const g = (s.grades || {})[q.questionId];
          if (g && typeof g.awardedPoints === 'number') sc += g.awardedPoints;
        });
        return acc + sc;
      }, 0) / students.length).toFixed(1);
      avgRow.push(Number(secAvg));
    });

    // 小問別平均
    allQuestions.forEach(q => {
      const qAvg = (students.reduce((acc, s) => {
        const g = (s.grades || {})[q.questionId];
        return acc + ((g && typeof g.awardedPoints === 'number') ? g.awardedPoints : 0);
      }, 0) / students.length).toFixed(1);
      avgRow.push(Number(qAvg));
    });

    rows.push([]); // 空行
    rows.push(avgRow);
  }

  // 5. ワークシートおよびブックの作成
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // カラム幅の自動設定
  const colWidths = headerRow1.map((hdr, idx) => {
    let maxLen = (hdr || '').toString().length * 2;
    rows.forEach(r => {
      const val = (r[idx] || '').toString();
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.max(maxLen + 2, 10) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, '成績一覧表');

  // 6. ファイル出力ダウンロード
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `${examTitle}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}
