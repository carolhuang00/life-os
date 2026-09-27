// 新增／編輯表單：除了名稱之外，全部都是選填
import { useState, useRef, useEffect } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useUI } from './ui.js';
import { cx, parseTags, fmtMinutes } from '../lib/util.js';
import { todayKey, addDays, fmtShort, isoToKey } from '../lib/date.js';
import {
  TASK_STATUS, PRIORITIES, GOAL_HORIZONS, GOAL_STATUS, PROJECT_STATUS, SOMEDAY_CATS, ESTIMATES, ICONS, COLORS,
} from '../lib/constants.js';
import { isOpen } from '../lib/insights.js';

// ---------- 欄位元件 ----------
export const Field = ({ label, hint, children, className }) => html`
  <label class=${cx('field', className)}>
    <span class="field-label">${label}</span>
    ${children}
    ${hint && html`<span class="field-hint">${hint}</span>`}
  </label>`;

export function AreaSelect({ value, onChange, placeholder = '未分類' }) {
  const { data } = useStore();
  const areas = [...data.areas].sort((a, b) => a.order - b.order);
  return html`<select value=${value} onChange=${(e) => onChange(e.currentTarget.value)}>
    <option value="">${placeholder}</option>
    ${areas.map((a) => html`<option value=${a.id}>${a.icon} ${a.name}</option>`)}
  </select>`;
}

export function GoalSelect({ value, onChange, placeholder = '不屬於任何目標' }) {
  const { data } = useStore();
  const goals = data.goals.filter((g) => g.status === 'active' || g.id === value);
  return html`<select value=${value} onChange=${(e) => onChange(e.currentTarget.value)}>
    <option value="">${placeholder}</option>
    ${goals.map((g) => html`<option value=${g.id}>${g.title}</option>`)}
  </select>`;
}

export function ProjectSelect({ value, onChange }) {
  const { data } = useStore();
  const list = data.projects.filter((p) => !['done', 'dropped'].includes(p.status) || p.id === value);
  return html`<select value=${value} onChange=${(e) => onChange(e.currentTarget.value)}>
    <option value="">不屬於任何計畫</option>
    ${list.map((p) => html`<option value=${p.id}>${p.title}</option>`)}
  </select>`;
}

function Chips({ value, options, onChange, allowEmpty = true, emptyLabel = '不設定' }) {
  return html`<div class="chips">
    ${allowEmpty && html`<button type="button" class=${cx('chip', !value && 'on')} onClick=${() => onChange('')}>${emptyLabel}</button>`}
    ${options.map((o) => html`<button type="button" class=${cx('chip', value === o.id && 'on', o.tone)} onClick=${() => onChange(o.id)}>${o.label}</button>`)}
  </div>`;
}

function useForm(init) {
  const [f, setF] = useState(init);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const bind = (k) => ({
    value: f[k] ?? '',
    onInput: (e) => set(k, e.currentTarget.value),
  });
  return [f, set, bind, setF];
}

function useAutofocus() {
  const ref = useRef();
  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 30);
  }, []);
  return ref;
}

function Actions({ onCancel, onDelete, deleteLabel = '刪除', submitLabel = '儲存', extra }) {
  return html`<div class="form-actions">
    ${onDelete && html`<button type="button" class="btn ghost danger-text" onClick=${onDelete}>${deleteLabel}</button>`}
    ${extra}
    <span class="spacer"></span>
    <button type="button" class="btn ghost" onClick=${onCancel}>取消</button>
    <button type="submit" class="btn primary">${submitLabel}</button>
  </div>`;
}

// 刪除後顯示「復原」
export function useUndoableRemove() {
  const store = useStore();
  const ui = useUI();
  return (col, id, text = '已刪除') => {
    const removed = store.remove(col, id);
    ui.toast(text, { action: { label: '復原', run: () => store.restore(removed) } });
  };
}

// ---------- 任務 ----------
export function TaskForm({ id, initial = {}, onDone, onCancel }) {
  const store = useStore();
  const ui = useUI();
  const removeUndo = useUndoableRemove();
  const today = todayKey();
  const existing = id ? store.idx.tasks[id] : null;
  const base = {
    title: '', areaId: '', goalId: '', projectId: '', priority: '', status: 'todo', startDate: '', dueDate: '', plannedDate: '',
    estimate: '', nextAction: '', notes: '', todayDate: '', blocksOthers: false, ...(existing || {}), ...initial,
  };
  base.tags = (existing?.tags || initial.tags || []).join(', ');
  const [f, set, bind] = useForm(base);
  const [more, setMore] = useState(
    !!(existing && (existing.goalId || existing.projectId || existing.startDate || existing.plannedDate || existing.nextAction || existing.notes || existing.tags.length || existing.estimate || existing.blocksOthers))
  );
  const titleRef = useAutofocus();
  // 沒有自己設定時，顯示從計畫／目標繼承來的領域與目標
  const proj = store.idx.projects[f.projectId];
  const inheritGoal = proj && store.idx.goals[proj.goalId];
  const inheritArea = store.idx.areas[proj?.areaId || store.idx.goals[f.goalId || proj?.goalId]?.areaId];
  const areaPlaceholder = inheritArea ? `跟隨${proj?.areaId ? '計畫' : '目標'}（${inheritArea.icon} ${inheritArea.name}）` : '未分類';
  const goalPlaceholder = inheritGoal ? `跟隨計畫（${inheritGoal.title}）` : '不屬於任何目標';

  const onProject = (pid) => {
    set('projectId', pid);
    const p = store.idx.projects[pid];
    if (p) {
      if (!f.goalId && p.goalId) set('goalId', p.goalId);
      if (!f.areaId && (p.areaId || store.idx.goals[p.goalId]?.areaId)) set('areaId', p.areaId || store.idx.goals[p.goalId].areaId);
    }
  };
  const onGoal = (gid) => {
    set('goalId', gid);
    const g = store.idx.goals[gid];
    if (g && !f.areaId && g.areaId) set('areaId', g.areaId);
  };

  const submit = (e) => {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) return titleRef.current?.focus();
    const payload = { ...f, title, tags: parseTags(f.tags), estimate: f.estimate ? Number(f.estimate) : '' };
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    let newId = id;
    if (existing) store.update('tasks', id, payload);
    else newId = store.add('tasks', payload);
    onDone(newId);
  };

  const onDelete = existing && (() => {
    removeUndo('tasks', id, `已刪除「${existing.title}」`);
    onCancel();
  });

  return html`<form class="form" onSubmit=${submit}>
    <input ref=${titleRef} class="title-input" placeholder="要做什麼？" ...${bind('title')} aria-label="任務名稱" />
    <div class="grid-2">
      <${Field} label="人生領域"><${AreaSelect} value=${f.areaId} placeholder=${areaPlaceholder} onChange=${(v) => set('areaId', v)} /><//>
      <${Field} label="Deadline"><input type="date" ...${bind('dueDate')} /><//>
    </div>
    <${Field} label="優先級"><${Chips} value=${f.priority} options=${PRIORITIES.map((p) => ({ id: p.id, label: p.label }))} onChange=${(v) => set('priority', v)} /><//>
    <div class="toggles">
      <label class="toggle"><input type="checkbox" checked=${f.todayDate === today} onChange=${(e) => set('todayDate', e.currentTarget.checked ? today : '')} /><span>加入今天</span></label>
      ${existing && html`<${Field} label="狀態" className="inline">
        <select value=${f.status} onChange=${(e) => set('status', e.currentTarget.value)}>
          ${TASK_STATUS.map((s) => html`<option value=${s.id}>${s.label}</option>`)}
        </select>
      <//>`}
    </div>

    ${!more && html`<button type="button" class="link-btn" onClick=${() => setMore(true)}>＋ 更多細節（目標、計畫、日期、下一步、備註…）</button>`}
    ${more && html`<div class="more-fields">
      <div class="grid-2">
        <${Field} label="所屬目標"><${GoalSelect} value=${f.goalId} placeholder=${goalPlaceholder} onChange=${onGoal} /><//>
        <${Field} label="所屬計畫"><${ProjectSelect} value=${f.projectId} onChange=${onProject} /><//>
      </div>
      <div class="grid-3">
        <${Field} label="開始日期"><input type="date" ...${bind('startDate')} /><//>
        <${Field} label="預計完成日期"><input type="date" ...${bind('plannedDate')} /><//>
        <${Field} label="預估時間">
          <select value=${f.estimate} onChange=${(e) => set('estimate', e.currentTarget.value)}>
            <option value="">不確定</option>
            ${ESTIMATES.map((m) => html`<option value=${m}>${fmtMinutes(m)}</option>`)}
          </select>
        <//>
      </div>
      <${Field} label="下一步行動" hint="寫下最小、最具體的第一步，例如「打電話給診所」。"><input placeholder="下一步要做什麼？" ...${bind('nextAction')} /><//>
      <${Field} label="備註"><textarea rows="3" ...${bind('notes')}></textarea><//>
      <${Field} label="標籤" hint="用逗號分隔"><input placeholder="例如：AI, 採買" ...${bind('tags')} /><//>
      <label class="toggle"><input type="checkbox" checked=${f.blocksOthers} onChange=${(e) => set('blocksOthers', e.currentTarget.checked)} /><span>會影響其他事情（別人在等我，或卡住其他任務）</span></label>
      ${existing && html`<p class="meta-line">建立於 ${fmtShort(isoToKey(existing.createdAt))}${existing.completedAt ? ` · 完成於 ${fmtShort(isoToKey(existing.completedAt))}` : ''}</p>`}
    </div>`}
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '新增任務'} />
  </form>`;
}

// ---------- 目標 ----------
export function GoalForm({ id, initial = {}, onDone, onCancel }) {
  const store = useStore();
  const ui = useUI();
  const existing = id ? store.idx.goals[id] : null;
  const [f, set, bind] = useForm({
    title: '', areaId: '', horizon: 'quarter', why: '', startDate: todayKey(), targetDate: '', status: 'active', progressMode: 'auto', progress: 0,
    ...(existing || {}), ...initial,
  });
  const titleRef = useAutofocus();
  const submit = (e) => {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) return titleRef.current?.focus();
    const payload = { ...f, title, progress: Number(f.progress) || 0 };
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    let newId = id;
    if (existing) store.update('goals', id, payload);
    else newId = store.add('goals', payload);
    onDone(newId);
  };
  const onDelete = existing && (async () => {
    const ok = await ui.confirm({ title: '刪除這個目標？', message: '相關的計畫與任務會保留，只是不再連到這個目標。如果只是暫時不想做，也可以把狀態改成「暫停」或「放下了」。', confirmText: '刪除目標', danger: true });
    if (!ok) return;
    store.deleteGoal(id);
    ui.toast('目標已刪除');
    onCancel(true);
  });
  return html`<form class="form" onSubmit=${submit}>
    <input ref=${titleRef} class="title-input" placeholder="想往哪個方向前進？" ...${bind('title')} aria-label="目標名稱" />
    <${Field} label="時間範圍"><${Chips} value=${f.horizon} allowEmpty=${false} options=${GOAL_HORIZONS} onChange=${(v) => set('horizon', v)} /><//>
    <div class="grid-2">
      <${Field} label="人生領域"><${AreaSelect} value=${f.areaId} onChange=${(v) => set('areaId', v)} /><//>
      <${Field} label="目前狀態">
        <select value=${f.status} onChange=${(e) => set('status', e.currentTarget.value)}>${GOAL_STATUS.map((s) => html`<option value=${s.id}>${s.label}</option>`)}</select>
      <//>
    </div>
    <${Field} label="為什麼想做" hint="之後想放棄或忘記初衷時，回來看看這句話。"><textarea rows="2" ...${bind('why')}></textarea><//>
    <div class="grid-2">
      <${Field} label="開始日期"><input type="date" ...${bind('startDate')} /><//>
      <${Field} label="目標日期" hint="持續性的目標可以不填。"><input type="date" ...${bind('targetDate')} /><//>
    </div>
    <${Field} label="進度計算">
      <${Chips} value=${f.progressMode} allowEmpty=${false} options=${[{ id: 'auto', label: '依任務自動計算' }, { id: 'manual', label: '手動設定' }]} onChange=${(v) => set('progressMode', v)} />
    <//>
    ${f.progressMode === 'manual' && html`<div class="range-row"><input type="range" min="0" max="100" step="5" value=${f.progress} onInput=${(e) => set('progress', e.currentTarget.value)} /><span>${f.progress}%</span></div>`}
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '建立目標'} />
  </form>`;
}

// ---------- 計畫 ----------
export function ProjectForm({ id, initial = {}, onDone, onCancel }) {
  const store = useStore();
  const ui = useUI();
  const existing = id ? store.idx.projects[id] : null;
  const [f, set, bind] = useForm({
    title: '', areaId: '', goalId: '', description: '', startDate: todayKey(), dueDate: '', status: 'active', progressMode: 'auto', progress: 0,
    ...(existing || {}), ...initial,
  });
  const titleRef = useAutofocus();
  const onGoal = (gid) => {
    set('goalId', gid);
    const g = store.idx.goals[gid];
    if (g && !f.areaId && g.areaId) set('areaId', g.areaId);
  };
  const submit = (e) => {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) return titleRef.current?.focus();
    const payload = { ...f, title, progress: Number(f.progress) || 0 };
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    let newId = id;
    if (existing) store.update('projects', id, payload);
    else newId = store.add('projects', payload);
    onDone(newId);
  };
  const onDelete = existing && (async () => {
    const ok = await ui.confirm({ title: '刪除這個計畫？', message: '計畫裡的任務會保留，只是不再屬於這個計畫。', confirmText: '刪除計畫', danger: true });
    if (!ok) return;
    store.deleteProject(id);
    ui.toast('計畫已刪除');
    onCancel(true);
  });
  return html`<form class="form" onSubmit=${submit}>
    <input ref=${titleRef} class="title-input" placeholder="需要多個步驟完成的事情" ...${bind('title')} aria-label="計畫名稱" />
    <div class="grid-2">
      <${Field} label="人生領域"><${AreaSelect} value=${f.areaId} onChange=${(v) => set('areaId', v)} /><//>
      <${Field} label="對應目標"><${GoalSelect} value=${f.goalId} onChange=${onGoal} /><//>
    </div>
    <${Field} label="說明"><textarea rows="2" ...${bind('description')}></textarea><//>
    <div class="grid-3">
      <${Field} label="開始日期"><input type="date" ...${bind('startDate')} /><//>
      <${Field} label="Deadline"><input type="date" ...${bind('dueDate')} /><//>
      <${Field} label="狀態">
        <select value=${f.status} onChange=${(e) => set('status', e.currentTarget.value)}>${PROJECT_STATUS.map((s) => html`<option value=${s.id}>${s.label}</option>`)}</select>
      <//>
    </div>
    <${Field} label="進度計算">
      <${Chips} value=${f.progressMode} allowEmpty=${false} options=${[{ id: 'auto', label: '依任務自動計算' }, { id: 'manual', label: '手動設定' }]} onChange=${(v) => set('progressMode', v)} />
    <//>
    ${f.progressMode === 'manual' && html`<div class="range-row"><input type="range" min="0" max="100" step="5" value=${f.progress} onInput=${(e) => set('progress', e.currentTarget.value)} /><span>${f.progress}%</span></div>`}
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '建立計畫'} />
  </form>`;
}

// ---------- Someday ----------
export function SomedayForm({ id, initial = {}, onDone, onCancel }) {
  const store = useStore();
  const removeUndo = useUndoableRemove();
  const existing = id ? store.idx && store.data.someday.find((x) => x.id === id) : null;
  const [f, set, bind] = useForm({ title: '', category: 'idea', areaId: '', notes: '', ...(existing || {}), ...initial });
  const titleRef = useAutofocus();
  const submit = (e) => {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) return titleRef.current?.focus();
    const payload = { title, category: f.category, areaId: f.areaId, notes: f.notes };
    let newId = id;
    if (existing) store.update('someday', id, payload);
    else newId = store.add('someday', payload);
    onDone(newId);
  };
  const onDelete = existing && (() => { removeUndo('someday', id); onCancel(); });
  return html`<form class="form" onSubmit=${submit}>
    <input ref=${titleRef} class="title-input" placeholder="有一天想做的事" ...${bind('title')} aria-label="名稱" />
    <${Field} label="類型"><${Chips} value=${f.category} allowEmpty=${false} options=${SOMEDAY_CATS} onChange=${(v) => set('category', v)} /><//>
    <${Field} label="人生領域"><${AreaSelect} value=${f.areaId} onChange=${(v) => set('areaId', v)} /><//>
    <${Field} label="想法與備註"><textarea rows="3" ...${bind('notes')}></textarea><//>
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '放進 Someday'} />
  </form>`;
}

// ---------- 等待中 ----------
export function WaitingForm({ id, initial = {}, onDone, onCancel }) {
  const store = useStore();
  const removeUndo = useUndoableRemove();
  const today = todayKey();
  const existing = id ? store.data.waiting.find((x) => x.id === id) : null;
  const [f, set, bind] = useForm({ what: '', who: '', since: today, followUp: addDays(today, 3), taskId: '', projectId: '', notes: '', status: 'waiting', ...(existing || {}), ...initial });
  const titleRef = useAutofocus();
  const openTasks = store.data.tasks.filter((t) => isOpen(t) || t.id === f.taskId);
  const submit = (e) => {
    e.preventDefault();
    const what = f.what.trim();
    if (!what) return titleRef.current?.focus();
    const payload = { what, who: f.who, since: f.since, followUp: f.followUp, taskId: f.taskId, projectId: f.projectId, notes: f.notes, status: f.status, doneAt: f.status === 'done' ? existing?.doneAt || new Date().toISOString() : '' };
    let newId = id;
    if (existing) store.update('waiting', id, payload);
    else newId = store.add('waiting', payload);
    onDone(newId);
  };
  const onDelete = existing && (() => { removeUndo('waiting', id); onCancel(); });
  return html`<form class="form" onSubmit=${submit}>
    <input ref=${titleRef} class="title-input" placeholder="在等什麼？例如：等客戶回覆報價" ...${bind('what')} aria-label="等什麼" />
    <div class="grid-3">
      <${Field} label="等誰"><input placeholder="人名或單位" ...${bind('who')} /><//>
      <${Field} label="開始等待"><input type="date" ...${bind('since')} /><//>
      <${Field} label="Follow-up 日期"><input type="date" ...${bind('followUp')} /><//>
    </div>
    <div class="grid-2">
      <${Field} label="對應任務">
        <select value=${f.taskId} onChange=${(e) => set('taskId', e.currentTarget.value)}>
          <option value="">無</option>
          ${openTasks.map((t) => html`<option value=${t.id}>${t.title}</option>`)}
        </select>
      <//>
      <${Field} label="對應計畫"><${ProjectSelect} value=${f.projectId} onChange=${(v) => set('projectId', v)} /><//>
    </div>
    <${Field} label="備註"><textarea rows="2" ...${bind('notes')}></textarea><//>
    ${existing && html`<label class="toggle"><input type="checkbox" checked=${f.status === 'done'} onChange=${(e) => set('status', e.currentTarget.checked ? 'done' : 'waiting')} /><span>已經等到了</span></label>`}
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '新增等待事項'} />
  </form>`;
}

// ---------- 筆記 ----------
export function NoteForm({ id, initial = {}, onDone, onCancel }) {
  const store = useStore();
  const removeUndo = useUndoableRemove();
  const existing = id ? store.data.notes.find((x) => x.id === id) : null;
  const [f, set, bind] = useForm({ title: '', body: '', areaId: '', ...(existing || {}), ...initial });
  const titleRef = useAutofocus();
  const submit = (e) => {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) return titleRef.current?.focus();
    const payload = { title, body: f.body, areaId: f.areaId };
    let newId = id;
    if (existing) store.update('notes', id, payload);
    else newId = store.add('notes', payload);
    onDone(newId);
  };
  const onDelete = existing && (() => { removeUndo('notes', id); onCancel(); });
  return html`<form class="form" onSubmit=${submit}>
    <input ref=${titleRef} class="title-input" placeholder="筆記標題" ...${bind('title')} aria-label="筆記標題" />
    <${Field} label="人生領域"><${AreaSelect} value=${f.areaId} onChange=${(v) => set('areaId', v)} /><//>
    <${Field} label="內容"><textarea rows="8" ...${bind('body')}></textarea><//>
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '新增筆記'} />
  </form>`;
}

// ---------- 人生領域 ----------
export function AreaForm({ id, onDone, onCancel }) {
  const store = useStore();
  const ui = useUI();
  const existing = id ? store.idx.areas[id] : null;
  const [f, set, bind] = useForm({ name: '', icon: '🌱', color: COLORS[0], ...(existing || {}) });
  const titleRef = useAutofocus();
  const submit = (e) => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) return titleRef.current?.focus();
    const payload = { name, icon: f.icon.trim() || '•', color: f.color };
    let newId = id;
    if (existing) store.update('areas', id, payload);
    else newId = store.add('areas', { ...payload, order: store.data.areas.length });
    onDone(newId);
  };
  const onDelete = existing && (async () => {
    const ok = await ui.confirm({ title: `刪除「${existing.name}」？`, message: '屬於這個領域的目標、計畫與任務都會保留，只是變成「未分類」。', confirmText: '刪除領域', danger: true });
    if (!ok) return;
    store.deleteArea(id);
    onCancel(true);
  });
  return html`<form class="form" onSubmit=${submit}>
    <div class="area-name-row">
      <span class="area-preview" style=${`--c:${f.color}`}>${f.icon || '•'}</span>
      <input ref=${titleRef} class="title-input" placeholder="領域名稱，例如：寵物" ...${bind('name')} aria-label="領域名稱" />
    </div>
    <${Field} label="Icon" hint="點選一個，或在下方輸入任何 emoji／文字。">
      <div class="icon-grid">
        ${ICONS.map((ic) => html`<button type="button" class=${cx('icon-choice', f.icon === ic && 'on')} onClick=${() => set('icon', ic)}>${ic}</button>`)}
      </div>
      <input class="icon-input" maxlength="4" ...${bind('icon')} aria-label="自訂 icon" />
    <//>
    <${Field} label="顏色">
      <div class="color-grid">
        ${COLORS.map((c) => html`<button type="button" class=${cx('color-choice', f.color === c && 'on')} style=${`background:${c}`} onClick=${() => set('color', c)} aria-label=${c}></button>`)}
      </div>
    <//>
    <${Actions} onCancel=${onCancel} onDelete=${onDelete} submitLabel=${existing ? '儲存' : '新增領域'} />
  </form>`;
}
