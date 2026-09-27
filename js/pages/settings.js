// 設定：主題、提醒門檻、資料備份（匯出／匯入）、示範資料
import { useRef } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useUI, PageHead, Segmented } from '../components/ui.js';
import { Icon } from '../components/icons.js';
import { downloadFile } from '../lib/util.js';
import { todayKey } from '../lib/date.js';
import { isValidBackup, COLLECTIONS } from '../lib/storage.js';
import { STORAGE_KEY } from '../lib/constants.js';

export function SettingsPage() {
  const store = useStore();
  const { data } = store;
  const ui = useUI();
  const fileRef = useRef();
  const s = data.settings;
  const demoCount = COLLECTIONS.reduce((n, c) => n + data[c].filter((x) => x.demo).length, 0);
  const total = COLLECTIONS.filter((c) => c !== 'areas').reduce((n, c) => n + data[c].length, 0);
  let size = 0;
  try { size = (localStorage.getItem(STORAGE_KEY) || '').length; } catch (e) {}

  const exportData = () => {
    const payload = { app: 'life-os', exportedAt: new Date().toISOString(), ...data };
    downloadFile(`life-os-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2));
    ui.toast('已下載備份檔');
  };

  const onFile = async (e) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch (err) {
      return ui.confirm({ title: '無法讀取這個檔案', message: '檔案不是有效的 JSON 格式。請選擇從這個工具匯出的備份檔。', confirmText: '好' });
    }
    if (!isValidBackup(raw)) {
      return ui.confirm({ title: '這不像是 Life OS 的備份檔', message: '找不到任務、目標等資料。請選擇從「匯出資料」下載的 JSON 檔。', confirmText: '好' });
    }
    const n = COLLECTIONS.filter((c) => c !== 'areas').reduce((k, c) => k + (Array.isArray(raw[c]) ? raw[c].length : 0), 0);
    const choice = await ui.choose({
      title: '要怎麼匯入？',
      message: `備份檔裡有 ${n} 筆資料（不含人生領域）。目前這裡有 ${total} 筆。`,
      options: [
        { value: 'merge', label: '合併資料（建議）', hint: '保留目前資料，加入備份裡新的項目；同一筆資料以較新的版本為準。' },
        { value: 'replace', label: '覆蓋目前資料', hint: '目前的資料會被備份檔完全取代。建議先匯出一份目前的資料。', danger: true },
      ],
    });
    if (!choice) return;
    if (choice === 'replace') {
      const ok = await ui.confirm({ title: '確定要覆蓋嗎？', message: '目前的所有資料會被取代，這個動作無法復原。', confirmText: '覆蓋', danger: true });
      if (!ok) return;
      store.replaceAll(raw);
      ui.toast('已用備份檔覆蓋資料');
    } else {
      const r = store.mergeIn(raw);
      ui.toast(`合併完成：新增 ${r.added} 筆，更新 ${r.updated} 筆`);
    }
  };

  const clearDemo = async () => {
    const ok = await ui.confirm({ title: '清除示範資料？', message: `會刪除 ${demoCount} 筆示範用的目標、計畫、任務等。你自己新增的資料和人生領域都會保留。`, confirmText: '清除示範資料' });
    if (!ok) return;
    store.clearDemo();
    store.setSettings({ welcomeDismissed: true });
    ui.toast('示範資料已清除，開始建立你自己的生活系統吧');
  };

  const clearAll = async () => {
    const ok = await ui.confirm({ title: '清除全部資料？', message: '所有任務、目標、計畫、Inbox、筆記都會被刪除，人生領域會恢復預設。這個動作無法復原，建議先匯出備份。', confirmText: '全部清除', danger: true });
    if (!ok) return;
    store.clearAll();
    ui.toast('已清除全部資料');
  };

  const num = (k, min, max) => html`<input type="number" class="num-input" min=${min} max=${max} value=${s[k]}
    onChange=${(e) => { const v = Math.max(min, Math.min(max, Number(e.currentTarget.value) || min)); store.setSettings({ [k]: v }); }} />`;

  return html`<div class="page narrow">
    <${PageHead} eyebrow="Settings" title="設定" />

    <section class="card">
      <div class="card-head"><h2>外觀</h2></div>
      <div class="setting-row">
        <div><strong>主題</strong><p class="muted small">會記住你的選擇。</p></div>
        <${Segmented} size="small" value=${s.theme} onChange=${(v) => store.setSettings({ theme: v })} options=${[{ id: 'light', label: '淺色' }, { id: 'dark', label: '深色' }, { id: 'system', label: '跟隨系統' }]} />
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>提醒</h2></div>
      <div class="setting-row"><div><strong>Today 排太多的提醒</strong><p class="muted small">今天的安排超過幾件時，溫和提醒一下。</p></div>${num('todayThreshold', 3, 30)}</div>
      <div class="setting-row"><div><strong>Inbox 累積提醒</strong><p class="muted small">Inbox 超過幾則時提醒整理。</p></div>${num('inboxThreshold', 3, 50)}</div>
      <div class="setting-row"><div><strong>「一陣子沒動」的天數</strong><p class="muted small">任務或目標超過幾天沒有推進，會建議拆小、延後或放棄。</p></div>${num('staleDays', 7, 90)}</div>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>資料備份</h2><p class="muted small">資料只存在這個瀏覽器裡（LocalStorage）。換電腦、清除瀏覽器資料之前，記得先匯出。</p></div></div>
      <div class="setting-row">
        <div><strong>匯出資料</strong><p class="muted small">把所有資料下載成一個 JSON 檔。</p></div>
        <button class="btn ghost" onClick=${exportData}><${Icon} name="download" size=${16} /> 匯出</button>
      </div>
      <div class="setting-row">
        <div><strong>匯入資料</strong><p class="muted small">匯入前會讓你選擇「合併」或「覆蓋」。</p></div>
        <button class="btn ghost" onClick=${() => fileRef.current?.click()}><${Icon} name="upload" size=${16} /> 匯入</button>
        <input ref=${fileRef} type="file" accept="application/json,.json" hidden onChange=${onFile} />
      </div>
      <p class="muted small">目前共 ${total} 筆資料，約 ${(size / 1024).toFixed(1)} KB。${!store.saveOk ? ' 注意：最近一次儲存失敗，瀏覽器可能停用了儲存空間。' : ''}</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>示範資料</h2></div>
      <div class="setting-row">
        <div><strong>清除示範資料</strong><p class="muted small">${demoCount ? `目前有 ${demoCount} 筆示範資料。只會刪除示範資料。` : '目前沒有示範資料。'}</p></div>
        <button class="btn ghost" disabled=${!demoCount} onClick=${clearDemo}>清除</button>
      </div>
      <div class="setting-row">
        <div><strong>重新載入示範資料</strong><p class="muted small">想再看一次範例時使用，不會影響你自己的資料。</p></div>
        <button class="btn ghost" onClick=${() => { store.loadDemo(); ui.toast('已載入示範資料'); }}>載入</button>
      </div>
      <div class="setting-row">
        <div><strong class="danger-text">清除全部資料</strong><p class="muted small">重新開始。無法復原。</p></div>
        <button class="btn ghost danger-text" onClick=${clearAll}>全部清除</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>鍵盤快捷鍵</h2></div>
      <div class="shortcut-list">
        <span><kbd>N</kbd> 快速記下一件事</span>
        <span><kbd>/</kbd> 或 <kbd>⌘K</kbd> 搜尋</span>
        <span><kbd>Esc</kbd> 關閉視窗</span>
      </div>
    </section>
    <p class="muted small center pad">Life OS · 資料只存在你的裝置，不會上傳到任何伺服器。</p>
  </div>`;
}
