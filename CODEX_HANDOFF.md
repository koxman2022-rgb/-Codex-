# Codex Handoff - 急診病摘優化外掛

## 專案位置

原始工作區：

`C:\Users\user\Documents\急診病摘優化外掛`

這是一個 Chrome Manifest V3 extension prototype，用於高醫院內急診病摘/體系病歷頁面。

## 目前檔案

- `manifest.json`：Chrome extension manifest，目前 match `https://intraweb.server.kmuh.org.tw/*`
- `src/content.js`：主要 content script，包含 UI、診斷候選、頁面架構匯出、ER_Main 快捷按鈕、體系病歷頁偵測
- `src/content.css`：面板與快捷按鈕樣式
- `README.md`：安裝、測試、匯出架構、排除問題說明
- `docs/er-main-structure.md`：ER_Main 清單頁 selector 筆記
- `docs/mrn-ioenote-structure.md`：體系病歷查詢頁 selector 筆記
- `test/mock-er-main.html`：本機假資料測試頁，不含真實病人資料

## 安裝方式

1. Chrome 開啟 `chrome://extensions/`
2. 開啟「開發人員模式」
3. 按「載入未封裝項目」
4. 選擇本專案資料夾
5. 修改檔案後，要在 `chrome://extensions/` 重新載入外掛，再重新整理院內頁面

## 已完成功能

- 右下角注入「急診病摘輔助」面板
- 讀取選取文字，或依頁面優先讀取目前病摘/紀錄區文字
- 本機關鍵字規則產生診斷候選
- 否定詞處理，例如「否認胸痛」不觸發急性冠心症
- 匯出頁面架構 JSON
  - 省略 input/textarea/select value
  - URL query/hash redacted
  - 跳過 script/style/option/datepicker 雜訊
  - 剪貼簿失敗時顯示手動複製 textarea
- 偵測支援頁面 selector
- ER_Main 左側病人清單姓名旁加入「體系」快捷按鈕
- 體系病歷查詢頁 selector 偵測與讀取範圍

## ER_Main 頁重點

URL path：

`/WEB/ipdNote/ER_Main`

關鍵 selector：

- 病人清單：`#ERPatientListTable`
- 姓名欄：`#ERPatientListTable tbody tr td:nth-child(6)`
- 右側病人資訊：`#erPatientinforDiv`
- 病摘內容區：`#ER_Note`
- 單張評估內容區：`#ER_Eva`
- 病摘/評估外層：`#AllRecAndEvaDiv`
- 病人紀錄列表：`#ERPatientRecordListTable`
- 新增按鈕：`.er-btn-add`
- Ditto 按鈕：`#DittoFormForERBtn`
- 體系病歷原始 icon：`span[title="體系病歷"] img.mrn-link`

目前「體系」快捷按鈕邏輯：

1. 在 `#ERPatientListTable tbody tr` 每列姓名欄新增 `button.ed-note-system-record-shortcut`
2. 點快捷按鈕後先 `row.click()`
3. 等約 80ms
4. 找右側 `span[title="體系病歷"]`
5. 找到就 click

為避免四字姓名被 ellipsis 裁掉，姓名欄會加：

- `ed-note-patient-name-cell`
- 姓名內層 div 加 `ed-note-patient-name-text`

## 體系病歷查詢頁重點

URL path：

`/web/MRN/IOEnote/Index`

標題：

`急/住病摘 - 體系病歷查詢`

關鍵 selector：

- 查詢表單：`#IOEnoteForm`
- 病歷號欄位：`#CurrentChartno`
- 院區查詢按鈕：`#QueryData`
- 基本資訊表：`#InfoDetailTable`
- 右側內容外層：`#AllDetailDiv`
- 病摘 tab：`#NoteLi`
- 追蹤修訂 tab：`#TrackModifyLi`
- 醫囑 tab：`#OrderLi`
- 病摘內容容器：`#Note`
- 追蹤修訂容器：`#TrackModify`
- 醫囑容器：`#Order`
- 醫囑表格外層：`#ControlOrderTable`
- 列印表單：`#EMRPrint`
- 可列印項目：`input[name="PrintValue[]"]`
- 左側病摘/事件 label 常見 class：`label.DetailLi`、`label.DetailOPD`

目前觀察：

- 匯出的體系病歷頁中 `#Note`、`#TrackModify` 是空容器
- 推測要先點左側某筆事件/病摘，右側才會 AJAX 載入內容
- 外掛目前已把 `#Note`、`#TrackModify`、`#Order`、`#ControlOrderTable`、`#AllDetailDiv` 納入優先讀取範圍

## 下一步建議

1. 在體系病歷頁點左側某筆「急診來診」或「轉區摘要」
2. 等右側 `#Note` 顯示內容
3. 按「匯出頁面架構」
4. 讓 Codex 依新的 JSON 找出實際病摘內容 DOM
5. 再實作：
   - 從體系病歷抓取指定病摘內容
   - 回 ER_Main 病摘頁後帶入診斷候選
   - 或把體系病歷摘要塞入外掛面板

## 隱私與安全

- 不要把真實病人姓名、病歷號、生日、完整病摘內容貼給 Codex
- 外掛目前不主動傳送資料到外部服務
- 所有診斷候選只作為醫師輔助整理，不能取代臨床判斷

## 已知限制

- 目前診斷候選是本機關鍵字規則，不是正式醫療 AI
- ER_Main 的「體系」快捷按鈕是代理按鈕，不是直接呼叫院內 API
- 若體系病歷頁開在不同網域或特殊視窗，manifest match 可能需再調整
- 若右側內容由 AJAX 延遲載入，需要使用 MutationObserver 或重試讀取
