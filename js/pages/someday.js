// Someday：想做但不急的事，沒有 Deadline、沒有壓力
import { useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { useUI, PageHead, Empty, Segmented, AreaTag, Menu, QuickInput } from '../components/ui.js';
import { useUndoableRemove } from '../components/forms.js';
import { setQuery, navigate } from '../lib/router.js';
import { SOMEDAY_CATS, SOMEDAY_LABEL } from '../lib/constants.js';

export function SomedayPage({ query }) {
  const store = useStore();
  const { data } = store;
  const { openEditor } = useEditor();
  const ui = useUI();
  const removeUndo = useUndoableRemove();
  const cat = query.cat || 'all';
  const [newCat, setNewCat] = useState('idea');
  const list = data.someday.filter((x) => cat === 'all' || x.category === cat).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (c) => data.someday.filter((x) => c === 'all' || x.category === c).length;

  // 開始進行：轉成任務／計畫／目標，成功後從 Someday 移除
  const start = (item, type) => {
    const initial = type === 'task' ? { title: item.title, areaId: item.areaId, notes: item.notes } : type === 'project' ? { title: item.title, areaId: item.areaId, description: item.notes } : { title: item.title, areaId: item.areaId, why: item.notes };
    openEditor(type, {
      initial,
      onSaved: (id) => {
        store.remove('someday', item.id);
        ui.toast('開始進行了');
        if (type === 'project') navigate(`/projects/${id}`);
        if (type === 'goal') navigate(`/goals/${id}`);
      },
    });
  };

  return html`<div class="page">
    <${PageHead} eyebrow="Someday" title="想做清單" sub="想去的地方、想學的東西、未來的點子。先放在這裡，不用急著開始。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('someday', { initial: { category: cat !== 'all' ? cat : 'idea' } })}>新增</button>`} />
    <${QuickInput} placeholder="有一天想做的事…" buttonLabel="放進來" onSubmit=${(v) => store.add('someday', { title: v, category: cat !== 'all' ? cat : newCat })}>
      ${cat === 'all' && html`<select class="quick-select" value=${newCat} onChange=${(e) => setNewCat(e.currentTarget.value)} aria-label="類型">
        ${SOMEDAY_CATS.map((c) => html`<option value=${c.id}>${c.label}</option>`)}
      </select>`}
    <//>
    <div class="filters">
      <${Segmented} value=${cat} onChange=${(v) => setQuery({ cat: v === 'all' ? '' : v })}
        options=${[{ id: 'all', label: '全部' }, ...SOMEDAY_CATS].map((o) => ({ ...o, count: count(o.id) }))} />
    </div>
    ${list.length
      ? html`<div class="someday-grid">
          ${list.map((x) => html`<div class="someday-card" key=${x.id} onClick=${() => openEditor('someday', { id: x.id })}>
            <div class="someday-top">
              <span class="cat-pill">${SOMEDAY_LABEL[x.category]}</span>
              <${Menu} items=${[
                { label: '開始進行：轉成任務', onClick: () => start(x, 'task') },
                { label: '開始進行：轉成計畫', onClick: () => start(x, 'project') },
                { label: '開始進行：轉成目標', onClick: () => start(x, 'goal') },
                '-',
                { label: '編輯', onClick: () => openEditor('someday', { id: x.id }) },
                { label: '刪除', danger: true, onClick: () => removeUndo('someday', x.id) },
              ]} />
            </div>
            <h3>${x.title}</h3>
            ${x.notes && html`<p class="muted small">${x.notes}</p>`}
            <${AreaTag} areaId=${x.areaId} small />
          </div>`)}
        </div>`
      : html`<${Empty} title="這裡還是空的">想學攝影、想去冰島、想做個人網站？都可以先放進來。<//>`}
  </div>`;
}
