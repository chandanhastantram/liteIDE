import { FileExplorer } from '../fileExplorer/FileExplorer';

interface SidebarPanel {
  id: string;
  label: string;
  element: HTMLElement;
}

export class Sidebar {
  private element: HTMLElement;
  private headerEl: HTMLElement;
  private contentEl: HTMLElement;
  private resizeHandle: HTMLElement;
  private panels: Map<string, SidebarPanel> = new Map();
  private activePanel: string | null = null;
  private _isCollapsed = false;

  private isResizing = false;
  private startX = 0;
  private startWidth = 0;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'sidebar';

    this.headerEl = document.createElement('div');
    this.headerEl.className = 'sidebar-header';

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'sidebar-content';

    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'sidebar-resize-handle';

    this.element.appendChild(this.headerEl);
    this.element.appendChild(this.contentEl);
    this.element.appendChild(this.resizeHandle);
    container.appendChild(this.element);

    this.setupResizing();
  }

  private setupResizing(): void {
    this.resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isResizing = true;
      this.startX = e.clientX;
      this.startWidth = this.element.offsetWidth;
      this.resizeHandle.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isResizing) return;
      const delta = e.clientX - this.startX;
      const newWidth = Math.max(160, Math.min(500, this.startWidth + delta));
      this.element.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!this.isResizing) return;
      this.isResizing = false;
      this.resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  addPanel(id: string, label: string, element: HTMLElement): void {
    const panel: SidebarPanel = { id, label, element };
    this.panels.set(id, panel);
    element.style.display = 'none';
    this.contentEl.appendChild(element);
  }

  showPanel(id: string): void {
    if (this.activePanel) {
      const current = this.panels.get(this.activePanel);
      if (current) current.element.style.display = 'none';
    }

    const panel = this.panels.get(id);
    if (!panel) return;

    panel.element.style.display = 'flex';
    panel.element.style.flexDirection = 'column';
    panel.element.style.height = '100%';
    this.activePanel = id;
    this.headerEl.textContent = panel.label;

    if (this._isCollapsed) this.expand();
  }

  toggle(id: string): void {
    if (this.activePanel === id && !this._isCollapsed) {
      this.collapse();
    } else {
      this.showPanel(id);
    }
  }

  collapse(): void {
    this._isCollapsed = true;
    this.element.classList.add('collapsed');
  }

  expand(): void {
    this._isCollapsed = false;
    this.element.classList.remove('collapsed');
  }

  get isCollapsed(): boolean {
    return this._isCollapsed;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}

// ===== Activity Bar =====
interface ActivityBarItem {
  id: string;
  icon: string;
  tooltip: string;
  position?: 'top' | 'bottom';
}

export class ActivityBar {
  private element: HTMLElement;
  private topEl: HTMLElement;
  private bottomEl: HTMLElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private onToggle: (id: string) => void;
  private activeId: string | null = null;

  constructor(container: HTMLElement, onToggle: (id: string) => void) {
    this.onToggle = onToggle;
    this.element = document.createElement('div');
    this.element.className = 'activity-bar';

    this.topEl = document.createElement('div');
    this.topEl.className = 'activity-bar-top';

    this.bottomEl = document.createElement('div');
    this.bottomEl.className = 'activity-bar-bottom';

    this.element.appendChild(this.topEl);
    this.element.appendChild(this.bottomEl);
    container.appendChild(this.element);
  }

  addItem(item: ActivityBarItem): void {
    const btn = document.createElement('button');
    btn.className = 'activity-bar-btn';
    btn.id = `activity-btn-${item.id}`;
    btn.innerHTML = item.icon;
    btn.dataset.tooltip = item.tooltip;
    btn.setAttribute('aria-label', item.tooltip);
    btn.title = item.tooltip;

    btn.addEventListener('click', () => {
      this.setActive(item.id);
      this.onToggle(item.id);
    });

    this.buttons.set(item.id, btn);

    if (item.position === 'bottom') {
      this.bottomEl.appendChild(btn);
    } else {
      this.topEl.appendChild(btn);
    }
  }

  setActive(id: string): void {
    this.buttons.forEach((btn, btnId) => {
      btn.classList.toggle('active', btnId === id);
    });
    this.activeId = id;
  }

  deactivateAll(): void {
    this.buttons.forEach(btn => btn.classList.remove('active'));
    this.activeId = null;
  }

  getActiveId(): string | null {
    return this.activeId;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
