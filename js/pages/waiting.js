// 等待中：不是我要做，而是在等別人
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { useUI, PageHead, Empty, Menu, Collapse } from '../components/ui.js';
import { useUndoableRemove } from '../components/forms.js';
import { cx } from '../lib/util.js';
import { todayKey, addDays, diffDays, fmtShort, relDay, nowISO } from '../lib/date.js';

function WaitingRow({ w }) {
  const store = useStore();
  const { idx } = store;
  const { openEditor } = useEditor();
  const ui = useUI();
  const removeUndo = useUndoableRemove();
  const today = todayKey();
  const due = w.status === 'waiting' && w.followUp && w.followUp <= today;
  const days = w.since ? diffDays(today, w.since) : null;
  const task = idx.tasks[w.taskId];
  const project = idx.projects[w.projectId];
  const done = () => {
    store.update('waiting', w.id, { status: 'done', doneAt: nowISO() });
    ui.toast('已經等到了', { action: { label: '復原', run: () => store.update('waiting', w.id, { status: 'waiting', doneAt: '' }) } });
  };
  const snooze = (n) => {
    store.update('waiting', w.id, { followUp: addDays(today, n) });
    ui.toast(`${n} 天後再提醒`);
  };
  return html`<div class=${cx('waiting-row', due && 'is-due', w.status === 'done' && 'is-done')} onClick=${() => openEditor('waiting', { id: w.id })}>
    <div class="waiting-main">
      <div class="task-title">${w.what}</div>
      <div class="task-meta">
        ${w.who && html`<span>等 ${w.who}</span>`}
        ${days != null && w.status === 'waiting' && html`<span class="muted">${days === 0 ? '今天開始等' : `已等 ${days} 天`}</span>`}
        ${w.followUp && w.status === 'waiting' && html`<span class=${cx(due ? 'due today' : 'muted')}>${due ? '可以追蹤了' : `${relDay(w.followUp, today)}追蹤`}</span>`}
        ${task && html`<span class="muted">任務：${task.title}</span>`}
        ${project && html`<a class="meta-link" href=${`#/projects/${project.id}`} onClick=${(e) => e.stopPropagation()}>${project.title}</a>`}
      </div>
    </div>
    <div class="task-actions" onClick=${(e) => e.stopPropagation()}>
      ${w.status === 'waiting' && html`<button class="btn soft small" onClick=${done}>等到了</button>`}
      <${Menu} items=${[
        w.status === 'waiting' && { label: '3 天後再提醒', onClick: () => snooze(3) },
        w.status === 'waiting' && { label: '一週後再提醒', onClick: () => snooze(7) },
        w.status === 'done' && { label: '還在等', onClick: () => store.update('waiting', w.id, { status: 'waiting', doneAt: '' }) },
        { label: '編輯', onClick: () => openEditor('waiting', { id: w.id }) },
        '-',
        { label: '刪除', danger: true, onClick: () => removeUndo('waiting', w.id) },
      ]} />
    </div>
  </div>`;
}

export function WaitingPage() {
  const { data } = useStore();
  const { openEditor } = useEditor();
  const today = todayKey();
  const active = data.waiting.filter((w) => w.status === 'waiting');
  const due = active.filter((w) => w.followUp && w.followUp <= today).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const later = active.filter((w) => !(w.followUp && w.followUp <= today)).sort((a, b) => (a.followUp || '9999').localeCompare(b.followUp || '9999'));
  const done = data.waiting.filter((w) => w.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  return html`<div class="page">
    <${PageHead} eyebrow="Waiting" title="等待中" sub="等客戶、等朋友、等包裹。到了 Follow-up 日期會提醒你可以追蹤。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('waiting')}>新增等待事項</button>`} />
    ${!active.length && !done.length && html`<${Empty} title="目前沒有在等的事情">交出去的事情、在等回覆的事情，可以記在這裡，腦袋就不用一直掛著。<//>`}
    ${due.length > 0 && html`<section class="task-group"><h3 class="group-title">這件事情可以追蹤了<span class="muted">${due.length}</span></h3>
      <div class="task-list">${due.map((w) => html`<${WaitingRow} key=${w.id} w=${w} />`)}</div></section>`}
    ${later.length > 0 && html`<section class="task-group"><h3 class="group-title">還在等<span class="muted">${later.length}</span></h3>
      <div class="task-list">${later.map((w) => html`<${WaitingRow} key=${w.id} w=${w} />`)}</div></section>`}
    ${done.length > 0 && html`<div class="section-gap"><${Collapse} title="已經等到" count=${done.length}>
      <div class="task-list">${done.map((w) => html`<${WaitingRow} key=${w.id} w=${w} />`)}</div>
    <//></div>`}
  </div>`;
}
