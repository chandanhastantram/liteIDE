import { TerminalPanel } from '../terminal/TerminalPanel';

type PanelTab = 'terminal' | 'problems' | 'output';

export class BottomPanel {
  private element: HTMLElement;
  private tabBar!: HTMLElement;
  private content!: HTMLElement;
  private resizeHandle!: HTMLElement;

  private terminalPanel!: TerminalPanel;
  private isVisible = false;
  private activeTab: PanelTab = 'terminal';
  private height = 240;

  private isResizing = false;
  private startY = 0;
  private startHeight = 0;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'bottom-panel';
    this.element.style.display = 'none';
    container.appendChild(this.element);
    this.build();
  }

  private build(): void {
    // Resize handle (top edge)
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'bottom-panel-resize-handle';

    // Tab bar
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'bottom-panel-tab-bar';

    // Content
    this.content = document.createElement('div');
    this.content.className = 'bottom-panel-content';

    this.element.appendChild(this.resizeHandle);
    this.element.appendChild(this.tabBar);
    this.element.appendChild(this.content);

    this.buildTabs();
    this.buildContent();
    this.setupResizing();
  }

  private buildTabs(): void {
    const tabs: { id: PanelTab; label: string; icon: string }[] = [
      { id: 'terminal', label: 'Terminal', icon: '>_' },
      { id: 'problems', label: 'Problems', icon: '⚠' },
      { id: 'output', label: 'Output', icon: '≡' },
    ];

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.className = `bottom-panel-tab${this.activeTab === tab.id ? ' active' : ''}`;
      btn.id = `bottom-tab-${tab.id}`;
      btn.innerHTML = `<span class="bottom-tab-icon">${tab.icon}</span>${tab.label}`;
      btn.addEventListener('click', () => this.switchTab(tab.id));
      this.tabBar.appendChild(btn);
    }

    // Right side controls
    const controls = document.createElement('div');
    controls.style.cssText = 'margin-left: auto; display: flex; align-items: center; gap: 4px;';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bottom-panel-close';
    closeBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    closeBtn.title = 'Close Panel';
    closeBtn.addEventListener('click', () => this.hide());
    controls.appendChild(closeBtn);

    this.tabBar.appendChild(controls);
  }

  private buildContent(): void {
    // Terminal
    const termContainer = document.createElement('div');
    termContainer.style.cssText = 'height: 100%; display: flex; flex-direction: column;';
    this.terminalPanel = new TerminalPanel(termContainer);

    // Problems panel
    const problemsContainer = document.createElement('div');
    problemsContainer.style.cssText = 'height: 100%; display: none; padding: 12px; color: var(--color-fg-muted); font-size: 12px;';
    problemsContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--color-fg-default); font-size: 13px;">
        <span style="color: #4fc1ff;">ℹ</span> No problems detected
      </div>
      <div style="opacity: 0.6;">
        Problems from TypeScript, ESLint, and other tools will appear here.
      </div>
    `;

    // Output panel
    const outputContainer = document.createElement('div');
    outputContainer.style.cssText = `
      height: 100%; display: none; padding: 8px;
      font-family: var(--font-mono); font-size: 12px;
      color: var(--color-fg-muted); overflow-y: auto;
    `;
    outputContainer.innerHTML = `
      <div style="color: #89d185;">[LiteCode] Starting up...</div>
      <div style="color: var(--color-fg-muted);">[LiteCode] Webpack HMR active</div>
      <div style="color: var(--color-fg-muted);">[LiteCode] TypeScript compilation: OK</div>
    `;

    termContainer.id = 'panel-terminal';
    problemsContainer.id = 'panel-problems';
    outputContainer.id = 'panel-output';

    this.content.appendChild(termContainer);
    this.content.appendChild(problemsContainer);
    this.content.appendChild(outputContainer);
  }

  private setupResizing(): void {
    this.resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isResizing = true;
      this.startY = e.clientY;
      this.startHeight = this.height;
      this.resizeHandle.classList.add('resizing');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isResizing) return;
      const delta = this.startY - e.clientY;
      this.height = Math.max(100, Math.min(600, this.startHeight + delta));
      this.element.style.height = `${this.height}px`;
      this.terminalPanel.fit();
    });

    document.addEventListener('mouseup', () => {
      if (!this.isResizing) return;
      this.isResizing = false;
      this.resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  private switchTab(tab: PanelTab): void {
    // Update tab buttons
    document.querySelectorAll('.bottom-panel-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`bottom-tab-${tab}`)?.classList.add('active');

    // Show/hide content
    const termEl = document.getElementById('panel-terminal');
    const probEl = document.getElementById('panel-problems');
    const outEl = document.getElementById('panel-output');

    if (termEl) termEl.style.display = tab === 'terminal' ? 'flex' : 'none';
    if (probEl) probEl.style.display = tab === 'problems' ? 'block' : 'none';
    if (outEl) outEl.style.display = tab === 'output' ? 'block' : 'none';

    this.activeTab = tab;

    if (tab === 'terminal') {
      requestAnimationFrame(() => {
        this.terminalPanel.fit();
        this.terminalPanel.focus();
      });
    }
  }

  show(): void {
    this.element.style.display = 'flex';
    this.element.style.height = `${this.height}px`;
    this.isVisible = true;
    this.switchTab(this.activeTab);
  }

  hide(): void {
    this.element.style.display = 'none';
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isShown(): boolean {
    return this.isVisible;
  }

  openTerminal(): void {
    this.show();
    this.switchTab('terminal');
  }

  getTerminalPanel(): TerminalPanel {
    return this.terminalPanel;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.terminalPanel.destroy();
  }
}
