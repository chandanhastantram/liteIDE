import * as monaco from 'monaco-editor';
import { getLanguageFromExtension } from '../fileExplorer/FileExplorer';

export interface OpenFile {
  path: string;
  name: string;
  language: string;
  model: monaco.editor.ITextModel;
  viewState: monaco.editor.ICodeEditorViewState | null;
  isDirty: boolean;
  originalContent: string;
}

export interface EditorServiceConfig {
  onTabChange: (file: OpenFile | null) => void;
  onDirtyChange: (filePath: string, isDirty: boolean) => void;
}

export class EditorService {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private openFiles: Map<string, OpenFile> = new Map();
  private activeFilePath: string | null = null;
  private container: HTMLElement;
  private config: EditorServiceConfig;
  private disposables: monaco.IDisposable[] = [];
  private baseFontSize = 14;

  constructor(container: HTMLElement, config: EditorServiceConfig) {
    this.container = container;
    this.config = config;
    this.initEditor();
  }

  private initEditor(): void {
    // Define VS Code Dark+ token theme
    monaco.editor.defineTheme('litecode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',              foreground: 'D4D4D4', background: '1E1E1E' },
        { token: 'comment',       foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword',       foreground: '569CD6' },
        { token: 'string',        foreground: 'CE9178' },
        { token: 'number',        foreground: 'B5CEA8' },
        { token: 'type',          foreground: '4EC9B0' },
        { token: 'class',         foreground: '4EC9B0' },
        { token: 'function',      foreground: 'DCDCAA' },
        { token: 'variable',      foreground: '9CDCFE' },
        { token: 'constant',      foreground: '4FC1FF' },
        { token: 'parameter',     foreground: '9CDCFE' },
        { token: 'property',      foreground: '9CDCFE' },
        { token: 'operator',      foreground: 'D4D4D4' },
        { token: 'regexp',        foreground: 'D16969' },
        { token: 'decorator',     foreground: 'DCDCAA' },
        { token: 'interface',     foreground: '4EC9B0' },
        { token: 'enum',          foreground: '4EC9B0' },
        { token: 'namespace',     foreground: '4EC9B0' },
        { token: 'typeParameter', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background':                   '#1E1E1E',
        'editor.foreground':                   '#D4D4D4',
        'editorLineNumber.foreground':          '#858585',
        'editorLineNumber.activeForeground':    '#C6C6C6',
        'editor.selectionBackground':           '#264F78',
        'editor.inactiveSelectionBackground':   '#3A3D41',
        'editorCursor.foreground':              '#AEAFAD',
        'editor.lineHighlightBackground':       '#2A2D2E',
        'editor.lineHighlightBorder':           '#2A2D2E',
        'editorBracketMatch.background':        '#0064001A',
        'editorBracketMatch.border':            '#888888',
        'editor.findMatchBackground':           '#515C6A',
        'editor.findMatchHighlightBackground':  '#EA5C0055',
        'editor.wordHighlightBackground':       '#575757B8',
        'editor.wordHighlightStrongBackground': '#004972B8',
        'editorWidget.background':             '#252526',
        'editorWidget.border':                 '#454545',
        'editorWidget.shadow':                 '#000000',
        'editorSuggestWidget.background':      '#252526',
        'editorSuggestWidget.border':          '#454545',
        'editorSuggestWidget.selectedBackground': '#062F4A',
        'editorHoverWidget.background':        '#252526',
        'editorHoverWidget.border':            '#454545',
        'editorIndentGuide.background1':        '#404040',
        'editorIndentGuide.activeBackground1':  '#707070',
        'editorRuler.foreground':               '#333333',
        'scrollbarSlider.background':          '#79797966',
        'scrollbarSlider.hoverBackground':     '#646464B3',
        'scrollbarSlider.activeBackground':    '#BFBFBF66',
        'editorGutter.background':             '#1E1E1E',
        'minimap.background':                  '#1E1E1E',
        'tab.activeBackground':                '#1E1E1E',
        'tab.inactiveBackground':              '#2D2D2D',
        'tab.border':                          '#252526',
        'tab.activeBorder':                    '#007ACC',
        'sideBar.background':                  '#252526',
        'sideBar.foreground':                  '#CCCCCC',
        'sideBarSectionHeader.background':     '#00000000',
        'list.activeSelectionBackground':      '#094771',
        'list.hoverBackground':                '#2A2D2E',
        'statusBar.background':                '#007ACC',
        'statusBar.foreground':                '#FFFFFF',
        'activityBar.background':              '#333333',
        'activityBar.foreground':              '#FFFFFF',
        'activityBarBadge.background':         '#007ACC',
        'panel.background':                    '#1E1E1E',
        'panel.border':                        '#454545',
        'panelTitle.activeForeground':         '#E7E7E7',
        'terminal.background':                 '#1E1E1E',
        'terminal.foreground':                 '#D4D4D4',
      },
    });

    this.editor = monaco.editor.create(this.container, {
      theme: 'litecode-dark',
      fontSize: this.baseFontSize,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
      fontLigatures: true,
      lineHeight: 22,
      letterSpacing: 0.3,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      minimap: { enabled: true, maxColumn: 80, renderCharacters: false, scale: 1 },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: 'active', indentation: true },
      formatOnType: true,
      formatOnPaste: true,
      autoClosingBrackets: 'languageDefined',
      autoClosingQuotes: 'languageDefined',
      autoSurround: 'languageDefined',
      suggest: { showIcons: true, showStatusBar: true },
      quickSuggestions: { other: true, comments: false, strings: true },
      inlineSuggest: { enabled: true },
      parameterHints: { enabled: true },
      padding: { top: 8, bottom: 8 },
      overviewRulerLanes: 3,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      foldingHighlight: true,
      showFoldingControls: 'mouseover',
      links: true,
      colorDecorators: true,
      renderControlCharacters: false,
      mouseWheelZoom: true,
      multiCursorModifier: 'ctrlCmd',
      accessibilitySupport: 'off',
    });

    // Track dirty state
    this.editor.onDidChangeModelContent(() => {
      const path = this.activeFilePath;
      if (!path) return;
      const file = this.openFiles.get(path);
      if (!file) return;
      const isDirty = this.editor!.getValue() !== file.originalContent;
      if (isDirty !== file.isDirty) {
        file.isDirty = isDirty;
        this.config.onDirtyChange(path, isDirty);
      }
    });

    // Ctrl+S → save
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveCurrentFile();
    });

    // Auto-resize
    const ro = new ResizeObserver(() => this.editor?.layout());
    ro.observe(this.container);
    this.disposables.push({ dispose: () => ro.disconnect() });
  }

  async openFile(filePath: string): Promise<void> {
    if (this.openFiles.has(filePath)) {
      this.switchTo(filePath);
      return;
    }

    const result = await window.electronAPI.fs.readFile(filePath);
    if (!result.success || result.content === undefined) {
      console.error('Failed to read file:', result.error);
      return;
    }

    const name = filePath.split(/[\\/]/).pop() ?? filePath;
    const ext  = name.includes('.') ? name.split('.').pop()! : '';
    const lang = getLanguageFromExtension(ext);

    const uri   = monaco.Uri.file(filePath);
    const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(result.content, lang, uri);

    const file: OpenFile = {
      path: filePath, name, language: lang,
      model, viewState: null,
      isDirty: false, originalContent: result.content,
    };

    this.openFiles.set(filePath, file);
    this.switchTo(filePath);
  }

  switchTo(filePath: string): void {
    const file = this.openFiles.get(filePath);
    if (!file || !this.editor) return;

    if (this.activeFilePath && this.openFiles.has(this.activeFilePath)) {
      this.openFiles.get(this.activeFilePath)!.viewState = this.editor.saveViewState();
    }

    this.editor.setModel(file.model);
    if (file.viewState) this.editor.restoreViewState(file.viewState);
    this.editor.focus();
    this.activeFilePath = filePath;
    this.config.onTabChange(file);
  }

  async saveCurrentFile(): Promise<boolean> {
    if (!this.activeFilePath || !this.editor) return false;
    const file = this.openFiles.get(this.activeFilePath);
    if (!file) return false;
    const content = this.editor.getValue();
    const result  = await window.electronAPI.fs.writeFile(this.activeFilePath, content);
    if (result.success) {
      file.isDirty = false;
      file.originalContent = content;
      this.config.onDirtyChange(this.activeFilePath, false);
      return true;
    }
    return false;
  }

  async saveAllFiles(): Promise<void> {
    for (const [filePath, file] of this.openFiles) {
      if (!file.isDirty) continue;
      const content = file.model.getValue();
      const result  = await window.electronAPI.fs.writeFile(filePath, content);
      if (result.success) {
        file.isDirty = false;
        file.originalContent = content;
        this.config.onDirtyChange(filePath, false);
      }
    }
  }

  closeFile(filePath: string): string | null {
    const file = this.openFiles.get(filePath);
    if (!file) return null;
    if (file.isDirty) {
      if (!confirm(`"${file.name}" has unsaved changes. Discard?`)) {
        return this.activeFilePath ?? null;
      }
    }
    file.model.dispose();
    this.openFiles.delete(filePath);

    if (this.activeFilePath === filePath) {
      const keys = [...this.openFiles.keys()];
      if (keys.length > 0) {
        this.switchTo(keys[keys.length - 1]);
        return keys[keys.length - 1];
      } else {
        this.activeFilePath = null;
        this.editor?.setModel(null);
        this.config.onTabChange(null);
        return null;
      }
    }
    return this.activeFilePath ?? null;
  }

  goToLine(lineNumber: number): void {
    if (!this.editor) return;
    this.editor.revealLineInCenter(lineNumber);
    this.editor.setPosition({ lineNumber, column: 1 });
    this.editor.focus();
  }

  formatDocument(): void {
    this.editor?.getAction('editor.action.formatDocument')?.run();
  }

  openFindReplace(): void {
    this.editor?.getAction('editor.action.startFindReplaceAction')?.run();
  }

  openFind(): void {
    this.editor?.getAction('editor.action.startFindAction')?.run();
  }

  toggleMinimap(): void {
    if (!this.editor) return;
    const cur = this.editor.getOption(monaco.editor.EditorOption.minimap);
    this.editor.updateOptions({ minimap: { enabled: !cur.enabled } });
  }

  adjustFontSize(delta: number): void {
    if (delta === 0) {
      this.baseFontSize = 14;
    } else {
      this.baseFontSize = Math.max(8, Math.min(32, this.baseFontSize + delta));
    }
    this.editor?.updateOptions({ fontSize: this.baseFontSize });
  }

  setFontSize(size: number): void {
    this.baseFontSize = size;
    this.editor?.updateOptions({ fontSize: size });
  }

  getActiveFilePath(): string | null  { return this.activeFilePath; }
  getActiveFile(): OpenFile | null    { return this.activeFilePath ? (this.openFiles.get(this.activeFilePath) ?? null) : null; }
  getOpenFiles(): Map<string, OpenFile> { return this.openFiles; }
  getOpenFilePaths(): string[]        { return [...this.openFiles.keys()]; }

  getCursorPosition(): { line: number; column: number } | null {
    const pos = this.editor?.getPosition();
    return pos ? { line: pos.lineNumber, column: pos.column } : null;
  }

  registerCursorChange(callback: (line: number, col: number) => void): monaco.IDisposable | null {
    return this.editor?.onDidChangeCursorPosition((e) => {
      callback(e.position.lineNumber, e.position.column);
    }) ?? null;
  }

  focus():  void { this.editor?.focus(); }
  layout(): void { this.editor?.layout(); }

  destroy(): void {
    for (const f of this.openFiles.values()) f.model.dispose();
    this.disposables.forEach(d => d.dispose());
    this.editor?.dispose();
  }
}
