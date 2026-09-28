// LocalStorage 讀寫、資料正規化、匯入合併
import { STORAGE_KEY, DATA_VERSION, DEFAULT_AREAS, DEFAULT_SETTINGS, LEGACY_COLORS } from './constants.js';
import { nowISO } from './date.js';
import { uid } from './util.js';

export const COLLECTIONS = ['areas', 'goals', 'projects', 'tasks', 'inbox', 'someday', 'waiting', 'notes'];

export function emptyData() {
  return {
    version: DATA_VERSION,
    areas: DEFAULT_AREAS.map((a, i) => ({ ...a, order: i })),
    goals: [],
    projects: [],
    tasks: [],
    inbox: [],
    someday: [],
    waiting: [],
    notes: [],
    dayPlans: {},
    reviews: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

const str = (v) => (v == null ? '' : String(v));

// 每種資料補齊預設欄位，確保舊版或手動修改過的 JSON 也能正常使用
const DEFAULTS = {
  areas: (x, i) => ({ id: x.id || uid('area'), name: str(x.name) || '未命名', icon: str(x.icon) || '•', color: LEGACY_COLORS[x.color] || x.color || '#5E7F99', order: x.order ?? i }),
  goals: (x) => ({
    id: x.id || uid('goal'), title: str(x.title) || '未命名目標', areaId: str(x.areaId), horizon: x.horizon || 'year',
    why: str(x.why), startDate: str(x.startDate), targetDate: str(x.targetDate), status: x.status || 'active',
    progressMode: x.progressMode === 'manual' ? 'manual' : 'auto', progress: Number(x.progress) || 0,
    createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(), demo: !!x.demo,
  }),
  projects: (x) => ({
    id: x.id || uid('proj'), title: str(x.title) || '未命名計畫', areaId: str(x.areaId), goalId: str(x.goalId),
    description: str(x.description), startDate: str(x.startDate), dueDate: str(x.dueDate), status: x.status || 'active',
    progressMode: x.progressMode === 'manual' ? 'manual' : 'auto', progress: Number(x.progress) || 0,
    createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(), demo: !!x.demo,
  }),
  tasks: (x) => ({
    id: x.id || uid('task'), title: str(x.title) || '未命名任務', areaId: str(x.areaId), goalId: str(x.goalId),
    projectId: str(x.projectId), priority: str(x.priority), status: x.status || 'todo',
    createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(),
    startDate: str(x.startDate), dueDate: str(x.dueDate), plannedDate: str(x.plannedDate),
    estimate: x.estimate ? Number(x.estimate) : '', nextAction: str(x.nextAction), notes: str(x.notes),
    tags: Array.isArray(x.tags) ? x.tags.map(String) : [], todayDate: str(x.todayDate),
    completedAt: str(x.completedAt), blocksOthers: !!x.blocksOthers, demo: !!x.demo,
  }),
  inbox: (x) => ({ id: x.id || uid('inbox'), text: str(x.text), createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(), archived: !!x.archived, demo: !!x.demo }),
  someday: (x) => ({
    id: x.id || uid('some'), title: str(x.title) || '未命名', category: x.category || 'other', areaId: str(x.areaId),
    notes: str(x.notes), createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(), demo: !!x.demo,
  }),
  waiting: (x) => ({
    id: x.id || uid('wait'), what: str(x.what) || '未命名', who: str(x.who), since: str(x.since), followUp: str(x.followUp),
    taskId: str(x.taskId), projectId: str(x.projectId), notes: str(x.notes), status: x.status === 'done' ? 'done' : 'waiting',
    doneAt: str(x.doneAt), createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(), demo: !!x.demo,
  }),
  notes: (x) => ({
    id: x.id || uid('note'), title: str(x.title) || '未命名筆記', body: str(x.body), areaId: str(x.areaId),
    createdAt: x.createdAt || nowISO(), updatedAt: x.updatedAt || x.createdAt || nowISO(), demo: !!x.demo,
  }),
};

export const normalizeItem = (col, x, i = 0) => DEFAULTS[col](x || {}, i);

export function normalize(raw) {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base, version: DATA_VERSION };
  for (const col of COLLECTIONS) {
    if (Array.isArray(raw[col])) out[col] = raw[col].filter((x) => x && typeof x === 'object').map((x, i) => DEFAULTS[col](x, i));
  }
  out.dayPlans = raw.dayPlans && typeof raw.dayPlans === 'object' ? raw.dayPlans : {};
  out.reviews = raw.reviews && typeof raw.reviews === 'object' ? raw.reviews : {};
  out.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
  return out;
}

export function isValidBackup(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return COLLECTIONS.some((c) => Array.isArray(raw[c]));
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn('讀取資料失敗', e);
    return null;
  }
}

export function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('儲存資料失敗', e);
    return false;
  }
}

// 合併：同 id 以較新的 updatedAt 為準，新 id 直接加入；設定保留目前的
export function mergeData(current, incomingRaw) {
  const inc = normalize(incomingRaw);
  const out = { ...current };
  let added = 0;
  let updated = 0;
  for (const col of COLLECTIONS) {
    const map = new Map(current[col].map((x) => [x.id, x]));
    for (const item of inc[col]) {
      const cur = map.get(item.id);
      if (!cur) {
        map.set(item.id, item);
        added++;
      } else if ((item.updatedAt || '') > (cur.updatedAt || '')) {
        map.set(item.id, item);
        updated++;
      }
    }
    out[col] = [...map.values()];
  }
  out.dayPlans = { ...inc.dayPlans, ...current.dayPlans };
  out.reviews = { ...inc.reviews, ...current.reviews };
  return { data: out, added, updated };
}

export function stripDemo(data) {
  const out = { ...data };
  for (const col of COLLECTIONS) out[col] = data[col].filter((x) => !x.demo);
  const alive = new Set(out.tasks.map((t) => t.id));
  const goals = new Set(out.goals.map((g) => g.id));
  const projects = new Set(out.projects.map((p) => p.id));
  out.projects = out.projects.map((p) => (p.goalId && !goals.has(p.goalId) ? { ...p, goalId: '' } : p));
  out.tasks = out.tasks.map((t) => ({
    ...t,
    goalId: t.goalId && !goals.has(t.goalId) ? '' : t.goalId,
    projectId: t.projectId && !projects.has(t.projectId) ? '' : t.projectId,
  }));
  out.waiting = out.waiting.map((w) => ({
    ...w,
    taskId: w.taskId && !alive.has(w.taskId) ? '' : w.taskId,
    projectId: w.projectId && !projects.has(w.projectId) ? '' : w.projectId,
  }));
  out.dayPlans = {};
  out.reviews = Object.fromEntries(Object.entries(data.reviews || {}).filter(([, r]) => !r.demo));
  return out;
}
