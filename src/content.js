(function () {
  const PANEL_ID = "ed-note-assistant";
  const ER_PREVIEW_ID = "ed-note-record-preview";
  const ER_PREVIEW_FRAME_ID = "ed-note-record-preview-frame";
  const RECENT_PREVIEW_STORAGE_KEY = "edNoteRecentPreview";
  const STRUCTURE_EXPORT_VERSION = "0.3.0";
  const MAX_EXPORT_NODES = 1500;
  const MAX_CHILDREN_PER_NODE = 80;
  const IGNORED_EXPORT_TAGS = new Set(["script", "style", "noscript", "template", "option"]);
  const ER_MAIN_SELECTORS = {
    patientTable: "#ERPatientListTable",
    recordTable: "#ERPatientRecordListTable",
    notePanel: "#ER_Note",
    evaPanel: "#ER_Eva",
    noteAndEvaPanel: "#AllRecAndEvaDiv",
    patientInfoPanel: "#erPatientinforDiv",
    addNoteForm: "#ADDNote",
    dittoForm: "#TurnToDitto",
    editForm: "#TurnToEditSelfView",
    newButton: ".er-btn-add",
    dittoButton: "#DittoFormForERBtn",
    searchButton: "#ERserchBtn"
  };
  const MRN_IOENOTE_SELECTORS = {
    form: "#IOEnoteForm",
    currentChartNo: "#CurrentChartno",
    queryButton: "#QueryData",
    infoDetailTable: "#InfoDetailTable",
    allDetailPanel: "#AllDetailDiv",
    noteTab: "#NoteLi",
    trackModifyTab: "#TrackModifyLi",
    orderTab: "#OrderLi",
    notePanel: "#Note",
    trackModifyPanel: "#TrackModify",
    orderPanel: "#Order",
    orderTable: "#ControlOrderTable",
    printForm: "#EMRPrint",
    noteHeaderTable: "#NoteHeaderTable",
    noteFrameForm: "#OnlyNote",
    noteFrame: "#iframFormOnlyNote"
  };
  const MRN_IOENOTE_FRAME_CONTENT_SELECTOR = "#nav-tabContent";
  const YEAR_AGGREGATION_DEFAULT_TYPES = new Set([
    "急診來診",
    "急診轉歸",
    "急診病程",
    "轉區摘要",
    "外傷來診紀錄",
    "入院病摘",
    "出院病摘",
    "轉入病摘",
    "轉出病摘"
  ]);
  const YEAR_AGGREGATION_MAX_RECORDS = 40;
  const YEAR_RECORD_LOAD_DELAY_MS = 900;
  const YEAR_RECORD_TIMEOUT_MS = 5000;
  const PATIENT_TABLE_SELECTOR = "#ERPatientListTable";
  const PATIENT_NAME_CELL_SELECTOR = "td:nth-child(6)";
  const PATIENT_CONSULT_CELL_SELECTOR = "td:nth-child(4)";
  const SYSTEM_RECORD_SELECTOR = 'span[title="體系病歷"]';
  const SYSTEM_RECORD_SHORTCUT_CLASS = "ed-note-system-record-shortcut";
  const PATIENT_NAME_CELL_CLASS = "ed-note-patient-name-cell";
  const PATIENT_NAME_TEXT_CLASS = "ed-note-patient-name-text";
  const SHORTCUT_OBSERVER_FLAG = "edNoteShortcutObserverReady";
  const ER_RECORD_PREVIEW_OBSERVER_FLAG = "edNoteRecordPreviewObserverReady";
  const ER_CONSULT_REDIRECT_OBSERVER_FLAG = "edNoteConsultRedirectObserverReady";
  const CROSS_TEAM_DOCTOR_CONSULT_OBSERVER_FLAG = "edNoteCrossTeamDoctorConsultObserverReady";
  const ER_RECORD_PREVIEW_PROGRAMMATIC_CLICK_FLAG = "edNoteRecordPreviewClicking";
  const CROSS_TEAM_DOCTOR_CONSULT_STORAGE_KEY = "edNoteCrossTeamDoctorConsultTarget";
  const CROSS_TEAM_DOCTOR_CONSULT_TYPE = "NewConsultDr";
  const CROSS_TEAM_DOCTOR_CONSULT_MAX_AGE_MS = 120000;
  const CROSS_TEAM_DOCTOR_CONSULT_RETRY_MS = 500;
  const CROSS_TEAM_DOCTOR_CONSULT_TIMEOUT_MS = 30000;
  const SYSTEM_RECORD_FAST_DELAY_MS = 80;
  const SYSTEM_RECORD_RETRY_TIMEOUT_MS = 900;
  const ER_RECORD_PREVIEW_TIMEOUT_MS = 30000;
  const yearAggregationState = {
    running: false,
    stopRequested: false
  };
  const erRecordPreviewState = {
    sequence: 0,
    enhanceTimerId: null
  };

  const diagnosisRules = [
    {
      name: "泌尿道感染 / 腎盂腎炎",
      keywords: ["發燒", "畏寒", "頻尿", "解尿痛", "腰痛", "CVA", "pyuria", "UTI", "WBC", "nitrite"],
      coreKeywords: ["頻尿", "解尿痛", "腰痛", "CVA", "pyuria", "UTI", "nitrite"],
      minHits: 2,
      note: "若合併敗血症徵象、低血壓、意識改變或腎功能異常，需提高警覺。"
    },
    {
      name: "肺炎 / 下呼吸道感染",
      keywords: ["咳嗽", "痰", "喘", "呼吸困難", "發燒", "CXR", "infiltration", "pneumonia", "SpO2"],
      coreKeywords: ["咳嗽", "痰", "喘", "呼吸困難", "CXR", "infiltration", "pneumonia", "SpO2"],
      minHits: 2,
      note: "可搭配胸部影像、氧氣需求、感染指標與共病評估嚴重度。"
    },
    {
      name: "急性冠心症",
      keywords: ["胸痛", "胸悶", "冒冷汗", "心電圖", "EKG", "ST", "troponin", "ACS", "AMI"],
      coreKeywords: ["胸痛", "胸悶", "冒冷汗", "心電圖", "EKG", "ST", "troponin", "ACS", "AMI"],
      minHits: 2,
      note: "需確認 ECG、心肌酵素趨勢與危險因子。"
    },
    {
      name: "腦中風 / TIA",
      keywords: ["肢體無力", "口齒不清", "臉歪", "意識改變", "NIHSS", "CT", "stroke", "TIA"],
      coreKeywords: ["肢體無力", "口齒不清", "臉歪", "NIHSS", "stroke", "TIA"],
      minHits: 1,
      note: "需確認 onset time、神經學檢查、影像與溶栓/取栓適應症。"
    },
    {
      name: "急性腸胃炎 / 腸胃道感染",
      keywords: ["腹瀉", "嘔吐", "噁心", "腹痛", "水瀉", "bloody stool", "gastroenteritis"],
      coreKeywords: ["腹瀉", "嘔吐", "水瀉", "bloody stool", "gastroenteritis"],
      minHits: 1,
      note: "留意脫水、電解質異常、血便、腹膜刺激與高風險族群。"
    },
    {
      name: "敗血症 / 感染症需評估",
      keywords: ["發燒", "低血壓", "tachycardia", "lactate", "sepsis", "WBC", "CRP", "意識改變"],
      coreKeywords: ["低血壓", "tachycardia", "lactate", "sepsis", "意識改變"],
      minHits: 3,
      note: "需整合生命徵象、感染源、lactate、器官功能與抗生素時機。"
    }
  ];

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.className = "ed-note-assistant";
    panel.innerHTML = `
      <div class="ed-note-assistant__header">
        <div class="ed-note-assistant__title">急診病摘輔助</div>
        <button class="ed-note-assistant__toggle" type="button" title="收合/展開">-</button>
      </div>
      <div class="ed-note-assistant__body">
        <div class="ed-note-assistant__actions">
          <button class="ed-note-assistant__primary" type="button" data-action="read">讀取選取/頁面文字</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="summarize">整理病摘摘要</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="aggregate-year">統整一年病歷</button>
          <button class="ed-note-assistant__secondary ed-note-assistant__danger ed-note-assistant__action--hidden" type="button" data-action="stop-year">停止統整</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="suggest">產生診斷候選</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="copy">複製結果</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="detect-page">偵測頁面</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="add-shortcuts">補體系按鈕</button>
          <button class="ed-note-assistant__secondary" type="button" data-action="export-structure">匯出頁面架構</button>
        </div>
        <div>
          <div class="ed-note-assistant__section-title">病摘文字</div>
          <textarea class="ed-note-assistant__textarea" data-role="source" placeholder="可先按讀取頁面文字，或手動貼上病摘內容"></textarea>
        </div>
        <div>
          <div class="ed-note-assistant__section-title">診斷候選</div>
          <div class="ed-note-assistant__result" data-role="result">
            <div class="ed-note-assistant__empty">尚未產生。此版本只做本機關鍵字輔助，需由醫師確認。</div>
          </div>
        </div>
        <div class="ed-note-assistant__export ed-note-assistant__export--hidden" data-role="export-output-wrap">
          <div class="ed-note-assistant__section-title">頁面架構 JSON</div>
          <textarea class="ed-note-assistant__textarea ed-note-assistant__textarea--compact" data-role="export-output" readonly></textarea>
        </div>
        <div class="ed-note-assistant__status" data-role="status"></div>
        <div class="ed-note-assistant__notice">提示：目前是 prototype。之後拿到目標欄位 HTML 後，可以改成精準讀取病摘欄位並自動填入指定欄位。</div>
      </div>
    `;

    panel.querySelector("[data-action='read']").addEventListener("click", () => {
      const text = extractVisibleClinicalText();
      getSource(panel).value = text;
      saveRecentPreview("讀取內容", text);
      refreshErMainPreview();
    });
    panel.querySelector("[data-action='suggest']").addEventListener("click", () => {
      renderSuggestions(panel, suggestDiagnoses(getSource(panel).value));
    });
    panel.querySelector("[data-action='summarize']").addEventListener("click", () => {
      summarizeCurrentText(panel);
    });
    panel.querySelector("[data-action='aggregate-year']").addEventListener("click", () => {
      aggregateYearRecords(panel);
    });
    panel.querySelector("[data-action='stop-year']").addEventListener("click", () => {
      requestStopYearAggregation(panel);
    });
    panel.querySelector("[data-action='copy']").addEventListener("click", () => {
      copySuggestions(panel);
    });
    panel.querySelector("[data-action='detect-page']").addEventListener("click", () => {
      renderPageDetection(panel);
    });
    panel.querySelector("[data-action='add-shortcuts']").addEventListener("click", () => {
      const addedCount = addSystemRecordShortcuts();
      showPanelStatus(`已檢查左側清單，新增 ${addedCount} 個體系按鈕。`);
    });
    panel.querySelector("[data-action='export-structure']").addEventListener("click", () => {
      exportAndCopyStructure(panel);
    });
    panel.querySelector(".ed-note-assistant__toggle").addEventListener("click", () => {
      panel.classList.toggle("ed-note-assistant--collapsed");
      panel.querySelector(".ed-note-assistant__toggle").textContent = panel.classList.contains("ed-note-assistant--collapsed") ? "+" : "-";
    });

    document.body.appendChild(panel);
    enhanceErMainPatientList();
    createErMainPreviewPanel();
    activatePendingCrossTeamDoctorConsult();
  }

  function getSource(panel) {
    return panel.querySelector("[data-role='source']");
  }

  function extractVisibleClinicalText() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      return compactText(selectedText);
    }

    const focusedPatientText = extractFocusedPatientText();
    if (focusedPatientText) {
      return focusedPatientText;
    }

    const formText = getReadableFormControls()
      .map((element) => element.value)
      .filter(Boolean);

    const pageText = document.body.innerText || "";
    return compactText([...formText, pageText].join("\n"));
  }

  function compactText(text) {
    return text
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function truncateText(text, maxLength) {
    const value = compactText(text);
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  function extractFocusedPatientText() {
    const mrnText = extractMrnIoeNoteText();
    if (mrnText) {
      return mrnText;
    }

    const selectors = [
      ER_MAIN_SELECTORS.notePanel,
      ER_MAIN_SELECTORS.evaPanel,
      ER_MAIN_SELECTORS.noteAndEvaPanel,
      ER_MAIN_SELECTORS.recordTable
    ];

    const text = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
      .map((element) => element.innerText || "")
      .filter(Boolean)
      .join("\n");

    return compactText(text);
  }

  function extractMrnIoeNoteText() {
    return extractMrnIoeNoteTextFromDocument(document);
  }

  function extractMrnIoeNoteTextFromDocument(rootDocument) {
    if (!rootDocument.querySelector(MRN_IOENOTE_SELECTORS.form)) {
      return "";
    }

    const frameText = extractAccessibleFrameText(
      MRN_IOENOTE_SELECTORS.noteFrame,
      MRN_IOENOTE_FRAME_CONTENT_SELECTOR,
      rootDocument
    );
    const noteHeaderText = getElementText(MRN_IOENOTE_SELECTORS.noteHeaderTable, rootDocument);
    if (frameText) {
      return compactText([noteHeaderText, frameText].filter(Boolean).join("\n"));
    }

    const selectors = [
      MRN_IOENOTE_SELECTORS.notePanel,
      MRN_IOENOTE_SELECTORS.trackModifyPanel,
      MRN_IOENOTE_SELECTORS.orderPanel,
      MRN_IOENOTE_SELECTORS.orderTable,
      MRN_IOENOTE_SELECTORS.allDetailPanel
    ];

    const topDocumentText = selectors
      .map((selector) => rootDocument.querySelector(selector))
      .filter(Boolean)
      .map((element) => element.innerText || "")
      .filter(Boolean)
      .join("\n");

    return compactText(topDocumentText);
  }

  function extractAccessibleFrameText(frameSelector, contentSelector, rootDocument = document) {
    const frame = rootDocument.querySelector(frameSelector);
    if (!frame) {
      return "";
    }

    const frameDocument = getAccessibleFrameDocument(frame);
    if (!frameDocument || !frameDocument.body) {
      return "";
    }

    const content = frameDocument.querySelector(contentSelector) || frameDocument.body;
    return compactText(content.innerText || "");
  }

  function getElementText(selector, rootDocument = document) {
    const element = rootDocument.querySelector(selector);
    return element ? compactText(element.innerText || "") : "";
  }

  function getReadableFormControls() {
    return getPageElements("textarea, input[type='text'], input:not([type])")
      .filter((element) => !element.closest(ER_MAIN_SELECTORS.patientTable));
  }

  function suggestDiagnoses(text) {
    const normalized = text.toLowerCase();
    return diagnosisRules
      .map((rule) => {
        const hits = rule.keywords.filter((keyword) => hasClinicalKeyword(normalized, keyword));
        return { ...rule, hits };
      })
      .filter((rule) => {
        const coreHits = (rule.coreKeywords || []).filter((keyword) => rule.hits.includes(keyword));
        const hasEnoughHits = rule.hits.length >= (rule.minHits || 1);
        return hasEnoughHits && (!rule.coreKeywords || coreHits.length > 0);
      })
      .sort((a, b) => b.hits.length - a.hits.length);
  }

  function hasClinicalKeyword(normalizedText, keyword) {
    const normalizedKeyword = keyword.toLowerCase();
    if (!normalizedText.includes(normalizedKeyword)) {
      return false;
    }
    return !isNegatedKeyword(normalizedText, normalizedKeyword);
  }

  function isNegatedKeyword(normalizedText, normalizedKeyword) {
    const negationPattern = new RegExp(`(否認|無|沒有|未|no|denies).{0,8}${escapeRegExp(normalizedKeyword)}`, "i");
    return negationPattern.test(normalizedText);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderSuggestions(panel, suggestions) {
    const result = panel.querySelector("[data-role='result']");
    if (!suggestions.length) {
      result.innerHTML = `<div class="ed-note-assistant__empty">沒有找到明顯關鍵字。請補充主訴、病史、檢查或檢驗內容後再試。</div>`;
      return;
    }

    result.innerHTML = suggestions
      .map((item) => `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-name">${escapeHtml(item.name)}</div>
          <div>${escapeHtml(item.note)}</div>
          <div class="ed-note-assistant__suggestion-meta">命中：${escapeHtml(item.hits.join("、"))}</div>
        </div>
      `)
      .join("");
  }

  function summarizeCurrentText(panel) {
    const source = getSource(panel);
    if (!source.value.trim()) {
      source.value = extractVisibleClinicalText();
    }

    const summary = summarizeClinicalText(source.value);
    renderClinicalSummary(panel, summary);
    saveRecentPreview("病摘摘要", formatClinicalSummaryText(summary));
    refreshErMainPreview();
    showPanelStatus(`已整理摘要：${summary.sourceLineCount} 行，${summary.sourceLength} 字。`);
  }

  function summarizeClinicalText(text) {
    const cleanedText = compactText(text);
    const lines = getClinicalSummaryLines(cleanedText);
    const sections = [
      buildSummarySection("主訴/主要問題", lines, ["主訴", "chief complaint", "cc", "complaint", "來診原因", "主要問題"], ["主訴", "complaint"], 3),
      buildSummarySection("病史重點", lines, ["現病史", "病史", "hpi", "history", "past history", "pmh", "過去病史", "否認", "allergy", "過敏"], ["history", "病史", "否認", "過敏"], 4),
      buildSummarySection("檢查/檢驗", lines, ["生命徵象", "vital", "bt", "bp", "hr", "rr", "spo2", "檢查", "檢驗", "lab", "wbc", "crp", "hb", "plt", "bun", "cre", "cr", "na", "k", "lactate", "troponin", "ekg", "ecg", "cxr", "ct", "x-ray", "infiltration"], ["生命徵象", "lab", "ekg", "cxr", "ct", "wbc", "crp", "troponin"], 5),
      buildSummarySection("處置/治療", lines, ["處置", "治療", "plan", "management", "給予", "使用", "輸液", "抗生素", "止痛", "退燒", "oxygen", "o2", "ivf", "antibiotic", "consult", "會診"], ["處置", "治療", "給予", "抗生素", "consult"], 4),
      buildSummarySection("轉歸/後續", lines, ["轉歸", "disposition", "住院", "入院", "出院", "留觀", "轉院", "ward", "icu", "admission", "admit", "discharge", "follow up", "返診"], ["轉歸", "disposition", "住院", "出院", "admit"], 3)
    ];

    const usedLines = new Set(sections.flatMap((section) => section.items));
    const otherImportant = lines
      .filter((line) => !usedLines.has(line))
      .filter((line) => scoreSummaryLine(line, ["診斷", "impression", "assessment", "dx", "diagnosis", "急診", "病摘", "摘要"]) > 0)
      .slice(0, 3);

    if (otherImportant.length) {
      sections.push({ title: "其他可能重要資訊", items: otherImportant });
    }

    return {
      sourceLength: cleanedText.length,
      sourceLineCount: lines.length,
      sections
    };
  }

  function getClinicalSummaryLines(text) {
    const seen = new Set();
    return text
      .split(/\n|。|；|;/)
      .map((line) => compactText(line))
      .filter((line) => line.length >= 2)
      .filter((line) => !/^(病摘\(完稿\)|追蹤修訂|醫囑)$/.test(line))
      .filter((line) => {
        const key = line.replace(/\s+/g, " ").toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 240);
  }

  function buildSummarySection(title, lines, keywords, preferredKeywords, maxItems) {
    const items = lines
      .map((line, index) => ({
        line,
        index,
        score: scoreSummaryLine(line, keywords) + scoreSummaryLine(line, preferredKeywords)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, maxItems)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.line);

    return { title, items };
  }

  function scoreSummaryLine(line, keywords) {
    const normalizedLine = line.toLowerCase();
    return keywords.reduce((score, keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      if (!normalizedLine.includes(normalizedKeyword)) {
        return score;
      }
      return score + (line.length <= 120 ? 2 : 1);
    }, 0);
  }

  function renderClinicalSummary(panel, summary) {
    const result = panel.querySelector("[data-role='result']");
    const nonEmptySections = summary.sections.filter((section) => section.items.length);

    if (!nonEmptySections.length) {
      result.innerHTML = `<div class="ed-note-assistant__empty">目前文字沒有足夠線索可整理摘要。請先確認已點選體系病歷左側紀錄，或手動補充病摘內容。</div>`;
      return;
    }

    result.innerHTML = `
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">體系病歷摘要</div>
        <div class="ed-note-assistant__suggestion-meta">本機規則整理，請以原文與臨床判斷確認。</div>
      </div>
      ${nonEmptySections.map((section) => `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-name">${escapeHtml(section.title)}</div>
          <ul class="ed-note-assistant__summary-list">
            ${section.items.map((item) => `<li>${escapeHtml(truncateText(item, 260))}</li>`).join("")}
          </ul>
        </div>
      `).join("")}
    `;
  }

  function formatClinicalSummaryText(summary) {
    const lines = ["病摘摘要"];
    summary.sections
      .filter((section) => section.items.length)
      .forEach((section) => {
        lines.push("");
        lines.push(section.title);
        section.items.forEach((item) => {
          lines.push(`- ${truncateText(item, 220)}`);
        });
      });
    return lines.join("\n");
  }

  function formatPreviewTextForRecord(recordMeta, text) {
    if (!recordMeta || !recordMeta.formName || !recordMeta.formName.includes("來診")) {
      return text;
    }

    const fields = [
      {
        title: "1. **生命徵象**",
        value: extractFocusedPreviewField(text, [
          "生命徵象",
          "vital sign",
          "vital signs",
          "v/s",
          "vs",
          "bt",
          "bp",
          "hr",
          "rr",
          "spo2"
        ], 4)
      },
      {
        title: "2. **主訴 (Chief Complaint)**",
        value: extractFocusedPreviewField(text, [
          "主訴",
          "chief complaint",
          "complaint",
          "cc",
          "來診原因"
        ], 3)
      },
      {
        title: "3. **來診臆斷 (Tentative Diagnosis)**",
        value: extractFocusedPreviewField(text, [
          "來診臆斷",
          "臆斷",
          "tentative diagnosis",
          "tentative dx",
          "diagnosis",
          "impression"
        ], 4)
      }
    ];

    const summaryText = formatClinicalSummaryText(summarizeClinicalText(text));
    return [
      ...fields.flatMap((field) => [field.title, field.value || "未擷取到", ""]),
      "------",
      summaryText
    ].join("\n");
  }

  function extractFocusedPreviewField(text, keywords, maxLines) {
    const lines = getClinicalSummaryLines(text);
    const selected = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const normalizedLine = line.toLowerCase();
      if (!keywords.some((keyword) => normalizedLine.includes(keyword.toLowerCase()))) {
        continue;
      }
      selected.push(cleanFocusedPreviewLine(line));
      for (let offset = 1; offset <= 2 && selected.length < maxLines; offset += 1) {
        const nextLine = lines[index + offset];
        if (nextLine && !looksLikeNewClinicalField(nextLine)) {
          selected.push(cleanFocusedPreviewLine(nextLine));
        }
      }
      break;
    }

    return selected
      .filter(Boolean)
      .slice(0, maxLines)
      .join("\n");
  }

  function cleanFocusedPreviewLine(line) {
    return truncateText(
      compactText(line)
        .replace(/^(生命徵象|vital signs?|v\/s|vs|主訴|chief complaint|complaint|cc|來診原因|來診臆斷|臆斷|tentative diagnosis|tentative dx|diagnosis|impression)\s*[:：-]?\s*/i, ""),
      260
    );
  }

  function looksLikeNewClinicalField(line) {
    return /^(主訴|現病史|病史|過去病史|生命徵象|檢查|檢驗|處置|治療|診斷|臆斷|來診臆斷|過敏|用藥|plan|assessment|impression|diagnosis|history|hpi|chief complaint|vital)/i.test(compactText(line));
  }

  async function aggregateYearRecords(panel) {
    if (yearAggregationState.running) {
      showPanelStatus("一年病歷統整已在執行中。");
      return;
    }
    if (!document.querySelector(MRN_IOENOTE_SELECTORS.form) || !document.querySelector("#treeview")) {
      showPanelStatus("請先在體系病歷查詢頁使用一年病歷統整。");
      return;
    }

    const allEvents = collectYearRecordEvents();
    const selectedEvents = allEvents
      .filter((event) => YEAR_AGGREGATION_DEFAULT_TYPES.has(event.type))
      .slice(0, YEAR_AGGREGATION_MAX_RECORDS);

    if (!selectedEvents.length) {
      renderYearAggregationEmpty(panel, allEvents);
      showPanelStatus("沒有找到可統整的高價值病歷類型。");
      return;
    }

    const originalIndex = allEvents.find((event) => event.isHighlighted)?.index ?? -1;
    const records = [];
    const failures = [];
    yearAggregationState.running = true;
    yearAggregationState.stopRequested = false;
    setYearAggregationControls(panel, true);
    renderYearAggregationProgress(panel, {
      selectedEvents,
      records,
      failures,
      currentIndex: 0,
      stopped: false
    });

    try {
      for (let index = 0; index < selectedEvents.length; index += 1) {
        if (yearAggregationState.stopRequested) {
          break;
        }

        const event = selectedEvents[index];
        showPanelStatus(`統整一年病歷：${index + 1}/${selectedEvents.length}，正在讀取 ${event.type}`);
        renderYearAggregationProgress(panel, {
          selectedEvents,
          records,
          failures,
          currentIndex: index,
          stopped: false
        });

        try {
          const label = getYearRecordLabelByIndex(event.index);
          if (!label) {
            throw new Error("找不到左側紀錄");
          }
          label.click();
          const text = await waitForYearRecordText();
          if (!text || text.length < 20) {
            throw new Error("讀到的內容過短");
          }
          records.push({
            ...event,
            text,
            summary: summarizeClinicalText(text)
          });
        } catch (error) {
          failures.push({
            ...event,
            error: error.message || "讀取失敗"
          });
        }
      }
    } finally {
      await restoreHighlightedYearRecord(originalIndex);
      yearAggregationState.running = false;
      setYearAggregationControls(panel, false);
    }

    const stopped = yearAggregationState.stopRequested;
    yearAggregationState.stopRequested = false;
    renderYearAggregationResult(panel, {
      allEvents,
      selectedEvents,
      records,
      failures,
      stopped
    });
    showPanelStatus(stopped ? `已停止統整，完成 ${records.length} 筆。` : `一年病歷統整完成：成功 ${records.length} 筆，失敗 ${failures.length} 筆。`);
  }

  function requestStopYearAggregation(panel) {
    if (!yearAggregationState.running) {
      showPanelStatus("目前沒有正在執行的一年病歷統整。");
      return;
    }
    yearAggregationState.stopRequested = true;
    showPanelStatus("收到停止要求，會在目前這筆讀取後停止。");
  }

  function setYearAggregationControls(panel, running) {
    const startButton = panel.querySelector("[data-action='aggregate-year']");
    const stopButton = panel.querySelector("[data-action='stop-year']");
    if (startButton) {
      startButton.disabled = running;
    }
    if (stopButton) {
      stopButton.classList.toggle("ed-note-assistant__action--hidden", !running);
    }
  }

  function collectYearRecordEvents() {
    return Array.from(document.querySelectorAll("label.DetailLi, label.DetailOPD")).map((label, index) => {
      const row = label.closest(".LiteachforFilter") || label.closest("li");
      const group = row && row.parentElement ? row.parentElement.closest("li.LiforFilter") : null;
      const rawText = compactText(label.innerText || label.textContent || "");
      return {
        index,
        type: normalizeYearRecordType(rawText, label.classList.contains("DetailOPD")),
        title: getYearRecordTitle(rawText),
        group: getYearRecordGroupLabel(group),
        isHighlighted: label.classList.contains("highlight"),
        kind: label.classList.contains("DetailOPD") ? "OPD" : "DetailLi"
      };
    });
  }

  function normalizeYearRecordType(text, isOpd) {
    if (isOpd || text.includes("門診")) {
      return "門診紀錄";
    }
    const knownTypes = [
      "急診來診",
      "急診轉歸",
      "急診病程",
      "轉區摘要",
      "外傷來診紀錄",
      "入院病摘",
      "出院病摘",
      "轉入病摘",
      "轉出病摘",
      "週病程紀錄",
      "病程紀錄",
      "主治紀錄"
    ];
    return knownTypes.find((type) => text.includes(type)) || "其他";
  }

  function getYearRecordTitle(text) {
    return compactText(text)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" / ")
      .slice(0, 160);
  }

  function getYearRecordGroupLabel(group) {
    if (!group) {
      return "未分組";
    }
    const parts = Array.from(group.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== "ul"))
      .map((node) => node.textContent || "")
      .join(" ");
    return compactText(parts).slice(0, 120) || "未分組";
  }

  function getYearRecordLabelByIndex(index) {
    return document.querySelectorAll("label.DetailLi, label.DetailOPD")[index] || null;
  }

  async function waitForYearRecordText() {
    await sleep(YEAR_RECORD_LOAD_DELAY_MS);
    const startedAt = Date.now();
    let bestText = "";
    while (Date.now() - startedAt < YEAR_RECORD_TIMEOUT_MS) {
      const text = extractMrnIoeNoteText();
      if (text.length > bestText.length) {
        bestText = text;
      }
      if (text.length >= 80) {
        return text;
      }
      await sleep(250);
    }
    return bestText;
  }

  async function restoreHighlightedYearRecord(originalIndex) {
    if (originalIndex < 0) {
      return;
    }
    const label = getYearRecordLabelByIndex(originalIndex);
    if (!label) {
      return;
    }
    label.click();
    await sleep(YEAR_RECORD_LOAD_DELAY_MS);
  }

  function renderYearAggregationEmpty(panel, allEvents) {
    const counts = countYearEventsByType(allEvents);
    panel.querySelector("[data-role='result']").innerHTML = `
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">一年病歷統整</div>
        <div>目前沒有找到預設納入的高價值紀錄類型。</div>
        <div class="ed-note-assistant__suggestion-meta">${escapeHtml(formatYearEventCounts(counts))}</div>
      </div>
    `;
  }

  function renderYearAggregationProgress(panel, progress) {
    const result = panel.querySelector("[data-role='result']");
    const total = progress.selectedEvents.length;
    const current = Math.min(progress.currentIndex + 1, total);
    result.innerHTML = `
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">一年病歷統整進行中</div>
        <div class="ed-note-assistant__progress">
          <div class="ed-note-assistant__progress-bar" style="width: ${escapeHtml(String(total ? Math.round((progress.records.length / total) * 100) : 0))}%"></div>
        </div>
        <div class="ed-note-assistant__suggestion-meta">正在處理 ${current}/${total}；成功 ${progress.records.length}，失敗 ${progress.failures.length}</div>
      </div>
    `;
    saveRecentPreview("一年病歷統整", shortDraft);
    refreshErMainPreview();
  }

  function renderYearAggregationResult(panel, aggregation) {
    const result = panel.querySelector("[data-role='result']");
    const counts = countYearEventsByType(aggregation.allEvents);
    const selectedCounts = countYearEventsByType(aggregation.selectedEvents);
    const timeline = buildYearAggregationTimeline(aggregation.records);
    const diagnosisCandidates = suggestDiagnoses(aggregation.records.map((record) => record.text).join("\n"));
    const focusedSummary = buildFocusedYearSummary(aggregation.records);
    const shortDraft = buildYearAggregationShortDraft(aggregation.records, diagnosisCandidates, focusedSummary);

    result.innerHTML = `
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">一年病歷統整（精簡模式）</div>
        <div>${aggregation.stopped ? "已停止，以下為已讀取內容。" : "已完成批次讀取。"}</div>
        <div class="ed-note-assistant__suggestion-meta">左側共 ${aggregation.allEvents.length} 筆；本次納入 ${aggregation.selectedEvents.length} 筆；成功 ${aggregation.records.length}，失敗 ${aggregation.failures.length}。</div>
      </div>
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">左側一年紀錄分布</div>
        <div>${escapeHtml(formatYearEventCounts(counts))}</div>
        <div class="ed-note-assistant__suggestion-meta">本次納入：${escapeHtml(formatYearEventCounts(selectedCounts))}</div>
      </div>
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">1. 過去病史</div>
        ${renderFocusedSummaryItems(focusedSummary.pastHistory)}
      </div>
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">2. 門診用藥</div>
        ${renderFocusedSummaryItems(focusedSummary.outpatientMedications)}
      </div>
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">3. 近期手術紀錄</div>
        ${renderFocusedSummaryItems(focusedSummary.recentSurgeries)}
      </div>
      ${timeline.length ? `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-name">一年時間軸</div>
          <ul class="ed-note-assistant__summary-list">
            ${timeline.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
      ${diagnosisCandidates.length ? `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-name">可能診斷線索</div>
          <ul class="ed-note-assistant__summary-list">
            ${diagnosisCandidates.slice(0, 5).map((item) => `<li>${escapeHtml(item.name)}：${escapeHtml(item.hits.join("、"))}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">可複製短版草稿</div>
        <div class="ed-note-assistant__prewrap">${escapeHtml(shortDraft)}</div>
      </div>
      ${aggregation.records.slice(0, 12).map((record) => renderYearRecordCard(record)).join("")}
      ${aggregation.records.length > 12 ? `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-meta">其餘 ${aggregation.records.length - 12} 筆已納入短版草稿與診斷線索，未逐卡顯示以避免面板過長。</div>
        </div>
      ` : ""}
      ${aggregation.failures.length ? `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-name">讀取失敗</div>
          <ul class="ed-note-assistant__summary-list">
            ${aggregation.failures.map((failure) => `<li>${escapeHtml(failure.type)}：${escapeHtml(failure.error)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
    `;
  }

  function renderYearRecordCard(record) {
    const sections = record.summary.sections
      .filter((section) => section.items.length)
      .slice(0, 3);
    return `
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">${escapeHtml(record.type)}</div>
        <div class="ed-note-assistant__suggestion-meta">${escapeHtml(record.group)}｜${escapeHtml(record.title)}</div>
        ${sections.length ? sections.map((section) => `
          <div class="ed-note-assistant__mini-section">${escapeHtml(section.title)}</div>
          <ul class="ed-note-assistant__summary-list">
            ${section.items.slice(0, 2).map((item) => `<li>${escapeHtml(truncateText(item, 220))}</li>`).join("")}
          </ul>
        `).join("") : `<div class="ed-note-assistant__suggestion-meta">已讀取 ${record.text.length} 字，未抽到明確摘要句。</div>`}
      </div>
    `;
  }

  function countYearEventsByType(events) {
    return events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {});
  }

  function formatYearEventCounts(counts) {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
      .map(([type, count]) => `${type} ${count}`)
      .join("、");
  }

  function buildYearAggregationTimeline(records) {
    const groups = new Map();
    records.forEach((record) => {
      if (!groups.has(record.group)) {
        groups.set(record.group, []);
      }
      groups.get(record.group).push(record);
    });
    return Array.from(groups.entries()).map(([group, groupRecords]) => {
      const counts = formatYearEventCounts(countYearEventsByType(groupRecords));
      return `${group}：${counts}`;
    });
  }

  function buildFocusedYearSummary(records) {
    const candidates = [];
    records.forEach((record) => {
      const lines = getClinicalSummaryLines(record.text);
      lines.forEach((line, index) => {
        candidates.push({
          line,
          index,
          record,
          normalized: line.toLowerCase()
        });
      });
    });

    const pastHistory = selectFocusedSummaryLines(candidates, [
      "過去病史", "past history", "pmh", "病史", "history", "既往", "慢性", "診斷",
      "diagnosis", "出院診斷", "入院診斷", "impression", "assessment", "癌", "腫瘤",
      "dm", "diabetes", "htn", "hypertension", "ckd", "cad", "copd", "stroke", "cva"
    ], ["病程紀錄", "週病程紀錄"], 8);

    const outpatientMedications = selectFocusedSummaryLines(candidates, [
      "門診用藥", "用藥", "藥物", "medication", "medications", "drug", "drugs",
      "rx", "prescription", "po", "口服", "qd", "bid", "tid", "qid", "hs",
      "insulin", "antibiotic", "anticoagulant", "抗凝", "降壓", "降糖"
    ], ["急診來診", "急診轉歸", "急診病程"], 8);

    const recentSurgeries = selectFocusedSummaryLines(candidates, [
      "手術", "術後", "術前", "開刀", "op", "operation", "operative", "surgery",
      "procedure", "切除", "縫合", "清創", "引流", "drainage", "debridement",
      "laparoscopic", "orif", "插管", "導管", "catheter"
    ], [], 8);

    return {
      pastHistory,
      outpatientMedications,
      recentSurgeries
    };
  }

  function selectFocusedSummaryLines(candidates, keywords, deprioritizedTypes, maxItems) {
    const seen = new Set();
    return candidates
      .map((candidate) => {
        const keywordScore = scoreSummaryLine(candidate.line, keywords);
        const recordTypeBonus = deprioritizedTypes.includes(candidate.record.type) ? -1 : 0;
        const summaryTypeBonus = ["入院病摘", "出院病摘", "轉入病摘", "轉出病摘", "門診紀錄"].includes(candidate.record.type) ? 2 : 0;
        return {
          ...candidate,
          score: keywordScore + recordTypeBonus + summaryTypeBonus
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.record.index - b.record.index || a.index - b.index)
      .filter((candidate) => {
        const key = normalizeFocusedSummaryLine(candidate.line);
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, maxItems)
      .map((candidate) => ({
        type: candidate.record.type,
        group: candidate.record.group,
        text: truncateText(candidate.line, 180)
      }));
  }

  function normalizeFocusedSummaryLine(line) {
    return line
      .toLowerCase()
      .replace(/\d+/g, "0")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function renderFocusedSummaryItems(items) {
    if (!items.length) {
      return `<div class="ed-note-assistant__suggestion-meta">未從本次讀取內容抓到明確線索，請回原文確認。</div>`;
    }
    return `
      <ul class="ed-note-assistant__summary-list">
        ${items.map((item) => `<li>${escapeHtml(item.text)} <span class="ed-note-assistant__suggestion-meta">（${escapeHtml(item.type)}）</span></li>`).join("")}
      </ul>
    `;
  }

  function buildYearAggregationShortDraft(records, diagnosisCandidates, focusedSummary) {
    const counts = formatYearEventCounts(countYearEventsByType(records));
    const lines = [
      `一年內體系病歷精簡統整：共讀取 ${records.length} 筆（${counts}）。`
    ];
    lines.push("");
    lines.push("1. 過去病史");
    lines.push(...formatFocusedSummaryDraftLines(focusedSummary.pastHistory));
    lines.push("");
    lines.push("2. 門診用藥");
    lines.push(...formatFocusedSummaryDraftLines(focusedSummary.outpatientMedications));
    lines.push("");
    lines.push("3. 近期手術紀錄");
    lines.push(...formatFocusedSummaryDraftLines(focusedSummary.recentSurgeries));
    if (diagnosisCandidates.length) {
      lines.push("");
      lines.push(`可能相關診斷線索：${diagnosisCandidates.slice(0, 4).map((item) => item.name).join("、")}。`);
    }
    lines.push("");
    lines.push("以上為外掛本機規則整理草稿，請回原文確認後再使用。");
    return lines.join("\n");
  }

  function formatFocusedSummaryDraftLines(items) {
    if (!items.length) {
      return ["- 未抓到明確線索，請回原文確認。"];
    }
    return items.slice(0, 6).map((item) => `- ${item.text}（${item.type}）`);
  }

  async function copySuggestions(panel) {
    const result = panel.querySelector("[data-role='result']").innerText.trim();
    if (!result) {
      return;
    }
    await navigator.clipboard.writeText(result);
  }

  function renderPageDetection(panel) {
    const result = panel.querySelector("[data-role='result']");
    const detection = detectErMainPage();
    result.innerHTML = `
      <div class="ed-note-assistant__suggestion">
        <div class="ed-note-assistant__suggestion-name">頁面偵測</div>
        <div>${escapeHtml(detection.pageType)}</div>
        <div class="ed-note-assistant__suggestion-meta">${escapeHtml(detection.summary)}</div>
      </div>
      ${detection.items.map((item) => `
        <div class="ed-note-assistant__suggestion">
          <div class="ed-note-assistant__suggestion-name">${escapeHtml(item.label)}</div>
          <div>${escapeHtml(item.selector)}</div>
          <div class="ed-note-assistant__suggestion-meta">${escapeHtml(item.status)}</div>
        </div>
      `).join("")}
    `;
  }

  function detectErMainPage() {
    const erItems = Object.entries(ER_MAIN_SELECTORS).map(([label, selector]) => {
      const count = document.querySelectorAll(selector).length;
      return {
        label: `ER_Main: ${label}`,
        selector,
        count,
        status: count ? `找到 ${count} 個` : "未找到"
      };
    });
    const mrnItems = Object.entries(MRN_IOENOTE_SELECTORS).map(([label, selector]) => {
      const count = document.querySelectorAll(selector).length;
      return {
        label: `體系病歷: ${label}`,
        selector,
        count,
        status: count ? `找到 ${count} 個` : "未找到"
      };
    });
    const items = [...erItems, ...mrnItems];
    const foundCount = items.filter((item) => item.count > 0).length;
    const isErMain = Boolean(document.querySelector(ER_MAIN_SELECTORS.patientTable) && document.querySelector(ER_MAIN_SELECTORS.notePanel));
    const isMrnIoeNote = Boolean(document.querySelector(MRN_IOENOTE_SELECTORS.form) && document.querySelector(MRN_IOENOTE_SELECTORS.allDetailPanel));
    const rowCount = document.querySelectorAll(`${PATIENT_TABLE_SELECTOR} tbody tr`).length;
    const shortcutCount = document.querySelectorAll(`.${SYSTEM_RECORD_SHORTCUT_CLASS}`).length;

    return {
      pageType: isErMain ? "偵測到 ER_Main 清單/紀錄主頁" : isMrnIoeNote ? "偵測到體系病歷查詢頁" : "尚未完整偵測到支援頁面",
      summary: `${foundCount}/${items.length} 個關鍵 selector 存在；左側列數 ${rowCount}，體系快捷 ${shortcutCount}`,
      items
    };
  }

  function enhanceErMainPatientList() {
    runErMainEnhancements();

    if (document.body.dataset[SHORTCUT_OBSERVER_FLAG] === "true") {
      return;
    }
    document.body.dataset[SHORTCUT_OBSERVER_FLAG] = "true";

    const observer = new MutationObserver(() => {
      scheduleErMainEnhancements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      scheduleErMainEnhancements();
      if (attempts >= 30) {
        window.clearInterval(intervalId);
      }
    }, 500);
  }

  function scheduleErMainEnhancements() {
    if (erRecordPreviewState.enhanceTimerId) {
      return;
    }
    erRecordPreviewState.enhanceTimerId = window.setTimeout(() => {
      erRecordPreviewState.enhanceTimerId = null;
      runErMainEnhancements();
    }, 250);
  }

  function runErMainEnhancements() {
    addSystemRecordShortcuts();
    attachErMainConsultRedirectEvents();
    attachErMainRecordPreviewEvents();
    createErMainPreviewPanel();
  }

  function attachErMainConsultRedirectEvents() {
    if (!document.querySelector(ER_MAIN_SELECTORS.patientTable) || !document.body) {
      return;
    }
    if (document.body.dataset[ER_CONSULT_REDIRECT_OBSERVER_FLAG] === "true") {
      return;
    }
    document.body.dataset[ER_CONSULT_REDIRECT_OBSERVER_FLAG] = "true";

    document.addEventListener("click", handleErMainConsultRedirectClick, true);
  }

  function handleErMainConsultRedirectClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const consultBadge = target.closest(`${PATIENT_TABLE_SELECTOR} tbody tr ${PATIENT_CONSULT_CELL_SELECTOR} [onclick*="openConsult"]`);
    if (!consultBadge) {
      return;
    }

    const row = consultBadge.closest("tr");
    const consultArgs = parseOpenConsultArgs(consultBadge.getAttribute("onclick") || "");
    const chartNo = consultArgs.chartNo || getPatientRowChartNo(row);
    if (!chartNo) {
      showPanelStatus("找不到這列病人的病歷號，無法開啟跨團隊醫師照會。");
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openCrossTeamDoctorConsultForRow(row, chartNo);
  }

  function parseOpenConsultArgs(onclickValue) {
    const args = [];
    const pattern = /'([^']*)'/g;
    let match = pattern.exec(onclickValue);
    while (match) {
      args.push(match[1]);
      match = pattern.exec(onclickValue);
    }
    return {
      hospital: args[0] || "",
      chartNo: args[1] || "",
      regDate: args[2] || ""
    };
  }

  function getPatientRowChartNo(row) {
    if (!row || !row.cells[4]) {
      return "";
    }
    return compactText(row.cells[4].innerText || "").replace(/\D/g, "");
  }

  async function openCrossTeamDoctorConsultForRow(row, chartNo) {
    clickElement(row);
    saveCrossTeamDoctorConsultTarget(chartNo);

    const placeholderWindow = window.open("about:blank", "_blank");
    await sleep(SYSTEM_RECORD_FAST_DELAY_MS);

    const systemRecordButton = await waitForElement(SYSTEM_RECORD_SELECTOR, SYSTEM_RECORD_RETRY_TIMEOUT_MS);
    const loginUser = getSystemRecordLoginUser(systemRecordButton);
    if (!loginUser) {
      if (placeholderWindow) {
        placeholderWindow.close();
      }
      showPanelStatus("找不到體系病歷入口參數，無法開啟跨團隊醫師照會。");
      return;
    }

    try {
      const mrnUrl = await fetchSystemRecordUrl(chartNo, loginUser);
      const crossTeamUrl = buildCrossTeamUrl(mrnUrl);
      if (placeholderWindow) {
        placeholderWindow.location.href = crossTeamUrl;
        activateDoctorConsultInOpenedCrossTeamWindow(placeholderWindow, chartNo, Date.now());
      } else {
        window.open(crossTeamUrl, "_blank");
      }
      showPanelStatus("已用體系病歷入口開啟跨團隊照護：醫師照會。");
    } catch (error) {
      if (placeholderWindow) {
        placeholderWindow.close();
      }
      clearCrossTeamDoctorConsultTarget();
      showPanelStatus(`開啟跨團隊醫師照會失敗：${error.message || "請稍後再試"}`);
    }
  }

  function clickElement(element) {
    if (!element) {
      return;
    }
    if (typeof element.click === "function") {
      element.click();
      return;
    }
    const event = document.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    element.dispatchEvent(event);
  }

  function clickElementInDocument(ownerDocument, element) {
    if (!element) {
      return;
    }
    if (typeof element.click === "function") {
      element.click();
      return;
    }
    const event = ownerDocument.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, ownerDocument.defaultView || window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    element.dispatchEvent(event);
  }

  function triggerOpenedWindowJQueryClick(openedWindow, element) {
    try {
      if (openedWindow && openedWindow.jQuery && element) {
        openedWindow.jQuery(element).trigger("click");
      }
    } catch (error) {
      // DOM click is the primary path.
    }
  }

  function getSystemRecordLoginUser(systemRecordButton) {
    const onclickValue = systemRecordButton ? systemRecordButton.getAttribute("onclick") || "" : "";
    const match = onclickValue.match(/MRNUrl\('([^']*)','([^']*)'\)/);
    return match ? match[2] : "";
  }

  async function fetchSystemRecordUrl(chartNo, loginUser) {
    const response = await fetch(`${window.location.origin}/WEB/ipdNote/Common/GetMRNUrl`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: new URLSearchParams({
        inChartno: chartNo,
        inLoginUser: loginUser
      }).toString()
    });
    const text = compactText(await response.text());
    if (!response.ok || !text.includes("intraweb")) {
      throw new Error("體系病歷入口沒有回傳有效網址");
    }
    return text;
  }

  function buildCrossTeamUrl(mrnUrl) {
    const url = new URL(mrnUrl, window.location.origin);
    url.pathname = "/WEB/MRN/CrossTeam";
    url.hash = "";
    return url.toString();
  }

  function activateDoctorConsultInOpenedCrossTeamWindow(openedWindow, targetChartNo, startedAt) {
    if (!openedWindow || openedWindow.closed) {
      return;
    }
    if (Date.now() - startedAt >= CROSS_TEAM_DOCTOR_CONSULT_TIMEOUT_MS) {
      return;
    }

    try {
      const openedDocument = openedWindow.document;
      if (!openedDocument || !/\/WEB\/MRN\/CrossTeam\/?$/i.test(openedWindow.location.pathname)) {
        window.setTimeout(() => {
          activateDoctorConsultInOpenedCrossTeamWindow(openedWindow, targetChartNo, startedAt);
        }, CROSS_TEAM_DOCTOR_CONSULT_RETRY_MS);
        return;
      }

      const doctorConsultTab = openedDocument.querySelector(`.ct-type[data-type="${CROSS_TEAM_DOCTOR_CONSULT_TYPE}"]`);
      if (!doctorConsultTab) {
        window.setTimeout(() => {
          activateDoctorConsultInOpenedCrossTeamWindow(openedWindow, targetChartNo, startedAt);
        }, CROSS_TEAM_DOCTOR_CONSULT_RETRY_MS);
        return;
      }

      const currentChartNo = getCrossTeamCurrentChartNo(openedDocument);
      if (currentChartNo && currentChartNo !== targetChartNo) {
        showPanelStatus("跨團隊頁未成功切到目標病人，已停止自動切換醫師照會。");
        return;
      }

      clickElementInDocument(openedDocument, doctorConsultTab);
      triggerOpenedWindowJQueryClick(openedWindow, doctorConsultTab);
      clearCrossTeamDoctorConsultTarget();
      showPanelStatus("已切換到跨團隊照護：醫師照會。");
    } catch (error) {
      window.setTimeout(() => {
        activateDoctorConsultInOpenedCrossTeamWindow(openedWindow, targetChartNo, startedAt);
      }, CROSS_TEAM_DOCTOR_CONSULT_RETRY_MS);
    }
  }

  function saveCrossTeamDoctorConsultTarget(chartNo) {
    const target = {
      chartNo,
      type: CROSS_TEAM_DOCTOR_CONSULT_TYPE,
      createdAt: Date.now()
    };

    try {
      window.localStorage.setItem(CROSS_TEAM_DOCTOR_CONSULT_STORAGE_KEY, JSON.stringify(target));
    } catch (error) {
      // Ignore storage failures; the POST still opens CrossTeam.
    }
  }

  function loadCrossTeamDoctorConsultTarget() {
    try {
      const raw = window.localStorage.getItem(CROSS_TEAM_DOCTOR_CONSULT_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const target = JSON.parse(raw);
      if (!target || target.type !== CROSS_TEAM_DOCTOR_CONSULT_TYPE || !target.chartNo) {
        return null;
      }
      if (Date.now() - Number(target.createdAt || 0) > CROSS_TEAM_DOCTOR_CONSULT_MAX_AGE_MS) {
        clearCrossTeamDoctorConsultTarget();
        return null;
      }
      return target;
    } catch (error) {
      return null;
    }
  }

  function clearCrossTeamDoctorConsultTarget() {
    try {
      window.localStorage.removeItem(CROSS_TEAM_DOCTOR_CONSULT_STORAGE_KEY);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function activatePendingCrossTeamDoctorConsult() {
    if (!/\/WEB\/MRN\/CrossTeam\/?$/i.test(window.location.pathname)) {
      return;
    }

    scheduleCrossTeamDoctorConsultPolling();
    const target = loadCrossTeamDoctorConsultTarget();
    if (!target) {
      return;
    }

    activatePendingCrossTeamDoctorConsultWithRetry(target, Date.now());
  }

  function scheduleCrossTeamDoctorConsultPolling() {
    if (!document.body || document.body.dataset[CROSS_TEAM_DOCTOR_CONSULT_OBSERVER_FLAG] === "true") {
      return;
    }
    document.body.dataset[CROSS_TEAM_DOCTOR_CONSULT_OBSERVER_FLAG] = "true";

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const target = loadCrossTeamDoctorConsultTarget();
      if (target) {
        window.clearInterval(intervalId);
        activatePendingCrossTeamDoctorConsultWithRetry(target, Date.now());
        return;
      }
      if (Date.now() - startedAt >= CROSS_TEAM_DOCTOR_CONSULT_TIMEOUT_MS) {
        window.clearInterval(intervalId);
      }
    }, 1000);
  }

  function activatePendingCrossTeamDoctorConsultWithRetry(target, startedAt) {
    const doctorConsultTab = document.querySelector(`.ct-type[data-type="${CROSS_TEAM_DOCTOR_CONSULT_TYPE}"]`);
    if (!doctorConsultTab) {
      if (Date.now() - startedAt >= CROSS_TEAM_DOCTOR_CONSULT_TIMEOUT_MS) {
        showPanelStatus("找不到跨團隊照護的醫師照會分頁。");
        return;
      }
      window.setTimeout(() => {
        activatePendingCrossTeamDoctorConsultWithRetry(target, startedAt);
      }, CROSS_TEAM_DOCTOR_CONSULT_RETRY_MS);
      return;
    }

    const currentChartNo = getCrossTeamCurrentChartNo();
    if (currentChartNo && currentChartNo !== target.chartNo) {
      showPanelStatus("跨團隊頁未成功切到目標病人，已停止自動切換醫師照會。");
      clearCrossTeamDoctorConsultTarget();
      return;
    }

    clickElement(doctorConsultTab);
    clearCrossTeamDoctorConsultTarget();
    showPanelStatus("已切換到跨團隊照護：醫師照會。");
  }

  function getCrossTeamCurrentChartNo(rootDocument = document) {
    const candidates = [
      rootDocument.querySelector('input[name="Chart_NO"]'),
      rootDocument.querySelector("#CurrentChartno"),
      rootDocument.querySelector("#CharNo")
    ];
    return compactText(candidates.map((element) => (element ? element.value : "")).find(Boolean) || "").replace(/\D/g, "");
  }

  function attachErMainRecordPreviewEvents() {
    if (!document.querySelector(ER_MAIN_SELECTORS.recordTable) || !document.body) {
      return;
    }
    if (document.body.dataset[ER_RECORD_PREVIEW_OBSERVER_FLAG] === "true") {
      return;
    }
    document.body.dataset[ER_RECORD_PREVIEW_OBSERVER_FLAG] = "true";

    document.addEventListener("click", handleErMainRecordPreviewClick, true);
  }

  function handleErMainRecordPreviewClick(event) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest(`#${ER_PREVIEW_ID}`)) {
      return;
    }

    const row = target.closest(`${ER_MAIN_SELECTORS.recordTable} tbody tr`);
    if (!row) {
      return;
    }

    if (target.closest(".usr-ERedit, .usr-ERdelete, .usr-ERprint, .usr-ERditto")) {
      return;
    }

    const readOnlyTrigger = target.closest(".usr-ERreadnoly, .action-icon.view");
    if (readOnlyTrigger) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      highlightErRecordRow(row);
      previewMrnIoeRecordForErRow(row);
      return;
    }

    window.setTimeout(() => {
      highlightErRecordRow(row);
      previewMrnIoeRecordForErRow(row);
    }, 120);
  }

  function triggerErRecordPreviewFromRow(row) {
    highlightErRecordRow(row);
    previewMrnIoeRecordForErRow(row);
  }

  function highlightErRecordRow(row) {
    if (!row) {
      return;
    }
    document.querySelectorAll(`${ER_MAIN_SELECTORS.recordTable} tbody tr.highlight`).forEach((highlightedRow) => {
      highlightedRow.classList.remove("highlight");
    });
    row.classList.add("highlight");
  }

  async function previewMrnIoeRecordForErRow(row) {
    createErMainPreviewPanel();
    const frame = getOrCreateErPreviewFrame();
    const meta = getErRecordRowMeta(row);
    const sequence = erRecordPreviewState.sequence + 1;
    erRecordPreviewState.sequence = sequence;

    renderErPreviewMessage("正在背景開啟體系病歷，並尋找相同日期與類型的紀錄。", meta);

    try {
      const chartNo = getErRecordCellText(row, 23) || getSelectedErPatientChartNo();
      const systemRecordButton = await waitForElement(SYSTEM_RECORD_SELECTOR, SYSTEM_RECORD_RETRY_TIMEOUT_MS);
      const loginUser = getSystemRecordLoginUser(systemRecordButton);
      if (!chartNo || !loginUser) {
        throw new Error("找不到體系病歷入口參數");
      }

      const mrnUrl = await fetchSystemRecordUrl(chartNo, loginUser);
      const ioeUrl = buildIoeNoteUrl(mrnUrl);
      await loadFrameUrl(frame, ioeUrl, ER_RECORD_PREVIEW_TIMEOUT_MS);
      const frameDocument = getAccessibleFrameDocument(frame);
      if (!frameDocument) {
        throw new Error("無法讀取體系病歷背景頁");
      }

      const matchedLabel = await findAndClickMatchingIoeRecord(frame, meta, ER_RECORD_PREVIEW_TIMEOUT_MS);
      if (!matchedLabel) {
        throw new Error("體系病歷找不到相同日期與類型的紀錄");
      }

      const text = await waitForIoeFrameRecordText(frame, ER_RECORD_PREVIEW_TIMEOUT_MS);
      if (erRecordPreviewState.sequence !== sequence) {
        return;
      }
      if (!text || text.length < 20) {
        throw new Error("體系病歷內容讀取過短");
      }

      const previewText = formatPreviewTextForRecord(meta, text);
      renderErPreviewText(meta, previewText);
      saveRecentPreview(meta.title || "體系病歷預覽", previewText);
    } catch (error) {
      if (erRecordPreviewState.sequence === sequence) {
        renderErPreviewMessage(`背景讀取體系病歷失敗：${error.message || "請稍後再試"}`, meta);
      }
    }
  }

  function buildIoeNoteUrl(mrnUrl) {
    const url = new URL(mrnUrl, window.location.origin);
    url.pathname = "/web/MRN/IOEnote/Index";
    url.hash = "";
    return url.toString();
  }

  function getSelectedErPatientChartNo() {
    const infoText = getElementText(ER_MAIN_SELECTORS.patientInfoPanel);
    const match = infoText.match(/\((\d{6,})\)/);
    return match ? match[1] : "";
  }

  function loadFrameUrl(frame, url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("體系病歷背景頁載入逾時"));
      }, timeoutMs);
      frame.onload = () => {
        window.clearTimeout(timeoutId);
        window.setTimeout(resolve, 800);
      };
      frame.src = url;
    });
  }

  async function findAndClickMatchingIoeRecord(frame, meta, timeoutMs) {
    const startedAt = Date.now();
    let bestLabel = null;
    while (Date.now() - startedAt < timeoutMs) {
      const frameDocument = getAccessibleFrameDocument(frame);
      const labels = frameDocument ? Array.from(frameDocument.querySelectorAll("label.DetailLi, label.DetailOPD")) : [];
      bestLabel = findBestIoeRecordLabel(labels, meta);
      if (bestLabel) {
        clickElementInDocument(frameDocument, bestLabel);
        return bestLabel;
      }
      await sleep(300);
    }
    return null;
  }

  function findBestIoeRecordLabel(labels, meta) {
    const targetDate = normalizeRecordMinute(meta.recordTime);
    const targetType = normalizeIoeRecordType(meta.formName);
    return labels.find((label) => {
      const text = compactText(label.innerText || label.textContent || "");
      const labelDate = normalizeRecordMinute(text);
      const labelType = normalizeIoeRecordType(text);
      return labelDate === targetDate && (!targetType || !labelType || labelType === targetType);
    }) || labels.find((label) => {
      const text = compactText(label.innerText || label.textContent || "");
      return normalizeRecordMinute(text) === targetDate;
    });
  }

  function normalizeRecordMinute(text) {
    const match = String(text || "").match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!match) {
      return "";
    }
    const [, year, month, day, hour, minute] = match;
    return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")} ${hour.padStart(2, "0")}:${minute}`;
  }

  function normalizeIoeRecordType(text) {
    const types = [
      "外傷來診紀錄",
      "急診來診",
      "急診轉歸",
      "急診病程",
      "轉區摘要",
      "入院病摘",
      "出院病摘",
      "轉入病摘",
      "轉出病摘"
    ];
    return types.find((type) => String(text || "").includes(type)) || "";
  }

  async function waitForIoeFrameRecordText(frame, timeoutMs) {
    await sleep(YEAR_RECORD_LOAD_DELAY_MS);
    const startedAt = Date.now();
    let bestText = "";
    while (Date.now() - startedAt < timeoutMs) {
      const frameDocument = getAccessibleFrameDocument(frame);
      const text = frameDocument ? extractMrnIoeNoteTextFromDocument(frameDocument) : "";
      if (text.length > bestText.length) {
        bestText = text;
      }
      if (text.length >= 80) {
        return text;
      }
      await sleep(250);
    }
    return bestText;
  }

  function submitErReadonlyPreviewFromRow(row) {
    createErMainPreviewPanel();
    const form = document.querySelector("#TurnToROView");
    const frame = getOrCreateErPreviewFrame();
    if (!form || !frame) {
      renderErPreviewMessage("找不到院內唯讀表單，暫時無法背景預覽這筆病歷。");
      return false;
    }

    fillErReadonlyPreviewForm(form, row);

    const sequence = erRecordPreviewState.sequence + 1;
    erRecordPreviewState.sequence = sequence;
    const meta = getErRecordRowMeta(row);
    const originalTarget = form.getAttribute("target");
    const restoreTarget = () => {
      if (form.getAttribute("target") !== frame.name) {
        return;
      }
      if (originalTarget === null) {
        form.removeAttribute("target");
      } else {
        form.setAttribute("target", originalTarget);
      }
    };

    renderErPreviewMessage("正在背景讀取這筆病歷，請稍候。若跳出調閱權限確認，按確定後會繼續載入。", meta);
    form.setAttribute("target", frame.name);

    let finished = false;
    frame.onload = () => {
      window.setTimeout(() => {
        if (erRecordPreviewState.sequence !== sequence || finished) {
          return;
        }
        finished = true;
        restoreTarget();
        const text = extractErReadonlyFrameText(frame);
        if (text) {
          renderErPreviewText(meta, text);
          saveRecentPreview(meta.title || "急診病歷預覽", text);
        } else {
          renderErPreviewMessage("背景頁已載入，但沒有讀到可顯示的病歷文字。", meta);
        }
      }, 500);
    };

    window.setTimeout(() => {
      if (erRecordPreviewState.sequence !== sequence || finished) {
        return;
      }
      finished = true;
      restoreTarget();
      renderErPreviewMessage("等待背景病歷載入逾時。請再點一次該筆病歷，或先確認院內權限提示是否已處理。", meta);
    }, ER_RECORD_PREVIEW_TIMEOUT_MS);

    submitFormToBackgroundFrame(form);
    return true;
  }

  function fillErReadonlyPreviewForm(form, row) {
    const originalNoteId = getErRecordCellText(row, 13);
    const selfNoteId = getErRecordCellText(row, 5);
    const noteId = selfNoteId || originalNoteId;
    const hasTrackEdit = Boolean(selfNoteId);
    const logObject = {
      SERIALNO: getErRecordCellText(row, 2),
      FLOWID: getErRecordCellText(row, 14),
      ACTION: "ReadOnly"
    };

    setFormFieldValue(form, "ROinhospID", getErRecordCellText(row, 1));
    setFormFieldValue(form, "PatientROInfo", extractErPatientInfoLiteral());
    setFormFieldValue(form, "ROKind", getErRecordCellText(row, 3));
    setFormFieldValue(form, "inGroupAnswerIDX", originalNoteId);
    setFormFieldValue(form, "ROnote_date", getErRecordCellText(row, 4));
    setFormFieldValue(form, "ROkindname", getErRecordCellText(row, 10));
    setFormFieldValue(form, "inRevisionIDX", noteId);
    setFormFieldValue(form, "ROSource", "ER");
    setFormFieldValue(form, "ROflowid", getErRecordCellText(row, 14));
    setFormFieldValue(form, "ROPreflowid", getErRecordCellText(row, 15));
    setFormFieldValue(form, "ROserialno", getErRecordCellText(row, 2));
    setFormFieldValue(form, "RONoteLogDto", JSON.stringify(logObject));
    setFormFieldValue(form, "ROflowall", getErRecordCellText(row, 16));
    setFormFieldValue(form, "ROflowSN", getErRecordCellText(row, 17));
    setFormFieldValue(form, "ROnext_flow", getErRecordCellText(row, 11));
    setFormFieldValue(form, "ROSecondDRcode", getErRecordCellText(row, 19));
    setFormFieldValue(form, "ROSecondDRname", getErRecordCellText(row, 21));
    setFormFieldValue(form, "ROFirstDRcode", getErRecordCellText(row, 18));
    setFormFieldValue(form, "ROCreater", getErRecordCellText(row, 20));
    setFormFieldValue(form, "ROCreaterCode", getErRecordCellText(row, 18));
    setFormFieldValue(form, "ROisteach", getErRecordCellText(row, 24));
    setFormFieldValue(form, "HasTrackEdit", hasTrackEdit);
  }

  function setFormFieldValue(form, id, value) {
    const field = form.querySelector(`#${cssEscape(id)}`);
    if (field) {
      field.value = value == null ? "" : String(value);
    }
  }

  function extractErPatientInfoLiteral() {
    const scriptText = Array.from(document.scripts)
      .map((script) => script.textContent || "")
      .find((text) => text.includes("function ReadOnlyFormForERstep2") && text.includes("var PatientInfo ="));
    if (!scriptText) {
      return "";
    }

    const start = scriptText.indexOf("var PatientInfo =");
    const end = scriptText.indexOf("var flowid =", start);
    if (start < 0 || end < 0) {
      return "";
    }

    const block = scriptText.slice(start, end);
    const match = block.match(/var\s+PatientInfo\s*=\s*'([\s\S]*?)';/);
    return match ? match[1].replace(/&quot;/g, "\"") : "";
  }

  function submitFormToBackgroundFrame(form) {
    if (window.HTMLFormElement && HTMLFormElement.prototype.submit) {
      HTMLFormElement.prototype.submit.call(form);
    } else {
      form.submit();
    }
  }

  function getOrCreateErPreviewFrame() {
    let frame = document.getElementById(ER_PREVIEW_FRAME_ID);
    if (frame) {
      return frame;
    }

    frame = document.createElement("iframe");
    frame.id = ER_PREVIEW_FRAME_ID;
    frame.name = ER_PREVIEW_FRAME_ID;
    frame.title = "急診病歷背景預覽";
    frame.className = "ed-note-record-preview__frame";
    document.body.appendChild(frame);
    return frame;
  }

  function extractErReadonlyFrameText(frame) {
    const frameDocument = getAccessibleFrameDocument(frame);
    if (!frameDocument || !frameDocument.body) {
      return "";
    }

    const preferredSelectors = [
      "#form1",
      "#OnlyNote",
      "#Note",
      "#AllDetailDiv",
      ".container-fluid",
      ".container",
      "main"
    ];
    const preferredText = preferredSelectors
      .map((selector) => frameDocument.querySelector(selector))
      .filter(Boolean)
      .map((element) => collectElementReadableText(element))
      .filter(Boolean)
      .join("\n");

    return compactText(preferredText || collectElementReadableText(frameDocument.body));
  }

  function collectElementReadableText(element) {
    if (!element) {
      return "";
    }

    const controlText = Array.from(element.querySelectorAll("textarea, input, select"))
      .map((control) => {
        if (control.tagName === "SELECT") {
          const selected = control.options && control.selectedIndex >= 0 ? control.options[control.selectedIndex] : null;
          return selected ? selected.text || selected.value : control.value;
        }
        return control.value || "";
      })
      .filter(Boolean)
      .join("\n");

    return compactText([element.innerText || "", controlText].filter(Boolean).join("\n"));
  }

  function getErRecordRowMeta(row) {
    const recordTime = getErRecordCellText(row, 9);
    const formName = getErRecordCellText(row, 10) || getErRecordCellText(row, 3);
    const flow = getErRecordCellText(row, 8);
    const status = getErRecordCellText(row, 12);
    const titleParts = [formName, recordTime].filter(Boolean);
    return {
      title: titleParts.length ? titleParts.join("｜") : "急診病歷預覽",
      formName,
      recordTime,
      flow,
      status
    };
  }

  function getErRecordCellText(row, index) {
    const cell = row.cells[index];
    return cell ? compactText(cell.innerText || "") : "";
  }

  function addSystemRecordShortcuts() {
    const rows = document.querySelectorAll(`${PATIENT_TABLE_SELECTOR} tbody tr`);
    let addedCount = 0;
    rows.forEach((row) => {
      const nameCell = getPatientNameCell(row);
      if (!nameCell || nameCell.querySelector(`.${SYSTEM_RECORD_SHORTCUT_CLASS}`)) {
        return;
      }
      const shortcutHost = preparePatientNameShortcutHost(nameCell);

      const shortcut = document.createElement("button");
      shortcut.type = "button";
      shortcut.className = SYSTEM_RECORD_SHORTCUT_CLASS;
      shortcut.title = "開啟體系病歷";
      shortcut.setAttribute("aria-label", "開啟體系病歷");
      shortcut.textContent = "體系";
      shortcut.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openSystemRecordForRow(row);
      });

      shortcutHost.appendChild(shortcut);
      addedCount += 1;
    });
    return addedCount;
  }

  function preparePatientNameShortcutHost(nameCell) {
    nameCell.classList.add(PATIENT_NAME_CELL_CLASS);

    const existingContainer = nameCell.querySelector("div");
    if (existingContainer) {
      existingContainer.classList.add(PATIENT_NAME_TEXT_CLASS);
    }

    return nameCell;
  }

  function getPatientNameCell(row) {
    const configuredCell = row.querySelector(PATIENT_NAME_CELL_SELECTOR);
    if (configuredCell) {
      return configuredCell;
    }
    return row.querySelector("td[title]");
  }

  async function openSystemRecordForRow(row) {
    row.click();
    await sleep(SYSTEM_RECORD_FAST_DELAY_MS);
    const systemRecordButton = await waitForElement(SYSTEM_RECORD_SELECTOR, SYSTEM_RECORD_RETRY_TIMEOUT_MS);
    if (systemRecordButton) {
      systemRecordButton.click();
    } else {
      showPanelStatus("找不到右側的體系病歷按鈕，請先確認已選取病人。");
    }
  }

  function waitForElement(selector, timeoutMs) {
    const startedAt = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(null);
          return;
        }
        window.setTimeout(tick, 80);
      };
      tick();
    });
  }

  function sleep(timeoutMs) {
    return new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
  }

  function showPanelStatus(message) {
    const status = document.querySelector(`#${PANEL_ID} [data-role='status']`);
    if (status) {
      status.textContent = message;
    }
  }

  function saveRecentPreview(title, text) {
    const cleanedText = compactText(text || "");
    if (!cleanedText) {
      return;
    }
    const preview = {
      title,
      text: cleanedText,
      savedAt: new Date().toISOString(),
      location: {
        pathname: window.location.pathname,
        title: document.title
      }
    };

    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [RECENT_PREVIEW_STORAGE_KEY]: preview });
        return;
      }
    } catch (error) {
      // Fall through to localStorage.
    }

    try {
      window.localStorage.setItem(RECENT_PREVIEW_STORAGE_KEY, JSON.stringify(preview));
    } catch (error) {
      // Ignore preview persistence failures.
    }
  }

  function loadRecentPreview(callback) {
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(RECENT_PREVIEW_STORAGE_KEY, (items) => {
          callback(items ? items[RECENT_PREVIEW_STORAGE_KEY] || null : null);
        });
        return;
      }
    } catch (error) {
      // Fall through to localStorage.
    }

    try {
      const raw = window.localStorage.getItem(RECENT_PREVIEW_STORAGE_KEY);
      callback(raw ? JSON.parse(raw) : null);
    } catch (error) {
      callback(null);
    }
  }

  function clearRecentPreview(callback) {
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(RECENT_PREVIEW_STORAGE_KEY, () => {
          if (callback) {
            callback();
          }
        });
        return;
      }
    } catch (error) {
      // Fall through to localStorage.
    }

    try {
      window.localStorage.removeItem(RECENT_PREVIEW_STORAGE_KEY);
    } catch (error) {
      // Ignore preview persistence failures.
    }
    if (callback) {
      callback();
    }
  }

  function createErMainPreviewPanel() {
    if (!document.querySelector(ER_MAIN_SELECTORS.patientTable) || !document.querySelector(ER_MAIN_SELECTORS.noteAndEvaPanel)) {
      return;
    }
    if (document.getElementById(ER_PREVIEW_ID)) {
      return;
    }

    const host = document.querySelector(ER_MAIN_SELECTORS.noteAndEvaPanel);
    const preview = document.createElement("section");
    preview.id = ER_PREVIEW_ID;
    preview.className = "ed-note-record-preview";
    preview.innerHTML = `
      <div class="ed-note-record-preview__header">
        <div>
          <div class="ed-note-record-preview__title">外掛病歷預覽</div>
          <div class="ed-note-record-preview__meta" data-role="preview-meta">尚未載入</div>
        </div>
        <div class="ed-note-record-preview__actions">
          <button type="button" data-preview-action="refresh">更新</button>
          <button type="button" data-preview-action="read-selected">讀選取</button>
          <button type="button" data-preview-action="clear">清除</button>
        </div>
      </div>
      <div class="ed-note-record-preview__body" data-role="preview-body">
        尚無可預覽內容。點右上方病歷紀錄列或眼睛按鈕後，外掛會在背景讀取該筆病歷。
      </div>
    `;

    preview.querySelector("[data-preview-action='refresh']").addEventListener("click", () => {
      refreshErMainPreview();
    });
    preview.querySelector("[data-preview-action='read-selected']").addEventListener("click", () => {
      const row = document.querySelector(`${ER_MAIN_SELECTORS.recordTable} tbody tr.highlight`) || document.querySelector(`${ER_MAIN_SELECTORS.recordTable} tbody tr`);
      if (row) {
        triggerErRecordPreviewFromRow(row);
        showPanelStatus("正在背景讀取選取的急診病歷。");
      } else {
        renderErPreviewMessage("目前右側沒有可讀取的病歷列。");
      }
    });
    preview.querySelector("[data-preview-action='clear']").addEventListener("click", () => {
      clearRecentPreview(() => refreshErMainPreview());
    });

    host.appendChild(preview);
    refreshErMainPreview();
  }

  function refreshErMainPreview() {
    const preview = document.getElementById(ER_PREVIEW_ID);
    if (!preview) {
      return;
    }
    const body = preview.querySelector("[data-role='preview-body']");
    const meta = preview.querySelector("[data-role='preview-meta']");
    loadRecentPreview((recentPreview) => {
      if (!recentPreview || !recentPreview.text) {
        body.textContent = "尚無可預覽內容。點右上方病歷紀錄列或眼睛按鈕後，外掛會在背景讀取該筆病歷。";
        meta.textContent = "尚未載入";
        return;
      }
      const savedAt = recentPreview.savedAt ? new Date(recentPreview.savedAt).toLocaleString("zh-TW", { hour12: false }) : "未知時間";
      const sourceTitle = recentPreview.location && recentPreview.location.title ? recentPreview.location.title : "未知頁面";
      meta.textContent = `${recentPreview.title || "病歷預覽"}｜${sourceTitle}｜${savedAt}`;
      body.textContent = truncateText(recentPreview.text, 5000);
    });
  }

  function renderErPreviewMessage(message, recordMeta) {
    const preview = document.getElementById(ER_PREVIEW_ID);
    if (!preview) {
      return;
    }
    const body = preview.querySelector("[data-role='preview-body']");
    const meta = preview.querySelector("[data-role='preview-meta']");
    body.textContent = message;
    meta.textContent = formatErPreviewMeta(recordMeta);
  }

  function renderErPreviewText(recordMeta, text) {
    const preview = document.getElementById(ER_PREVIEW_ID);
    if (!preview) {
      return;
    }
    const body = preview.querySelector("[data-role='preview-body']");
    const meta = preview.querySelector("[data-role='preview-meta']");
    meta.textContent = formatErPreviewMeta(recordMeta);
    body.textContent = truncateText(text, 8000);
  }

  function formatErPreviewMeta(recordMeta) {
    if (!recordMeta) {
      return "尚未載入";
    }
    const parts = [
      recordMeta.formName || "急診病歷",
      recordMeta.recordTime,
      recordMeta.status
    ].filter(Boolean);
    return parts.join("｜") || "急診病歷";
  }

  async function exportAndCopyStructure(panel) {
    const status = panel.querySelector("[data-role='status']");
    try {
      const exportData = buildPageStructureExport();
      const json = JSON.stringify(exportData, null, 2);
      setExportOutput(panel, "", false);
      try {
        await navigator.clipboard.writeText(json);
        status.textContent = `頁面架構已複製：${exportData.summary.nodeCount} 個節點、${exportData.summary.formControlCount} 個欄位、${exportData.summary.buttonCount} 個按鈕。`;
      } catch (clipboardError) {
        setExportOutput(panel, json, true);
        status.textContent = `頁面架構已產生，但剪貼簿無法寫入。請從下方文字框手動複製。`;
      }
    } catch (error) {
      status.textContent = `匯出失敗：${error.message || "請稍後再試"}`;
    }
  }

  function setExportOutput(panel, value, visible) {
    const wrap = panel.querySelector("[data-role='export-output-wrap']");
    const output = panel.querySelector("[data-role='export-output']");
    output.value = value;
    wrap.classList.toggle("ed-note-assistant__export--hidden", !visible);
    if (visible) {
      output.focus();
      output.select();
    }
  }

  function buildPageStructureExport() {
    const state = { nodeCount: 0, truncated: false };
    const frameSummaries = collectFrameSummaries();
    const documentExports = [serializeDocument(document, "top", state)];

    getPageElements("iframe, frame").forEach((frame, index) => {
      const frameDocument = getAccessibleFrameDocument(frame);
      if (frameDocument && frameDocument.body) {
        documentExports.push(serializeDocument(frameDocument, `frame:${index}:${frame.id || frame.name || "unnamed"}`, state));
      }
    });

    return {
      exportVersion: STRUCTURE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      location: {
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search ? "[redacted]" : "",
        hash: window.location.hash ? "[redacted]" : ""
      },
      title: sanitizeText(document.title),
      summary: {
        nodeCount: state.nodeCount,
        truncated: state.truncated,
        formControlCount: getPageElements("input, textarea, select").length,
        buttonCount: getPageElements("button, input[type='button'], input[type='submit'], [role='button']").length,
        frameCount: frameSummaries.length,
        documentCount: documentExports.length
      },
      frames: frameSummaries,
      documents: documentExports
    };
  }

  function serializeDocument(doc, frameName, state) {
    return {
      frame: frameName,
      title: sanitizeText(doc.title),
      forms: Array.from(doc.forms).map((form, index) => serializeForm(form, index)),
      landmarks: collectLandmarks(doc),
      tree: serializeElement(doc.body, state, 0)
    };
  }

  function getPageElements(selector) {
    return Array.from(document.querySelectorAll(selector))
      .filter((element) => element.id !== PANEL_ID && !element.closest(`#${PANEL_ID}`));
  }

  function serializeForm(form, index) {
    return {
      index,
      selector: getStableSelector(form),
      id: form.id || undefined,
      name: form.getAttribute("name") || undefined,
      method: form.getAttribute("method") || undefined,
      target: form.getAttribute("target") || undefined,
      action: form.getAttribute("action") ? "[redacted]" : undefined,
      controls: Array.from(form.querySelectorAll("input, textarea, select, button")).map(serializeControl)
    };
  }

  function serializeControl(element) {
    return {
      tag: element.tagName.toLowerCase(),
      selector: getStableSelector(element),
      id: element.id || undefined,
      class: getClassList(element),
      name: element.getAttribute("name") || undefined,
      type: element.getAttribute("type") || undefined,
      role: element.getAttribute("role") || undefined,
      placeholder: sanitizeText(element.getAttribute("placeholder")),
      title: sanitizeText(element.getAttribute("title")),
      ariaLabel: sanitizeText(element.getAttribute("aria-label")),
      label: getAssociatedLabel(element),
      value: element.matches("button, input[type='button'], input[type='submit']") ? sanitizeText(element.innerText || element.value) : "[omitted]"
    };
  }

  function collectLandmarks(doc) {
    return Array.from(doc.querySelectorAll("header, nav, main, aside, section, article, form, table, [role], iframe"))
      .filter((element) => element.id !== PANEL_ID && !element.closest(`#${PANEL_ID}`))
      .slice(0, 200)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        selector: getStableSelector(element),
        id: element.id || undefined,
        class: getClassList(element),
        role: element.getAttribute("role") || undefined,
        title: sanitizeText(element.getAttribute("title")),
        ariaLabel: sanitizeText(element.getAttribute("aria-label"))
      }));
  }

  function collectFrameSummaries() {
    return Array.from(document.querySelectorAll("iframe, frame")).map((frame, index) => ({
      index,
      selector: getStableSelector(frame),
      id: frame.id || undefined,
      name: frame.getAttribute("name") || undefined,
      title: sanitizeText(frame.getAttribute("title")),
      src: frame.getAttribute("src") ? "[redacted]" : undefined,
      accessible: Boolean(getAccessibleFrameDocument(frame))
    }));
  }

  function getAccessibleFrameDocument(frame) {
    try {
      return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null;
    } catch (error) {
      return null;
    }
  }

  function serializeElement(element, state, depth) {
    if (!element || element.id === PANEL_ID || element.closest(`#${PANEL_ID}`)) {
      return null;
    }
    const tag = element.tagName.toLowerCase();
    if (IGNORED_EXPORT_TAGS.has(tag) || isExportNoise(element)) {
      return null;
    }
    if (state.nodeCount >= MAX_EXPORT_NODES) {
      state.truncated = true;
      return null;
    }

    state.nodeCount += 1;

    const serialized = {
      tag,
      selector: getStableSelector(element)
    };
    const attrs = getSerializableAttributes(element);
    if (Object.keys(attrs).length) {
      serialized.attrs = attrs;
    }

    const uiText = getSafeUiText(element);
    if (uiText) {
      serialized.uiText = uiText;
    }

    if (element.matches("input, textarea, select, button")) {
      serialized.control = serializeControl(element);
    }

    const children = Array.from(element.children)
      .filter((child) => child.id !== PANEL_ID && !child.closest(`#${PANEL_ID}`))
      .filter((child) => !IGNORED_EXPORT_TAGS.has(child.tagName.toLowerCase()) && !isExportNoise(child))
      .slice(0, MAX_CHILDREN_PER_NODE)
      .map((child) => serializeElement(child, state, depth + 1))
      .filter(Boolean);

    if (element.children.length > MAX_CHILDREN_PER_NODE) {
      serialized.childrenTruncated = element.children.length - MAX_CHILDREN_PER_NODE;
    }
    if (children.length) {
      serialized.children = children;
    }

    return serialized;
  }

  function isExportNoise(element) {
    return element.id === "ui-datepicker-div" || element.classList.contains("ui-datepicker-calendar");
  }

  function getSerializableAttributes(element) {
    const attrNames = ["id", "class", "name", "type", "role", "target", "placeholder", "title", "aria-label", "aria-labelledby", "data-testid", "data-test", "data-id"];
    return attrNames.reduce((attrs, name) => {
      const value = element.getAttribute(name);
      if (value) {
        attrs[name] = name === "class" ? getClassList(element) : sanitizeText(value);
      }
      return attrs;
    }, {});
  }

  function getClassList(element) {
    const classes = Array.from(element.classList || []).slice(0, 12);
    return classes.length ? classes : undefined;
  }

  function getSafeUiText(element) {
    if (!element.matches("button, label, legend, th, option, [role='button'], [role='tab']")) {
      return "";
    }
    const text = compactText(element.innerText || element.textContent || "");
    if (!text || text.length > 60) {
      return "";
    }
    return sanitizeText(text);
  }

  function getAssociatedLabel(element) {
    if (!element.id) {
      return undefined;
    }
    const ownerDocument = element.ownerDocument || document;
    const label = ownerDocument.querySelector(`label[for="${cssEscape(element.id)}"]`);
    return label ? sanitizeText(label.innerText || label.textContent) : undefined;
  }

  function getStableSelector(element) {
    if (element.id) {
      return `#${cssEscape(element.id)}`;
    }

    const parts = [];
    const ownerDocument = element.ownerDocument || document;
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== ownerDocument.body && parts.length < 5) {
      const tag = current.tagName.toLowerCase();
      const name = current.getAttribute("name");
      const type = current.getAttribute("type");
      const testId = current.getAttribute("data-testid") || current.getAttribute("data-test");
      let part = tag;

      if (testId) {
        part += `[data-testid="${cssEscape(testId)}"]`;
      } else if (name) {
        part += `[name="${cssEscape(name)}"]`;
      } else if (type) {
        part += `[type="${cssEscape(type)}"]`;
      } else {
        const siblings = Array.from(current.parentElement ? current.parentElement.children : []);
        const sameTagSiblings = siblings.filter((sibling) => sibling.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
        }
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  function sanitizeText(value) {
    if (!value) {
      return undefined;
    }
    return compactText(String(value))
      .replace(/\b\d{6,}\b/g, "[number]")
      .replace(/\b\d{3,4}[/-]\d{1,2}[/-]\d{1,2}\b/g, "[date]")
      .replace(/\b\d{1,3}[/-]\d{1,2}[/-]\d{1,2}\b/g, "[date]")
      .replace(/[A-Z][0-9]{8,10}/gi, "[id]")
      .slice(0, 120);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  createPanel();
})();
