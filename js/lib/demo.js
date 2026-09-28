// 示範資料（簡化版）：一個目標 → 一個計畫 → 幾件任務，加上 Inbox、Someday、等待中各一則
// 日期全部以「今天」為基準推算
import { addDays, todayKey, parseKey } from './date.js';
import { emptyData, normalize } from './storage.js';

export function buildDemoData(today = todayKey()) {
  const D = (n) => addDays(today, n);
  const iso = (n, hour = 10) => {
    const d = parseKey(D(n));
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const goals = [
    { id: 'g_fit', title: '建立運動習慣', areaId: 'area_health', horizon: 'year', why: '想要精神好一點、睡得更好。', startDate: D(-14), status: 'active', createdAt: iso(-14) },
  ];

  const projects = [
    { id: 'p_gym', title: '每週運動 3 次', areaId: 'area_health', goalId: 'g_fit', description: '健身、跑步輪流。', startDate: D(-14), status: 'active', createdAt: iso(-14) },
  ];

  const tasks = [
    { id: 't_gym', title: '晚上去健身房', projectId: 'p_gym', estimate: 60, todayDate: today, nextAction: '下班前先把運動服帶著', createdAt: iso(-2) },
    { id: 't_run', title: '晨跑 30 分鐘', projectId: 'p_gym', estimate: 30, status: 'done', completedAt: iso(-1, 7), createdAt: iso(-3) },
    { id: 't_mail', title: '回覆客戶信', areaId: 'area_work', priority: 'P1', dueDate: today, todayDate: today, estimate: 15, createdAt: iso(-1) },
    { id: 't_bills', title: '繳水電費', areaId: 'area_life', dueDate: D(2), estimate: 10, createdAt: iso(-1) },
  ].map((t) => ({ status: 'todo', ...t }));

  const inbox = [{ id: 'i1', text: '想買新的桌子', createdAt: iso(0, 9) }];
  const someday = [{ id: 's1', title: '學攝影', category: 'learn', areaId: 'area_learning', createdAt: iso(-5) }];
  const waiting = [{ id: 'w1', what: '等朋友確認聚餐時間', who: '小安', since: D(-2), followUp: D(1), createdAt: iso(-2) }];

  const mark = (list) => list.map((x) => ({ ...x, demo: true }));
  return normalize({
    ...emptyData(),
    goals: mark(goals),
    projects: mark(projects),
    tasks: mark(tasks),
    inbox: mark(inbox),
    someday: mark(someday),
    waiting: mark(waiting),
  });
}
