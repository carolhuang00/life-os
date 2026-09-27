// 入口：組合資料狀態、提示元件、編輯器與路由
import { render } from 'preact';
import { html } from './lib/html.js';
import { StoreProvider } from './store.js';
import { UIProvider, Empty } from './components/ui.js';
import { EditorProvider } from './components/editor.js';
import { Layout } from './components/layout.js';
import { useRoute } from './lib/router.js';
import { TodayPage } from './pages/today.js';
import { InboxPage } from './pages/inbox.js';
import { TasksPage } from './pages/tasks.js';
import { GoalsPage, GoalDetailPage } from './pages/goals.js';
import { ProjectsPage, ProjectDetailPage } from './pages/projects.js';
import { SomedayPage } from './pages/someday.js';
import { WaitingPage } from './pages/waiting.js';
import { CalendarPage } from './pages/calendar.js';
import { ReviewPage } from './pages/review.js';
import { NotesPage } from './pages/notes.js';
import { AreasPage } from './pages/areas.js';
import { SettingsPage } from './pages/settings.js';

const TITLES = {
  '': '今天', inbox: 'Inbox', tasks: '任務', goals: '目標', projects: '計畫', someday: 'Someday',
  review: '每週回顧', calendar: '行事曆', waiting: '等待中', notes: '筆記', areas: '人生領域', settings: '設定',
};

function Page({ route }) {
  const [section, id] = route.parts;
  const q = route.query;
  document.title = `${TITLES[section || ''] || 'Life OS'} · Life OS`;
  switch (section) {
    case undefined: return html`<${TodayPage} />`;
    case 'inbox': return html`<${InboxPage} />`;
    case 'tasks': return html`<${TasksPage} query=${q} />`;
    case 'goals': return id ? html`<${GoalDetailPage} id=${id} />` : html`<${GoalsPage} query=${q} />`;
    case 'projects': return id ? html`<${ProjectDetailPage} id=${id} />` : html`<${ProjectsPage} query=${q} />`;
    case 'someday': return html`<${SomedayPage} query=${q} />`;
    case 'waiting': return html`<${WaitingPage} />`;
    case 'calendar': return html`<${CalendarPage} query=${q} />`;
    case 'review': return html`<${ReviewPage} query=${q} />`;
    case 'notes': return html`<${NotesPage} />`;
    case 'areas': return html`<${AreasPage} />`;
    case 'settings': return html`<${SettingsPage} />`;
    default: return html`<div class="page"><${Empty} title="找不到這個頁面"><a href="#/">回到今天</a><//></div>`;
  }
}

function App() {
  const route = useRoute();
  return html`<${StoreProvider}>
    <${UIProvider}>
      <${EditorProvider}>
        <${Layout} route=${route}><${Page} key=${route.path} route=${route} /><//>
      <//>
    <//>
  <//>`;
}

render(html`<${App} />`, document.getElementById('app'));
