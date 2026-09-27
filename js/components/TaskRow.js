// 任務列：勾選完成、加入今天、更多動作
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useUI, Menu, AreaTag } from './ui.js';
import { useEditor } from './editor.js';
import { useUndoableRemove } from './forms.js';
import { Icon } from './icons.js';
import { cx, fmtMinutes } from '../lib/util.js';
import { relDue, todayKey, fmtShort, addDays } from '../lib/date.js';
import { taskAreaId, suggestFocus } from '../lib/insights.js';
import { TASK_STATUS_LABEL } from '../lib/constants.js';

export function useTaskActions() {
  const store = useStore();
  const ui = useUI();
  const removeUndo = useUndoableRemove();
  const today = todayKey();

  const plan = () => store.data.dayPlans[today] || { focusIds: [], manual: [] };

  return {
    complete(t, done = t.status !== 'done') {
      const prev = t.status;
      store.completeTask(t.id, done);
      if (done) ui.toast(`完成「${t.title}」`, { action: { label: '復原', run: () => store.update('tasks', t.id, { status: prev }) } });
    },
    toggleToday(t) {
      const on = store.toggleToday(t.id);
      ui.toast(on ? '已加入今天' : '已移出今天');
    },
    addFocus(t) {
      const p = plan();
      if (p.focusIds.includes(t.id)) return ui.toast('已經是今日重點了');
      const active = p.focusIds.filter((id) => store.idx.tasks[id] && store.idx.tasks[id].status !== 'dropped');
      if (active.length >= 3) return ui.toast('今日重點最多 3 件，可以先移除一件再加入。');
      store.setDayPlan(today, { focusIds: [...active, t.id], manual: [...(p.manual || []), t.id] });
      if (t.todayDate !== today) store.update('tasks', t.id, { todayDate: today });
      ui.toast('已設為今日重點');
    },
    removeFocus(t) {
      const p = plan();
      store.setDayPlan(today, { focusIds: p.focusIds.filter((id) => id !== t.id), manual: (p.manual || []).filter((id) => id !== t.id) });
    },
    refreshFocus() {
      const p = plan();
      const keep = p.focusIds.filter((id) => {
        const t = store.idx.tasks[id];
        return t && (t.status === 'done' || (p.manual || []).includes(id));
      });
      store.setDayPlan(today, { focusIds: suggestFocus(store.data, store.idx, today, keep) });
    },
    setStatus(t, status, text) {
      const prev = t.status;
      const patch = { status };
      if (status !== 'todo' && status !== 'doing') patch.todayDate = t.todayDate === today ? '' : t.todayDate;
      store.update('tasks', t.id, patch);
      ui.toast(text || `已標記為「${TASK_STATUS_LABEL[status]}」`, { action: { label: '復原', run: () => store.update('tasks', t.id, { status: prev, todayDate: t.todayDate }) } });
    },
    tomorrow(t) {
      store.update('tasks', t.id, { todayDate: addDays(today, 1) });
      ui.toast('已改到明天');
    },
    keep(t) {
      store.update('tasks', t.id, {});
      ui.toast('好，先保留');
    },
    remove(t) {
      removeUndo('tasks', t.id, `已刪除「${t.title}」`);
    },
  };
}

export function TaskMeta({ t, hideArea = false, hideProject = false }) {
  const { idx } = useStore();
  const today = todayKey();
  const due = relDue(t.dueDate, today);
  const project = idx.projects[t.projectId];
  const goal = idx.goals[t.goalId] || (project && idx.goals[project.goalId]);
  const areaId = taskAreaId(t, idx);
  const bits = [];
  if (!hideArea && areaId) bits.push(html`<${AreaTag} areaId=${areaId} small />`);
  if (!hideProject && project) bits.push(html`<a class="meta-link" href=${`#/projects/${project.id}`} onClick=${(e) => e.stopPropagation()}>${project.title}</a>`);
  else if (!hideProject && goal) bits.push(html`<a class="meta-link" href=${`#/goals/${goal.id}`} onClick=${(e) => e.stopPropagation()}>${goal.title}</a>`);
  if (due && t.status !== 'done') bits.push(html`<span class=${cx('due', due.tone)}>${due.text}</span>`);
  if (t.priority && t.status !== 'done') bits.push(html`<span class=${cx('prio', t.priority)}>${t.priority}</span>`);
  if (t.estimate) bits.push(html`<span class="muted">${fmtMinutes(t.estimate)}</span>`);
  if (!['todo', 'done'].includes(t.status)) bits.push(html`<span class=${cx('status-pill', t.status)}>${TASK_STATUS_LABEL[t.status]}</span>`);
  if (t.tags?.length) bits.push(html`<span class="muted">${t.tags.map((x) => '#' + x).join(' ')}</span>`);
  return bits.length ? html`<div class="task-meta">${bits}</div>` : null;
}

export function TaskRow({ task: t, hideArea, hideProject, showNext = false, extraMenu = [], showToday = true }) {
  const { openEditor } = useEditor();
  const act = useTaskActions();
  const today = todayKey();
  const done = t.status === 'done';
  const dropped = t.status === 'dropped';
  const inToday = t.todayDate === today;

  const menu = [
    { label: '編輯', onClick: () => openEditor('task', { id: t.id }) },
    !done && !dropped && { label: '設為今日重點', onClick: () => act.addFocus(t) },
    !done && !dropped && inToday && { label: '改到明天', onClick: () => act.tomorrow(t) },
    t.status !== 'doing' && !done && { label: '標記進行中', onClick: () => act.setStatus(t, 'doing') },
    t.status !== 'waiting' && !done && { label: '標記等待中', onClick: () => act.setStatus(t, 'waiting') },
    t.status !== 'deferred' && !done && { label: '延後', onClick: () => act.setStatus(t, 'deferred', '已延後，之後想做再拿出來') },
    t.status !== 'paused' && !done && { label: '暫停', onClick: () => act.setStatus(t, 'paused') },
    ['deferred', 'paused', 'waiting', 'dropped'].includes(t.status) && { label: '恢復為待處理', onClick: () => act.setStatus(t, 'todo', '已恢復為待處理') },
    ...extraMenu,
    '-',
    !dropped && !done && { label: '放棄這件事', onClick: () => act.setStatus(t, 'dropped', '已放棄。不做也是一種決定。') },
    { label: '刪除', danger: true, onClick: () => act.remove(t) },
  ];

  return html`<div class=${cx('task-row', done && 'is-done', dropped && 'is-dropped')} onClick=${() => openEditor('task', { id: t.id })}>
    <button type="button" class=${cx('check', done && 'on')} aria-label=${done ? '標記為未完成' : '標記完成'} onClick=${(e) => { e.stopPropagation(); act.complete(t); }}>
      ${done && html`<${Icon} name="check" size=${14} />`}
    </button>
    <div class="task-main">
      <div class="task-title">${t.title}</div>
      ${showNext && t.nextAction && !done && html`<div class="task-next">下一步：${t.nextAction}</div>`}
      <${TaskMeta} t=${t} hideArea=${hideArea} hideProject=${hideProject} />
    </div>
    <div class="task-actions" onClick=${(e) => e.stopPropagation()}>
      ${showToday && !done && !dropped && html`<button type="button" class=${cx('icon-btn today-btn', inToday && 'on')} title=${inToday ? '移出今天' : '加入今天'} aria-label=${inToday ? '移出今天' : '加入今天'} onClick=${() => act.toggleToday(t)}><${Icon} name="sun" /></button>`}
      <${Menu} items=${menu} />
    </div>
  </div>`;
}

export function TaskList({ tasks, empty, ...rest }) {
  if (!tasks.length) return empty || null;
  return html`<div class="task-list">${tasks.map((t) => html`<${TaskRow} key=${t.id} task=${t} ...${rest} />`)}</div>`;
}
