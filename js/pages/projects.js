// 計畫：任何需要多個步驟完成的事情，不限工作
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { useUI, PageHead, Empty, Segmented, ProgressBar, AreaTag, QuickInput, Menu, Collapse } from '../components/ui.js';
import { TaskList } from '../components/TaskRow.js';
import { setQuery, navigate } from '../lib/router.js';
import { cx } from '../lib/util.js';
import { todayKey, relDue, fmtShort } from '../lib/date.js';
import { projectProgress, tasksOfProject, projectAreaId, isOpen, scoreTask } from '../lib/insights.js';
import { PROJECT_STATUS, PROJECT_STATUS_LABEL } from '../lib/constants.js';

function ProjectCard({ p }) {
  const { data, idx } = useStore();
  const today = todayKey();
  const prog = projectProgress(p, data);
  const areaId = projectAreaId(p, idx);
  const a = idx.areas[areaId];
  const goal = idx.goals[p.goalId];
  const open = tasksOfProject(data, p.id).filter((t) => t.status === 'todo' || t.status === 'doing');
  const next = open.sort((x, y) => (scoreTask(y, idx, today)?.score || 0) - (scoreTask(x, idx, today)?.score || 0))[0];
  const due = p.dueDate && !['done', 'dropped'].includes(p.status) ? relDue(p.dueDate, today) : null;
  return html`<a class=${cx('goal-card', ['done', 'dropped', 'paused'].includes(p.status) && 'is-muted')} href=${`#/projects/${p.id}`} style=${a ? `--c:${a.color}` : ''}>
    <div class="goal-card-top">
      <${AreaTag} areaId=${areaId} small />
      <span class="status-pill ${p.status}">${PROJECT_STATUS_LABEL[p.status]}</span>
    </div>
    <h3 class="goal-card-title">${p.title}</h3>
    ${goal && html`<p class="muted small">目標：${goal.title}</p>`}
    <div class="goal-progress"><${ProgressBar} pct=${prog.pct} color=${a?.color} /><span class="small muted">${prog.done}/${prog.total}</span></div>
    <div class="goal-card-foot">
      ${next ? html`<span class="small">下一件：${next.title}</span>` : html`<span class="muted small">${prog.total ? '沒有待處理的任務' : '還沒有任務'}</span>`}
      ${due && html`<span class=${cx('due small', due.tone)}>${due.text}</span>`}
    </div>
  </a>`;
}

export function ProjectsPage({ query }) {
  const { data, idx } = useStore();
  const { openEditor } = useEditor();
  const status = query.s || 'open';
  const area = query.area || '';
  const areas = [...data.areas].sort((a, b) => a.order - b.order);
  const list = data.projects
    .filter((p) => status === 'all' || (status === 'open' ? !['done', 'dropped'].includes(p.status) : ['done', 'dropped'].includes(p.status)))
    .filter((p) => !area || projectAreaId(p, idx) === area)
    .sort((a, b) => (a.status === 'paused') - (b.status === 'paused') || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const usedAreas = areas.filter((a) => data.projects.some((p) => projectAreaId(p, idx) === a.id));

  return html`<div class="page">
    <${PageHead} eyebrow="Projects" title="計畫" sub="日本旅行、整理房間、一場論壇，只要需要好幾個步驟，都可以是一個計畫。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('project', { initial: area ? { areaId: area } : {}, onSaved: (id) => navigate(`/projects/${id}`) })}>新增計畫</button>`} />
    <div class="filters">
      <${Segmented} value=${status} onChange=${(v) => setQuery({ s: v === 'open' ? '' : v })} options=${[{ id: 'open', label: '進行中' }, { id: 'closed', label: '已完成／放下' }, { id: 'all', label: '全部' }]} />
      ${usedAreas.length > 1 && html`<div class="chip-row">
        <button class=${cx('chip', !area && 'on')} onClick=${() => setQuery({ area: '' })}>全部領域</button>
        ${usedAreas.map((a) => html`<button class=${cx('chip', area === a.id && 'on')} onClick=${() => setQuery({ area: a.id })}>${a.icon} ${a.name}</button>`)}
      </div>`}
    </div>
    ${list.length
      ? html`<div class="card-grid">${list.map((p) => html`<${ProjectCard} key=${p.id} p=${p} />`)}</div>`
      : html`<${Empty} title="這裡還沒有計畫">建立一個計畫，把大事情拆成幾個小步驟。<//>`}
  </div>`;
}

export function ProjectDetailPage({ id }) {
  const store = useStore();
  const { data, idx } = store;
  const { openEditor } = useEditor();
  const ui = useUI();
  const today = todayKey();
  const p = idx.projects[id];
  if (!p) return html`<div class="page"><${Empty} title="找不到這個計畫">可能已經被刪除了。<a href="#/projects">回到計畫列表</a><//></div>`;

  const areaId = projectAreaId(p, idx);
  const a = idx.areas[areaId];
  const goal = idx.goals[p.goalId];
  const prog = projectProgress(p, data);
  const tasks = tasksOfProject(data, p.id);
  const open = tasks.filter(isOpen).sort((x, y) => (scoreTask(y, idx, today)?.score ?? -1) - (scoreTask(x, idx, today)?.score ?? -1));
  const done = tasks.filter((t) => t.status === 'done');
  const dropped = tasks.filter((t) => t.status === 'dropped');
  const waits = data.waiting.filter((w) => w.projectId === p.id && w.status === 'waiting');
  const due = p.dueDate ? relDue(p.dueDate, today) : null;
  const setStatus = (s) => { store.update('projects', p.id, { status: s }); ui.toast(`計畫狀態：${PROJECT_STATUS_LABEL[s]}`); };

  return html`<div class="page">
    <a class="back-link" href="#/projects">← 計畫</a>
    <header class="detail-head" style=${a ? `--c:${a.color}` : ''}>
      <div class="detail-tags"><${AreaTag} areaId=${areaId} small /><span class="status-pill ${p.status}">${PROJECT_STATUS_LABEL[p.status]}</span></div>
      <div class="detail-title-row">
        <h1>${p.title}</h1>
        <div class="row gap-4">
          <button class="btn ghost small" onClick=${() => openEditor('project', { id: p.id, onDeleted: () => navigate('/projects') })}>編輯</button>
          <${Menu} items=${PROJECT_STATUS.filter((s) => s.id !== p.status).map((s) => ({ label: `標記為「${s.label}」`, onClick: () => setStatus(s.id) }))} />
        </div>
      </div>
      ${p.description && html`<p class="detail-desc">${p.description}</p>`}
      <div class="detail-facts">
        ${goal && html`<span><span class="muted">目標</span> <a href=${`#/goals/${goal.id}`}>${goal.title}</a></span>`}
        <span><span class="muted">開始</span> ${p.startDate ? fmtShort(p.startDate, today) : '未設定'}</span>
        <span><span class="muted">Deadline</span> ${due ? html`<span class=${cx('due', !['done', 'dropped'].includes(p.status) && due.tone)}>${fmtShort(p.dueDate, today)}${!['done', 'dropped'].includes(p.status) && due.days <= 7 ? ` · ${due.text}` : ''}</span>` : '未設定'}</span>
      </div>
      <div class="goal-progress big"><${ProgressBar} pct=${prog.pct} color=${a?.color} /><span>${prog.pct}%</span></div>
      <p class="muted small">${prog.manual ? '進度為手動設定' : prog.total ? `${prog.done} / ${prog.total} 件任務完成` : '新增任務後會自動計算進度'}</p>
    </header>

    <section class="card">
      <div class="card-head"><h2>任務</h2><span class="muted small">${open.length} 件未完成</span></div>
      <${QuickInput} placeholder="新增這個計畫的下一步" onSubmit=${(v) => store.add('tasks', { title: v, projectId: p.id, goalId: p.goalId })} />
      <${TaskList} tasks=${open} hideProject=${true} hideArea=${true} showNext=${true} empty=${html`<p class="muted small pad-y">把計畫拆成幾個具體的小步驟吧。</p>`} />
    </section>

    ${waits.length > 0 && html`<section class="card">
      <div class="card-head"><h2>等待中</h2></div>
      ${waits.map((w) => html`<div class="mini-row" key=${w.id} onClick=${() => openEditor('waiting', { id: w.id })}>
        <span>${w.what}</span><span class="muted small">${w.who ? '等 ' + w.who : ''}${w.followUp ? ` · ${fmtShort(w.followUp, today)} 追蹤` : ''}</span>
      </div>`)}
    </section>`}

    ${done.length > 0 && html`<${Collapse} title="已完成" count=${done.length}><${TaskList} tasks=${done} hideProject=${true} hideArea=${true} /><//>`}
    ${dropped.length > 0 && html`<${Collapse} title="已放棄" count=${dropped.length}><${TaskList} tasks=${dropped} hideProject=${true} hideArea=${true} /><//>`}
  </div>`;
}
