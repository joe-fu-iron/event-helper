# AI 指揮官 CRAZY — Codex 接手任務

## 目標
直接完成 CRAZY 語音功能與既有 Google Apps Script 專案的同步，不要只提供教學。

## 既有正式 Apps Script 專案
- Script ID: `1rKzySEMcqme7ERc6fxgNz8YQ3HoGSR4vXIg1BogmH4mVf8_D-A9MXfCc`
- Apps Script 編輯器：`https://script.google.com/u/0/home/projects/1rKzySEMcqme7ERc6fxgNz8YQ3HoGSR4vXIg1BogmH4mVf8_D-A9MXfCc/edit`
- 不得建立新的 Apps Script 專案。
- 使用者負責 Google 登入／OAuth 授權；其餘盡量由 Codex 執行。

## GitHub
- Repo: `joe-fu-iron/event-helper`
- 語音頁已存在：`crazy-voice/index.html`
- GAS 修改說明已存在：`crazy-voice/GAS_PATCH.txt`
- 預期 Pages URL：`https://joe-fu-iron.github.io/event-helper/crazy-voice/`

## 必做
1. 在本機工作資料夾安裝或使用 `@google/clasp`。
2. 用 `clasp login` 完成 Google 授權；若需要使用者點登入，只在這一步要求操作。
3. 以既有 Script ID 建立/修正 `.clasp.json`，連接原 CRAZY Apps Script 專案。
4. Pull 目前 Apps Script 原始碼，保留現有 Sheets、Calendar、Tasks、Gmail、Drive、專案、缺漏掃描、每日摘要功能。
5. 修改 `Code.gs`：
   - `doGet(e)` 改為 HtmlTemplate。
   - 支援 `?cmd=`。
   - template 注入 `initialCommand`、`appUrl`、`voiceUrl`。
   - `voiceUrl` 使用 `https://joe-fu-iron.github.io/event-helper/crazy-voice/`。
   - 完全取消 CG 強制觸發。
6. 修改 `Index.html`：
   - 不再於 Apps Script iframe 內直接啟動 SpeechRecognition。
   - 語音按鈕改為開啟外部語音頁。
   - 收到 `INITIAL_COMMAND` 時自動填入指令框並執行 `apiRunCommand()`。
   - 移除舊 `voice()` / `not-allowed` 處理，避免兩套語音流程並存。
7. 檢查 `appsscript.json` scopes，保留目前必要權限。
8. `clasp push` 回原 Apps Script 專案。
9. 若現有 Web App deployment 可由 clasp/API 更新，建立新版本並更新原 deployment；若部署更新需要使用者在 Google UI 點一次，僅要求這一步，並提供精確點擊位置。
10. 檢查 GitHub Pages 是否能開啟；若工具可設定則直接設定，否則只要求使用者完成唯一必要的 Pages 設定。
11. 測試：
    - CRAZY 首頁載入成功，CORE ONLINE。
    - Sheets 正常。
    - Calendar 正常。
    - Gmail / Drive 正常。
    - Tasks 狀態可辨識。
    - 點「🎙️ 語音」可到獨立語音入口。
    - 說「查看今天行程」→ 返回 CRAZY → 自動執行。
    - 說「新增工作 測試 CRAZY 語音」→ 真正建立工作；若 Tasks API 尚未啟用，清楚指出 Google Cloud 中唯一要人工完成的啟用步驟。

## 驗收回報
完成後只需要回報：
- 修改檔案
- GitHub commit
- Apps Script push 結果
- CRAZY 正式 `/exec` 網址
- 語音入口網址
- 上述測試結果
- 尚需使用者親自完成的授權/部署步驟（如有）

## 執行原則
直接改、直接 push、直接測。不要把程式碼丟給使用者手動貼；只有 Google/GitHub 登入、OAuth 或平台明確禁止自動操作的步驟才停下來要求使用者操作。
