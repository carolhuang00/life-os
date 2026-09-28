// 全域資料狀態：所有新增、修改、刪除都經過這裡，並自動存進 LocalStorage
import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { html } from './lib/html.js';
import { load, save, normalize, normalizeItem, emptyData, mergeData, stripDemo, COLLECTIONS } from './lib/storage.js';
import { buildDemoData } from './lib/demo.js';
import { buildIndex } from './lib/insights.js';
import { nowISO, todayKey } from './lib/date.js';
import { uid } from './lib/util.js';

const StoreCtx = createContext(null);
const PREFIX = { areas: 'area', goals: 'goal', projects: 'proj', tasks: 'task', inbox: 'inbox', someday: 'some', waiting: 'wait', notes: 'note' };

function initialData() {
  const saved = load();
  if (saved) return saved;
  return buildDemoData(todayKey()); // 第一次打開：放示範資料
}

// 任務狀態變化時，同步完成時間
function taskPatch(prev, patch) {
  const next = { ...prev, ...patch };
  if (patch.status && patch.status !== prev.status) {
    if (patch.status === 'done') next.completedAt = next.completedAt && prev.status === 'done' ? next.completedAt : nowISO();
    else next.completedAt = '';
  }
  return next;
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(initialData);
  const ref = useRef(data);
  ref.current = data;

  const [saveOk, setSaveOk] = useState(true);
  useEffect(() => {
    setSaveOk(save(data));
  }, [data]);

  // 主題
  useEffect(() => {
    const apply = () => {
      const t = data.settings.theme;
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = dark ? '#0D1B26' : '#F3F8FB';
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [data.settings.theme]);

  const api = useMemo(() => {
    const touch = (x) => ({ ...x, updatedAt: nowISO() });

    const add = (col, fields = {}) => {
      const id = fields.id || uid(PREFIX[col]);
      const now = nowISO();
      const item = normalizeItem(col, { ...fields, id, createdAt: fields.createdAt || now, updatedAt: now }, ref.current[col].length);
      if (col === 'tasks' && item.status === 'done' && !item.completedAt) item.completedAt = now;
      setData((d) => ({ ...d, [col]: [...d[col], item] }));
      return id;
    };

    const update = (col, id, patch) =>
      setData((d) => ({
        ...d,
        [col]: d[col].map((x) => (x.id === id ? touch(col === 'tasks' ? taskPatch(x, patch) : { ...x, ...patch }) : x)),
      }));

    // 回傳被刪掉的項目與位置，讓「復原」可以放回原處
    const remove = (col, id) => {
      const list = ref.current[col];
      const index = list.findIndex((x) => x.id === id);
      const item = list[index];
      setData((d) => ({ ...d, [col]: d[col].filter((x) => x.id !== id) }));
      return { col, item, index };
    };

    const restore = ({ col, item, index }) => {
      if (!item) return;
      setData((d) => {
        if (d[col].some((x) => x.id === item.id)) return d;
        const list = [...d[col]];
        list.splice(Math.min(index, list.length), 0, item);
        return { ...d, [col]: list };
      });
    };

    return {
      add,
      update,
      remove,
      restore,
      setSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      setDayPlan: (date, patch) =>
        setData((d) => ({ ...d, dayPlans: { ...d.dayPlans, [date]: { focusIds: [], manual: [], ...(d.dayPlans[date] || {}), ...patch } } })),
      saveReview: (week, patch) =>
        setData((d) => ({ ...d, reviews: { ...d.reviews, [week]: { focus: [], note: '', ...(d.reviews[week] || {}), ...patch, demo: false, savedAt: nowISO() } } })),

      completeTask: (id, done = true) => update('tasks', id, { status: done ? 'done' : 'todo' }),
      toggleToday: (id) => {
        const t = ref.current.tasks.find((x) => x.id === id);
        if (!t) return false;
        const on = t.todayDate !== todayKey();
        update('tasks', id, { todayDate: on ? todayKey() : '' });
        return on;
      },

      // 刪除目標：相關計畫、任務保留，只解除關聯
      deleteGoal: (id) =>
        setData((d) => ({
          ...d,
          goals: d.goals.filter((g) => g.id !== id),
          projects: d.projects.map((p) => (p.goalId === id ? { ...p, goalId: '' } : p)),
          tasks: d.tasks.map((t) => (t.goalId === id ? { ...t, goalId: '' } : t)),
        })),
      deleteProject: (id) =>
        setData((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== id),
          tasks: d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: '', areaId: t.areaId || d.projects.find((p) => p.id === id)?.areaId || '' } : t)),
          waiting: d.waiting.map((w) => (w.projectId === id ? { ...w, projectId: '' } : w)),
        })),
      deleteArea: (id) =>
        setData((d) => {
          const next = { ...d, areas: d.areas.filter((a) => a.id !== id) };
          for (const col of ['goals', 'projects', 'tasks', 'someday', 'notes']) next[col] = d[col].map((x) => (x.areaId === id ? { ...x, areaId: '' } : x));
          return next;
        }),
      reorderArea: (id, dir) =>
        setData((d) => {
          const list = [...d.areas].sort((a, b) => a.order - b.order);
          const i = list.findIndex((a) => a.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return d;
          [list[i], list[j]] = [list[j], list[i]];
          return { ...d, areas: list.map((a, k) => ({ ...a, order: k })) };
        }),

      replaceAll: (raw) => setData({ ...normalize(raw), settings: { ...ref.current.settings, ...(raw?.settings || {}) } }),
      mergeIn: (raw) => {
        const r = mergeData(ref.current, raw);
        setData(r.data);
        return r;
      },
      clearDemo: () => setData((d) => stripDemo(d)),
      loadDemo: () => {
        const demo = buildDemoData(todayKey());
        setData((d) => {
          const cleared = stripDemo(d);
          const next = { ...cleared, reviews: { ...demo.reviews, ...cleared.reviews } };
          for (const col of COLLECTIONS) {
            if (col === 'areas') {
              const have = new Set(cleared.areas.map((a) => a.id));
              next.areas = [...cleared.areas, ...demo.areas.filter((a) => !have.has(a.id)).map((a, i) => ({ ...a, order: cleared.areas.length + i }))];
            } else next[col] = [...cleared[col], ...demo[col]];
          }
          return next;
        });
      },
      clearAll: () => setData({ ...emptyData(), settings: { ...ref.current.settings, welcomeDismissed: true } }),
    };
  }, []);

  const idx = useMemo(() => buildIndex(data), [data]);
  const value = useMemo(() => ({ data, idx, saveOk, ...api }), [data, idx, saveOk, api]);
  return html`<${StoreCtx.Provider} value=${value}>${children}<//>`;
}

export const useStore = () => useContext(StoreCtx);
