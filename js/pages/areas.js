// 人生領域：可新增、修改、刪除、排序，自訂名稱與 icon
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { PageHead, Empty } from '../components/ui.js';
import { Icon } from '../components/icons.js';
import { taskAreaId, projectAreaId, isOpen } from '../lib/insights.js';

export function AreasPage() {
  const store = useStore();
  const { data, idx } = store;
  const { openEditor } = useEditor();
  const areas = [...data.areas].sort((a, b) => a.order - b.order);
  const stat = (id) => ({
    goals: data.goals.filter((g) => g.areaId === id && g.status === 'active').length,
    projects: data.projects.filter((p) => projectAreaId(p, idx) === id && !['done', 'dropped'].includes(p.status)).length,
    tasks: data.tasks.filter((t) => isOpen(t) && taskAreaId(t, idx) === id).length,
  });
  return html`<div class="page">
    <${PageHead} eyebrow="Areas" title="人生領域" sub="生活由很多面向組成。工作只是其中之一。"
      actions=${html`<button class="btn primary" onClick=${() => openEditor('area')}>新增領域</button>`} />
    ${areas.length
      ? html`<div class="area-list">${areas.map((a, i) => {
          const s = stat(a.id);
          return html`<div class="area-row" key=${a.id} style=${`--c:${a.color}`}>
            <span class="area-preview">${a.icon}</span>
            <button class="area-row-main" onClick=${() => openEditor('area', { id: a.id })}>
              <strong>${a.name}</strong>
              <span class="muted small">${s.goals} 個目標 · ${s.projects} 個計畫 · ${s.tasks} 件未完成任務</span>
            </button>
            <div class="row gap-4">
              <button class="icon-btn subtle" aria-label="上移" disabled=${i === 0} onClick=${() => store.reorderArea(a.id, -1)}><${Icon} name="up" size=${16} /></button>
              <button class="icon-btn subtle" aria-label="下移" disabled=${i === areas.length - 1} onClick=${() => store.reorderArea(a.id, 1)}><${Icon} name="down" size=${16} /></button>
              <button class="icon-btn subtle" aria-label="編輯" onClick=${() => openEditor('area', { id: a.id })}><${Icon} name="edit" size=${16} /></button>
            </div>
          </div>`;
        })}</div>`
      : html`<${Empty} title="還沒有人生領域">新增幾個你在意的生活面向，例如工作、健康、家庭。<//>`}
  </div>`;
}
