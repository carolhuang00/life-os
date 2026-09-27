// 全域搜尋：任務、目標、計畫、Inbox、Someday、等待中、筆記
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { Modal } from './ui.js';
import { useEditor } from './editor.js';
import { navigate } from '../lib/router.js';
import { includesText } from '../lib/util.js';
import { TASK_STATUS_LABEL, SOMEDAY_LABEL, HORIZON_LABEL } from '../lib/constants.js';

const GROUPS = [
  { key: 'tasks', label: '任務' },
  { key: 'goals', label: '目標' },
  { key: 'projects', label: '計畫' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'someday', label: 'Someday' },
  { key: 'waiting', label: '等待中' },
  { key: 'notes', label: '筆記' },
];

export function SearchModal({ onClose }) {
  const { data } = useStore();
  const { openEditor } = useEditor();
  const [q, setQ] = useState('');
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 30); }, []);

  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    const m = (...xs) => xs.some((x) => includesText(Array.isArray(x) ? x.join(' ') : x, s));
    const out = {
      tasks: data.tasks.filter((t) => m(t.title, t.notes, t.nextAction, t.tags)).map((t) => ({ id: t.id, title: t.title, sub: TASK_STATUS_LABEL[t.status], open: () => openEditor('task', { id: t.id }) })),
      goals: data.goals.filter((g) => m(g.title, g.why)).map((g) => ({ id: g.id, title: g.title, sub: HORIZON_LABEL[g.horizon], open: () => navigate(`/goals/${g.id}`) })),
      projects: data.projects.filter((p) => m(p.title, p.description)).map((p) => ({ id: p.id, title: p.title, sub: '計畫', open: () => navigate(`/projects/${p.id}`) })),
      inbox: data.inbox.filter((i) => m(i.text)).map((i) => ({ id: i.id, title: i.text, sub: i.archived ? '已封存' : 'Inbox', open: () => navigate('/inbox') })),
      someday: data.someday.filter((x) => m(x.title, x.notes)).map((x) => ({ id: x.id, title: x.title, sub: SOMEDAY_LABEL[x.category], open: () => openEditor('someday', { id: x.id }) })),
      waiting: data.waiting.filter((w) => m(w.what, w.who, w.notes)).map((w) => ({ id: w.id, title: w.what, sub: w.who ? `等 ${w.who}` : '等待中', open: () => openEditor('waiting', { id: w.id }) })),
      notes: data.notes.filter((n) => m(n.title, n.body)).map((n) => ({ id: n.id, title: n.title, sub: '筆記', open: () => openEditor('note', { id: n.id }) })),
    };
    return GROUPS.map((g) => ({ ...g, items: out[g.key].slice(0, 8) })).filter((g) => g.items.length);
  }, [q, data]);

  const flat = results.flatMap((g) => g.items);
  const pick = (it) => { onClose(); setTimeout(it.open, 0); };

  return html`<${Modal} title="搜尋" onClose=${onClose} className="search-modal">
    <input ref=${ref} class="search-input" type="search" placeholder="搜尋任務、目標、計畫、Inbox、Someday、筆記…" value=${q}
      onInput=${(e) => setQ(e.currentTarget.value)}
      onKeyDown=${(e) => { if (e.key === 'Enter' && flat[0]) pick(flat[0]); }} />
    <div class="search-results">
      ${q.trim() && !results.length && html`<p class="muted center pad">找不到符合「${q}」的內容。</p>`}
      ${results.map((g) => html`<div class="search-group" key=${g.key}>
        <div class="search-group-label">${g.label}</div>
        ${g.items.map((it) => html`<button type="button" class="search-item" onClick=${() => pick(it)}>
          <span class="search-title">${it.title}</span><span class="muted small">${it.sub}</span>
        </button>`)}
      </div>`)}
      ${!q.trim() && html`<p class="muted small pad">小技巧：在電腦上按 <kbd>/</kbd> 或 <kbd>⌘K</kbd> 可以隨時打開搜尋。</p>`}
    </div>
  <//>`;
}
