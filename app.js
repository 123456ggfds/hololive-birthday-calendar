const STORAGE_KEY = "hololive-rng-state-v1";

const TIERS = [
  { key: "mythic", label: "MYTHIC", zh: "神話", chance: 0.8, color: "#ff78bd", rank: 5 },
  { key: "legendary", label: "LEGENDARY", zh: "傳說", chance: 4, color: "#ffc36a", rank: 4 },
  { key: "epic", label: "EPIC", zh: "史詩", chance: 12, color: "#b99cff", rank: 3 },
  { key: "rare", label: "RARE", zh: "稀有", chance: 28, color: "#6fdbe8", rank: 2 },
  { key: "common", label: "COMMON", zh: "普通", chance: 55, color: "#9da3b5", rank: 1 },
];
const DEFAULT_STATE = { collection: {}, draws: 0, rarityCounts: {}, history: [], bestRank: 0, bestDrop: null, duplicateStreak: 0, maxDuplicateStreak: 0, newDiscoveries: 0 };
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

let members = [];
let tiersByKey = {};
let state = structuredClone(DEFAULT_STATE);
let activeFilter = "all";
let searchTerm = "";
let toastTimer;

function tierForIndex(index) {
  if (index % 19 === 0) return TIERS[0];
  if (index % 7 === 0) return TIERS[1];
  if (index % 4 === 0) return TIERS[2];
  if (index % 2 === 0) return TIERS[3];
  return TIERS[4];
}

function initials(member) {
  const words = member.english.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : member.english.slice(0, 2)).toUpperCase();
}

function tierForMember(member) { return tiersByKey[member.rarity]; }
function memberById(id) { return members.find((member) => member.id === id); }
function getCount(id) { return Number(state.collection[id] || 0); }
function ownedMembers() { return members.filter((member) => getCount(member.id) > 0); }
function formatChance(member) { return `${member.individualChance.toFixed(member.individualChance < 0.1 ? 3 : 2)}%`; }
function timeLabel(timestamp) { return new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) state = { ...structuredClone(DEFAULT_STATE), ...saved, rarityCounts: { ...saved.rarityCounts } };
  } catch (error) {
    console.warn("Unable to restore local progress", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = $("#saveStatus");
  if (status) status.textContent = "本機進度已保存";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function prepareMembers(rawMembers) {
  members = rawMembers.map((member, index) => {
    const tier = tierForIndex(index);
    return { ...member, rarity: tier.key };
  });
  tiersByKey = Object.fromEntries(TIERS.map((tier) => [tier.key, { ...tier, count: members.filter((member) => member.rarity === tier.key).length }]));
  members = members.map((member) => ({ ...member, individualChance: tierForMember(member).chance / tierForMember(member).count }));
}

function rollMember() {
  let cursor = Math.random() * 100;
  let chosenTier = TIERS[TIERS.length - 1];
  for (const tier of TIERS) {
    cursor -= tier.chance;
    if (cursor <= 0) { chosenTier = tier; break; }
  }
  const pool = members.filter((member) => member.rarity === chosenTier.key);
  return pool[Math.floor(Math.random() * pool.length)];
}

function performDraw() {
  const member = rollMember();
  const previousCount = getCount(member.id);
  const tier = tierForMember(member);
  state.collection[member.id] = previousCount + 1;
  state.draws += 1;
  state.rarityCounts[member.rarity] = Number(state.rarityCounts[member.rarity] || 0) + 1;
  if (previousCount === 0) {
    state.newDiscoveries += 1;
    state.duplicateStreak = 0;
  } else {
    state.duplicateStreak += 1;
    state.maxDuplicateStreak = Math.max(state.maxDuplicateStreak, state.duplicateStreak);
  }
  if (tier.rank > state.bestRank) {
    state.bestRank = tier.rank;
    state.bestDrop = member.id;
  }
  state.history.unshift({ id: member.id, rarity: member.rarity, timestamp: Date.now(), isNew: previousCount === 0 });
  state.history = state.history.slice(0, 20);
  return { member, isNew: previousCount === 0, count: previousCount + 1 };
}

function renderResult(draw, batch = []) {
  const { member, isNew, count } = draw;
  const tier = tierForMember(member);
  const card = $("#resultCard");
  const batchMarkup = batch.length > 1 ? `<div class="batch-results">${batch.map((item) => `<i class="batch-dot" style="--dot:${tierForMember(item.member).color}" title="${escapeHtml(item.member.name)}"></i>`).join("")}</div>` : "";
  card.style.setProperty("--rarity-color", tier.color);
  card.className = "result-card has-result reveal";
  card.innerHTML = `<div class="result-scanline"></div><div class="result-content"><div class="result-avatar" style="background:linear-gradient(145deg, ${tier.color}, #191b2b)">${initials(member)}</div><span class="result-rarity">${tier.label} · ${tier.zh}</span><strong class="result-name">${escapeHtml(member.name)}</strong><span class="result-en">${escapeHtml(member.english)}</span><span class="result-meta">個別機率 ${formatChance(member)} · ${member.birthday} 生誕</span><span class="${isNew ? "new-badge" : "repeat-badge"}">${isNew ? "✦ NEW DISCOVERY / 新訊號" : `DUPLICATE ×${count} / 重複收集`}</span>${batchMarkup}</div>`;
  void card.offsetWidth;
  card.classList.add("reveal");
  const burst = $("#rarityBurst");
  burst.style.boxShadow = `inset 0 0 70px ${tier.color}28`;
  burst.style.opacity = "1";
  setTimeout(() => { burst.style.opacity = "0"; }, 650);
}

function renderProgress() {
  const owned = ownedMembers().length;
  const percent = members.length ? (owned / members.length) * 100 : 0;
  $("#ownedCount").textContent = owned;
  $("#totalCount").textContent = members.length;
  $("#poolCount").textContent = members.length;
  $("#discoveredCount").textContent = state.newDiscoveries;
  $("#drawCount").textContent = state.draws;
  $("#progressPercent").textContent = `${percent.toFixed(1)}%`;
  $("#progressBar").style.width = `${percent}%`;
  $("#collectionSubline").textContent = `${owned} / ${members.length} 已解鎖`;
  $("#allTabCount").textContent = members.length;
  $("#ownedTabCount").textContent = owned;
  $("#missingTabCount").textContent = members.length - owned;
  $("#historyCount").textContent = `${state.history.length} / 20`;
}

function renderRaritySummary() {
  $("#raritySummary").innerHTML = TIERS.map((tier) => `<div class="rarity-row ${tier.key}"><i></i><span>${tier.label}</span><strong>${state.rarityCounts[tier.key] || 0}</strong></div>`).join("");
}

function renderHistory() {
  const list = $("#historyList");
  if (!state.history.length) {
    list.innerHTML = `<div class="history-empty"><span>◌</span><p>還沒有訊號<br />你的第一抽會出現在這裡</p></div>`;
    return;
  }
  list.innerHTML = state.history.map((entry) => {
    const member = memberById(entry.id);
    if (!member) return "";
    const tier = tierForMember(member);
    return `<div class="history-item"><div class="history-avatar" style="--item-color:${tier.color};background:linear-gradient(145deg,${tier.color},#1b1c2c)">${initials(member)}</div><div><div class="history-name">${escapeHtml(member.name)}</div><span class="history-time">${timeLabel(entry.timestamp)} ${entry.isNew ? "· NEW" : "· DUPLICATE"}</span></div><span class="history-rarity" style="--item-color:${tier.color}">${tier.label}</span></div>`;
  }).join("");
}

function renderCollection() {
  const query = searchTerm.toLowerCase();
  const filtered = members.filter((member) => {
    const owned = getCount(member.id) > 0;
    const matchFilter = activeFilter === "all" || (activeFilter === "owned" && owned) || (activeFilter === "missing" && !owned);
    const matchQuery = !query || member.name.toLowerCase().includes(query) || member.english.toLowerCase().includes(query);
    return matchFilter && matchQuery;
  });
  const grid = $("#collectionGrid");
  if (!filtered.length) {
    grid.innerHTML = `<div class="member-card empty-state">找不到符合條件的訊號，試試另一個名字。</div>`;
    return;
  }
  grid.innerHTML = filtered.map((member) => {
    const count = getCount(member.id);
    const owned = count > 0;
    const tier = tierForMember(member);
    return `<article class="member-card ${owned ? "owned" : "locked"}" style="--member-color:${tier.color}" title="${owned ? `${member.name} · 已收集 ${count} 次` : "尚未解鎖"}"><div class="member-top"><div class="member-avatar" style="background:linear-gradient(145deg,${tier.color},#191b2b)">${owned ? initials(member) : "?"}</div><span class="member-rarity">${tier.label}</span></div><div class="member-name">${owned ? escapeHtml(member.name) : "未解鎖訊號"}</div><div class="member-en">${owned ? escapeHtml(member.english) : "UNKNOWN / LOCKED"}</div><div class="member-footer"><span class="member-count">${owned ? `收集 <b>×${count}</b>` : "待探索"}</span><span class="member-odds">${formatChance(member)}</span></div></article>`;
  }).join("");
}

function renderStats() {
  const best = state.bestDrop ? memberById(state.bestDrop) : null;
  $("#bestDrop").textContent = best ? best.name : "—";
  $("#bestDropMeta").textContent = best ? `${tierForMember(best).label} · ${formatChance(best)} 個別機率` : "尚未鎖定";
  $("#duplicateStreak").textContent = state.maxDuplicateStreak;
  $("#efficiency").textContent = state.draws ? `${(state.newDiscoveries / state.draws * 10).toFixed(1)}` : "—";
  const max = Math.max(1, ...TIERS.map((tier) => Number(state.rarityCounts[tier.key] || 0)));
  $("#distribution").innerHTML = TIERS.slice().reverse().map((tier) => `<div class="distribution-item"><div class="distribution-bar" style="--dist-color:${tier.color};height:${Math.max(3, Number(state.rarityCounts[tier.key] || 0) / max * 19)}px"></div><span>${tier.label.slice(0, 3)} ${state.rarityCounts[tier.key] || 0}</span></div>`).join("");
}

function renderAll() {
  renderProgress();
  renderRaritySummary();
  renderHistory();
  renderCollection();
  renderStats();
}

function setBusy(isBusy) {
  $("#drawButton").disabled = isBusy;
  $("#tenButton").disabled = isBusy;
  $("#drawButton b").textContent = isBusy ? "掃描中…" : "抽取訊號";
}

function drawOnce() {
  setBusy(true);
  setTimeout(() => {
    const result = performDraw();
    saveState(); renderAll(); renderResult(result);
    setBusy(false);
    showToast(result.isNew ? `✦ 新成員解鎖：${result.member.name}` : `訊號重複：${result.member.name} ×${result.count}`);
  }, 520);
}

function drawTen() {
  setBusy(true);
  setTimeout(() => {
    const batch = Array.from({ length: 10 }, () => performDraw());
    const last = batch[batch.length - 1];
    saveState(); renderAll(); renderResult(last, batch);
    setBusy(false);
    const fresh = batch.filter((item) => item.isNew).length;
    showToast(`十連完成：${fresh ? `解鎖 ${fresh} 位新成員` : "這次全是重複訊號"}`);
  }, 680);
}

function resetProgress() {
  const confirmed = window.confirm("確定要重置全部收藏、統計與抽取紀錄嗎？這個動作無法復原。");
  if (!confirmed) return;
  state = structuredClone(DEFAULT_STATE);
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  $("#resultCard").className = "result-card empty";
  $("#resultCard").innerHTML = `<div class="result-scanline"></div><div class="result-placeholder"><span class="placeholder-star">✦</span><strong>READY TO ROLL</strong><small>按下抽取，啟動星圖掃描</small></div>`;
  showToast("進度已重置，星圖等待重新點亮。");
}

async function init() {
  try {
    const response = await fetch("./members.json");
    prepareMembers(await response.json());
    loadState();
    renderAll();
    $("#drawButton").addEventListener("click", drawOnce);
    $("#tenButton").addEventListener("click", drawTen);
    $("#resetButton").addEventListener("click", resetProgress);
    $("#scrollCollection").addEventListener("click", () => $("#collection").scrollIntoView({ behavior: "smooth" }));
    $("#searchInput").addEventListener("input", (event) => { searchTerm = event.target.value.trim(); renderCollection(); });
    document.querySelectorAll(".filter-tab").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active"); activeFilter = button.dataset.filter; renderCollection();
    }));
  } catch (error) {
    console.error(error);
    showToast("角色資料載入失敗，請重新整理頁面。");
  }
}

init();
