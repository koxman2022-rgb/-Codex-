(function () {
  const PANEL_ID = "ed-note-assistant";
  const STRUCTURE_EXPORT_VERSION = "0.2.0";
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
    printForm: "#EMRPrint"
  };
  const PATIENT_TABLE_SELECTOR = "#ERPatientListTable";
  const PATIENT_NAME_CELL_SELECTOR = "td:nth-child(6)";
  const SYSTEM_RECORD_SELECTOR = 'span[title="體系病歷"]';
  const SYSTEM_RECORD_SHORTCUT_CLASS = "ed-note-system-record-shortcut";
  const PATIENT_NAME_CELL_CLASS = "ed-note-patient-name-cell";
  const PATIENT_NAME_TEXT_CLASS = "ed-note-patient-name-text";
  const SHORTCUT_OBSERVER_FLAG = "edNoteShortcutObserverReady";
  const SYSTEM_RECORD_FAST_DELAY_MS = 80;
  const SYSTEM_RECORD_RETRY_TIMEOUT_MS = 900;

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
      getSource(panel).value = extractVisibleClinicalText();
    });
    panel.querySelector("[data-action='suggest']").addEventListener("click", () => {
      renderSuggestions(panel, suggestDiagnoses(getSource(panel).value));
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
    if (!document.querySelector(MRN_IOENOTE_SELECTORS.form)) {
      return "";
    }

    const selectors = [
      MRN_IOENOTE_SELECTORS.notePanel,
      MRN_IOENOTE_SELECTORS.trackModifyPanel,
      MRN_IOENOTE_SELECTORS.orderPanel,
      MRN_IOENOTE_SELECTORS.orderTable,
      MRN_IOENOTE_SELECTORS.allDetailPanel
    ];

    const text = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
      .map((element) => element.innerText || "")
      .filter(Boolean)
      .join("\n");

    return compactText(text);
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
    addSystemRecordShortcuts();

    if (document.body.dataset[SHORTCUT_OBSERVER_FLAG] === "true") {
      return;
    }
    document.body.dataset[SHORTCUT_OBSERVER_FLAG] = "true";

    const observer = new MutationObserver(() => addSystemRecordShortcuts());
    observer.observe(document.body, { childList: true, subtree: true });

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      addSystemRecordShortcuts();
      if (attempts >= 30) {
        window.clearInterval(intervalId);
      }
    }, 500);
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
    const frameExports = [serializeDocument(document, "top", state)];
    const frameSummaries = collectFrameSummaries();

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
        frameCount: frameSummaries.length
      },
      frames: frameSummaries,
      documents: frameExports
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
      src: frame.getAttribute("src") ? "[redacted]" : undefined
    }));
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
    const attrNames = ["id", "class", "name", "type", "role", "placeholder", "title", "aria-label", "aria-labelledby", "data-testid", "data-test", "data-id"];
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
    const label = document.querySelector(`label[for="${cssEscape(element.id)}"]`);
    return label ? sanitizeText(label.innerText || label.textContent) : undefined;
  }

  function getStableSelector(element) {
    if (element.id) {
      return `#${cssEscape(element.id)}`;
    }

    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && parts.length < 5) {
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
