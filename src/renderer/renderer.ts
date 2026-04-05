// Import all styles
import './styles/theme.css';
import './styles/workbench.css';
import './styles/fileExplorer.css';
import './styles/editor.css';
import './styles/panels.css';

import { Workbench } from './workbench/Workbench';

async function main(): Promise<void> {
  const appRoot = document.getElementById('app');
  if (!appRoot) throw new Error('App root not found');

  // Boot workbench immediately — no auto folder picker
  const workbench = new Workbench(appRoot);

  // Set up menu listener for opening folders
  try {
    window.electronAPI.menu.onOpenFolder((folderPath: string) => {
      workbench.openFolder(folderPath);
    });
    window.electronAPI.menu.onOpenFile((filePath: string) => {
      workbench.openFile(filePath);
    });
    window.electronAPI.menu.onSave(() => workbench.save());
    window.electronAPI.menu.onSaveAll(() => workbench.saveAll());
    window.electronAPI.menu.onToggleSidebar(() => workbench.toggleSidebar());
    window.electronAPI.menu.onCommandPalette(() => workbench.openCommandPalette());
    window.electronAPI.menu.onFind(() => workbench.showSearch());
    window.electronAPI.menu.onToggleTerminal(() => workbench.toggleTerminal());
  } catch {
    console.warn('Electron API not available');
  }

  window.addEventListener('beforeunload', () => workbench.destroy());
}

main().catch((err) => {
  console.error(err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div style="color:#f14c4c;padding:24px;font-family:monospace;font-size:13px;white-space:pre-wrap;background:#1e1e1e;height:100vh;">
      <h2 style="color:#f14c4c;margin-bottom:12px;">LiteCode startup error</h2>
      ${String(err?.stack || err)}
    </div>`;
  }
});
