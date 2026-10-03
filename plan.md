# Hololive RNG — 實作計畫

## 產品定位
Hololive RNG 是一個把「抽卡的瞬間」做成主角的粉絲向收藏體驗：玩家可以單抽或十連抽，看到稀有掉落演出，並以圖鑑、統計與歷史紀錄持續累積收藏。角色資料取自專案既有的 Hololive 生誕祭 ICS，網站本身不依賴外部 API。

## 已確認範圍
- 主要抽取按鈕進行單次隨機抽卡，依角色設定的機率與稀有度產生結果。
- 動態揭曉動畫、稀有度色彩、特效與角色資訊。
- Hololive 角色收藏圖鑑，區分已獲得、未獲得、重複取得。
- 顯示每位角色的稀有度、個別掉落機率與收藏資訊。
- 顯示已收集角色數量、總數、完成百分比。
- 顯示總抽取、各稀有度數量、最稀有掉落。
- 依時間瀏覽抽取紀錄。
- 清晰的遊戲狀態區，顯示目前進度、最近結果與可執行操作。
- 使用瀏覽器 localStorage 保存收藏、統計與抽取紀錄，提供確認後重置。
- 桌面／手機響應式版面。

## 視覺與互動方向
- **Design Movement**：霓虹星際街機（neon celestial arcade），把深夜抽卡房與星圖控制台結合。
- **Core Principles**：結果先行、資訊可掃讀、稀有感有層次、每次操作都有回饋。
- **Color Philosophy**：墨藍黑作為宇宙底色，珊瑚粉是品牌記憶點；紫、青、金只在稀有度與狀態上出現，讓掉落顏色成為視覺語言。
- **Layout Paradigm**：非對稱三區控制台：左側進度與稀有度，中央是抽卡舞台，右側是即時紀錄；手機則依「舞台 → 狀態 → 圖鑑」垂直重排。
- **Signature Elements**：星塵十字光、細線星圖、膠囊狀機率標籤與大面積稀有度光暈。
- **Interaction Philosophy**：點擊不是表單提交，而是「啟動儀式」；抽卡按鈕會進入 charge／reveal 動畫，結果出現後立即更新圖鑑與統計。
- **Animation**：背景星點慢速漂移；抽卡時卡片短暫縮放、光暈掃過；高稀有度結果增加粒子與閃爍，但保留 reduced-motion 支援。
- **Typography System**：標題用 Space Grotesk，中文與內文用 Noto Sans TC；數字使用 Space Grotesk 的粗體 tabular-nums，形成儀表板節奏。
- **Brand Essence**：給 Hololive 粉絲的高回饋收藏抽卡台，讓每次「再一抽」都有星光理由。個性：俐落、閃耀、上癮。
- **Brand Voice**：短句、直接、帶一點太空電台感。例：「今天的星光，會落在哪位成員身上？」、「稀有訊號鎖定。把它收進圖鑑。」
- **Wordmark & Logo**：以 `H` 與四芒星疊成的「H★」訊號徽章，旁邊使用 `HOLO / RNG` 雙層字標。
- **Signature Brand Color**：Coral Signal `#ff6b9d`，用於主 CTA、選取狀態與關鍵連線。

## 技術方案
- 原生 HTML/CSS/JavaScript 靜態前端，避免無必要依賴。
- `members.json`：由既有 ICS 整理出的 75 位角色資料。
- `app.js`：抽卡演算法、狀態管理、localStorage、圖鑑篩選、統計與歷史。
- `styles.css`：霓虹星際街機視覺系統與響應式版面。
- `manus-routes.json`：首頁路由宣告。
- 以專案 runtime port 3000 啟動靜態服務，Preview 與公開網站使用相對路徑。

## 機率設計
- Mythic：0.8%
- Legendary：4%
- Epic：12%
- Rare：28%
- Common：55%

每次先依稀有度權重抽取，再從該稀有度角色池隨機選取；圖鑑中的「個別機率」顯示該稀有度機率除以同稀有度角色數量，便於理解。

## 專案結構
- `index.html`：語意化頁面骨架、導覽、抽卡舞台、圖鑑與統計區。
- `styles.css`：設計 token、版面、元件狀態、動畫與 mobile breakpoint。
- `app.js`：純前端狀態與事件邏輯。
- `members.json`：角色與生誕日資料。
- `manus-routes.json`：路由 manifest。
- `app.config.ts`：專案 logo metadata。
