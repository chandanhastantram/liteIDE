import type { FileEntry, WatchEvent } from '../../shared/types';
type WatchEventCallback = (event: WatchEvent) => void;

interface FileEntryNode {
  name: string;
  path: string;
  isDirectory: boolean;
  extension?: string;
}

// File extension → language ID for Monaco
export function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    mjs: 'javascript', cjs: 'javascript',
    json: 'json', jsonc: 'json',
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', mdx: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp', 'c++': 'cpp',
    c: 'c', h: 'c',
    java: 'java',
    kt: 'kotlin', kts: 'kotlin',
    swift: 'swift',
    php: 'php',
    rb: 'ruby',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    sql: 'sql',
    yaml: 'yaml', yml: 'yaml',
    xml: 'xml', svg: 'xml',
    toml: 'ini',
    ini: 'ini', cfg: 'ini',
    Dockerfile: 'dockerfile',
    tf: 'hcl',
    r: 'r', R: 'r',
    lua: 'lua',
    cs: 'csharp',
    fs: 'fsharp', fsx: 'fsharp',
    vb: 'vb',
    dart: 'dart',
    ex: 'elixir', exs: 'elixir',
    hs: 'haskell',
    pl: 'perl',
    ps1: 'powershell', psm1: 'powershell',
    bat: 'bat', cmd: 'bat',
    txt: 'plaintext',
    log: 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}

// SVG icon sets
function getFolderIconSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 4H8.5L7 2.5H1.5A1.5 1.5 0 000 4v8a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0016 12V5.5A1.5 1.5 0 0014.5 4z" fill="currentColor"/>
  </svg>`;
}

function getFolderOpenIconSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 2.5A1.5 1.5 0 000 4v8a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0016 12V5.5A1.5 1.5 0 0014.5 4H8.5L7 2.5H1.5z" fill="currentColor" opacity="0.6"/>
    <path d="M0 7l2-3h12l-2 6H0V7z" fill="currentColor"/>
  </svg>`;
}

function getFileIconSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5l-5-4z" fill="currentColor" opacity="0.7"/>
    <path d="M9 1v4h4L9 1z" fill="currentColor" opacity="0.4"/>
  </svg>`;
}

function getArrowSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function getNewFileSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5l-5-4z" fill="currentColor" opacity="0.5"/>
    <path d="M11 9H8V6h-1v3H4v1h3v3h1v-3h3V9z" fill="currentColor"/>
  </svg>`;
}

function getNewFolderSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 4H8.5L7 2.5H1.5A1.5 1.5 0 000 4v8a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0016 12V5.5A1.5 1.5 0 0014.5 4z" fill="currentColor" opacity="0.5"/>
    <path d="M11 9H8.5V6.5h-1V9H5v1h2.5v2.5h1V10H11V9z" fill="currentColor"/>
  </svg>`;
}

function getRefreshSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.5 2.5A7 7 0 102.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M13.5 2.5V6h-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function getCollapseSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 5l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export type FileOpenCallback = (filePath: string) => void;

export class FileExplorer {
  private element: HTMLElement;
  private fileTree: HTMLElement;
  private rootPath: string | null = null;
  private selectedPath: string | null = null;
  private expandedPaths: Set<string> = new Set();
  private onFileOpen: FileOpenCallback;
  private watchUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, onFileOpen: FileOpenCallback) {
    this.onFileOpen = onFileOpen;
    this.element = this.createElement();
    container.appendChild(this.element);

    this.fileTree = this.element.querySelector('.file-tree') as HTMLElement;

    this.setupToolbar();
    this.setupWatcher();
    this.showEmpty();
  }

  private createElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'file-explorer';
    el.innerHTML = `
      <div class="file-explorer-toolbar">
        <button class="fe-toolbar-btn" id="fe-new-file" data-tooltip="New File" title="New File">
          ${getNewFileSvg()}
        </button>
        <button class="fe-toolbar-btn" id="fe-new-folder" data-tooltip="New Folder" title="New Folder">
          ${getNewFolderSvg()}
        </button>
        <button class="fe-toolbar-btn" id="fe-refresh" data-tooltip="Refresh Explorer" title="Refresh">
          ${getRefreshSvg()}
        </button>
        <button class="fe-toolbar-btn" id="fe-collapse-all" data-tooltip="Collapse All" title="Collapse All">
          ${getCollapseSvg()}
        </button>
      </div>
      <div class="file-tree" tabindex="0"></div>
    `;
    return el;
  }

  private setupToolbar(): void {
    this.element.querySelector('#fe-new-file')?.addEventListener('click', () => {
      this.createNewFile(this.rootPath ?? '');
    });
    this.element.querySelector('#fe-new-folder')?.addEventListener('click', () => {
      this.createNewFolder(this.rootPath ?? '');
    });
    this.element.querySelector('#fe-refresh')?.addEventListener('click', () => {
      if (this.rootPath) this.openFolder(this.rootPath);
    });
    this.element.querySelector('#fe-collapse-all')?.addEventListener('click', () => {
      this.collapseAll();
    });
  }

  private setupWatcher(): void {
    this.watchUnsubscribe = window.electronAPI.fs.onWatchEvent((event: WatchEvent) => {
      // On any fs change, refresh the parent dir of affected path
      if (this.rootPath) {
        this.refreshTree(this.rootPath);
      }
    });
  }

  async openFolder(folderPath: string): Promise<void> {
    this.rootPath = folderPath;

    // Start watcher
    await window.electronAPI.fs.watchFolder(folderPath);

    await this.refreshTree(folderPath);
  }

  private async refreshTree(folderPath: string): Promise<void> {
    this.fileTree.innerHTML = `
      <div class="tree-loading">
        <div class="tree-loading-spinner"></div>
        Loading...
      </div>
    `;

    const result = await window.electronAPI.fs.readDir(folderPath);
    if (!result.success || !result.entries) {
      this.fileTree.innerHTML = `<div class="tree-empty"><div class="tree-empty-icon">⚠️</div>Failed to load folder</div>`;
      return;
    }

    this.fileTree.innerHTML = '';
    this.renderNodes(result.entries, this.fileTree, 0);
  }

  private renderNodes(entries: FileEntry[], container: HTMLElement, depth: number): void {
    for (const entry of entries) {
      const node = this.createTreeNode(entry, depth);
      container.appendChild(node);
    }
  }

  private createTreeNode(entry: FileEntryNode, depth: number): HTMLElement {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';

    const rowEl = document.createElement('div');
    rowEl.className = 'tree-node-row';
    rowEl.dataset.path = entry.path;
    rowEl.dataset.isDir = String(entry.isDirectory);
    if (entry.extension) rowEl.dataset.ext = entry.extension;

    if (this.selectedPath === entry.path) {
      rowEl.classList.add('selected');
    }

    // Indent
    const indent = document.createElement('div');
    indent.className = 'tree-indent';
    indent.style.width = `${depth * 16 + 4}px`;
    rowEl.appendChild(indent);

    // Arrow (dirs only)
    const arrow = document.createElement('div');
    arrow.className = 'tree-arrow';
    if (entry.isDirectory) {
      arrow.innerHTML = getArrowSvg();
      if (this.expandedPaths.has(entry.path)) {
        arrow.classList.add('expanded');
      }
    } else {
      arrow.style.visibility = 'hidden';
    }
    rowEl.appendChild(arrow);

    // Icon
    const icon = document.createElement('div');
    icon.className = 'tree-icon';
    if (entry.isDirectory) {
      icon.innerHTML = this.expandedPaths.has(entry.path) ? getFolderOpenIconSvg() : getFolderIconSvg();
      icon.style.color = 'var(--color-folder)';
    } else {
      icon.innerHTML = getFileIconSvg();
    }
    rowEl.appendChild(icon);

    // Label
    const label = document.createElement('div');
    label.className = 'tree-label';
    label.textContent = entry.name;
    rowEl.appendChild(label);

    // Children container
    const childrenEl = document.createElement('div');
    childrenEl.className = 'tree-children';
    if (entry.isDirectory && this.expandedPaths.has(entry.path)) {
      childrenEl.classList.add('expanded');
    }

    // Event: click
    rowEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.selectNode(rowEl, entry.path);

      if (entry.isDirectory) {
        const isExpanded = this.expandedPaths.has(entry.path);
        if (isExpanded) {
          this.expandedPaths.delete(entry.path);
          arrow.classList.remove('expanded');
          icon.innerHTML = getFolderIconSvg();
          childrenEl.classList.remove('expanded');
          childrenEl.innerHTML = '';
        } else {
          this.expandedPaths.add(entry.path);
          arrow.classList.add('expanded');
          icon.innerHTML = getFolderOpenIconSvg();
          childrenEl.classList.add('expanded');
          await this.loadChildren(entry.path, childrenEl, depth + 1);
        }
      } else {
        this.onFileOpen(entry.path);
      }
    });

    // Event: double-click (rename)
    rowEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (entry.isDirectory) return; // Only rename files on dblclick
      this.startRename(rowEl, label, entry);
    });

    // Event: right-click
    rowEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, entry, rowEl);
    });

    nodeEl.appendChild(rowEl);
    nodeEl.appendChild(childrenEl);

    // If already expanded, load children
    if (entry.isDirectory && this.expandedPaths.has(entry.path)) {
      this.loadChildren(entry.path, childrenEl, depth + 1);
    }

    return nodeEl;
  }

  private async loadChildren(dirPath: string, container: HTMLElement, depth: number): Promise<void> {
    container.innerHTML = `<div class="tree-loading"><div class="tree-loading-spinner"></div></div>`;
    const result = await window.electronAPI.fs.readDir(dirPath);
    container.innerHTML = '';
    if (result.success && result.entries && result.entries.length > 0) {
      this.renderNodes(result.entries, container, depth);
    } else {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 2px 0 2px 32px; font-size: 11px; color: var(--color-fg-muted)';
      empty.textContent = 'Empty folder';
      container.appendChild(empty);
    }
  }

  private selectNode(rowEl: HTMLElement, filePath: string): void {
    // Deselect all
    this.element.querySelectorAll('.tree-node-row.selected').forEach(el => el.classList.remove('selected'));
    rowEl.classList.add('selected');
    this.selectedPath = filePath;
  }

  private showContextMenu(x: number, y: number, entry: FileEntryNode, rowEl: HTMLElement): void {
    this.selectNode(rowEl, entry.path);
    ContextMenu.show(x, y, [
      entry.isDirectory ? {
        label: '📄 New File',
        action: () => this.createNewFile(entry.path),
      } : null,
      entry.isDirectory ? {
        label: '📁 New Folder',
        action: () => this.createNewFolder(entry.path),
      } : null,
      entry.isDirectory ? { separator: true } : null,
      {
        label: '✏️ Rename',
        shortcut: 'F2',
        action: () => {
          const label = rowEl.querySelector('.tree-label') as HTMLElement;
          this.startRename(rowEl, label, entry);
        },
      },
      {
        label: '🗑️ Delete',
        danger: true,
        shortcut: 'Del',
        action: () => this.deleteEntry(entry),
      },
      { separator: true },
      {
        label: '📋 Copy Path',
        action: () => navigator.clipboard.writeText(entry.path),
      },
    ].filter(Boolean) as ContextMenuEntry[]);
  }

  private startRename(rowEl: HTMLElement, labelEl: HTMLElement, entry: FileEntryNode): void {
    const currentName = entry.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-label-input';
    input.value = currentName;
    // Select name without extension for files
    const dotIdx = currentName.lastIndexOf('.');
    if (!entry.isDirectory && dotIdx > 0) {
      input.setSelectionRange(0, dotIdx);
    } else {
      input.select();
    }

    labelEl.replaceWith(input);
    input.focus();

    const commit = async () => {
      const newName = input.value.trim();
      if (!newName || newName === currentName) {
        input.replaceWith(labelEl);
        return;
      }

      const dirPath = entry.path.substring(0, entry.path.lastIndexOf('\\') || entry.path.lastIndexOf('/'));
      const newPath = dirPath + '/' + newName;
      const result = await window.electronAPI.fs.rename(entry.path, newPath);
      if (result.success) {
        labelEl.textContent = newName;
        entry.path = newPath;
        entry.name = newName;
      }
      input.replaceWith(labelEl);
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.replaceWith(labelEl); }
    });
  }

  private async createNewFile(dirPath: string): Promise<void> {
    const name = await this.promptInlineCreate(dirPath, false);
    if (!name) return;
    const newPath = dirPath + '/' + name;
    const result = await window.electronAPI.fs.createFile(newPath);
    if (result.success) {
      await this.refreshTree(this.rootPath!);
      this.onFileOpen(newPath);
    }
  }

  private async createNewFolder(dirPath: string): Promise<void> {
    const name = await this.promptInlineCreate(dirPath, true);
    if (!name) return;
    const newPath = dirPath + '/' + name;
    await window.electronAPI.fs.createDir(newPath);
    await this.refreshTree(this.rootPath!);
  }

  private promptInlineCreate(_dirPath: string, _isDir: boolean): Promise<string | null> {
    return new Promise((resolve) => {
      const name = prompt(_isDir ? 'Folder name:' : 'File name:');
      resolve(name);
    });
  }

  private async deleteEntry(entry: FileEntryNode): Promise<void> {
    const confirmed = confirm(`Delete "${entry.name}"?`);
    if (!confirmed) return;
    const result = await window.electronAPI.fs.delete(entry.path);
    if (result.success) {
      await this.refreshTree(this.rootPath!);
    }
  }

  private collapseAll(): void {
    this.expandedPaths.clear();
    if (this.rootPath) this.refreshTree(this.rootPath);
  }

  private showEmpty(): void {
    this.fileTree.innerHTML = `
      <div class="tree-empty">
        <div class="tree-empty-icon">📁</div>
        <div>No folder opened</div>
        <div style="margin-top: 8px; font-size: 11px">Open a folder to start browsing files</div>
      </div>
    `;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.watchUnsubscribe) this.watchUnsubscribe();
    window.electronAPI.fs.stopWatch();
  }
}

// ===== Context Menu =====
interface ContextMenuEntry {
  label?: string;
  shortcut?: string;
  action?: () => void;
  danger?: boolean;
  separator?: boolean;
}

export class ContextMenu {
  private static activeMenu: HTMLElement | null = null;

  static show(x: number, y: number, items: ContextMenuEntry[]): void {
    this.hide();

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
        continue;
      }

      const menuItem = document.createElement('div');
      menuItem.className = `context-menu-item${item.danger ? ' danger' : ''}`;

      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label ?? '';
      menuItem.appendChild(labelSpan);

      if (item.shortcut) {
        const kbd = document.createElement('span');
        kbd.className = 'context-menu-shortcut';
        kbd.textContent = item.shortcut;
        menuItem.appendChild(kbd);
      }

      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        item.action?.();
      });

      menu.appendChild(menuItem);
    }

    // Position
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const clampedX = Math.min(x, window.innerWidth - rect.width - 8);
    const clampedY = Math.min(y, window.innerHeight - rect.height - 8);
    menu.style.left = `${clampedX}px`;
    menu.style.top = `${clampedY}px`;

    this.activeMenu = menu;

    // Close on outside click
    const handler = () => this.hide();
    setTimeout(() => {
      document.addEventListener('click', handler, { once: true });
      document.addEventListener('contextmenu', handler, { once: true });
    }, 10);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    }, { once: true });
  }

  static hide(): void {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }
}
