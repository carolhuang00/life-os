// 任務：快速新增、篩選、搜尋
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { PageHead, QuickInput, Empty, Segmented, Collapse } from '../components/ui.js';
import { TaskList } from '../components/TaskRow.js';
import { setQuery } from '../lib/router.js';
import { includesText } from '../lib/util.js';
import { todayKey, addDays } from '../lib/date.js';
import { isOpen, taskAreaId, taskGoalId, scoreTask } from '../lib/insights.js';
import { PRIORITIES, PRIORITY_RANK, TASK_STATUS } from '../lib/constants.js';

const VIEWS = [
  { id: 'open', label: '未完成' },
  { id: 'today', label: '今天' },
  { id: 'soon', label: '即將到期' },
  { id: 'overdue', label: '逾期' },
  { id: 'done', label: '已完成' },
  { id: 'all', label: '全部' },
];

const GROUPS = [
  { id: 'doing', label: '進行中' },
  { id: 'todo', label: '待處理' },
  { id: 'waiting', label: '等待中' },
  { id: 'deferred', label: '延後' },
  { id: 'paused', label: '暫停' },
];

export function TasksPage({ query }) {
  const store = useStore();
  const { data, idx } = store;
  const { openEditor } = useEditor();
  const today = todayKey();
  const view = query.view || 'open';
  const area = query.area || '';
  const prio = query.prio || '';
  const status = query.status || '';
  const q = query.q || '';
  const sort = query.sort || 'smart';

  const matchView = (t) => {
    switch (view) {
      case 'today': return isOpen(t) && (t.todayDate === today || t.dueDate === today);
      case 'soon': return isOpen(t) && t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 7);
      case 'overdue': return isOpen(t) && t.dueDate && t.dueDate < today;
      case 'done': return t.status === 'done';
      case 'all': return true;
      default: return isOpen(t);
    }
  };

  let list = data.tasks.filter(matchView)
    .filter((t) => !area || (area === '_none' ? !taskAreaId(t, idx) : taskAreaId(t, idx) === area))
    .filter((t) => !prio || (prio === '_none' ? !t.priority : t.priority === prio))
    .filter((t) => !status || t.status === status)
    .filter((t) => !q || [t.title, t.notes, t.nextAction, t.tags.join(' '), idx.projects[t.projectId]?.title, idx.goals[taskGoalId(t, idx)]?.title].some((x) => includesText(x, q)));

  const byDue = (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  const sorters = {
    smart: (a, b) => (scoreTask(b, idx, today)?.score ?? -1) - (scoreTask(a, idx, today)?.score ?? -1) || byDue(a, b),
    due: (a, b) => byDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  if (view === 'done') list.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  else list.sort(sorters[sort] || sorters.smart);

  const counts = {
    today: data.tasks.filter((t) => isOpen(t) && (t.todayDate === today || t.dueDate === today)).length,
    overdue: data.tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate < today).length,
  };
  const areas = [...data.areas].sort((a, b) => a.order - b.order);
  const filtered = area || prio || status || q;
  const dropped = view === 'open' ? data.tasks.filter((t) => t.status === 'dropped') : [];

  const quickAdd = (v) => {
    const init = {};
    if (area && area !== '_none') init.areaId = area;
    if (prio && prio !== '_none') init.priority = prio;
    if (view === 'today') init.todayDate = today;
    if (view === 'soon' || view === 'overdue') init.dueDate = today;
    store.add('tasks', { title: v, ...init });
  };

  const grouped = view === 'open' && sort === 'smart' && !status;

  return html`<div class="page">
    <${PageHead} eyebrow="Tasks" title="任務" sub="只需要名稱就能新增，其他細節之後再補。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('task', { initial: area && area !== '_none' ? { areaId: area } : {} })}>新增任務</button>`} />

    <${QuickInput} placeholder="快速新增任務，按 Enter" onSubmit=${quickAdd} autoFocus=${true} />

    <div class="filters">
      <${Segmented} value=${view} onChange=${(v) => setQuery({ view: v === 'open' ? '' : v })}
        options=${VIEWS.map((v) => ({ ...v, count: counts[v.id] }))} />
      <div class="filter-row">
        <input class="filter-search" type="search" placeholder="搜尋任務" value=${q} onInput=${(e) => setQuery({ q: e.currentTarget.value })} aria-label="搜尋任務" />
        <select value=${area} onChange=${(e) => setQuery({ area: e.currentTarget.value })} aria-label="人生領域">
          <option value="">所有領域</option>
          ${areas.map((a) => html`<option value=${a.id}>${a.icon} ${a.name}</option>`)}
          <option value="_none">未分類</option>
        </select>
        <select value=${prio} onChange=${(e) => setQuery({ prio: e.currentTarget.value })} aria-label="優先級">
          <option value="">所有優先級</option>
          ${PRIORITIES.map((p) => html`<option value=${p.id}>${p.label}</option>`)}
          <option value="_none">未設定</option>
        </select>
        <select value=${status} onChange=${(e) => setQuery({ status: e.currentTarget.value })} aria-label="狀態">
          <option value="">所有狀態</option>
          ${TASK_STATUS.map((s) => html`<option value=${s.id}>${s.label}</option>`)}
        </select>
        ${view !== 'done' && html`<select value=${sort} onChange=${(e) => setQuery({ sort: e.currentTarget.value === 'smart' ? '' : e.currentTarget.value })} aria-label="排序">
          <option value="smart">建議順序</option>
          <option value="due">依 Deadline</option>
          <option value="priority">依優先級</option>
          <option value="created">最新建立</option>
        </select>`}
        ${filtered && html`<button class="btn ghost small" onClick=${() => setQuery({ area: '', prio: '', status: '', q: '' })}>清除篩選</button>`}
      </div>
    </div>

    ${!list.length && html`<${Empty} title=${filtered ? '沒有符合條件的任務' : view === 'overdue' ? '沒有逾期的任務' : view === 'done' ? '還沒有完成紀錄' : '這裡目前是空的'}>
      ${view === 'overdue' ? '很好，沒有落後的事情。' : '可以在上方輸入框快速新增一件。'}
    <//>`}

    ${list.length > 0 && (grouped
      ? GROUPS.map((g) => {
          const items = list.filter((t) => t.status === g.id);
          if (!items.length) return null;
          const soft = ['deferred', 'paused'].includes(g.id);
          return soft
            ? html`<div class="section-gap" key=${g.id}><${Collapse} title=${g.label} count=${items.length}><${TaskList} tasks=${items} showNext=${true} /><//></div>`
            : html`<section class="task-group" key=${g.id}><h3 class="group-title">${g.label}<span class="muted">${items.length}</span></h3><${TaskList} tasks=${items} showNext=${true} /></section>`;
        })
      : html`<${TaskList} tasks=${list} showNext=${true} />`)}

    ${dropped.length > 0 && !filtered && html`<div class="section-gap"><${Collapse} title="已放棄" count=${dropped.length}>
      <p class="muted small pad-y">放棄是正常的決定。需要時可以從選單恢復。</p>
      <${TaskList} tasks=${dropped} />
    <//></div>`}
  </div>`;
}
