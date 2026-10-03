# Hololive RNG

霓虹星際街機風格的 Hololive 收藏抽卡網站，使用既有生誕祭 ICS 整理出 75 位角色資料。

## 功能

- 單抽與十連抽，依稀有度機率產生動態揭曉結果
- 角色圖鑑、已獲得／待解鎖篩選、搜尋與個別機率
- 收藏進度、稀有度統計、最稀有掉落與抽卡歷史
- 使用瀏覽器 localStorage 保存進度，支援確認後重置
- 桌面與手機響應式介面

## 本機預覽

```bash
python3 -m http.server 3000
```

接著開啟 `http://localhost:3000`。

> Fan-made interface. Hololive 角色名稱與生日資料整理自專案內的 `hololive-birthday-calendar.ics`。
