// 目標：本週／本月／季度／年度／長期
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { useUI, PageHead, Empty, Segmented, ProgressBar, AreaTag, QuickInput, Menu, Collapse } from '../components/ui.js';
import { TaskList } from '../components/TaskRow.js';
import { setQuery, navigate } from '../lib/router.js';
import { cx } from '../lib/util.js';
import { todayKey, relDue, fmtShort, diffDays } from '../lib/date.js';
import { goalProgress, projectProgress, tasksOfGoal, projectsOfGoal, goalStreak, lastProgressKey, isOpen } from '../lib/insights.js';
import { GOAL_HORIZONS, HORIZON_LABEL, GOAL_STATUS, GOAL_STATUS_LABEL, PROJECT_STATUS_LABEL } from '../lib/constants.js';

const HORIZON_ORDER = GOAL_HORIZONS.map((h) => h.id);

export function GoalCard({ g }) {
  const { data, idx } = useStore();
  const today = todayKey();
  const p = goalProgress(g, data, idx);
  const a = idx.areas[g.areaId];
  const projects = projectsOfGoal(data, g.id);
  const openTasks = tasksOfGoal(data, idx, g.id).filter(isOpen).length;
  const streak = g.status === 'active' ? goalStreak(g.id, data, idx, today) : 0;
  const due = g.targetDate && g.status === 'active' ? relDue(g.targetDate, today) : null;
  return html`<a class=${cx('goal-card', g.status !== 'active' && 'is-muted')} href=${`#/goals/${g.id}`} style=${a ? `--c:${a.color}` : ''}>
    <div class="goal-card-top">
      <span class="horizon-pill">${HORIZON_LABEL[g.horizon]}</span>
      ${g.status !== 'active' && html`<span class="status-pill ${g.status}">${GOAL_STATUS_LABEL[g.status]}</span>`}
    </div>
    <h3 class="goal-card-title">${g.title}</h3>
    ${g.why && html`<p class="goal-why">${g.why}</p>`}
    <div class="goal-progress"><${ProgressBar} pct=${p.pct} color=${a?.color} /><span class="small muted">${p.pct}%</span></div>
    <div class="goal-card-foot">
      <${AreaTag} areaId=${g.areaId} small />
      <span class="muted small">${projects.length ? `${projects.length} 個計畫 · ` : ''}${openTasks} 件進行中</span>
      ${due && html`<span class=${cx('due small', due.tone === 'overdue' ? 'soon' : '')}>${due.tone === 'overdue' ? '已過目標日期' : '目標 ' + fmtShort(g.targetDate, today)}</span>`}
      ${!g.targetDate && g.status === 'active' && html`<span class="muted small">持續性</span>`}
    </div>
    ${streak >= 2 && html`<div class="streak">已經連續推進 ${streak} 週</div>`}
  </a>`;
}

export function GoalsPage({ query }) {
  const { data } = useStore();
  const { openEditor } = useEditor();
  const horizon = query.h || 'all';
  const status = query.s || 'active';
  const list = data.goals
    .filter((g) => horizon === 'all' || g.horizon === horizon)
    .filter((g) => status === 'all' || (status === 'closed' ? ['done', 'dropped'].includes(g.status) : status === 'active' ? ['active', 'paused'].includes(g.status) : g.status === status))
    .sort((a, b) => (a.status === 'paused') - (b.status === 'paused') || HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon));
  const count = (h) => data.goals.filter((g) => ['active', 'paused'].includes(g.status) && (h === 'all' || g.horizon === h)).length;

  return html`<div class="page">
    <${PageHead} eyebrow="Goals" title="目標" sub="目標是方向，不一定要有 Deadline。每天的小事可以連回這裡。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('goal', { initial: horizon !== 'all' ? { horizon } : {}, onSaved: (id) => navigate(`/goals/${id}`) })}>新增目標</button>`} />
    <div class="filters">
      <${Segmented} value=${horizon} onChange=${(v) => setQuery({ h: v === 'all' ? '' : v })}
        options=${[{ id: 'all', label: '全部' }, ...GOAL_HORIZONS.map((h) => ({ id: h.id, label: h.label.replace('目標', '') }))].map((o) => ({ ...o, count: count(o.id) }))} />
      <div class="filter-row">
        <${Segmented} size="small" value=${status} onChange=${(v) => setQuery({ s: v === 'active' ? '' : v })}
          options=${[{ id: 'active', label: '進行中' }, { id: 'closed', label: '已達成／放下' }, { id: 'all', label: '全部' }]} />
      </div>
    </div>
    ${list.length
      ? html`<div class="card-grid">${list.map((g) => html`<${GoalCard} key=${g.id} g=${g} />`)}</div>`
      : html`<${Empty} title="這裡還沒有目標">目標可以很小，例如「本週運動兩次」；也可以很長，例如「提升英文能力」。<//>`}
  </div>`;
}

export function GoalDetailPage({ id }) {
  const store = useStore();
  const { data, idx } = store;
  const { openEditor } = useEditor();
  const ui = useUI();
  const today = todayKey();
  const g = idx.goals[id];
  if (!g) return html`<div class="page"><${Empty} title="找不到這個目標">可能已經被刪除了。<a href="#/goals">回到目標列表</a><//></div>`;

  const p = goalProgress(g, data, idx);
  const a = idx.areas[g.areaId];
  const projects = projectsOfGoal(data, g.id);
  const tasks = tasksOfGoal(data, idx, g.id);
  const directOpen = tasks.filter((t) => isOpen(t) && !t.projectId);
  const done = tasks.filter((t) => t.status === 'done').sort((x, y) => (y.completedAt || '').localeCompare(x.completedAt || ''));
  const streak = goalStreak(g.id, data, idx, today);
  const last = lastProgressKey(g.id, data, idx);
  const setStatus = (s) => { store.update('goals', g.id, { status: s }); ui.toast(`目標狀態：${GOAL_STATUS_LABEL[s]}`); };

  return html`<div class="page">
    <a class="back-link" href="#/goals">← 目標</a>
    <header class="detail-head" style=${a ? `--c:${a.color}` : ''}>
      <div class="detail-tags"><span class="horizon-pill">${HORIZON_LABEL[g.horizon]}</span><${AreaTag} areaId=${g.areaId} small /><span class="status-pill ${g.status}">${GOAL_STATUS_LABEL[g.status]}</span></div>
      <div class="detail-title-row">
        <h1>${g.title}</h1>
        <div class="row gap-4">
          <button class="btn ghost small" onClick=${() => openEditor('goal', { id: g.id, onDeleted: () => navigate('/goals') })}>編輯</button>
          <${Menu} items=${GOAL_STATUS.filter((s) => s.id !== g.status).map((s) => ({ label: `標記為「${s.label}」`, onClick: () => setStatus(s.id) }))} />
        </div>
      </div>
      ${g.why && html`<blockquote class="why">${g.why}</blockquote>`}
      <div class="detail-facts">
        <span><span class="muted">開始</span> ${g.startDate ? fmtShort(g.startDate, today) : '未設定'}</span>
        <span><span class="muted">目標日期</span> ${g.targetDate ? fmtShort(g.targetDate, today) : '持續性目標'}</span>
        <span><span class="muted">最近推進</span> ${last ? (diffDays(today, last) === 0 ? '今天' : `${diffDays(today, last)} 天前`) : '還沒有紀錄'}</span>
        ${streak >= 2 && html`<span class="streak inline">已經連續推進 ${streak} 週</span>`}
      </div>
      <div class="goal-progress big"><${ProgressBar} pct=${p.pct} color=${a?.color} /><span>${p.pct}%</span></div>
      <p class="muted small">${p.manual ? '進度為手動設定' : p.total ? `${p.done} / ${p.total} 件任務完成（自動計算）` : '還沒有相關任務，進度會在新增任務後自動計算'}</p>
    </header>

    <section class="card">
      <div class="card-head"><h2>相關計畫</h2><button class="btn ghost small" onClick=${() => openEditor('project', { initial: { goalId: g.id, areaId: g.areaId } })}>新增計畫</button></div>
      ${projects.length
        ? html`<div class="project-mini-list">${projects.map((pr) => {
            const pp = projectProgress(pr, data);
            return html`<a class="project-mini" href=${`#/projects/${pr.id}`} key=${pr.id}>
              <span class="project-mini-title">${pr.title}</span>
              <span class="muted small">${PROJECT_STATUS_LABEL[pr.status]} · ${pp.done}/${pp.total}</span>
              <${ProgressBar} pct=${pp.pct} color=${a?.color} />
            </a>`;
          })}</div>`
        : html`<p class="muted small">需要多個步驟的事情，可以建立成計畫。</p>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>直接相關的任務</h2><span class="muted small">${directOpen.length} 件</span></div>
      <${QuickInput} placeholder="為這個目標新增一件小事" onSubmit=${(v) => store.add('tasks', { title: v, goalId: g.id, areaId: g.areaId })} />
      <${TaskList} tasks=${directOpen} hideProject=${true} showNext=${true} empty=${html`<p class="muted small pad-y">計畫之外的零散任務會放在這裡。</p>`} />
      ${projects.length > 0 && html`<p class="muted small">計畫裡的任務請到各計畫頁查看。</p>`}
    </section>

    ${done.length > 0 && html`<${Collapse} title="已完成的任務" count=${done.length}><${TaskList} tasks=${done} /><//>`}
  </div>`;
}
