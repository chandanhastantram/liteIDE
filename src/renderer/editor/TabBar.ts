import { EditorService, OpenFile } from './EditorService';

// Tiny SVG close icon
function getCloseSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

function getFileIconSvg(ext: string): string {
  const colors: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6',
    js: '#f7df1e', jsx: '#f7df1e',
    json: '#f7df1e', css: '#563d7c', scss: '#563d7c',
    html: '#e44d26', htm: '#e44d26',
    md: '#519aba', py: '#3572a5',
    rs: '#dea584', go: '#00add8',
  };
  const color = colors[ext] ?? '#8d8d8d';
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5l-5-4z" fill="${color}" opacity="0.85"/>
    <path d="M9 1v4h4L9 1z" fill="${color}" opacity="0.5"/>
  </svg>`;
}

export class TabBar {
  private element: HTMLElement;
  private editorService: EditorService;
  private tabs: Map<string, HTMLElement> = new Map();
  private onFileOpen: ((path: string) => void) | null = null;

  constructor(container: HTMLElement, editorService: EditorService) {
    this.editorService = editorService;
    this.element = document.createElement('div');
    this.element.className = 'tab-bar';
    container.appendChild(this.element);

    this.setupKeyboardNav();
  }

  private setupKeyboardNav(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+W — close active tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const active = this.editorService.getActiveFilePath();
        if (active) this.closeTab(active);
      }

      // Ctrl+Tab — cycle tabs
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const paths = [...this.tabs.keys()];
        const currentIdx = paths.indexOf(this.editorService.getActiveFilePath() ?? '');
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + paths.length) % paths.length
          : (currentIdx + 1) % paths.length;
        if (paths[nextIdx]) {
          this.editorService.switchTo(paths[nextIdx]);
        }
      }
    });
  }

  addTab(file: OpenFile): void {
    if (this.tabs.has(file.path)) {
      this.setActive(file.path);
      return;
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() ?? '' : '';

    const tab = document.createElement('div');
    tab.className = 'editor-tab';
    tab.dataset.path = file.path;
    tab.title = file.path;

    const iconEl = document.createElement('div');
    iconEl.className = 'tab-file-icon';
    iconEl.innerHTML = getFileIconSvg(ext);

    const labelEl = document.createElement('div');
    labelEl.className = 'tab-label';
    labelEl.textContent = file.name;

    const dirtyDot = document.createElement('div');
    dirtyDot.className = 'tab-dirty';
    dirtyDot.title = 'Unsaved changes';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = getCloseSvg();
    closeBtn.title = 'Close (Ctrl+W)';

    tab.appendChild(iconEl);
    tab.appendChild(labelEl);
    tab.appendChild(dirtyDot);
    tab.appendChild(closeBtn);

    // Click tab → switch
    tab.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.tab-close')) return;
      this.editorService.switchTo(file.path);
    });

    // Middle click → close
    tab.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(file.path);
      }
    });

    // Close button
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(file.path);
    });

    this.element.appendChild(tab);
    this.tabs.set(file.path, tab);
    this.setActive(file.path);
    this.scrollToTab(tab);
  }

  setActive(filePath: string): void {
    this.tabs.forEach((tab, path) => {
      tab.classList.toggle('active', path === filePath);
    });
    const tab = this.tabs.get(filePath);
    if (tab) this.scrollToTab(tab);
  }

  setDirty(filePath: string, isDirty: boolean): void {
    const tab = this.tabs.get(filePath);
    if (!tab) return;
    tab.classList.toggle('dirty', isDirty);
  }

  removeTab(filePath: string): void {
    const tab = this.tabs.get(filePath);
    if (tab) {
      tab.remove();
      this.tabs.delete(filePath);
    }
  }

  private closeTab(filePath: string): void {
    const nextPath = this.editorService.closeFile(filePath);
    this.removeTab(filePath);
    if (nextPath) {
      this.setActive(nextPath);
    }
  }

  private scrollToTab(tab: HTMLElement): void {
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  updateForFile(file: OpenFile | null): void {
    if (file) {
      this.addTab(file);
      this.setActive(file.path);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
