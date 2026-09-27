// 全域編輯器：任何頁面都可以呼叫 openEditor('task', { id }) 打開表單
import { createContext } from 'preact';
import { useCallback, useContext, useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { Modal } from './ui.js';
import { TaskForm, GoalForm, ProjectForm, SomedayForm, WaitingForm, NoteForm, AreaForm } from './forms.js';

const EditorCtx = createContext(null);

const FORMS = {
  task: { C: TaskForm, add: '新增任務', edit: '編輯任務' },
  goal: { C: GoalForm, add: '新增目標', edit: '編輯目標' },
  project: { C: ProjectForm, add: '新增計畫', edit: '編輯計畫' },
  someday: { C: SomedayForm, add: '放進 Someday', edit: '編輯 Someday' },
  waiting: { C: WaitingForm, add: '新增等待事項', edit: '編輯等待事項' },
  note: { C: NoteForm, add: '新增筆記', edit: '編輯筆記' },
  area: { C: AreaForm, add: '新增人生領域', edit: '編輯人生領域' },
};

export function EditorProvider({ children }) {
  const [stack, setStack] = useState([]);

  // opts: { id, initial, title, onSaved(id), onDeleted() }
  const openEditor = useCallback((type, opts = {}) => {
    setStack((s) => [...s, { key: Math.random().toString(36).slice(2), type, ...opts }]);
  }, []);

  const close = (key) => setStack((s) => s.filter((x) => x.key !== key));

  return html`<${EditorCtx.Provider} value=${{ openEditor }}>
    ${children}
    ${stack.map((e) => {
      const def = FORMS[e.type];
      if (!def) return null;
      const C = def.C;
      return html`<${Modal} key=${e.key} title=${e.title || (e.id ? def.edit : def.add)} onClose=${() => close(e.key)}>
        <${C}
          id=${e.id}
          initial=${e.initial || {}}
          onDone=${(id) => { close(e.key); e.onSaved?.(id); }}
          onCancel=${(deleted) => { close(e.key); if (deleted === true) e.onDeleted?.(); }}
        />
      <//>`;
    })}
  <//>`;
}

export const useEditor = () => useContext(EditorCtx);
