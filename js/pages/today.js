// 首頁：今天的生活 Dashboard
import { useEffect } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { useUI, AreaTag, QuickInput, Collapse } from '../components/ui.js';
import { TaskRow, TaskList, useTaskActions } from '../components/TaskRow.js';
import { BalanceBars, GoalMiniList } from '../components/widgets.js';
import { Icon } from '../components/icons.js';
import { cx, fmtMinutes } from '../lib/util.js';
import { todayKey, fmtFull, addDays, relDue, relDay, weekStart, fmtShort, weekdayOf } from '../lib/date.js';
import {
  suggestFocus, todayStats, todayHeadline, reminders, feedback, upcoming, focusReasons, taskAreaId, rankTasks, staleTasks, describeIdle,
} from '../lib/insights.js';

function FocusItem({ t, onRemove }) {
  const { idx } = useStore();
  const { openEditor } = useEditor();
  const act = useTaskActions();
  const today = todayKey();
  const done = t.status === 'done';
  const project = idx.projects[t.projectId];
  const goal = idx.goals[t.goalId] || (project && idx.goals[project.goalId]);
  const due = relDue(t.dueDate, today);
  const reasons = done ? [] : focusReasons(t, idx, today);
  return html`<div class=${cx('focus-item', done && 'is-done')} onClick=${() => openEditor('task', { id: t.id })}>
    <button type="button" class=${cx('check big', done && 'on')} aria-label=${done ? '標記為未完成' : '標記完成'} onClick=${(e) => { e.stopPropagation(); act.complete(t); }}>
      ${done && html`<${Icon} name="check" size=${16} />`}
    </button>
    <div class="focus-main">
      <div class="focus-title">${t.title}</div>
      <div class="task-meta">
        <${AreaTag} areaId=${taskAreaId(t, idx)} small />
        ${goal && html`<a class="meta-link" href=${`#/goals/${goal.id}`} onClick=${(e) => e.stopPropagation()}>目標：${goal.title}</a>`}
        ${project && html`<a class="meta-link" href=${`#/projects/${project.id}`} onClick=${(e) => e.stopPropagation()}>計畫：${project.title}</a>`}
      </div>
      <div class="focus-facts">
        <span><span class="muted">Deadline</span> ${due ? html`<span class=${cx('due', !done && due.tone)}>${due.text}</span>` : html`<span class="muted">未設定</span>`}</span>
        <span><span class="muted">預估</span> ${t.estimate ? fmtMinutes(t.estimate) : html`<span class="muted">未設定</span>`}</span>
      </div>
      ${t.nextAction && !done && html`<div class="task-next">下一步：${t.nextAction}</div>`}
      ${reasons.length > 0 && html`<div class="reasons">${reasons.map((r) => html`<span class="reason">${r}</span>`)}</div>`}
    </div>
    <button type="button" class="icon-btn subtle" title="移出今日重點" aria-label="移出今日重點" onClick=${(e) => { e.stopPropagation(); onRemove(t); }}><${Icon} name="x" size=${16} /></button>
  </div>`;
}

export function TodayPage() {
  const store = useStore();
  const { data, idx } = store;
  const { openEditor } = useEditor();
  const ui = useUI();
  const act = useTaskActions();
  const today = todayKey();
  const hasPlan = !!data.dayPlans[today];

  // 每天第一次打開時，自動推薦今日重點（之後可以手動調整）
  useEffect(() => {
    if (!hasPlan) store.setDayPlan(today, { focusIds: suggestFocus(data, idx, today), manual: [] });
  }, [today, hasPlan]);

  const plan = data.dayPlans[today] || { focusIds: [], manual: [] };
  const focus = plan.focusIds.map((id) => idx.tasks[id]).filter((t) => t && t.status !== 'dropped');
  const focusDone = focus.filter((t) => t.status === 'done').length;
  const st = todayStats(data, today);
  const headline = todayHeadline(st, focus);
  const notes = reminders(data, idx, today).filter((r) => r.key !== 'toomany');
  const fb = feedback(data, idx, today, focus);
  const focusSet = new Set(focus.map((t) => t.id));

  const planned = st.planned
    .filter((t) => !focusSet.has(t.id))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done'));
  const plannedOpen = st.planned.filter((t) => t.status !== 'done');
  const carry = data.tasks.filter((t) => t.todayDate && t.todayDate < today && ['todo', 'doing'].includes(t.status));
  const soon = upcoming(data, idx, today, 7);
  const activeGoals = data.goals.filter((g) => g.status === 'active').sort((a, b) => ['week', 'month', 'quarter', 'year', 'long'].indexOf(a.horizon) - ['week', 'month', 'quarter', 'year', 'long'].indexOf(b.horizon));
  const weekFocus = data.reviews[weekStart(today)]?.focus || [];
  const stale = staleTasks(data, today, data.settings.staleDays)[0];
  const tooMany = st.planned.length > data.settings.todayThreshold;
  const candidates = !focus.length ? rankTasks(data, idx, today).slice(0, 3) : [];

  const moveCarry = (t) => store.update('tasks', t.id, { todayDate: today });
  const clearCarry = (t) => store.update('tasks', t.id, { todayDate: '' });

  return html`<div class="page today-page">
    <header class="page-head today-head">
      <div class="page-head-text">
        <div class="eyebrow">${fmtFull(today)}</div>
        <h1>${headline}</h1>
        ${fb.map((x) => html`<p class="page-sub">${x}</p>`)}
      </div>
    </header>

    ${!data.settings.welcomeDismissed && data.tasks.some((t) => t.demo) && html`<div class="welcome">
      <div>
        <strong>歡迎，這裡是你的生活整理空間。</strong>
        <p>目前放的是示範資料，讓你先看看整套工具怎麼運作：人生領域 → 目標 → 計畫 → 任務 → 今天。熟悉之後可以到「設定」一鍵清除示範資料。</p>
      </div>
      <div class="welcome-actions">
        <a class="btn ghost small" href="#/settings">前往設定</a>
        <button class="btn primary small" onClick=${() => store.setSettings({ welcomeDismissed: true })}>知道了</button>
      </div>
    </div>`}

    <div class="today-grid">
      <div class="col-main">
        <section class="card focus-card">
          <div class="card-head">
            <div>
              <h2>今日重點</h2>
              <p class="muted small">今天最值得處理的事情，最多 3 件。</p>
            </div>
            <div class="focus-score">
              ${focus.length > 0 && html`<span class="score"><strong>${focusDone}</strong> / ${focus.length} 完成</span>`}
              <button type="button" class="btn ghost small" onClick=${() => { act.refreshFocus(); ui.toast('已重新建議今日重點'); }} title="依 Deadline、優先級與目標重新推薦">重新建議</button>
            </div>
          </div>
          ${focus.length > 0 && focusDone === focus.length && html`<div class="done-banner">今天最重要的事情已經處理完了。</div>`}
          <div class="focus-list">
            ${focus.map((t) => html`<${FocusItem} key=${t.id} t=${t} onRemove=${act.removeFocus} />`)}
          </div>
          ${!focus.length && html`<div class="empty small">
            ${candidates.length
              ? html`<p class="empty-title">今天還沒有選定重點</p><p class="muted small">按「重新建議」讓系統依 Deadline 與優先級推薦，或從下面的清單把任務設為今日重點。</p>`
              : html`<p class="empty-title">今天沒有需要特別處理的事情</p><p class="muted small">可以推進一個長期目標，或留一點時間給自己。</p>`}
          </div>`}
          <div class="focus-foot muted small">今天已完成 ${st.doneToday.length} 件${plannedOpen.length ? ` · 今天的安排還有 ${plannedOpen.length} 件` : ''}</div>
        </section>

        ${notes.length > 0 && html`<section class="notices">
          ${notes.slice(0, 5).map((r) => html`<a class="notice" href=${r.to} key=${r.key}><span class="notice-dot"></span><span>${r.text}</span><${Icon} name="right" size=${16} /></a>`)}
        </section>`}

        ${stale && html`<section class="card soft-card">
          <p><strong>「${stale.title}」</strong>拖了一段時間（${describeIdle(stale, today)}），可以考慮拆小、延後，或直接放棄。</p>
          <div class="row gap-8 wrap">
            <button class="btn ghost small" onClick=${() => openEditor('task', { id: stale.id })}>拆小或修改</button>
            <button class="btn ghost small" onClick=${() => act.setStatus(stale, 'deferred', '已延後，之後想做再拿出來')}>延後</button>
            <button class="btn ghost small" onClick=${() => act.setStatus(stale, 'dropped', '已放棄。不做也是一種決定。')}>放棄</button>
            <button class="btn ghost small" onClick=${() => act.keep(stale)}>還是想做</button>
          </div>
        </section>`}

        <section class="card">
          <div class="card-head">
            <div>
              <h2>今天的安排</h2>
              <p class="muted small">「加入今天」不等於今天到期，只是你決定今天要處理。</p>
            </div>
            <span class="muted small">${st.planned.length} 件</span>
          </div>
          ${tooMany && html`<p class="soft-note">今天安排了 ${st.planned.length} 件事情，可能有點多。可以先選 3 件真正重要的。</p>`}
          <${QuickInput} placeholder="加入今天要做的事，按 Enter" onSubmit=${(v) => { store.add('tasks', { title: v, todayDate: today }); }} />
          <${TaskList} tasks=${planned} showNext=${false} empty=${html`<p class="muted small pad-y">${focus.length ? '除了今日重點，今天沒有其他安排。' : '今天還沒有安排。可以從任務清單按太陽圖示加入今天。'}</p>`} />
          ${carry.length > 0 && html`<${Collapse} title="之前排過、還沒完成" count=${carry.length}>
            ${carry.map((t) => html`<div class="carry-row" key=${t.id}>
              <span class="carry-title">${t.title}<span class="muted small"> · 原本排在 ${relDay(t.todayDate, today)}</span></span>
              <span class="row gap-4">
                <button class="btn ghost small" onClick=${() => moveCarry(t)}>移到今天</button>
                <button class="btn ghost small" onClick=${() => clearCarry(t)}>先不排</button>
              </span>
            </div>`)}
          <//>`}
        </section>

        <section class="card">
          <div class="card-head"><h2>接下來 7 天</h2><a class="muted small" href="#/calendar">看行事曆</a></div>
          ${soon.length
            ? html`<div class="upcoming">${soon.map((it) => html`<div class="upcoming-row" key=${it.kind + it.id + it.date}>
                <span class="upcoming-date">${relDay(it.date, today)}<span class="muted small"> 週${weekdayOf(it.date)}</span></span>
                <span class=${cx('kind-pill', it.kind)}>${it.label}</span>
                <span class="upcoming-title">${it.title}</span>
              </div>`)}</div>`
            : html`<p class="muted small">接下來一週沒有重要時間點。</p>`}
        </section>
      </div>

      <aside class="col-side">
        ${weekFocus.length > 0 && html`<section class="card">
          <div class="card-head"><h2>這週想專注</h2><a class="muted small" href="#/review">回顧</a></div>
          <ol class="week-focus">${weekFocus.map((f) => html`<li key=${f.id}>
            ${f.type === 'goal' ? html`<a href=${`#/goals/${f.id}`}>${f.title}</a>` : f.type === 'project' ? html`<a href=${`#/projects/${f.id}`}>${f.title}</a>` : f.title}
          </li>`)}</ol>
        </section>`}

        <section class="card">
          <div class="card-head"><h2>生活分布</h2><span class="muted small">最近 7 天完成</span></div>
          <${BalanceBars} from=${addDays(today, -6)} to=${today} />
        </section>

        <section class="card">
          <div class="card-head"><h2>正在前進的目標</h2><a class="muted small" href="#/goals">全部</a></div>
          <${GoalMiniList} goals=${activeGoals} />
        </section>

        ${st.followUps.length > 0 && html`<section class="card">
          <div class="card-head"><h2>可以追蹤了</h2><a class="muted small" href="#/waiting">等待中</a></div>
          ${st.followUps.map((w) => html`<div class="mini-row" key=${w.id} onClick=${() => openEditor('waiting', { id: w.id })}>
            <span>${w.what}</span><span class="muted small">${w.who ? '等 ' + w.who : ''}</span>
          </div>`)}
        </section>`}
      </aside>
    </div>
  </div>`;
}
