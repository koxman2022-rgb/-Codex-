# Coding Agent Guidelines

- 寫程式前先理解現有架構與使用者真正要求。
- 不確定時明確說出假設；若合理推斷風險低，可以先採用保守假設繼續。
- 優先做最小、清楚、可驗證的改動。
- 不新增未要求的功能、抽象層、設定項或未來彈性。
- 修改既有專案時，只碰必要檔案與必要行數。
- 保持既有程式風格；不要順手重構或格式化無關程式碼。
- 若看到無關問題，先回報，不自行修改，除非使用者要求。
- 修 bug 時，盡量先找出可重現條件，再修正並驗證。
- 多步驟任務先給簡短計畫，完成後說明改了什麼與如何驗證。

## Project Notes

- 這是 Chrome Manifest V3 extension 專案。
- 主要程式在 `src/content.js`，樣式在 `src/content.css`，測試頁在 `test/mock-er-main.html`。
- 修改 DOM selector 或病摘/病歷擷取邏輯時，先查看 `docs/er-main-structure.md` 與 `docs/mrn-ioenote-structure.md`。
- 不要把真實病患資料、登入資訊、內網 token、cookie 或含識別資訊的截圖寫入 repo。
- 若需要範例資料，使用去識別化資料或 `test/` 裡的 mock HTML。
