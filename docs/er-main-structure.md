# ER_Main 頁面架構筆記

來源：使用外掛「匯出頁面架構」取得的去識別化 JSON。

## 頁面概要

- 標題：急診 - 病摘紀錄系統
- URL path：`/WEB/ipdNote/ER_Main`
- iframe：無
- 主要結構：左側急診病人清單、右側病摘/單張評估/紀錄列表、多個隱藏 form 用於導頁或送出動作

## 關鍵區塊

- 急診病人清單：`#ERPatientListTable`
- 右側病人資訊：`#erPatientinforDiv`
- 病摘/評估 tab：`#ER_NandEUL`
- 病摘 tab：`#ER_Note_li`
- 單張評估 tab：`#ER_Eva_li`
- 病摘內容區：`#ER_Note`
- 單張評估內容區：`#ER_Eva`
- 病摘與評估外層：`#AllRecAndEvaDiv`
- 病人紀錄列表：`#ERPatientRecordListTable`
- 體系病歷 icon：`span[title="體系病歷"]`，目前出現在右側病人資訊附近，元素型態是 `span` 包 `img.mrn-link`

## 常用按鈕與控制

- 查詢按鈕：`#ERserchBtn`
- 新增按鈕：`.er-btn-add`
- Ditto 按鈕：`#DittoFormForERBtn`
- 體系病歷 icon：`span[title="體系病歷"] img.mrn-link`
- 病歷號搜尋：`#ChartnoSearch`
- 護理站：`#StationListText`
- 醫師：`#doctorsListText`
- 在院狀態：`#ERSTATUSin`
- 出院/退掛狀態：`#ERSTATUSout`
- AI 生成開關：`input[name="AIBuildR"]`
- 表單種類 radio：`input[name="FormList"]`

## 導頁/送出表單

- 新增病摘：`#ADDNote`
- Ditto：`#TurnToDitto`
- 轉單張/病程檢視：`#TurnToTMView`
- 編輯自己紀錄：`#TurnToEditSelfView`
- 只讀檢視：`#TurnToROView`
- 列印：`#PrintNote`
- 119：`#TurnTo119`
- 照會：`#TurnToConsult`

## 目前判斷

這份匯出是 ER_Main 清單/紀錄主頁，尚未包含實際新增或編輯病摘時的輸入欄位。若要讓外掛精準讀取或填入病摘內容，下一步需要在按「新增」、「是，Ditto」或編輯既有病摘後，再於該編輯頁面匯出一次頁面架構。

## 外掛新增行為

外掛會在左側病人清單 `#ERPatientListTable tbody tr` 的姓名欄 `td:nth-child(6)` 補上一個「體系」代理按鈕。這個按鈕不直接取代院內原本元件，而是先點選該病人列，短暫等待右側資訊更新，再點擊右側原本的 `span[title="體系病歷"]`。
