// 所有「判斷」邏輯：今日重點推薦、生活分布、提醒、回饋
import { diffDays, addDays, weekStart, isoToKey, fmtShort } from './date.js';
import { byId } from './util.js';

export const isOpen = (t) => t.status !== 'done' && t.status !== 'dropped';
export const isActionable = (t) => t.status === 'todo' || t.status === 'doing';

export function buildIndex(data) {
  return {
    areas: byId(data.areas),
    goals: byId(data.goals),
    projects: byId(data.projects),
    tasks: byId(data.tasks),
  };
}

// 任務可以直接掛目標，也可以透過計畫間接掛目標
export const taskGoalId = (t, idx) => t.goalId || (t.projectId && idx.projects[t.projectId]?.goalId) || '';

export function taskAreaId(t, idx) {
  if (t.areaId) return t.areaId;
  const p = idx.projects[t.projectId];
  if (p?.areaId) return p.areaId;
  const g = idx.goals[taskGoalId(t, idx)];
  return g?.areaId || '';
}

export const projectAreaId = (p, idx) => p.areaId || idx.goals[p.goalId]?.areaId || '';
export const doneKey = (t) => (t.completedAt ? isoToKey(t.completedAt) : '');
export const touchedKey = (t) => isoToKey(t.updatedAt || t.createdAt);

export const tasksOfGoal = (data, idx, goalId) => data.tasks.filter((t) => taskGoalId(t, idx) === goalId);
export const tasksOfProject = (data, projectId) => data.tasks.filter((t) => t.projectId === projectId);
export const projectsOfGoal = (data, goalId) => data.projects.filter((p) => p.goalId === goalId);

export function progressOf(tasks) {
  const rel = tasks.filter((t) => t.status !== 'dropped');
  const done = rel.filter((t) => t.status === 'done').length;
  return { pct: rel.length ? Math.round((done / rel.length) * 100) : 0, done, total: rel.length };
}

export function goalProgress(goal, data, idx) {
  const p = progressOf(tasksOfGoal(data, idx, goal.id));
  if (goal.status === 'done') return { ...p, pct: 100 };
  if (goal.progressMode === 'manual') return { ...p, pct: goal.progress || 0, manual: true };
  return p;
}

export function projectProgress(project, data) {
  const p = progressOf(tasksOfProject(data, project.id));
  if (project.status === 'done') return { ...p, pct: 100 };
  if (project.progressMode === 'manual') return { ...p, pct: project.progress || 0, manual: true };
  return p;
}

// ---------- 今日重點 ----------

const HORIZON_WEIGHT = { week: 12, month: 9, quarter: 7, year: 5, long: 4 };
const PRIORITY_WEIGHT = { P0: 30, P1: 20, P2: 10, P3: 0 };

export function scoreTask(t, idx, today) {
  if (!isActionable(t)) return null;
  if (t.startDate && t.startDate > today) return null;
  let score = 0;
  const reasons = [];
  if (t.dueDate) {
    const n = diffDays(t.dueDate, today);
    if (n < 0) { score += 50 + Math.min(-n, 10) * 2; reasons.push(`逾期 ${-n} 天`); }
    else if (n === 0) { score += 40; reasons.push('今天到期'); }
    else if (n <= 3) { score += 25; reasons.push(`${n} 天後到期`); }
    else if (n <= 7) { score += 10; reasons.push('本週到期'); }
  }
  score += PRIORITY_WEIGHT[t.priority] || 0;
  if (t.priority === 'P0') reasons.push('最重要');
  if (t.todayDate === today) { score += 15; reasons.push('已排入今天'); }
  if (t.status === 'doing') { score += 8; reasons.push('進行中'); }
  if (t.blocksOthers) { score += 15; reasons.push('會影響其他事情'); }
  const g = idx.goals[taskGoalId(t, idx)];
  if (g && g.status === 'active') {
    score += HORIZON_WEIGHT[g.horizon] || 4;
    reasons.push('推進目標');
  }
  const idle = diffDays(today, touchedKey(t));
  if (idle >= 14) { score += Math.min(Math.floor(idle / 7), 6); reasons.push('擱置了一段時間'); }
  return { score, reasons: reasons.slice(0, 3) };
}

export function rankTasks(data, idx, today, exclude = []) {
  const ex = new Set(exclude);
  return data.tasks
    .filter((t) => !ex.has(t.id))
    .map((t) => ({ task: t, s: scoreTask(t, idx, today) }))
    .filter((x) => x.s && x.s.score > 0)
    .sort((a, b) => b.s.score - a.s.score);
}

export function suggestFocus(data, idx, today, keep = [], n = 3) {
  const picked = keep.filter((id) => idx.tasks[id] && idx.tasks[id].status !== 'dropped').slice(0, n);
  for (const x of rankTasks(data, idx, today, picked)) {
    if (picked.length >= n) break;
    picked.push(x.task.id);
  }
  return picked;
}

export function focusReasons(t, idx, today) {
  return scoreTask(t, idx, today)?.reasons || [];
}

// ---------- 生活分布 ----------

export function lifeBalance(data, idx, from, to) {
  const counts = {};
  let total = 0;
  for (const t of data.tasks) {
    if (t.status !== 'done') continue;
    const k = doneKey(t);
    if (!k || k < from || k > to) continue;
    const a = taskAreaId(t, idx) || '_none';
    counts[a] = (counts[a] || 0) + 1;
    total++;
  }
  const rows = Object.entries(counts)
    .map(([areaId, count]) => ({ areaId, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
  return { rows, total };
}

export function balanceHint(balance, idx) {
  if (balance.total < 4 || !balance.rows.length) return null;
  const top = balance.rows[0];
  if (top.share < 0.6 || top.areaId === '_none') return null;
  const name = idx.areas[top.areaId]?.name || '同一個領域';
  return `最近完成事項主要集中在${name}，也可以看看其他生活目標是否需要一些時間。`;
}

// ---------- 推進紀錄 ----------

// 目標連續幾週有完成相關任務（本週還沒有也不中斷，從上週往回算）
export function goalStreak(goalId, data, idx, today) {
  const weeks = new Set(
    tasksOfGoal(data, idx, goalId).filter((t) => t.status === 'done' && t.completedAt).map((t) => weekStart(doneKey(t)))
  );
  let w = weekStart(today);
  if (!weeks.has(w)) w = addDays(w, -7);
  let n = 0;
  while (weeks.has(w)) { n++; w = addDays(w, -7); }
  return n;
}

export function lastProgressKey(goalId, data, idx) {
  let last = '';
  for (const t of tasksOfGoal(data, idx, goalId)) {
    const k = t.status === 'done' ? doneKey(t) : '';
    if (k > last) last = k;
  }
  return last;
}

export function staleTasks(data, today, days = 21) {
  return data.tasks
    .filter((t) => ['todo', 'deferred', 'paused'].includes(t.status) && t.todayDate !== today)
    .filter((t) => diffDays(today, touchedKey(t)) >= days)
    .sort((a, b) => touchedKey(a).localeCompare(touchedKey(b)));
}

export function staleGoals(data, idx, today, days = 21) {
  return data.goals.filter((g) => {
    if (g.status !== 'active') return false;
    if (diffDays(today, isoToKey(g.createdAt)) < days) return false;
    const last = lastProgressKey(g.id, data, idx);
    return !last || diffDays(today, last) >= days;
  });
}

// ---------- 今天 ----------

export function todayStats(data, today) {
  const open = data.tasks.filter(isOpen);
  return {
    overdue: open.filter((t) => t.dueDate && t.dueDate < today),
    dueToday: open.filter((t) => t.dueDate === today),
    dueSoon: open.filter((t) => t.dueDate && t.dueDate > today && diffDays(t.dueDate, today) <= 3),
    planned: data.tasks.filter((t) => t.todayDate === today && t.status !== 'dropped'),
    doneToday: data.tasks.filter((t) => t.status === 'done' && doneKey(t) === today),
    followUps: data.waiting.filter((w) => w.status === 'waiting' && w.followUp && w.followUp <= today),
  };
}

export function todayHeadline(stats, focus) {
  const focusOpen = focus.filter((t) => t.status !== 'done');
  const important = new Set([...stats.overdue, ...stats.dueToday, ...focusOpen].map((t) => t.id));
  if (focus.length && !focusOpen.length) return '今天最重要的事情已經處理完了。';
  if (!stats.overdue.length && !stats.dueToday.length) {
    return important.size
      ? `今天沒有迫切 Deadline，可以推進 ${important.size} 件重點事情，或長期目標。`
      : '今天沒有迫切 Deadline，可以推進長期目標。';
  }
  return `今天有 ${important.size} 件重要事情需要處理。`;
}

// 溫和提醒：每一則都附上可以前往的地方
export function reminders(data, idx, today) {
  const s = data.settings;
  const st = todayStats(data, today);
  const out = [];
  if (st.overdue.length) out.push({ key: 'overdue', text: `有 ${st.overdue.length} 件事情已經過了 Deadline，可以重新安排日期，或想想是否還需要做。`, to: '#/tasks?view=overdue' });
  if (st.dueToday.length) out.push({ key: 'today', text: `今天有 ${st.dueToday.length} 件 Deadline。`, to: '#/tasks?view=today' });
  if (st.dueSoon.length) out.push({ key: 'soon', text: `接下來 3 天內有 ${st.dueSoon.length} 件 Deadline。`, to: '#/tasks?view=soon' });
  for (const w of st.followUps.slice(0, 2)) out.push({ key: 'w' + w.id, text: `「${w.what}」這件事情可以追蹤了。`, to: '#/waiting' });
  if (st.followUps.length > 2) out.push({ key: 'wmore', text: `還有 ${st.followUps.length - 2} 件等待事項可以追蹤。`, to: '#/waiting' });
  if (st.planned.length > s.todayThreshold) out.push({ key: 'toomany', text: `今天安排了 ${st.planned.length} 件事情，可能有點多。可以先選 3 件真正重要的。`, to: '#/' });
  const inboxCount = data.inbox.filter((i) => !i.archived).length;
  if (inboxCount > s.inboxThreshold) out.push({ key: 'inbox', text: `Inbox 累積了 ${inboxCount} 則，有空時花幾分鐘整理就好。`, to: '#/inbox' });
  const sg = staleGoals(data, idx, today, s.staleDays)[0];
  if (sg) out.push({ key: 'g' + sg.id, text: `「${sg.title}」有一陣子沒有推進，可以安排一個小步驟，或先暫停也沒關係。`, to: `#/goals/${sg.id}` });
  return out;
}

// 依實際進度給的簡短回饋（最多兩句，不說教、不雞湯）
export function feedback(data, idx, today, focus) {
  const out = [];
  if (focus.length && focus.every((t) => t.status === 'done')) {
    out.push('今天的主要事項已經完成，可以把剩餘時間留給自己。');
  }
  const bal = lifeBalance(data, idx, addDays(today, -6), today);
  const top = bal.rows[0];
  if (bal.total >= 4 && top && top.share >= 0.6) {
    const planned = data.tasks.filter((t) => t.todayDate === today && t.status !== 'dropped');
    const other = planned.some((t) => taskAreaId(t, idx) !== top.areaId);
    const name = idx.areas[top.areaId]?.name;
    if (!other && name) out.push(`最近${name}事項很多，今天也可以安排一件生活相關的小事。`);
  }
  let best = null;
  for (const g of data.goals.filter((g) => g.status === 'active')) {
    const n = goalStreak(g.id, data, idx, today);
    if (n >= 3 && (!best || n > best.n)) best = { g, n };
  }
  if (best) out.push(`「${best.g.title}」這個目標已經連續推進 ${best.n} 週。`);
  return out.slice(0, 2);
}

export function upcoming(data, idx, today, days = 7) {
  const end = addDays(today, days);
  const items = [];
  for (const t of data.tasks) {
    if (isOpen(t) && t.dueDate && t.dueDate > today && t.dueDate <= end) items.push({ date: t.dueDate, kind: 'task', label: 'Deadline', title: t.title, id: t.id });
  }
  for (const p of data.projects) {
    if (!['done', 'dropped'].includes(p.status) && p.dueDate && p.dueDate > today && p.dueDate <= end) items.push({ date: p.dueDate, kind: 'project', label: '計畫', title: p.title, id: p.id });
  }
  for (const g of data.goals) {
    if (g.status === 'active' && g.targetDate && g.targetDate > today && g.targetDate <= end) items.push({ date: g.targetDate, kind: 'goal', label: '目標日期', title: g.title, id: g.id });
  }
  for (const w of data.waiting) {
    if (w.status === 'waiting' && w.followUp && w.followUp > today && w.followUp <= end) items.push({ date: w.followUp, kind: 'waiting', label: '追蹤', title: w.what, id: w.id });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

// 行事曆：某段日期內的所有時間點
export function calendarItems(data, from, to) {
  const inRange = (k) => k && k >= from && k <= to;
  const items = [];
  for (const t of data.tasks) {
    if (t.status === 'dropped') continue;
    const done = t.status === 'done';
    if (inRange(t.dueDate)) items.push({ date: t.dueDate, kind: 'due', label: 'Deadline', title: t.title, id: t.id, type: 'task', done });
    if (inRange(t.todayDate) && t.todayDate !== t.dueDate) items.push({ date: t.todayDate, kind: 'today', label: 'Today', title: t.title, id: t.id, type: 'task', done });
    if (inRange(t.plannedDate) && t.plannedDate !== t.dueDate && t.plannedDate !== t.todayDate) items.push({ date: t.plannedDate, kind: 'plan', label: '預定', title: t.title, id: t.id, type: 'task', done });
    if (inRange(t.startDate) && ![t.dueDate, t.todayDate, t.plannedDate].includes(t.startDate)) items.push({ date: t.startDate, kind: 'plan', label: '開始', title: t.title, id: t.id, type: 'task', done });
  }
  for (const p of data.projects) {
    if (inRange(p.dueDate) && p.status !== 'dropped') items.push({ date: p.dueDate, kind: 'due', label: '計畫 Deadline', title: p.title, id: p.id, type: 'project', done: p.status === 'done' });
  }
  for (const g of data.goals) {
    if (inRange(g.targetDate) && g.status !== 'dropped') items.push({ date: g.targetDate, kind: 'goal', label: '目標日期', title: g.title, id: g.id, type: 'goal', done: g.status === 'done' });
  }
  for (const w of data.waiting) {
    if (inRange(w.followUp) && w.status === 'waiting') items.push({ date: w.followUp, kind: 'waiting', label: '追蹤', title: w.what, id: w.id, type: 'waiting', done: false });
  }
  const order = { due: 0, goal: 1, today: 2, plan: 3, waiting: 4 };
  return items.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]);
}

export const describeIdle = (t, today) => {
  const n = diffDays(today, touchedKey(t));
  return n >= 7 ? `${n} 天沒有動靜` : `最後更新 ${fmtShort(touchedKey(t), today)}`;
};
