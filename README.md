# 急診病摘優化外掛

這是一個 Chrome Extension prototype，會在院內急診病摘頁面注入輔助面板，先以本機處理方式讀取頁面文字並產生診斷候選。

## 安裝測試

1. 打開 Chrome 的 `chrome://extensions/`
2. 開啟右上角「開發人員模式」
3. 選擇「載入未封裝項目」
4. 選擇這個資料夾：`C:\Users\user\Documents\急診病摘優化外掛`
5. 開啟或重新整理 `https://intraweb.server.kmuh.org.tw/WEB/ipdNote/ER_Main`

外掛目前會在 `https://intraweb.server.kmuh.org.tw/*` 底下的院內頁面載入，因此按進「體系病歷」後，如果仍在同一個主機，右下角也會出現輔助面板。

## 本機假資料測試

也可以直接用瀏覽器開啟：

`C:\Users\user\Documents\急診病摘優化外掛\test\mock-er-main.html`

這個測試頁會直接載入 `src/content.js` 與 `src/content.css`，方便先確認面板與關鍵字規則。

## 目前功能

- 在目標頁面右下角加入「急診病摘輔助」面板
- 優先讀取使用者選取的文字；沒有選取時，讀取頁面可見文字與表單文字欄位
- 以本機關鍵字規則產生診斷候選，並會忽略「否認、無、沒有」附近的否定關鍵字
- 可複製診斷候選文字
- 可匯出頁面架構 JSON，協助後續判斷病摘欄位、診斷欄位與按鈕位置
- 可偵測 ER_Main 主頁常見 selector 是否存在
- 在 ER_Main 左側病人清單的姓名旁邊加入「體系」快捷按鈕
- 若清單較晚載入，可按「補體系按鈕」手動重新掃描

## 匯出頁面架構

1. 登入院內病摘頁並停在你要分析的畫面
2. 按右下角外掛面板的「匯出頁面架構」
3. 若顯示「頁面架構已複製」，直接把剪貼簿內容貼給我
4. 若瀏覽器不允許寫入剪貼簿，面板會顯示「頁面架構 JSON」文字框，從文字框手動複製

匯出內容會省略 `input`、`textarea`、`select` 的實際 value，並把 URL query/hash 標成 `[redacted]`。它仍會保留 selector、id、class、name、type、role、placeholder、title、aria label、按鈕文字等架構資訊。

目前已整理 ER_Main 主頁 selector 筆記：[docs/er-main-structure.md](docs/er-main-structure.md)。
體系病歷查詢頁 selector 筆記：[docs/mrn-ioenote-structure.md](docs/mrn-ioenote-structure.md)。

若要分析「體系病歷」頁面，請先按左側病人旁邊的「體系」進入頁面，再於新頁面右下角按「匯出頁面架構」。

## 體系病歷快捷按鈕

外掛會在 `#ERPatientListTable` 每一列的姓名欄，也就是 `td:nth-child(6)`，加入「體系」按鈕。按下後會先選取該病人列，再觸發右側原本的 `span[title="體系病歷"]`。

目前快捷按鈕會在選取病人列後約 80ms 嘗試開啟體系病歷；若右側資料尚未更新，會短暫重試。

如果沒看到按鈕：

1. 先到 `chrome://extensions/` 重新載入外掛
2. 重新整理病摘頁
3. 打開右下角「急診病摘輔助」
4. 按「偵測頁面」，看結果中的「左側列數」與「體系快捷」數量
5. 若左側列數大於 0 但體系快捷是 0，按「補體系按鈕」

## 下一步需要的資料

若要精準修改欄位、讀取病摘、填入指定欄位，可以先按外掛面板的「匯出頁面架構」，再把剪貼簿內的 JSON 貼給我。這份 JSON 會省略表單 value、病摘內文與 URL query/hash，但貼上前仍建議快速確認一次沒有真實病人資訊。

若你要補充 HTML 片段，請提供去識別化後的內容，尤其是：

- 病摘內容所在區塊或 textarea/input 的 HTML
- 想新增按鈕或面板的位置附近 HTML
- 想自動填入的診斷欄位 HTML
- 使用者操作流程，例如要在哪個 tab 或哪個按鈕後觸發

## 隱私與醫療安全

目前版本不會主動把病人資料送到外部服務。診斷候選只作為醫師輔助整理，不能取代臨床判斷。
