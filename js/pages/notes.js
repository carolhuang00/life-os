// 筆記：想法、參考資料、不需要行動的內容
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { PageHead, Empty, AreaTag } from '../components/ui.js';
import { todayKey, isoToKey, fmtShort } from '../lib/date.js';

export function NotesPage() {
  const { data } = useStore();
  const { openEditor } = useEditor();
  const today = todayKey();
  const list = [...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return html`<div class="page">
    <${PageHead} eyebrow="Notes" title="筆記" sub="不需要行動、但想留下來的想法與資料。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('note')}>新增筆記</button>`} />
    ${list.length
      ? html`<div class="someday-grid">${list.map((n) => html`<div class="someday-card note-card" key=${n.id} onClick=${() => openEditor('note', { id: n.id })}>
          <h3>${n.title}</h3>
          ${n.body && html`<p class="note-body">${n.body}</p>`}
          <div class="row gap-8 between"><${AreaTag} areaId=${n.areaId} small /><span class="muted small">${fmtShort(isoToKey(n.updatedAt), today)}</span></div>
        </div>`)}</div>`
      : html`<${Empty} title="還沒有筆記">Inbox 裡不需要行動的內容，可以轉成筆記保存。<//>`}
  </div>`;
}
