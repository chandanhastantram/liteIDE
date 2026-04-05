import * as monaco from 'monaco-editor';
import { getLanguageFromExtension } from '../fileExplorer/FileExplorer';

export class DiffViewer {
  private element: HTMLElement;
  private container: HTMLElement;
  private diffEditor: monaco.editor.IStandaloneDiffEditor | null = null;
  private header: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private originalModel: monaco.editor.ITextModel | null = null;
  private modifiedModel: monaco.editor.ITextModel | null = null;
  private currentFilePath: string | null = null;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'diff-viewer';
    this.element.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--color-bg-default);
      display: none;
      flex-direction: column;
      z-index: 100;
    `;

    this.header = document.createElement('div');
    this.header.className = 'diff-viewer-header';
    this.header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 35px;
      padding: 0 16px;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
      font-size: 13px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Working Tree Diff';
    
    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = '✕';
    this.closeBtn.style.cssText = `
      background: transparent; border: none; color: var(--color-fg-muted);
      cursor: pointer; font-size: 14px;
    `;
    this.closeBtn.addEventListener('click', () => this.hide());
    this.closeBtn.addEventListener('mouseover', () => this.closeBtn.style.color = 'var(--color-fg-default)');
    this.closeBtn.addEventListener('mouseout', () => this.closeBtn.style.color = 'var(--color-fg-muted)');

    this.header.appendChild(title);
    this.header.appendChild(this.closeBtn);

    this.container = document.createElement('div');
    this.container.style.cssText = 'flex: 1; min-height: 0;';

    this.element.appendChild(this.header);
    this.element.appendChild(this.container);
    parent.appendChild(this.element);

    this.initEditor();
  }

  private initEditor(): void {
    this.diffEditor = monaco.editor.createDiffEditor(this.container, {
      theme: 'litecode-dark',
      renderSideBySide: true,
      originalEditable: false, // HEAD is readonly
      readOnly: true, // For now, make modified readonly too to keep it simple, or make it false so you can edit it.
      minimap: { enabled: false },
      automaticLayout: true,
    });
  }

  async openDiff(folderPath: string, filePath: string, relPath: string): Promise<void> {
    this.currentFilePath = filePath;
    this.element.style.display = 'flex';
    this.header.children[0].textContent = `Working Tree Diff — ${relPath}`;

    try {
      // Fetch diff and original content from git IPC
      const res = await window.electronAPI.git.diff(folderPath, relPath);
      if (!res.success) throw new Error(res.error);

      let modifiedContent = '';
      const fileRes = await window.electronAPI.fs.readFile(filePath);
      if (fileRes.success && fileRes.content !== undefined) {
        modifiedContent = fileRes.content;
      }

      const originalContent = res.originalContent || '';
      
      // Get extension from filePath
      const match = filePath.match(/\.([^.]+)$/);
      const ext = match ? match[1] : '';
      const lang = getLanguageFromExtension(ext);

      if (this.originalModel) this.originalModel.dispose();
      if (this.modifiedModel) this.modifiedModel.dispose();

      this.originalModel = monaco.editor.createModel(originalContent, lang);
      this.modifiedModel = monaco.editor.createModel(modifiedContent, lang);

      this.diffEditor?.setModel({
        original: this.originalModel,
        modified: this.modifiedModel
      });

    } catch (e) {
      console.error('Failed to open diff', e);
    }
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    if (this.originalModel) this.originalModel.dispose();
    if (this.modifiedModel) this.modifiedModel.dispose();
    this.diffEditor?.dispose();
    this.element.remove();
  }
}
