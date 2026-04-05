import { ActivityBar, Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { EditorArea } from '../editor/EditorArea';
import { FileExplorer } from '../fileExplorer/FileExplorer';
import { SearchPanel } from '../search/SearchPanel';
import { GitPanel } from '../git/GitPanel';
import { SettingsEditor } from '../settings/SettingsEditor';
import { BottomPanel } from './BottomPanel';
import { CommandPalette } from '../commandPalette/CommandPalette';
import { CommandRegistry } from '../commandPalette/CommandRegistry';
import { Notification } from './Notification';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ICONS = {
  explorer: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4C3 3.45 3.45 3 4 3h6l2 2h9c.55 0 1 .45 1 1v13c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V4z" fill="currentColor" opacity="0.85"/>
  </svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
    <path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  git: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="5" r="2.5" fill="currentColor"/>
    <circle cx="6" cy="12" r="2.5" fill="currentColor"/>
    <circle cx="18" cy="19" r="2.5" fill="currentColor"/>
    <path d="M8.5 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8.5 12c0-3.5 5-3.5 5-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8.5 12c0 3.5 5 3.5 5 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  extensions: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.7"/>
    <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.9"/>
    <path d="M16.5 13v9M13 16.5h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/>
  </svg>`,
};

export class Workbench {
  private appRoot: HTMLElement;
  private editorArea!: EditorArea;
  private statusBar!: StatusBar;
  private sidebar!: Sidebar;
  private activityBar!: ActivityBar;
  private fileExplorer!: FileExplorer;
  private searchPanel!: SearchPanel;
  private gitPanel!: GitPanel;
  private settingsEditor!: SettingsEditor;
  private bottomPanel!: BottomPanel;
  private commandPalette!: CommandPalette;
  private currentFolderPath: string | null = null;
  private allFilesList: string[] = [];
  private titleBarTextEl!: HTMLElement;

  constructor(appRoot: HTMLElement) {
    this.appRoot = appRoot;
    this.buildLayout();
    this.registerCommands();
    this.setupKeyboardShortcuts();
  }

  // ─── Layout Builder ─────────────────────────────────────────────────────────
  private buildLayout(): void {
    this.appRoot.innerHTML = '';
    this.appRoot.className = '';

    // Root structure:
    // #app → [title-bar] + [workbench-body] + [status-bar]
    // workbench-body → [activity-bar] + [sidebar] + [editor-main-area]
    // editor-main-area → [editor-area] + [bottom-panel]

    // Title bar
    const titleBar = this.buildTitleBar();
    this.appRoot.appendChild(titleBar);

    // Workbench body
    const workbenchBody = document.createElement('div');
    workbenchBody.className = 'workbench-body';
    this.appRoot.appendChild(workbenchBody);

    // Activity bar
    this.activityBar = new ActivityBar(workbenchBody, (id) => this.handleActivityToggle(id));

    // Sidebar
    this.sidebar = new Sidebar(workbenchBody);

    // Editor main area (vertical flex: editor + bottom panel)
    const editorMainArea = document.createElement('div');
    editorMainArea.className = 'editor-main-area';
    workbenchBody.appendChild(editorMainArea);

    // Editor area
    this.editorArea = new EditorArea(editorMainArea, {
      onTabChange: (file) => {
        if (file) {
          this.titleBarTextEl.textContent = `${file.name} — LiteCode`;
          this.statusBar.updateForFile(file.path, file.language);
        } else {
          this.titleBarTextEl.textContent = this.currentFolderPath
            ? `${this.currentFolderPath.split(/[\\/]/).pop()} — LiteCode`
            : 'LiteCode';
          this.statusBar.updateForFile(null, null);
        }
      },
      onDirtyChange: (filePath, isDirty) => {
        this.editorArea.tabBar.setDirty(filePath, isDirty);
      },
    });

    // Bottom panel (terminal etc.)
    this.bottomPanel = new BottomPanel(editorMainArea);

    // Status bar (must be LAST child of appRoot so it's at the bottom)
    this.statusBar = new StatusBar(this.appRoot);
    this.statusBar.bindEditorService(this.editorArea.editorService);

    // ─── Activity bar items ───────────────────────────────────────────────────
    this.activityBar.addItem({ id: 'explorer',   icon: ICONS.explorer,   tooltip: 'Explorer (Ctrl+Shift+E)' });
    this.activityBar.addItem({ id: 'search',     icon: ICONS.search,     tooltip: 'Search (Ctrl+Shift+F)' });
    this.activityBar.addItem({ id: 'git',        icon: ICONS.git,        tooltip: 'Source Control (Ctrl+Shift+G)' });
    this.activityBar.addItem({ id: 'extensions', icon: ICONS.extensions, tooltip: 'Extensions' });
    this.activityBar.addItem({ id: 'settings',   icon: ICONS.settings,   tooltip: 'Settings (Ctrl+,)', position: 'bottom' });

    // ─── Sidebar panels ───────────────────────────────────────────────────────
    // Explorer
    const explorerEl = document.createElement('div');
    explorerEl.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';
    this.fileExplorer = new FileExplorer(explorerEl, (filePath) => this.openFile(filePath));
    this.sidebar.addPanel('explorer', 'EXPLORER', explorerEl);

    // Search
    const searchEl = document.createElement('div');
    searchEl.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';
    this.searchPanel = new SearchPanel(searchEl, (filePath, lineNumber) => this.openFile(filePath, lineNumber));
    this.sidebar.addPanel('search', 'SEARCH', searchEl);

    // Git
    const gitEl = document.createElement('div');
    gitEl.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';
    this.gitPanel = new GitPanel(gitEl, (filePath) => this.openFile(filePath));
    this.sidebar.addPanel('git', 'SOURCE CONTROL', gitEl);

    // Extensions (stub)
    const extEl = this.buildExtensionsStub();
    this.sidebar.addPanel('extensions', 'EXTENSIONS', extEl);

    // Settings
    const settingsEl = document.createElement('div');
    settingsEl.style.cssText = 'height:100%;overflow:hidden;display:flex;flex-direction:column;';
    this.settingsEditor = new SettingsEditor(settingsEl, (settings) => {
      this.applySettings(settings);
    });
    this.sidebar.addPanel('settings', 'SETTINGS', settingsEl);

    // ─── Command Palette ──────────────────────────────────────────────────────
    this.commandPalette = new CommandPalette();
    this.commandPalette.onOpenFile = (path) => this.openFile(path);
    this.commandPalette.onGoToLine = (line) => this.editorArea.editorService.goToLine(line);
    this.commandPalette.getOpenFiles = () => this.editorArea.editorService.getOpenFilePaths();
    this.commandPalette.getAllFiles = async () => this.allFilesList;

    // Default: show explorer with welcome state
    this.sidebar.showPanel('explorer');
    this.activityBar.setActive('explorer');

    // Listen for settings open-json event
    document.addEventListener('open-settings-json', (e: Event) => {
      this.openFile((e as CustomEvent<string>).detail);
    });
  }

  private buildTitleBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'title-bar';
    bar.id = 'title-bar';

    this.titleBarTextEl = document.createElement('div');
    this.titleBarTextEl.className = 'title-bar-text';
    this.titleBarTextEl.id = 'title-bar-text';
    this.titleBarTextEl.textContent = 'LiteCode';

    const controls = document.createElement('div');
    controls.className = 'title-bar-controls';

    const mkBtn = (cls: string, label: string, title: string, fn: () => void) => {
      const b = document.createElement('button');
      b.className = `title-bar-btn ${cls}`;
      b.innerHTML = label;
      b.title = title;
      b.addEventListener('click', fn);
      return b;
    };

    controls.appendChild(mkBtn('minimize', '&#xE921;', 'Minimize', () => this.tryElectron(() => window.electronAPI.window.minimize())));
    controls.appendChild(mkBtn('maximize', '&#xE922;', 'Maximize', () => this.tryElectron(() => window.electronAPI.window.maximize())));
    controls.appendChild(mkBtn('close', '&#xE8BB;', 'Close', () => this.tryElectron(() => window.electronAPI.window.close())));

    bar.appendChild(this.titleBarTextEl);
    bar.appendChild(controls);
    return bar;
  }

  private buildExtensionsStub(): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:10px;height:100%;overflow:hidden;';

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search Extensions in Marketplace';
    search.style.cssText = 'background:var(--color-bg-input);border:1px solid var(--color-border);color:var(--color-fg-default);padding:6px 10px;border-radius:3px;font-size:13px;font-family:var(--font-ui);outline:none;';
    search.addEventListener('focus', () => { search.style.borderColor = 'var(--color-border-focus)'; });
    search.addEventListener('blur', () => { search.style.borderColor = 'var(--color-border)'; });

    const info = document.createElement('div');
    info.style.cssText = 'color:var(--color-fg-muted);font-size:12px;padding:8px 0;text-align:center;';
    info.textContent = 'Extension Marketplace — coming soon';

    el.appendChild(search);
    el.appendChild(info);
    return el;
  }

  // ─── Command Registry ────────────────────────────────────────────────────────
  private registerCommands(): void {
    const reg = (id: string, label: string, category: string, keybinding: string, fn: () => void | Promise<void>) =>
      CommandRegistry.register({ id, label, category, keybinding, handler: fn });

    // File
    reg('file.openFolder',  'Open Folder…',      'File',  'Ctrl+Shift+O', () => this.promptOpenFolder());
    reg('file.newFile',     'New File',           'File',  'Ctrl+N',       () => this.fileExplorer.createNew(false));
    reg('file.newFolder',   'New Folder',         'File',  '',             () => this.fileExplorer.createNew(true));
    reg('file.save',        'Save',               'File',  'Ctrl+S',       async () => { await this.save(); });
    reg('file.saveAll',     'Save All',           'File',  'Ctrl+K S',     () => this.saveAll());
    reg('file.closeEditor', 'Close Editor',       'View',  'Ctrl+W',       () => {
      const p = this.editorArea.editorService.getActiveFilePath();
      if (p) this.editorArea.editorService.closeFile(p);
    });

    // View
    reg('view.toggleSidebar',  'Toggle Primary Sidebar',  'View', 'Ctrl+B',           () => this.toggleSidebar());
    reg('view.toggleTerminal', 'Toggle Terminal',          'View', 'Ctrl+`',           () => this.toggleTerminal());
    reg('view.showExplorer',   'Show Explorer',            'View', 'Ctrl+Shift+E',     () => this.switchToPanel('explorer'));
    reg('view.showSearch',     'Find in Files',            'View', 'Ctrl+Shift+F',     () => this.showSearch());
    reg('view.showGit',        'Show Source Control',      'View', 'Ctrl+Shift+G',     () => this.switchToPanel('git'));
    reg('view.openSettings',   'Open Settings',            'Preferences', 'Ctrl+,',    () => this.switchToPanel('settings'));
    reg('view.toggleMinimap',  'Toggle Minimap',           'View', '',                 () => this.editorArea.editorService.toggleMinimap());
    reg('view.zoomIn',         'Zoom In',                  'View', 'Ctrl+=',           () => this.editorArea.editorService.adjustFontSize(+1));
    reg('view.zoomOut',        'Zoom Out',                 'View', 'Ctrl+-',           () => this.editorArea.editorService.adjustFontSize(-1));
    reg('view.resetZoom',      'Reset Zoom',               'View', 'Ctrl+0',           () => this.editorArea.editorService.adjustFontSize(0));

    // Go
    reg('go.line',          'Go to Line…',          'Go', 'Ctrl+G',       () => this.commandPalette.open('goto-line'));
    reg('go.file',          'Go to File…',          'Go', 'Ctrl+P',       () => this.commandPalette.open('file'));
    reg('go.back',          'Go Back',              'Go', 'Alt+Left',     () => {});

    // Editor
    reg('editor.format',    'Format Document',     'Editor', 'Shift+Alt+F', () => this.editorArea.editorService.formatDocument());
    reg('editor.findReplace','Find & Replace',     'Editor', 'Ctrl+H',      () => this.editorArea.editorService.openFindReplace());

    // Terminal
    reg('terminal.new',    'New Terminal',           'Terminal', 'Ctrl+Shift+`', () => { this.bottomPanel.show(); this.bottomPanel.newTerminal(); });
    reg('terminal.toggle', 'Toggle Terminal',        'Terminal', 'Ctrl+`',       () => this.toggleTerminal());

    // Help
    reg('help.about',      'About LiteCode',         'Help', '',                 () => this.showAbout());
  }

  // ─── Public API (called from renderer.ts and menu listeners) ─────────────────
  async openFolder(folderPath: string): Promise<void> {
    this.currentFolderPath = folderPath;
    const folderName = folderPath.split(/[\\/]/).pop() ?? folderPath;

    this.titleBarTextEl.textContent = `${folderName} — LiteCode`;
    this.searchPanel.setFolderPath(folderPath);
    this.gitPanel.setFolderPath(folderPath);
    this.statusBar.updateFolder(folderName);

    this.switchToPanel('explorer');
    await this.fileExplorer.openFolder(folderPath);

    // Collect file list in background for quick open
    this.collectFilesInBackground(folderPath);

    Notification.show(`Opened: ${folderName}`, 'info', 2000);
  }

  async openFile(filePath: string, lineNumber?: number): Promise<void> {
    await this.editorArea.openFile(filePath);
    if (lineNumber) {
      setTimeout(() => this.editorArea.editorService.goToLine(lineNumber), 80);
    }
  }

  async save(): Promise<void> {
    const ok = await this.editorArea.editorService.saveCurrentFile();
    if (ok) Notification.show('File saved', 'success', 1500);
  }

  saveAll(): void {
    this.editorArea.editorService.saveAllFiles().then(() => {
      Notification.show('All files saved', 'success', 1500);
    });
  }

  toggleSidebar(): void {
    if (this.sidebar.isCollapsed) {
      const id = this.activityBar.getActiveId() ?? 'explorer';
      this.sidebar.showPanel(id);
    } else {
      this.sidebar.collapse();
      this.activityBar.deactivateAll();
    }
  }

  openCommandPalette(): void {
    this.commandPalette.open('command');
  }

  showSearch(): void {
    this.switchToPanel('search');
    setTimeout(() => this.searchPanel.focus(), 80);
  }

  toggleTerminal(): void {
    this.bottomPanel.toggle();
  }

  destroy(): void {
    this.editorArea.destroy();
    this.fileExplorer.destroy();
    this.bottomPanel.destroy();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────
  private handleActivityToggle(id: string): void {
    const wasActive = this.activityBar.getActiveId() === id && !this.sidebar.isCollapsed;
    if (wasActive) {
      this.sidebar.collapse();
      this.activityBar.deactivateAll();
    } else {
      this.activityBar.setActive(id);
      this.sidebar.showPanel(id);
      if (id === 'search') setTimeout(() => this.searchPanel.focus(), 80);
    }
  }

  private switchToPanel(id: string): void {
    this.activityBar.setActive(id);
    this.sidebar.showPanel(id);
  }

  private async promptOpenFolder(): Promise<void> {
    try {
      const result = await window.electronAPI.fs.openFolder();
      if (result.success && result.folderPath) {
        await this.openFolder(result.folderPath);
      }
    } catch { /* not in electron */ }
  }

  private applySettings(settings: Record<string, unknown>): void {
    const fontSize = settings['editor.fontSize'];
    if (typeof fontSize === 'number') {
      this.editorArea.editorService.setFontSize(fontSize);
    }
  }

  private async collectFilesInBackground(folderPath: string): Promise<void> {
    try {
      const result = await window.electronAPI.search.findInFiles(folderPath, { query: '.' });
      if (result.success) {
        this.allFilesList = [...new Set(result.results.map(r => r.filePath))];
        this.commandPalette.currentFolderPath = folderPath;
      }
    } catch { /* skip */ }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      // Command palette
      if (e.shiftKey && e.key === 'P') { e.preventDefault(); this.commandPalette.open('command'); return; }
      // Quick open
      if (!e.shiftKey && !e.altKey && e.key === 'p') { e.preventDefault(); this.commandPalette.open('file'); return; }
      // Go to line
      if (!e.shiftKey && e.key === 'g') { e.preventDefault(); this.commandPalette.open('goto-line'); return; }
      // Toggle sidebar
      if (e.key === 'b') { e.preventDefault(); this.toggleSidebar(); return; }
      // Explorer
      if (e.shiftKey && e.key === 'E') { e.preventDefault(); this.switchToPanel('explorer'); return; }
      // Search
      if (e.shiftKey && e.key === 'F') { e.preventDefault(); this.showSearch(); return; }
      // Git
      if (e.shiftKey && e.key === 'G') { e.preventDefault(); this.switchToPanel('git'); return; }
      // Settings
      if (e.key === ',') { e.preventDefault(); this.switchToPanel('settings'); return; }
      // Terminal
      if (e.key === '`') { e.preventDefault(); this.toggleTerminal(); return; }
      // New terminal
      if (e.shiftKey && e.key === '`') { e.preventDefault(); this.bottomPanel.show(); this.bottomPanel.newTerminal(); return; }
      // Zoom
      if (e.key === '=') { e.preventDefault(); this.editorArea.editorService.adjustFontSize(+1); return; }
      if (e.key === '-') { e.preventDefault(); this.editorArea.editorService.adjustFontSize(-1); return; }
      if (e.key === '0') { e.preventDefault(); this.editorArea.editorService.adjustFontSize(0); return; }
      // Open folder
      if (e.shiftKey && e.key === 'O') { e.preventDefault(); this.promptOpenFolder(); return; }
    });
  }

  private showAbout(): void {
    Notification.show('LiteCode v1.0.0 — Built with Electron + Monaco', 'info', 4000);
  }

  private tryElectron(fn: () => void): void {
    try { fn(); } catch { /* ok */ }
  }
}
