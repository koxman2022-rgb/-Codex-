# 院內急診病摘/體系病歷網頁架構總覽

本文整理目前已確認的頁面架構、資料流與外掛切入點。內容只描述 selector、區塊角色與互動流程，不記錄病人識別資料或病摘全文。

## 目前分析範圍

### 已深入分析

- 急診病摘主頁：`/WEB/ipdNote/ER_Main`
- 急/住病摘體系病歷查詢頁：`/web/MRN/IOEnote/Index`

### 尚可延伸分析

- 體系病歷入口頁：`/WEB/MRN/IOEnote`
- 跨團隊體系病歷：`/WEB/MRN/CrossTeam`
- 檢查體系病歷：`/WEB/MRN/ExamReport`

目前外掛主要應先穩定支援 ER_Main 與 IOEnote/Index，再評估是否納入延伸頁。

## ER_Main 急診病摘主頁

### 頁面角色

ER_Main 是急診工作流程的主頁，負責顯示急診病人清單、右側病人資訊、病摘內容、評估內容，以及病人紀錄列表。

### 主要 selector

- 病人清單：`#ERPatientListTable`
- 病人清單列：`#ERPatientListTable tbody tr`
- 姓名欄：`#ERPatientListTable tbody tr td:nth-child(6)`
- 右側病人資訊：`#erPatientinforDiv`
- 病摘內容區：`#ER_Note`
- 單張評估內容區：`#ER_Eva`
- 病摘/評估外層：`#AllRecAndEvaDiv`
- 病人紀錄列表：`#ERPatientRecordListTable`
- 查詢按鈕：`#ERserchBtn`
- 新增病摘按鈕：`.er-btn-add`
- Ditto 按鈕：`#DittoFormForERBtn`
- 原始體系病歷按鈕：`span[title="體系病歷"]`
- 原始體系病歷 icon：`span[title="體系病歷"] img.mrn-link`

### 外掛目前切入點

- 在 `#ERPatientListTable tbody tr` 每一列姓名欄旁插入「體系」快捷按鈕。
- 快捷按鈕 class：`.ed-note-system-record-shortcut`
- 在右側 `#AllRecAndEvaDiv` 插入「外掛病歷預覽」區。
- 預覽區 id：`#ed-note-record-preview`
- 點擊流程：
  1. 先點該列病人 `row.click()`
  2. 等待右側病人資訊更新
  3. 找 `span[title="體系病歷"]`
  4. 點原始體系病歷按鈕

這個做法是代理操作，不直接呼叫院內 API。

### 目前觀察

- 最新 Chrome 觀察中，ER_Main 分頁存在 `#ERPatientListTable`、`#ER_Note`、`#ER_Eva`、`#AllRecAndEvaDiv`、`#ERPatientRecordListTable`。
- 當前分頁曾出現病人列與紀錄列。
- 當前 ER_Main 分頁未看到外掛面板，可能是分頁在外掛更新前已開啟，或尚未重新整理。若要測 ER_Main 外掛功能，需重新整理 ER_Main 或重新載入外掛後再開頁。

## IOEnote 體系病歷查詢頁

### 頁面角色

IOEnote/Index 是急/住病摘的體系病歷查詢頁，負責查詢跨院區病摘、顯示左側事件清單，並在右側載入病摘、追蹤修訂與醫囑。

### 整體結構

- 查詢表單區
- 個資/基本資訊區
- 左側病歷事件樹
- 右側 tab 詳細內容區
- 點選病摘後動態產生的 iframe

### 主要表單

- 院區/日期查詢表單：`#IOEnoteForm`
- 病歷號欄位：`#CurrentChartno`
- 院區查詢按鈕：`#QueryData`
- 日期範圍選單：`#searchDate`
- 開始日期：`#search_START_DATE`
- 結束日期：`#search_END_DATE`
- 列印表單：`#EMRPrint`
- 點選病摘後出現的 iframe form：`#OnlyNote`
- `#OnlyNote` target：`OnlyNotetarget`
- `#OnlyNote` hidden inputs：`#inGroupAnswerIDX`、`#inStyle`

### 左側事件樹

- 事件樹容器：`#treeview`
- 事件列：`.LiteachforFilter`
- 病摘/急診/住院事件 label：`label.DetailLi`
- 門診事件 label：`label.DetailOPD`
- 可列印項目 checkbox：`input[name="PrintValue[]"]`
- 展開中的群組：`.nested.active`

目前觀察：

- 左側可有大量事件列。
- 點選某筆「急診來診」後，左側 label 本身未觀察到明確 active/selected class。
- 比較可靠的選取狀態在右側：`#NoteLi.active` 與 `#Note.tab-pane.fade.in.active`。

### 右側 tab

- 右側外層：`#AllDetailDiv`
- 病摘 tab：`#NoteLi`
- 追蹤修訂 tab：`#TrackModifyLi`
- 醫囑 tab：`#OrderLi`
- 病摘 panel：`#Note`
- 追蹤修訂 panel：`#TrackModify`
- 醫囑 panel：`#Order`
- 醫囑表格：`#ControlOrderTable`

未點左側事件時：

- `#Note` 通常是空的 `tab-pane fade`
- `#TrackModify` 通常是空的
- `#Order` 只有醫囑篩選區與空表格
- iframe 尚未出現

點選急診來診後：

- `#NoteLi` 變成 `active`
- `#Note` 變成 `tab-pane fade in active`
- `#Note` 底下出現：
  - `#NoteHeaderTable`
  - `#OnlyNote`
  - `#iframFormOnlyNote`

### 病摘本文位置

真正的病摘本文不在外層 `#Note.innerText`，而是在 iframe 裡。

- iframe：`#iframFormOnlyNote`
- iframe name：`OnlyNotetarget`
- iframe 內主要內容容器：`#nav-tabContent`
- iframe 內內容 class：`template`
- 內部結構通常是多個 `blockquote.default`
- 每個 blockquote 通常包含：
  - `div.blockquote-header.Cgrapefruit`
  - `div.card.mt-2`
  - 多個 `div.card-group`

目前外掛讀取策略：

1. 如果 `#iframFormOnlyNote` 可讀，優先讀 iframe 內 `#nav-tabContent.innerText`
2. 加上外層 `#NoteHeaderTable` 作為標頭補充
3. 若 iframe 不存在或不可讀，才退回外層 `#Note`、`#TrackModify`、`#Order`、`#ControlOrderTable`、`#AllDetailDiv`

### Chrome 控制端與 content script 差異

在 Chrome 自動化控制端直接讀 iframe 時，有時會顯示 iframe 不可讀；但外掛 content script 實際按「讀取目前內容」可以讀到內容。

推論：

- content script 在頁面環境中可成功取得 iframe 內容。
- Chrome 控制端的 isolated/evaluate context 不一定等同外掛 content script context。
- 後續驗證外掛功能時，以外掛按鈕結果為準。

## 外掛面板

### 面板 selector

- 面板：`#ed-note-assistant`
- 讀取按鈕：`#ed-note-assistant [data-action="read"]`
- 診斷建議按鈕：`#ed-note-assistant [data-action="suggest"]`
- 複製按鈕：`#ed-note-assistant [data-action="copy"]`
- 偵測頁面按鈕：`#ed-note-assistant [data-action="detect-page"]`
- 補體系按鈕：`#ed-note-assistant [data-action="add-shortcuts"]`
- 匯出頁面架構按鈕：`#ed-note-assistant [data-action="export-structure"]`
- 來源文字框：`#ed-note-assistant [data-role="source"]`
- 結果區：`#ed-note-assistant [data-role="result"]`
- 狀態列：`#ed-note-assistant [data-role="status"]`

### 目前能力

- 讀取選取文字
- 讀取 ER_Main 目前病摘/評估/紀錄區
- 讀取 IOEnote 已載入的病摘 iframe
- 將已讀取的病摘文字整理成本機規則摘要
- 在 ER_Main 右側下方顯示最近一次讀取/摘要/一年統整內容預覽
- 本機關鍵字規則產生診斷候選
- 匯出頁面架構 JSON
- 偵測 ER_Main 與 IOEnote selector
- 在 ER_Main 病人清單補「體系」快捷按鈕

### 體系病摘摘要

- 按鈕：`#ed-note-assistant [data-action="summarize"]`
- 摘要來源：外掛文字框內容；若文字框為空，會先走目前頁面的讀取流程。
- 摘要方式：本機規則依關鍵字抽取，不呼叫外部服務。
- 摘要欄位：
  - 主訴/主要問題
  - 病史重點
  - 檢查/檢驗
  - 處置/治療
  - 轉歸/後續
  - 其他可能重要資訊
- 安全邊界：只顯示在外掛結果區，不自動寫回 ER_Main，不送出院內表單。

### ER_Main 右側病歷預覽

- 插入位置：`#AllRecAndEvaDiv`
- 預覽面板：`#ed-note-record-preview`
- 內容來源：
  - 最近一次「讀取選取/頁面文字」
  - 最近一次「整理病摘摘要」
  - 最近一次「統整一年病歷」短版草稿
- 儲存方式：外掛本機 `chrome.storage.local`，若不可用則退回頁面 `localStorage`
- 操作：
  - 更新：重新載入最近預覽
  - 讀本頁：讀取目前 ER_Main 可見內容並更新預覽
  - 清除：清除最近預覽
- 安全邊界：只顯示預覽，不寫入病摘欄位，不儲存到院內系統。

## 資料流整理

### 從 ER_Main 到體系病歷

1. ER_Main 左側選病人
2. 右側資訊更新
3. 原始體系病歷 icon 出現
4. 外掛「體系」快捷按鈕代理點擊原始 icon
5. 開啟 IOEnote/Index

### 在 IOEnote 讀病摘

1. IOEnote 初始載入查詢表單與左側事件樹
2. 使用者點左側「急診來診」等事件
3. 右側 `#Note` active
4. `#OnlyNote` form post 到 `OnlyNotetarget`
5. `#iframFormOnlyNote` 載入病摘模板內容
6. 外掛讀 iframe 內 `#nav-tabContent`

## 後續功能追加切入點

### 低風險功能

- 顯示目前頁面偵測狀態
- 顯示目前讀取來源：ER_Main / IOEnote iframe / 選取文字
- 顯示讀取內容字數與行數
- 在 IOEnote 顯示「已讀到體系病摘」狀態
- 匯出結構時更清楚標註 frame document

### 中等風險功能

- 將體系病摘內容整理成摘要放入外掛結果區
- 從體系病摘抽取急診診斷候選
- 依病摘內容提示可補充的症狀、檢查、處置
- 在 ER_Main 與 IOEnote 間保存暫存內容
- 讓使用者手動複製摘要回 ER_Main

### 高風險功能

- 自動回填 ER_Main 病摘欄位
- 自動點選左側第一筆體系紀錄
- 自動提交、儲存、列印、簽章或送出
- 呼叫院內 API 直接抓資料
- 把病摘內容送到外部 AI 服務

高風險功能都應需要明確確認與清楚的資料保護策略。

## 建議開發順序

1. 先穩定「讀取來源狀態」顯示，讓使用者知道外掛現在讀到哪裡。
2. 加入「體系病摘摘要」但只顯示在外掛面板，不自動寫回院內系統。
3. 改善診斷候選規則，並標示命中依據。
4. 做 ER_Main 與 IOEnote 的手動橋接，例如一鍵複製摘要。
5. 最後才考慮半自動回填，且必須保留人工確認。
