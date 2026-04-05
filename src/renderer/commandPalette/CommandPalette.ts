import { CommandRegistry, fuzzyScore, highlightMatches } from './CommandRegistry';

type QuickPickItem = {
  label: string;
  description?: string;
  detail?: string;
  action: () => void;
};

type Mode = 'command' | 'file' | 'goto-line';

export class CommandPalette {
  private element: HTMLElement | null = null;
  private inputEl: HTMLElement | null = null;
  private resultsEl: HTMLElement | null = null;
  private isOpen = false;
  private focusedIndex = 0;
  private currentMode: Mode = 'command';
  private currentItems: QuickPickItem[] = [];

  // Callbacks wired in by the Workbench
  onOpenFile?: (path: string) => void;
  onGoToLine?: (line: number) => void;
  getOpenFiles?: () => string[];
  getAllFiles?: () => Promise<string[]>;
  currentFolderPath?: string | null;

  open(mode: Mode = 'command', initialQuery = ''): void {
    if (this.isOpen) {
      this.close();
    }
    this.currentMode = mode;
    this.isOpen = true;
    this.renderOverlay(initialQuery);
  }

  close(): void {
    if (!this.isOpen) return;
    this.element?.remove();
    this.element = null;
    this.inputEl = null;
    this.resultsEl = null;
    this.isOpen = false;
    this.focusedIndex = 0;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open('command');
    }
  }

  private renderOverlay(initialQuery: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'command-palette-overlay';
    overlay.id = 'command-palette-overlay';

    const palette = document.createElement('div');
    palette.className = 'command-palette';

    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'cp-input-wrapper';

    const prefix = document.createElement('div');
    prefix.className = 'cp-prefix';
    prefix.textContent = this.getModePrefix();

    const input = document.createElement('input');
    input.className = 'cp-input';
    input.type = 'text';
    input.placeholder = this.getModePlaceholder();
    input.value = initialQuery;
    input.setAttribute('autofocus', 'true');
    this.inputEl = input;

    inputWrapper.appendChild(prefix);
    inputWrapper.appendChild(input);

    // Results
    const results = document.createElement('div');
    results.className = 'cp-results';
    this.resultsEl = results;

    palette.appendChild(inputWrapper);
    palette.appendChild(results);
    overlay.appendChild(palette);
    document.body.appendChild(overlay);

    this.element = overlay;

    // Focus input
    requestAnimationFrame(() => input.focus());

    // Events
    input.addEventListener('input', () => this.onInput(input.value));
    input.addEventListener('keydown', (e) => this.onKeyDown(e));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    }, { once: true });

    // Initial results
    this.onInput(initialQuery);
  }

  private getModePrefix(): string {
    switch (this.currentMode) {
      case 'file': return '📄';
      case 'goto-line': return ':';
      case 'command': return '>';
    }
  }

  private getModePlaceholder(): string {
    switch (this.currentMode) {
      case 'file': return 'Search files by name';
      case 'goto-line': return 'Go to line (type a number)';
      case 'command': return 'Type a command name';
    }
  }

  private async onInput(query: string): Promise<void> {
    if (!this.resultsEl) return;

    // Detect mode prefix switching
    if (query.startsWith('>')) {
      this.currentMode = 'command';
      query = query.slice(1).trimStart();
    } else if (query.startsWith(':')) {
      this.currentMode = 'goto-line';
      query = query.slice(1).trimStart();
    } else if (this.currentMode === 'file') {
      // stay in file mode
    }

    switch (this.currentMode) {
      case 'command':
        this.renderCommandResults(query);
        break;
      case 'file':
        await this.renderFileResults(query);
        break;
      case 'goto-line':
        this.renderGotoLineResults(query);
        break;
    }
  }

  private renderCommandResults(query: string): void {
    if (!this.resultsEl) return;

    const commands = CommandRegistry.getAll();
    const scored = commands
      .map(cmd => ({
        cmd,
        score: fuzzyScore(
          (cmd.category ? `${cmd.category}: ` : '') + cmd.label,
          query
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    this.currentItems = scored.map(({ cmd }) => ({
      label: cmd.label,
      description: cmd.category,
      detail: cmd.keybinding,
      action: () => { this.close(); cmd.handler(); },
    }));

    this.renderItems(this.currentItems, query);
  }

  private async renderFileResults(query: string): Promise<void> {
    if (!this.resultsEl) return;

    const openFiles = this.getOpenFiles?.() ?? [];
    let allFiles: string[] = openFiles;

    if (this.getAllFiles) {
      try {
        const more = await this.getAllFiles();
        allFiles = [...new Set([...openFiles, ...more])];
      } catch { /* skip */ }
    }

    const scored = allFiles
      .map(f => {
        const name = f.split(/[\\/]/).pop() ?? f;
        return { path: f, name, score: fuzzyScore(name, query) };
      })
      .filter(f => f.score > 0 || !query)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    this.currentItems = scored.map(f => ({
      label: f.name,
      description: f.path.replace(f.name, ''),
      action: () => {
        this.close();
        this.onOpenFile?.(f.path);
      },
    }));

    this.renderItems(this.currentItems, query);
  }

  private renderGotoLineResults(query: string): void {
    if (!this.resultsEl) return;

    const lineNum = parseInt(query, 10);
    this.currentItems = isNaN(lineNum)
      ? [{ label: 'Type a line number', description: '', action: () => {} }]
      : [{ label: `Go to line ${lineNum}`, description: 'Press Enter', action: () => {
          this.close();
          this.onGoToLine?.(lineNum);
        }}];

    this.renderItems(this.currentItems, '');
  }

  private renderItems(items: QuickPickItem[], query: string): void {
    if (!this.resultsEl) return;
    this.focusedIndex = 0;
    this.resultsEl.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'cp-empty';
      empty.textContent = query ? `No results for "${query}"` : 'No commands available';
      this.resultsEl.appendChild(empty);
      return;
    }

    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `cp-item${idx === 0 ? ' focused' : ''}`;
      row.dataset.idx = String(idx);

      const labelEl = document.createElement('div');
      labelEl.className = 'cp-item-label';
      labelEl.innerHTML = query ? highlightMatches(item.label, query) : item.label;

      row.appendChild(labelEl);

      if (item.description) {
        const desc = document.createElement('div');
        desc.className = 'cp-item-description';
        desc.textContent = item.description;
        row.appendChild(desc);
      }

      if (item.detail) {
        const kbd = document.createElement('div');
        kbd.className = 'cp-item-keybinding';
        kbd.textContent = item.detail;
        row.appendChild(kbd);
      }

      row.addEventListener('click', () => item.action());
      row.addEventListener('mouseenter', () => this.setFocus(idx));

      this.resultsEl!.appendChild(row);
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.setFocus((this.focusedIndex + 1) % Math.max(this.currentItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.setFocus((this.focusedIndex - 1 + Math.max(this.currentItems.length, 1)) % Math.max(this.currentItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = this.currentItems[this.focusedIndex];
      if (item) item.action();
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  private setFocus(idx: number): void {
    if (!this.resultsEl) return;
    const rows = this.resultsEl.querySelectorAll('.cp-item');
    rows[this.focusedIndex]?.classList.remove('focused');
    this.focusedIndex = idx;
    const newRow = rows[this.focusedIndex];
    newRow?.classList.add('focused');
    newRow?.scrollIntoView({ block: 'nearest' });
  }
}
