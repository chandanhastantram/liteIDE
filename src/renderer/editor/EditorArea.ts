import { EditorService, OpenFile } from './EditorService';
import { TabBar } from './TabBar';
import { DiffViewer } from '../git/DiffViewer';

interface EditorAreaConfig {
  onTabChange: (file: OpenFile | null) => void;
  onDirtyChange: (filePath: string, isDirty: boolean) => void;
}

function getEmptySvg(): string {
  return `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="6" width="56" height="78" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <rect x="6" y="12" width="56" height="78" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <line x1="20" y1="30" x2="50" y2="30" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="38" x2="44" y2="38" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="46" x2="40" y2="46" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="54" x2="36" y2="54" stroke="rgba(255,255,255,0.05)" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

export class EditorArea {
  private element: HTMLElement;
  private tabBarWrapper: HTMLElement;
  private breadcrumbBar: HTMLElement;
  private monacoContainer: HTMLElement;
  private emptyState: HTMLElement;
  private diffViewer: DiffViewer;

  public editorService: EditorService;
  public tabBar: TabBar;

  constructor(container: HTMLElement, config: EditorAreaConfig) {
    this.element = document.createElement('div');
    this.element.className = 'editor-area';

    this.tabBarWrapper = document.createElement('div');
    this.tabBarWrapper.className = 'tab-bar-wrapper';

    this.breadcrumbBar = document.createElement('div');
    this.breadcrumbBar.className = 'breadcrumb-bar';

    this.monacoContainer = document.createElement('div');
    this.monacoContainer.className = 'monaco-container';

    this.emptyState = this.buildEmptyState();

    this.element.appendChild(this.tabBarWrapper);
    this.element.appendChild(this.breadcrumbBar);
    this.element.appendChild(this.monacoContainer);
    this.element.appendChild(this.emptyState);
    container.appendChild(this.element);

    this.diffViewer = new DiffViewer(this.element);

    document.addEventListener('git-open-diff', (e: Event) => {
      const ev = e as CustomEvent<{ filePath: string, relPath: string }>;
      // Try to determine current folder path from current state or assume single workspace
      // We can get root from Workbench, wait, better pass via an event or just let DiffViewer use the one from somewhere. Wait.
      // Wait, we need folderPath!
      const dirPath = ev.detail.filePath.slice(0, -(ev.detail.relPath.length)); // approximate
      this.diffViewer.openDiff(dirPath, ev.detail.filePath, ev.detail.relPath);
    });

    this.editorService = new EditorService(this.monacoContainer, {
      onTabChange: (file) => {
        this.tabBar.updateForFile(file);
        this.updateBreadcrumb(file?.path ?? null);
        if (file) { this.showEditor(); } else { this.showEmpty(); }
        config.onTabChange(file);
      },
      onDirtyChange: config.onDirtyChange,
    });

    this.tabBar = new TabBar(this.tabBarWrapper, this.editorService);
    this.showEmpty();
  }

  private buildEmptyState(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'editor-empty';
    el.innerHTML = `
      <div class="editor-empty-logo">${getEmptySvg()}</div>
      <div class="editor-empty-title">LiteCode</div>
      <div class="editor-empty-subtitle">VS Code-inspired editor</div>
      <div class="editor-empty-shortcuts">
        <div class="shortcut-row">
          <span class="shortcut-key">Ctrl+P</span><span class="shortcut-desc">Go to File</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-key">Ctrl+Shift+P</span><span class="shortcut-desc">Command Palette</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-key">Ctrl+Shift+F</span><span class="shortcut-desc">Find in Files</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-key">Ctrl+\`</span><span class="shortcut-desc">Toggle Terminal</span>
        </div>
      </div>
      <button class="editor-empty-open-btn" id="empty-open-folder-btn">Open Folder…</button>
    `;

    el.querySelector('#empty-open-folder-btn')?.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.fs.openFolder();
        if (result.success && result.folderPath) {
          const event = new CustomEvent('workbench:openFolder', { detail: result.folderPath });
          document.dispatchEvent(event);
        }
      } catch { /* not in electron */ }
    });

    return el;
  }

  private showEditor(): void {
    this.monacoContainer.style.display = 'flex';
    this.emptyState.style.display = 'none';
    this.breadcrumbBar.style.display = 'flex';
    this.editorService.layout();
  }

  private showEmpty(): void {
    this.monacoContainer.style.display = 'none';
    this.emptyState.style.display = 'flex';
    this.breadcrumbBar.style.display = 'none';
  }

  private updateBreadcrumb(filePath: string | null): void {
    this.breadcrumbBar.innerHTML = '';
    if (!filePath) return;
    const parts = filePath.replace(/\\/g, '/').split('/');
    parts.forEach((part, idx) => {
      if (!part) return;
      const item = document.createElement('span');
      item.className = `breadcrumb-item${idx === parts.length - 1 ? ' current' : ''}`;
      item.textContent = part;
      this.breadcrumbBar.appendChild(item);
      if (idx < parts.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = '›';
        this.breadcrumbBar.appendChild(sep);
      }
    });
  }

  async openFile(filePath: string): Promise<void> {
    await this.editorService.openFile(filePath);
  }

  destroy(): void {
    this.editorService.destroy();
  }
}
