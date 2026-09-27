# Life OS · 個人生活與目標管理工具

一個放在 GitHub Pages 上的個人 Dashboard。工作、生活、健康、學習、未來計畫，都放在同一個地方。

每次打開，30 秒內知道：

- 今天最值得做的是什麼（今日重點，最多 3 件）
- 這週有哪些事情需要注意（Deadline、該追蹤的等待事項）
- 我正在往哪些目標前進（目標進度）
- 最近的時間都花在哪些生活面向（生活分布）

---

## 一、部署到 GitHub Pages（不用安裝任何軟體）

這個工具不需要安裝 Node.js，也不需要「建置」。整個資料夾上傳就能用。

1. 登入 GitHub，右上角「+」→「New repository」
   - Repository name 例如 `life-os`
   - 選 **Public**（免費帳號的 GitHub Pages 需要公開儲存庫；資料不會外流，見下方「資料存在哪裡」）
   - 按「Create repository」
2. 在新儲存庫頁面點「uploading an existing file」
3. 把 `life-os` 資料夾**裡面的所有檔案與資料夾**（`index.html`、`css`、`js`、`favicon.svg`、`.nojekyll`、`README.md`）一起拖進去
   - 注意是拖「裡面的東西」，不是拖整個 `life-os` 資料夾，`index.html` 要在最外層
   - `.nojekyll` 是隱藏檔，Mac 在 Finder 按 `Command + Shift + .` 可以顯示；沒傳到也能正常運作
4. 按「Commit changes」
5. 到儲存庫的「Settings」→ 左側「Pages」
   - Source 選「Deploy from a branch」
   - Branch 選 `main`，資料夾選 `/ (root)`，按「Save」
6. 等 1～2 分鐘，重新整理 Pages 設定頁，上方會出現網址，例如：
   `https://你的帳號.github.io/life-os/`

打開網址就可以開始用。建議加入瀏覽器書籤，手機可以用「加入主畫面」。

### 之後要更新程式

在儲存庫頁面點「Add file」→「Upload files」，把修改過的檔案拖進去覆蓋，Commit 後等 1～2 分鐘即可。更新程式**不會**影響你已經存在瀏覽器裡的資料。

### 為什麼重新整理不會 404？

GitHub Pages 只認得實體檔案。這個工具的網址用 `#` 切換頁面（例如 `.../life-os/#/tasks`），伺服器永遠只讀 `index.html`，所以任何頁面重新整理、加書籤、分享連結都正常。不論儲存庫叫什麼名字都能用。

---

## 二、資料存在哪裡？

- 所有資料只存在**你目前使用的瀏覽器**（LocalStorage），不會上傳到任何伺服器，儲存庫公開也看不到你的資料
- 換電腦、換瀏覽器、清除瀏覽器資料時，資料不會跟著走
- **定期到「設定 → 匯出資料」下載備份 JSON**
- 在另一台裝置用「設定 → 匯入資料」即可搬過去，匯入前可選：
  - **合併資料**（建議）：保留目前資料，加入備份裡新的項目，同一筆資料以較新的版本為準
  - **覆蓋目前資料**：完全用備份取代（會再確認一次）

---

## 三、功能一覽

| 頁面 | 用途 |
|------|------|
| 今天 Today | 今日重點（最多 3 件）、溫和提醒、今天的安排、接下來 7 天、生活分布、目標進度、該追蹤的等待事項 |
| 收件匣 Inbox | 只填一行字就能記下；之後轉成任務、目標、計畫、筆記、Someday、等待事項，或封存、刪除 |
| 任務 Tasks | 快速新增、篩選（領域、優先級、狀態）、搜尋、排序；7 種狀態，「放棄」是正常狀態 |
| 目標 Goals | 本週／本月／季度／年度／長期；可以沒有目標日期；進度自動計算或手動設定；連續推進週數 |
| 計畫 Projects | 任何多步驟的事情（旅行、整理房間、論壇）；進度、下一件任務、相關等待事項 |
| 想做清單 Someday | 想去的地方、想學的、想買的、Side Project、靈感；沒有 Deadline；一鍵「開始進行」 |
| 每週回顧 Review | 這週完成了什麼（依領域）、還在路上的事、生活分布、下週 Focus（1～3 個）、可以放掉什麼 |
| 行事曆 | 今天／本週／本月的 Deadline、目標日期、Today 任務、預定事項、追蹤日期 |
| 等待中 | 等誰、等什麼、Follow-up 日期；到期提醒「這件事情可以追蹤了」 |
| 筆記 | 不需要行動的想法與資料 |
| 人生領域 | 新增、修改、刪除、排序，自訂名稱、icon、顏色 |
| 設定 | 淺色／深色／跟隨系統、提醒門檻、匯出匯入、清除示範資料、清除全部資料 |

全域功能：搜尋（`/` 或 `⌘K`）、快速記錄（`N` 或右下角 ＋）、刪除後可「復原」、深色模式會被記住。

### 資訊架構

```
人生領域 → 目標 → 計畫 → 任務 → 今天
```

- 任務可以直接屬於目標，也可以透過計畫間接屬於目標
- 任務沒設人生領域時，會自動跟隨所屬計畫或目標的領域
- 「加入今天」（Today Plan）和 Deadline 是兩件事：週五要交的文章，週三決定先做，它就會出現在今天

### 今日重點怎麼選？

每天第一次打開時，系統依以下因素打分，挑出最多 3 件（可以手動調整或按「重新建議」）：

逾期天數、Deadline 遠近、優先級（P0～P3）、是否已排入今天、是否進行中、是否會影響其他事情、所屬目標的時間範圍、擱置多久。

任何任務都可以從選單「設為今日重點」。

---

## 四、示範資料

第一次打開會放入跨領域的示範資料（工作、健康、生活、學習、旅行、家庭、財務、Someday、等待中），日期都以「今天」為基準推算。

熟悉之後到「設定 → 清除示範資料」，只會刪除示範資料，你自己新增的內容與人生領域都會保留。

---

## 五、技術說明（給之後要維護的人）

- **架構**：純前端，[Preact](https://preactjs.com/)（React 的輕量版，寫法相同）＋ [htm](https://github.com/developit/htm)（在瀏覽器直接寫類 JSX 語法），用瀏覽器原生 ES Modules 載入
- **不需要建置**：沒有 `package.json`、沒有 `npm install`，改完檔案直接上傳
- **外部依賴**：只有 Preact 與 htm，從 jsDelivr CDN 載入（版本鎖定在 `index.html` 的 import map）
- **路由**：Hash 路由（`js/lib/router.js`），完全相容 GitHub Pages
- **資料**：LocalStorage key `lifeos:v1`，結構與正規化在 `js/lib/storage.js`
- **本機預覽**：瀏覽器不允許直接雙擊 `index.html` 載入模組，需要用本機伺服器，例如在資料夾裡執行 `python3 -m http.server 8000`，再打開 `http://localhost:8000`

### 資料夾結構

```
life-os/
├── index.html              入口、import map、主題預載
├── favicon.svg
├── .nojekyll               告訴 GitHub Pages 不要用 Jekyll 處理
├── css/style.css           全部樣式（顏色變數、深色模式、手機版）
└── js/
    ├── app.js              入口：組合 Provider 與頁面路由
    ├── store.js            全域資料狀態，所有新增／修改／刪除都經過這裡並自動存檔
    ├── lib/
    │   ├── constants.js    狀態、優先級、目標時間範圍、預設人生領域
    │   ├── date.js         日期計算（本地時間 YYYY-MM-DD）
    │   ├── storage.js      LocalStorage、資料正規化、匯入合併、清除示範資料
    │   ├── demo.js         示範資料
    │   ├── insights.js     判斷邏輯：今日重點評分、生活分布、提醒、回饋、進度
    │   ├── router.js       Hash 路由
    │   ├── html.js         htm 綁定
    │   └── util.js         小工具
    ├── components/
    │   ├── layout.js       側邊導航、手機底部導航、快速記錄
    │   ├── ui.js           Modal、提示、確認框、選單、標籤、進度條
    │   ├── forms.js        任務／目標／計畫／Someday／等待／筆記／領域表單
    │   ├── editor.js       全域編輯器（任何頁面都能打開表單）
    │   ├── TaskRow.js      任務列與任務動作
    │   ├── search.js       全域搜尋
    │   ├── widgets.js      生活分布、目標進度小元件
    │   └── icons.js        線條圖示
    └── pages/              各頁面（today、inbox、tasks、goals、projects、someday、
                            review、calendar、waiting、notes、areas、settings）
```

### LocalStorage 資料結構

```js
{
  version: 1,
  areas:    [{ id, name, icon, color, order }],
  goals:    [{ id, title, areaId, horizon: 'week|month|quarter|year|long', why, startDate, targetDate,
               status: 'active|paused|done|dropped', progressMode: 'auto|manual', progress, createdAt, updatedAt }],
  projects: [{ id, title, areaId, goalId, description, startDate, dueDate,
               status: 'planning|active|paused|done|dropped', progressMode, progress, createdAt, updatedAt }],
  tasks:    [{ id, title, areaId, goalId, projectId, priority: 'P0|P1|P2|P3|', 
               status: 'todo|doing|waiting|done|deferred|paused|dropped',
               createdAt, updatedAt, startDate, dueDate, plannedDate, estimate, nextAction, notes, tags: [],
               todayDate, completedAt, blocksOthers }],
  inbox:    [{ id, text, archived, createdAt, updatedAt }],
  someday:  [{ id, title, category: 'place|learn|buy|side|plan|idea|other', areaId, notes, createdAt }],
  waiting:  [{ id, what, who, since, followUp, taskId, projectId, notes, status: 'waiting|done', doneAt }],
  notes:    [{ id, title, body, areaId, createdAt, updatedAt }],
  dayPlans: { 'YYYY-MM-DD': { focusIds: [], manual: [] } },       // 每天的今日重點
  reviews:  { 'YYYY-MM-DD(週一)': { focus: [{ type, id, title }], note } },  // 該週的 Focus 與回顧
  settings: { theme: 'light|dark|system', inboxThreshold, todayThreshold, staleDays, welcomeDismissed }
}
```

日期欄位一律是本地時間的 `YYYY-MM-DD` 字串；`createdAt`、`updatedAt`、`completedAt` 是 ISO 時間。示範資料多一個 `demo: true` 欄位。

---

## 六、第一版刻意不做的事

登入、帳號、後端資料庫、社群、團隊協作、AI API、Google Calendar、複雜通知、訂閱、遊戲化與積分。先把個人每天使用的體驗做好。
