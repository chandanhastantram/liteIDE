import type { SearchResult, SearchOptions } from '../../shared/types';

type FileOpenCallback = (filePath: string, lineNumber?: number) => void;

// Quick SVG generators
const svgs = {
  case: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="1" y="12" font-size="11" fill="currentColor" font-weight="700">Aa</text></svg>`,
  word: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="1" y="12" font-size="10" fill="currentColor" font-weight="700">ab</text><rect x="1" y="12" width="14" height="1.5" rx="0.5" fill="currentColor"/></svg>`,
  regex: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="1" y="12" font-size="12" fill="currentColor">.*</text></svg>`,
  replace: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5h8M2 8h6M2 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 9l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  chevron: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

export class SearchPanel {
  private element: HTMLElement;
  private queryInput!: HTMLInputElement;
  private replaceInput!: HTMLInputElement;
  private replaceRow!: HTMLElement;
  private resultsEl!: HTMLElement;
  private statusEl!: HTMLElement;

  private caseSensitive = false;
  private wholeWord = false;
  private useRegex = false;
  private showReplace = false;

  private folderPath: string | null = null;
  private onFileOpen: FileOpenCallback;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private isSearching = false;

  constructor(container: HTMLElement, onFileOpen: FileOpenCallback) {
    this.onFileOpen = onFileOpen;
    this.element = document.createElement('div');
    this.element.className = 'search-panel';
    container.appendChild(this.element);
    this.build();
  }

  private build(): void {
    this.element.innerHTML = '';

    const inputGroup = document.createElement('div');
    inputGroup.className = 'search-input-group';

    // Search row
    const searchRow = document.createElement('div');
    searchRow.className = 'search-input-row';

    this.queryInput = document.createElement('input');
    this.queryInput.type = 'text';
    this.queryInput.placeholder = 'Search (⇧Enter to replace)';
    this.queryInput.id = 'search-panel-input';

    // Toggle buttons
    const caseBtn = this.makeToggle('case', 'Case Sensitive (Alt+C)', svgs.case, () => {
      this.caseSensitive = !this.caseSensitive;
      caseBtn.classList.toggle('active', this.caseSensitive);
      this.triggerSearch();
    });

    const wordBtn = this.makeToggle('word', 'Whole Word (Alt+W)', svgs.word, () => {
      this.wholeWord = !this.wholeWord;
      wordBtn.classList.toggle('active', this.wholeWord);
      this.triggerSearch();
    });

    const regexBtn = this.makeToggle('regex', 'Use Regex (Alt+R)', svgs.regex, () => {
      this.useRegex = !this.useRegex;
      regexBtn.classList.toggle('active', this.useRegex);
      this.triggerSearch();
    });

    const replaceToggle = this.makeToggle('collapse', 'Toggle Replace', svgs.replace, () => {
      this.showReplace = !this.showReplace;
      this.replaceRow.style.display = this.showReplace ? 'flex' : 'none';
    });

    searchRow.appendChild(replaceToggle);
    searchRow.appendChild(this.queryInput);
    searchRow.appendChild(caseBtn);
    searchRow.appendChild(wordBtn);
    searchRow.appendChild(regexBtn);

    // Replace row
    this.replaceRow = document.createElement('div');
    this.replaceRow.className = 'search-input-row';
    this.replaceRow.style.display = 'none';

    this.replaceInput = document.createElement('input');
    this.replaceInput.type = 'text';
    this.replaceInput.placeholder = 'Replace';
    this.replaceInput.id = 'search-panel-replace-input';

    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.className = 'search-toggle-btn';
    replaceAllBtn.title = 'Replace All';
    replaceAllBtn.innerHTML = svgs.replace;
    replaceAllBtn.addEventListener('click', () => this.replaceAll());

    this.replaceRow.appendChild(this.replaceInput);
    this.replaceRow.appendChild(replaceAllBtn);

    inputGroup.appendChild(searchRow);
    inputGroup.appendChild(this.replaceRow);

    // Status
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'search-status';

    // Search button
    const actionRow = document.createElement('div');
    actionRow.className = 'search-actions';

    const searchBtn = document.createElement('button');
    searchBtn.className = 'search-action-btn';
    searchBtn.textContent = '🔍 Search';
    searchBtn.id = 'search-panel-btn';
    searchBtn.addEventListener('click', () => this.doSearch());

    actionRow.appendChild(searchBtn);

    // Results
    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'search-results';

    this.element.appendChild(inputGroup);
    this.element.appendChild(this.statusEl);
    this.element.appendChild(actionRow);
    this.element.appendChild(this.resultsEl);

    // Keyboard
    this.queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.doSearch();
      }
    });
    this.queryInput.addEventListener('input', () => this.triggerSearch());
  }

  private makeToggle(id: string, title: string, icon: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'search-toggle-btn';
    btn.title = title;
    btn.id = `search-toggle-${id}`;
    btn.innerHTML = icon;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private triggerSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.doSearch(), 350);
  }

  async doSearch(): Promise<void> {
    const query = this.queryInput.value.trim();
    if (!query || !this.folderPath) {
      this.resultsEl.innerHTML = '';
      this.statusEl.textContent = query ? 'No folder open' : '';
      return;
    }

    this.isSearching = true;
    this.statusEl.className = 'search-status searching';
    this.statusEl.textContent = 'Searching…';
    this.resultsEl.innerHTML = '';

    const options: SearchOptions = {
      query,
      caseSensitive: this.caseSensitive,
      wholeWord: this.wholeWord,
      useRegex: this.useRegex,
    };

    try {
      const response = await window.electronAPI.search.findInFiles(this.folderPath, options);
      this.isSearching = false;

      if (!response.success) {
        this.statusEl.className = 'search-status';
        this.statusEl.textContent = `Error: ${response.error}`;
        return;
      }

      this.renderResults(response.results, query);
    } catch (err) {
      this.isSearching = false;
      this.statusEl.className = 'search-status';
      this.statusEl.textContent = String(err);
    }
  }

  private renderResults(results: SearchResult[], query: string): void {
    const count = results.length;

    if (count === 0) {
      this.statusEl.className = 'search-status';
      this.statusEl.textContent = `No results for "${query}"`;
      this.resultsEl.innerHTML = '';
      return;
    }

    // Group by file
    const byFile = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!byFile.has(r.filePath)) byFile.set(r.filePath, []);
      byFile.get(r.filePath)!.push(r);
    }

    const fileCount = byFile.size;
    this.statusEl.className = 'search-status has-results';
    this.statusEl.textContent = `${count} result${count !== 1 ? 's' : ''} in ${fileCount} file${fileCount !== 1 ? 's' : ''}`;

    this.resultsEl.innerHTML = '';

    for (const [filePath, matches] of byFile) {
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
      const relPath = this.folderPath ? filePath.replace(this.folderPath, '').replace(/^[\\/]/, '') : filePath;

      const group = document.createElement('div');
      group.className = 'search-file-group';

      // Header (collapsible)
      const header = document.createElement('div');
      header.className = 'search-file-header';
      header.innerHTML = `
        <span class="search-file-name">📄 ${fileName}</span>
        <span class="search-file-path">${relPath}</span>
        <span class="search-match-count-badge">${matches.length}</span>
      `;

      const matchContainer = document.createElement('div');
      matchContainer.className = 'search-matches expanded';

      header.addEventListener('click', () => {
        matchContainer.classList.toggle('expanded');
      });

      // Match rows
      for (const match of matches) {
        const row = document.createElement('div');
        row.className = 'search-match-row';

        const col = document.createElement('div');
        col.className = 'search-match-col';
        col.textContent = String(match.lineNumber);

        const content = document.createElement('div');
        content.className = 'search-match-content';

        // Highlight the match
        const before = match.lineContent.slice(0, match.matchStart);
        const matched = match.lineContent.slice(match.matchStart, match.matchEnd);
        const after = match.lineContent.slice(match.matchEnd);
        content.innerHTML = `${escapeHtml(before.trimStart())}<mark>${escapeHtml(matched)}</mark>${escapeHtml(after)}`;

        row.appendChild(col);
        row.appendChild(content);

        row.addEventListener('click', () => {
          this.onFileOpen(match.filePath, match.lineNumber);
        });

        matchContainer.appendChild(row);
      }

      group.appendChild(header);
      group.appendChild(matchContainer);
      this.resultsEl.appendChild(group);
    }
  }

  private async replaceAll(): Promise<void> {
    const query = this.queryInput.value.trim();
    const replacement = this.replaceInput.value;
    if (!query || !this.folderPath) return;

    // Do search first to get results
    const options: SearchOptions = { query, caseSensitive: this.caseSensitive, wholeWord: this.wholeWord, useRegex: this.useRegex };
    const response = await window.electronAPI.search.findInFiles(this.folderPath, options);
    if (!response.success) return;

    if (response.results.length === 0) {
      this.statusEl.textContent = 'No results to replace';
      return;
    }

    const confirmed = confirm(`Replace ${response.results.length} occurrence(s) with "${replacement}"?`);
    if (!confirmed) return;

    // Build replacement list
    const replacements = response.results.map(r => {
      const newContent = r.lineContent.replace(
        this.useRegex ? new RegExp(query, this.caseSensitive ? 'g' : 'gi') : query,
        replacement
      );
      return {
        filePath: r.filePath,
        lineNumber: r.lineNumber,
        oldContent: r.lineContent,
        newContent,
      };
    });

    const result = await window.electronAPI.search.replaceInFiles(replacements);
    if (result.success) {
      this.statusEl.textContent = `Replaced ${replacements.length} occurrence(s)`;
      this.resultsEl.innerHTML = '';
    }
  }

  setFolderPath(folderPath: string | null): void {
    this.folderPath = folderPath;
  }

  focus(): void {
    this.queryInput.focus();
  }

  getElement(): HTMLElement {
    return this.element;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
