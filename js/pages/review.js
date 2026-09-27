// 每週回顧：看看完成了什麼、還在路上的事、下週想專注什麼、可以放掉什麼
import { useState, useEffect } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useUI, PageHead, AreaTag, Empty } from '../components/ui.js';
import { useTaskActions } from '../components/TaskRow.js';
import { BalanceBars } from '../components/widgets.js';
import { Icon } from '../components/icons.js';
import { setQuery } from '../lib/router.js';
import { cx } from '../lib/util.js';
import { todayKey, addDays, weekStart, fmtRange, isValidKey, diffDays, fmtShort } from '../lib/date.js';
import { doneKey, taskAreaId, isOpen, touchedKey, staleTasks, describeIdle } from '../lib/insights.js';

export function ReviewPage({ query }) {
  const store = useStore();
  const { data, idx } = store;
  const ui = useUI();
  const act = useTaskActions();
  const today = todayKey();
  const thisWeek = weekStart(today);
  const week = isValidKey(query.w) ? weekStart(query.w) : thisWeek;
  const end = addDays(week, 6);
  const nextWeek = addDays(week, 7);
  const isCurrent = week === thisWeek;

  // 這週完成了什麼（依人生領域分組）
  const done = data.tasks.filter((t) => t.status === 'done' && doneKey(t) >= week && doneKey(t) <= end);
  const groups = {};
  for (const t of done) (groups[taskAreaId(t, idx) || '_none'] ||= []).push(t);
  const groupRows = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

  // 還在路上的事情
  const cutoff = end < today ? end : addDays(today, -1);
  const overdue = data.tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate <= cutoff);
  const deferred = data.tasks.filter((t) => t.status === 'deferred');
  const idle = data.tasks.filter((t) => ['todo', 'doing'].includes(t.status) && diffDays(today, touchedKey(t)) >= 14 && !(t.dueDate && t.dueDate <= cutoff));

  // 可以放掉什麼
  const letGo = [...staleTasks(data, today, data.settings.staleDays), ...data.tasks.filter((t) => t.status === 'paused')]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .slice(0, 8);

  // 下週 Focus
  const saved = data.reviews[nextWeek]?.focus || [];
  const [focus, setFocus] = useState(saved);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState(data.reviews[week]?.note || '');
  useEffect(() => { setFocus(data.reviews[nextWeek]?.focus || []); setNote(data.reviews[week]?.note || ''); }, [week]);

  const options = [
    ...data.goals.filter((g) => g.status === 'active').map((g) => ({ type: 'goal', id: g.id, title: g.title, areaId: g.areaId, kind: '目標' })),
    ...data.projects.filter((p) => ['active', 'planning'].includes(p.status)).map((p) => ({ type: 'project', id: p.id, title: p.title, areaId: p.areaId || idx.goals[p.goalId]?.areaId, kind: '計畫' })),
  ];
  const picked = (o) => focus.some((f) => f.type === o.type && f.id === o.id);
  const toggle = (o) => {
    if (picked(o)) return setFocus(focus.filter((f) => !(f.type === o.type && f.id === o.id)));
    if (focus.length >= 3) return ui.toast('下週 Focus 最多選 3 個，少一點比較做得到。');
    setFocus([...focus, { type: o.type, id: o.id, title: o.title }]);
  };
  const addCustom = (e) => {
    e.preventDefault();
    const v = custom.trim();
    if (!v) return;
    if (focus.length >= 3) return ui.toast('下週 Focus 最多選 3 個。');
    setFocus([...focus, { type: 'text', id: 'txt_' + Date.now().toString(36), title: v }]);
    setCustom('');
  };
  const saveAll = () => {
    store.saveReview(nextWeek, { focus });
    store.saveReview(week, { note });
    ui.toast('回顧已儲存，下週的 Focus 會出現在首頁');
  };

  return html`<div class="page">
    <${PageHead} eyebrow="Weekly Review" title="每週回顧" sub="花 10 分鐘看看這週，不是檢討，是整理。" />
    <div class="cal-nav review-nav">
      <button class="icon-btn" aria-label="上一週" onClick=${() => setQuery({ w: addDays(week, -7) })}><${Icon} name="left" /></button>
      <span class="cal-title">${isCurrent ? '這週' : '那週'} · ${fmtRange(week, end)}</span>
      <button class="icon-btn" aria-label="下一週" disabled=${isCurrent} onClick=${() => setQuery({ w: addDays(week, 7) === thisWeek ? '' : addDays(week, 7) })}><${Icon} name="right" /></button>
      ${!isCurrent && html`<button class="btn ghost small" onClick=${() => setQuery({ w: '' })}>回到這週</button>`}
    </div>

    <section class="card">
      <div class="card-head"><h2>1. 這週完成了什麼</h2><span class="muted small">${done.length} 件</span></div>
      ${done.length
        ? html`<div class="review-groups">${groupRows.map(([areaId, list]) => html`<div class="review-group" key=${areaId}>
            <div class="review-group-head">${areaId === '_none' ? html`<span class="muted">未分類</span>` : html`<${AreaTag} areaId=${areaId} />`}<span class="muted small">${list.length} 件</span></div>
            <ul class="plain-list">${list.map((t) => html`<li key=${t.id}>${t.title}</li>`)}</ul>
          </div>`)}</div>`
        : html`<p class="muted small">這週還沒有完成紀錄。有時候一週就是比較慢，沒關係。</p>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>2. 還在路上的事情</h2></div>
      ${!overdue.length && !deferred.length && !idle.length && html`<p class="muted small">沒有卡住的事情，節奏很穩。</p>`}
      ${overdue.length > 0 && html`<div class="review-sub"><h3>過了 Deadline <span class="muted">${overdue.length}</span></h3>
        <p class="muted small">可以重新安排日期，或想想是否還需要做。</p>
        <ul class="plain-list">${overdue.map((t) => html`<li key=${t.id}>${t.title} <span class="muted small">原定 ${fmtShort(t.dueDate, today)}</span></li>`)}</ul></div>`}
      ${deferred.length > 0 && html`<div class="review-sub"><h3>延後中 <span class="muted">${deferred.length}</span></h3>
        <ul class="plain-list">${deferred.map((t) => html`<li key=${t.id}>${t.title}</li>`)}</ul></div>`}
      ${idle.length > 0 && html`<div class="review-sub"><h3>一陣子沒有推進 <span class="muted">${idle.length}</span></h3>
        <ul class="plain-list">${idle.map((t) => html`<li key=${t.id}>${t.title} <span class="muted small">${describeIdle(t, today)}</span></li>`)}</ul></div>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>3. 這週的生活分布</h2></div>
      <${BalanceBars} from=${week} to=${end} emptyText="這週還沒有完成紀錄。" />
    </section>

    <section class="card">
      <div class="card-head"><div><h2>4. ${isCurrent ? '下週' : '隔週'}想專注什麼</h2><p class="muted small">選 1～3 個就好，會顯示在首頁提醒你。</p></div><span class="muted small">${focus.length} / 3</span></div>
      ${focus.length > 0 && html`<ol class="week-focus picked">${focus.map((f) => html`<li key=${f.type + f.id}>${f.title}<button class="icon-btn subtle" aria-label="移除" onClick=${() => setFocus(focus.filter((x) => x !== f))}><${Icon} name="x" size=${14} /></button></li>`)}</ol>`}
      <div class="focus-options">
        ${options.map((o) => html`<button type="button" key=${o.type + o.id} class=${cx('focus-option', picked(o) && 'on')} onClick=${() => toggle(o)}>
          <span class="muted small">${o.kind}</span><span>${o.title}</span>
        </button>`)}
      </div>
      <form class="inline-form" onSubmit=${addCustom}>
        <input placeholder="或自己寫一個，例如：好好睡覺" value=${custom} onInput=${(e) => setCustom(e.currentTarget.value)} />
        <button class="btn ghost small" type="submit">加入</button>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>5. 可以放掉什麼</h2><p class="muted small">放棄、延後、刪除，都是正常的整理方式。</p></div></div>
      ${letGo.length
        ? html`<div class="letgo-list">${letGo.map((t) => html`<div class="letgo-row" key=${t.id}>
            <div><div>${t.title}</div><div class="muted small">${describeIdle(t, today)}${t.status === 'paused' ? ' · 暫停中' : t.status === 'deferred' ? ' · 延後中' : ''}</div></div>
            <div class="row gap-4 wrap">
              <button class="btn ghost small" onClick=${() => act.setStatus(t, 'dropped', '已放棄。不做也是一種決定。')}>放棄</button>
              ${t.status !== 'deferred' && html`<button class="btn ghost small" onClick=${() => act.setStatus(t, 'deferred', '已延後')}>延後</button>`}
              <button class="btn ghost small" onClick=${() => act.keep(t)}>保留</button>
              <button class="btn ghost small danger-text" onClick=${() => act.remove(t)}>刪除</button>
            </div>
          </div>`)}</div>`
        : html`<p class="muted small">目前沒有看起來已經不重要的事情。</p>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>6. 一句話記下這週</h2></div>
      <textarea class="review-note" rows="3" placeholder="這週印象最深的一件事？想對下週的自己說什麼？" value=${note} onInput=${(e) => setNote(e.currentTarget.value)}></textarea>
    </section>

    <div class="sticky-save"><button class="btn primary" onClick=${saveAll}>儲存這週的回顧</button></div>
  </div>`;
}
