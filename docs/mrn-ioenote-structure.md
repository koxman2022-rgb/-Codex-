# 體系病歷查詢頁架構筆記

來源：使用外掛「匯出頁面架構」取得的去識別化 JSON。

## 頁面概要

- 標題：急/住病摘 - 體系病歷查詢
- URL path：`/web/MRN/IOEnote/Index`
- iframe：無
- 主要結構：查詢條件表單、左側病歷事件/病摘清單、右側詳細內容 tab

## 主要表單

- 體系病歷查詢表單：`#IOEnoteForm`
- 病歷號欄位：`#CurrentChartno`
- 院區查詢按鈕：`#QueryData`
- 院區 checkbox：
  - 高醫：`#KMUH`
  - 小港：`#KMHK`
  - 大同：`#KMTTH`
  - 旗津：`#KMCH`
  - 岡山：`#KMUGH`
- 日期區間：
  - 日期範圍選單：`#searchDate`
  - 開始日期：`#search_START_DATE`
  - 結束日期：`#search_END_DATE`
- 列印表單：`#EMRPrint`
- 列印值：`input[name="PrintValue[]"]`

## 左側清單

- 個資/基本資訊表：`#InfoDetailTable`
- 病摘/門診/急診事件通常在 `label.DetailLi` 或 `label.DetailOPD`
- 可列印或可選項目通常配對 `input[name="PrintValue[]"]`

### 左側清單目前推論

- `label.DetailLi`、`label.DetailOPD` 很可能是可點選的事件標籤，文字會描述院區、日期、科別或病摘類型。
- `input[name="PrintValue[]"]` 可能保存每筆事件或列印項目的識別值。外掛匯出時不會輸出實際 value，因此需觀察它的鄰近 label、父層 selector、id/name/class。
- 若 label 與 input 是兄弟節點或同一個父層，之後可用「事件 label + 鄰近 input」建立穩定定位方式。
- 目前尚未確認點擊 label、input、或父層哪一個元素會觸發 AJAX 載入右側內容。

## 右側內容

- 右側內容外層：`#AllDetailDiv`
- 病摘 tab：`#NoteLi`
- 追蹤修訂 tab：`#TrackModifyLi`
- 醫囑 tab：`#OrderLi`
- 病摘內容容器：`#Note`
- 追蹤修訂內容容器：`#TrackModify`
- 醫囑內容容器：`#Order`
- 醫囑表格外層：`#ControlOrderTable`
- 點選病摘後出現的病摘標頭表格：`#NoteHeaderTable`
- 點選病摘後出現的病摘 iframe 表單：`#OnlyNote`
- 點選病摘後出現的病摘 iframe：`#iframFormOnlyNote`

### 右側內容目前推論

- `#AllDetailDiv` 是右側詳細內容的總容器，適合做 MutationObserver 監看。
- `#Note`、`#TrackModify`、`#Order` 看起來是 tab panel 容器，不一定一開始就有內容。
- 初始匯出中 `#Note`、`#TrackModify` 為空，代表真正病摘內容應該是點選左側事件後才插入。
- 若 AJAX 完成後內容插在 `#Note` 底下，後續可直接讀 `#Note.innerText`。
- 若內容插在 `#AllDetailDiv` 的其他子節點，外掛目前仍可能讀到，因為 `#AllDetailDiv` 已納入讀取範圍，但會比較容易混入 tab 標題、按鈕或雜訊。
- `#ControlOrderTable` 應只適合醫囑資料；若只要病摘主文，應優先避免把醫囑表格混進摘要。

### 已比對的點選前後結果

來源：兩份去識別化匯出 JSON；第一份未點左側紀錄，第二份點選一筆「急診來診」後匯出。

- 未點紀錄時：
  - `nodeCount` 約 1055。
  - `frameCount` 為 0。
  - `#Note` class 是 `tab-pane fade`，childCount 為 0。
  - `#TrackModify` childCount 為 0。
  - `#Order` 只有醫囑篩選區與空的 `#ControlOrderTable`。
- 點選「急診來診」後：
  - `nodeCount` 約 1089。
  - `frameCount` 變成 1。
  - `#NoteLi` class 變成 `active`。
  - `#Note` class 變成 `tab-pane fade in active`，childCount 變成 3。
  - `#Note` 底下新增 `#NoteHeaderTable`、`#OnlyNote`、`#iframFormOnlyNote`。
  - `#OnlyNote` 是 post form，含 hidden input：`#inGroupAnswerIDX`、`#inStyle`。
  - iframe id 是 `#iframFormOnlyNote`，name 是 `OnlyNotetarget`。
- 左側被點選的 `label.DetailLi` 沒有觀察到 active/selected class；目前比較可靠的狀態訊號在右側 tab 與 iframe。

目前最重要的新結論：病摘本文很可能在 `#iframFormOnlyNote` 這個 iframe 裡，而不是外層 `#Note` 的直接文字。外層 `#NoteHeaderTable` 比較像病摘標頭資訊。

### iframe 內部結構

來源：`0.3.0` 版外掛在點選「急診來診」後匯出的去識別化 JSON。

- `summary.documentCount` 為 2，代表 iframe document 已成功匯出。
- `frames[0]`：
  - selector：`#iframFormOnlyNote`
  - id：`iframFormOnlyNote`
  - name：`OnlyNotetarget`
  - accessible：`true`
- iframe document：
  - frame 名稱：`frame:0:iframFormOnlyNote`
  - title：`- HisOrder`
  - body 底下只有一個主要 `div`
  - 主要內容容器：`#nav-tabContent`
  - `#nav-tabContent` class：`template`
  - `#nav-tabContent` 底下有多個 `blockquote.default`
  - 每個 blockquote 通常包含：
    - `div.blockquote-header.Cgrapefruit`
    - `div.card.mt-2`
    - 多個 `div.card-group`
- 常見內容 class：
  - `card-group`
  - `tpl-cke_view`
  - `text-nowrap`
  - `font-weight-bold`
  - `Not2remove`
  - `d-none`

實作判斷：病摘本文應優先讀 iframe 內 `#nav-tabContent.innerText`，而不是從外層 `#AllDetailDiv` 讀。外層 `#NoteHeaderTable` 可當作標頭補充。

## 目前判斷

這份匯出中 `#Note`、`#TrackModify` 仍是空容器，代表需要先在左側清單點選某筆病摘/事件，右側才會載入內容。外掛目前會在體系病歷頁優先讀取 `#Note`、`#TrackModify`、`#Order`、`#ControlOrderTable`、`#AllDetailDiv` 的文字。

## 外掛目前對此頁的支援狀態

- 頁面偵測條件：同時找到 `#IOEnoteForm` 與 `#AllDetailDiv` 時，判定為體系病歷查詢頁。
- 關鍵 selector 偵測：會列出 `#IOEnoteForm`、`#CurrentChartno`、`#QueryData`、`#InfoDetailTable`、`#AllDetailDiv`、`#NoteLi`、`#TrackModifyLi`、`#OrderLi`、`#Note`、`#TrackModify`、`#Order`、`#ControlOrderTable`、`#EMRPrint` 的存在數量。
- 讀取病摘文字時，若可讀 `#iframFormOnlyNote`，會優先讀 iframe 內 `#nav-tabContent`，並加上外層 `#NoteHeaderTable` 標頭。
- 若 iframe 不存在或不可讀，才退回讀取 `#Note`、`#TrackModify`、`#Order`、`#ControlOrderTable`、`#AllDetailDiv`。
- 尚未支援自動點選左側事件，也尚未記錄哪一筆事件目前被選取。
- `0.3.0` 版匯出器已補強：若 iframe 同網域且可讀，匯出 JSON 會把 iframe 內部 document 也納入 `documents`，並在 `summary.documentCount` 顯示匯出文件數量。

## 下一次匯出 JSON 時要確認

請先重新載入 Chrome 外掛，再在體系病歷頁完成匯出，且不要包含真實姓名、病歷號、生日或完整病摘內容。

目前已經有未點選與點選後的外層結構。下一次最需要的是：

1. 點選一筆「急診來診」或「轉區摘要」。
2. 等 `#Note` 內容載入完成。
3. 使用 `0.3.0` 版外掛按「匯出頁面架構」。
4. 確認 JSON 中 `summary.documentCount` 是否大於 1。

新的匯出特別看這些項目：

- `documents` 是否包含 `frame:0:iframFormOnlyNote` 或類似名稱。
- iframe 文件內是否有穩定的病摘本文容器 id/class。
- iframe 內若是表格，確認表格 id/class 與欄位標題，不需要提供儲存格內真實內容。
- iframe 內若是 textarea/input，外掛會省略 value；只需看 selector、id、name、class。
- 若 `summary.documentCount` 仍是 1，代表 iframe 不可直接讀取，需要改用其他方式分析。

## 後續實作方向

- 優先用 MutationObserver 監看 `#AllDetailDiv`，在右側內容變動後重新整理外掛面板狀態。
- 病摘主文抓取應先嘗試 `#iframFormOnlyNote` 的可讀 iframe document，再退回 `#Note`，最後才退回 `#AllDetailDiv`。
- 左側事件若有穩定 selected/active class，可加入「目前選取事件」顯示；若沒有，先不自動推斷。
- 在尚未確認 AJAX 觸發元素前，不建議加入自動點選左側第一筆事件，避免干擾院內系統操作。
