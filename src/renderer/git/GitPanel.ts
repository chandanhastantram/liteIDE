import * as path from 'path';

type FileOpenCallback = (path: string) => void;

interface GitFileStatus {
  path: string;
  index: string;
  working_dir: string;
}

export class GitPanel {
  private element: HTMLElement;
  private changesSection!: HTMLElement;
  private stagedSection!: HTMLElement;
  private commitInput!: HTMLTextAreaElement;
  private folderPath: string | null = null;
  private onFileOpen: FileOpenCallback;

  constructor(container: HTMLElement, onFileOpen: FileOpenCallback) {
    this.onFileOpen = onFileOpen;
    this.element = document.createElement('div');
    this.element.className = 'git-panel';
    container.appendChild(this.element);
    this.build();
  }

  private build(): void {
    // Commit area
    const commitArea = document.createElement('div');
    commitArea.className = 'git-commit-area';

    this.commitInput = document.createElement('textarea');
    this.commitInput.className = 'git-commit-input';
    this.commitInput.placeholder = 'Message (Ctrl+Enter to commit)';
    this.commitInput.id = 'git-commit-message';

    const commitBtn = document.createElement('button');
    commitBtn.className = 'git-commit-btn';
    commitBtn.textContent = '✓ Commit';
    commitBtn.addEventListener('click', () => this.commit());

    this.commitInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.commit();
      }
    });

    commitArea.appendChild(this.commitInput);
    commitArea.appendChild(commitBtn);

    // Changes area
    const changesScroll = document.createElement('div');
    changesScroll.className = 'git-changes';

    // Staged changes
    this.stagedSection = document.createElement('div');
    this.stagedSection.className = 'git-section';

    // Unstaged changes  
    this.changesSection = document.createElement('div');
    this.changesSection.className = 'git-section';

    changesScroll.appendChild(this.stagedSection);
    changesScroll.appendChild(this.changesSection);

    this.element.appendChild(commitArea);
    this.element.appendChild(changesScroll);

    this.renderEmpty();
  }

  private renderEmpty(): void {
    this.changesSection.innerHTML = `
      <div class="git-no-changes">
        <div style="font-size: 24px; margin-bottom: 8px;">⎇</div>
        <div>No source control detected.</div>
        <div style="margin-top: 4px; opacity: 0.7;">Open a folder with a Git repository.</div>
      </div>
    `;
    this.stagedSection.innerHTML = '';
  }

  async refresh(): Promise<void> {
    if (!this.folderPath) {
      this.renderEmpty();
      return;
    }

    try {
      const res = await window.electronAPI.git.status(this.folderPath);
      if (!res.success || !res.isRepo) {
        this.renderNotGitRepo();
        return;
      }
      this.renderGitStatus(res.status);
    } catch {
      this.renderNotGitRepo();
    }
  }

  private renderNotGitRepo(): void {
    this.changesSection.innerHTML = `
      <div class="git-no-changes">
        <div style="font-size: 24px; margin-bottom: 8px;">⎇</div>
        <div>Not a Git repository.</div>
        <div style="margin-top: 4px; opacity: 0.7;">Initialize a repository to start tracking changes.</div>
        <button id="git-init-btn" style="
          margin-top: 12px; padding: 5px 12px;
          background: var(--color-accent); border: none; border-radius: 3px;
          color: #fff; font-size: 12px; cursor: pointer;
        ">Initialize Repository</button>
      </div>
    `;
    this.stagedSection.innerHTML = '';
    const btn = this.changesSection.querySelector('#git-init-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (this.folderPath) {
          await window.electronAPI.git.init(this.folderPath);
          this.refresh();
        }
      });
    }
  }

  private renderGitStatus(status: any): void {
    const staged: GitFileStatus[] = [];
    const unstaged: GitFileStatus[] = [];

    for (const file of status.files) {
      if (file.index !== ' ' && file.index !== '?') {
        staged.push(file);
      }
      if (file.working_dir !== ' ' && file.working_dir !== '?') {
        unstaged.push(file);
      }
      if (file.index === '?' && file.working_dir === '?') {
        unstaged.push(file);
      }
    }

    this.renderSection(this.stagedSection, 'STAGED CHANGES', staged, true);
    this.renderSection(this.changesSection, 'CHANGES', unstaged, false);
  }

  private renderSection(container: HTMLElement, title: string, files: GitFileStatus[], isStaged: boolean): void {
    if (files.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';

    const header = document.createElement('div');
    header.className = 'git-section-header';
    header.textContent = `${title} (${files.length})`;
    
    const actions = document.createElement('span');
    actions.style.float = 'right';
    actions.style.cursor = 'pointer';
    actions.textContent = isStaged ? '−' : '+';
    actions.title = isStaged ? 'Unstage All' : 'Stage All';
    actions.addEventListener('click', async (e) => {
      e.stopPropagation();
      const paths = files.map(f => f.path);
      if (isStaged) {
        await window.electronAPI.git.unstage(this.folderPath!, paths);
      } else {
        await window.electronAPI.git.stage(this.folderPath!, paths);
      }
      this.refresh();
    });
    header.appendChild(actions);

    container.innerHTML = '';
    container.appendChild(header);

    for (const file of files) {
      const item = document.createElement('div');
      item.className = 'git-file-item';
      
      const icon = document.createElement('span');
      // basic icon mapping based on letter
      const statusLetter = isStaged ? file.index : (file.working_dir === '?' ? 'U' : file.working_dir);
      icon.className = `git-status-icon git-status-${statusLetter.trim().toLowerCase() || 'u'}`;
      icon.textContent = statusLetter;
      
      const name = document.createElement('span');
      name.className = 'git-file-name';
      name.textContent = file.path.split('/').pop() || file.path;

      const pathSpan = document.createElement('span');
      pathSpan.className = 'git-file-path';
      pathSpan.textContent = path.dirname(file.path);

      const actionBtn = document.createElement('button');
      actionBtn.className = 'git-file-action';
      actionBtn.innerHTML = isStaged ? '−' : '+';
      actionBtn.title = isStaged ? 'Unstage' : 'Stage';
      actionBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (isStaged) {
          await window.electronAPI.git.unstage(this.folderPath!, file.path);
        } else {
          await window.electronAPI.git.stage(this.folderPath!, file.path);
        }
        this.refresh();
      });

      item.appendChild(icon);
      item.appendChild(name);
      item.appendChild(pathSpan);
      item.appendChild(actionBtn);

      item.addEventListener('click', () => {
        if (this.folderPath) {
          // Open Diff Viewer (or file)
          const fullPath = path.join(this.folderPath, file.path);
          this.onFileOpen(fullPath); // TODO: trigger diff viewer custom event
          document.dispatchEvent(new CustomEvent('git-open-diff', { 
            detail: { filePath: fullPath, relPath: file.path } 
          }));
        }
      });

      container.appendChild(item);
    }
  }

  private async commit(): Promise<void> {
    const message = this.commitInput.value.trim();
    if (!message || !this.folderPath) {
      this.commitInput.style.borderColor = '#f14c4c';
      setTimeout(() => {
        this.commitInput.style.borderColor = '';
      }, 1500);
      return;
    }

    try {
      const res = await window.electronAPI.git.commit(this.folderPath, message);
      if (res.success) {
        this.commitInput.value = '';
        this.refresh();
      } else {
        alert('Commit failed: ' + res.error);
      }
    } catch (e) {
      alert('Commit failed');
    }
  }

  setFolderPath(folderPath: string | null): void {
    this.folderPath = folderPath;
    this.refresh();
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
