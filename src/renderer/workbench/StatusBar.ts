import { EditorService } from '../editor/EditorService';

export class StatusBar {
  private element: HTMLElement;
  private branchItem: HTMLElement;
  private languageItem: HTMLElement;
  private lineColItem: HTMLElement;
  private encodingItem: HTMLElement;
  private eolItem: HTMLElement;
  private folderItem: HTMLElement;
  private editorService: EditorService | null = null;
  private cursorDisposable: { dispose: () => void } | null = null;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'status-bar';
    container.appendChild(this.element);

    // Build left items
    this.branchItem = this.createItem('status-branch', '$(git-branch) main', 'Git Branch');
    this.folderItem = this.createItem('status-folder', '', 'Open Folder');

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'status-spacer';

    // Right items
    this.lineColItem = this.createItem('status-line-col', 'Ln 1, Col 1', 'Go to Line');
    this.languageItem = this.createItem('status-language', 'Plain Text', 'Select Language Mode');
    this.encodingItem = this.createItem('status-encoding', 'UTF-8', 'Select Encoding');
    this.eolItem = this.createItem('status-eol', 'CRLF', 'Select End of Line Sequence');

    this.element.appendChild(this.branchItem);
    this.element.appendChild(this.folderItem);
    this.element.appendChild(spacer);
    this.element.appendChild(this.lineColItem);
    this.element.appendChild(this.languageItem);
    this.element.appendChild(this.encodingItem);
    this.element.appendChild(this.eolItem);
  }

  private createItem(id: string, text: string, tooltip: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'status-item';
    item.id = id;
    item.title = tooltip;
    item.textContent = text;
    return item;
  }

  bindEditorService(service: EditorService): void {
    // Clean up old binding
    if (this.cursorDisposable) {
      this.cursorDisposable.dispose();
      this.cursorDisposable = null;
    }

    this.editorService = service;

    // Register cursor position listener
    const disposable = service.registerCursorChange((line, col) => {
      this.lineColItem.textContent = `Ln ${line}, Col ${col}`;
    });

    if (disposable) {
      this.cursorDisposable = disposable;
    }
  }

  updateForFile(filePath: string | null, language: string | null): void {
    if (filePath && language) {
      // Language
      const langLabel = language.charAt(0).toUpperCase() + language.slice(1);
      this.languageItem.textContent = langLabel;

      // EOL — detect from file extension
      this.eolItem.textContent = 'CRLF';
    } else {
      this.languageItem.textContent = 'Plain Text';
      this.lineColItem.textContent = 'Ln 1, Col 1';
    }
  }

  updateFolder(folderName: string | null): void {
    if (folderName) {
      this.folderItem.textContent = `📁 ${folderName}`;
      this.folderItem.style.display = 'flex';
    } else {
      this.folderItem.style.display = 'none';
    }
  }

  updateBranch(branch: string | null): void {
    if (branch) {
      this.branchItem.textContent = `⎇ ${branch}`;
    } else {
      this.branchItem.textContent = '';
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
