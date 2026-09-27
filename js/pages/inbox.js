// Inbox：先記下來，之後再整理
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { useUI, PageHead, QuickInput, Empty, Menu, Collapse } from '../components/ui.js';
import { useUndoableRemove } from '../components/forms.js';
import { Icon } from '../components/icons.js';
import { todayKey, isoToKey, relDay, parseLooseDate, fmtShort } from '../lib/date.js';

export function InboxPage() {
  const store = useStore();
  const { data } = store;
  const { openEditor } = useEditor();
  const ui = useUI();
  const removeUndo = useUndoableRemove();
  const today = todayKey();
  const items = data.inbox.filter((i) => !i.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const archived = data.inbox.filter((i) => i.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // 轉換：打開對應表單，儲存後才把 Inbox 項目移除
  const convert = (item, type) => {
    const text = item.text.trim();
    const due = parseLooseDate(text, today);
    const initial = {
      task: { title: text, dueDate: due },
      goal: { title: text },
      project: { title: text, dueDate: due },
      note: { title: text },
      someday: { title: text },
      waiting: { what: text },
    }[type];
    openEditor(type, {
      initial,
      onSaved: () => {
        store.remove('inbox', item.id);
        ui.toast('已整理完成');
      },
    });
  };

  const archive = (item, on = true) => {
    store.update('inbox', item.id, { archived: on });
    ui.toast(on ? '已封存' : '已放回 Inbox', on ? { action: { label: '復原', run: () => store.update('inbox', item.id, { archived: false }) } } : {});
  };

  return html`<div class="page">
    <${PageHead} eyebrow="Inbox" title="收件匣" sub="腦中想到什麼就先丟進來。分類、日期、目標都可以晚點再決定。" />

    <${QuickInput} placeholder="例如：回 Joy、牙醫預約、想去日本…" buttonLabel="記下" autoFocus=${true} onSubmit=${(v) => store.add('inbox', { text: v })} />

    ${items.length > data.settings.inboxThreshold && html`<p class="soft-note">Inbox 累積了 ${items.length} 則。不用一次整理完，挑幾則轉成任務，或直接封存就好。</p>`}

    ${!items.length
      ? html`<${Empty} title="Inbox 是空的">想到事情時，按右下角的 ＋ 或鍵盤 <kbd>N</kbd>，隨時記下來。<//>`
      : html`<div class="inbox-list">
          ${items.map((item) => {
            const due = parseLooseDate(item.text, today);
            return html`<div class="inbox-item" key=${item.id}>
              <div class="inbox-text">
                <div>${item.text}</div>
                <div class="muted small">${relDay(isoToKey(item.createdAt), today)}記下${due ? ` · 看起來跟 ${fmtShort(due, today)} 有關` : ''}</div>
              </div>
              <div class="inbox-actions">
                <button class="btn soft small" onClick=${() => convert(item, 'task')}>轉成任務</button>
                <${Menu} label="整理方式" items=${[
                  { label: '轉成目標', onClick: () => convert(item, 'goal') },
                  { label: '轉成計畫', onClick: () => convert(item, 'project') },
                  { label: '轉成筆記', onClick: () => convert(item, 'note') },
                  { label: '放進 Someday', onClick: () => convert(item, 'someday') },
                  { label: '轉成等待事項', onClick: () => convert(item, 'waiting') },
                  '-',
                  { label: '封存', onClick: () => archive(item) },
                  { label: '刪除', danger: true, onClick: () => removeUndo('inbox', item.id) },
                ]} />
              </div>
            </div>`;
          })}
        </div>`}

    ${archived.length > 0 && html`<div class="section-gap"><${Collapse} title="已封存" count=${archived.length}>
      ${archived.map((item) => html`<div class="carry-row" key=${item.id}>
        <span class="carry-title muted">${item.text}</span>
        <span class="row gap-4">
          <button class="btn ghost small" onClick=${() => archive(item, false)}>放回 Inbox</button>
          <button class="icon-btn subtle" aria-label="刪除" onClick=${() => removeUndo('inbox', item.id)}><${Icon} name="trash" size=${16} /></button>
        </span>
      </div>`)}
    <//></div>`}
  </div>`;
}
