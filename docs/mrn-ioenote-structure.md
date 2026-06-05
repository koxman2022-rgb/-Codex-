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

## 右側內容

- 右側內容外層：`#AllDetailDiv`
- 病摘 tab：`#NoteLi`
- 追蹤修訂 tab：`#TrackModifyLi`
- 醫囑 tab：`#OrderLi`
- 病摘內容容器：`#Note`
- 追蹤修訂內容容器：`#TrackModify`
- 醫囑內容容器：`#Order`
- 醫囑表格外層：`#ControlOrderTable`

## 目前判斷

這份匯出中 `#Note`、`#TrackModify` 仍是空容器，代表需要先在左側清單點選某筆病摘/事件，右側才會載入內容。外掛目前會在體系病歷頁優先讀取 `#Note`、`#TrackModify`、`#Order`、`#ControlOrderTable`、`#AllDetailDiv` 的文字。
