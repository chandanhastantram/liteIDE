// Shared types used by both preload and renderer
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  extension?: string;
}

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
}

export interface SearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  includePattern?: string;
  excludePattern?: string;
}

export interface ElectronAPI {
  // File System
  fs: {
    readDir(dirPath: string): Promise<{ success: boolean; entries?: FileEntry[]; error?: string }>;
    readFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }>;
    writeFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }>;
    createFile(filePath: string): Promise<{ success: boolean; error?: string }>;
    createDir(dirPath: string): Promise<{ success: boolean; error?: string }>;
    delete(targetPath: string): Promise<{ success: boolean; error?: string }>;
    rename(oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }>;
    openFolder(): Promise<{ success: boolean; folderPath?: string; canceled?: boolean; error?: string }>;
    watchFolder(folderPath: string): Promise<{ success: boolean; error?: string }>;
    stopWatch(): Promise<{ success: boolean }>;
    stat(filePath: string): Promise<{ success: boolean; isDirectory?: boolean; size?: number; mtime?: string; error?: string }>;
    onWatchEvent(callback: (event: WatchEvent) => void): () => void;
  };
  // Search
  search: {
    findInFiles(folderPath: string, options: SearchOptions): Promise<{ success: boolean; results: SearchResult[]; error?: string }>;
    replaceInFiles(replacements: Array<{ filePath: string; lineNumber: number; oldContent: string; newContent: string }>): Promise<{ success: boolean; error?: string }>;
  };
  // Settings
  settings: {
    getDefaults(): Promise<{ success: boolean; settings: Record<string, unknown> }>;
    read(): Promise<{ success: boolean; settings: Record<string, unknown>; path?: string; error?: string }>;
    write(settings: Record<string, unknown>): Promise<{ success: boolean; path?: string; error?: string }>;
    getPath(): Promise<{ success: boolean; path: string }>;
  };
  // Git
  git: {
    init(folderPath: string): Promise<{ success: boolean; error?: string }>;
    status(folderPath: string): Promise<{ success: boolean; isRepo?: boolean; status?: any; error?: string }>;
    stage(folderPath: string, filePaths: string | string[]): Promise<{ success: boolean; error?: string }>;
    unstage(folderPath: string, filePaths: string | string[]): Promise<{ success: boolean; error?: string }>;
    commit(folderPath: string, message: string): Promise<{ success: boolean; result?: any; error?: string }>;
    diff(folderPath: string, filePath: string): Promise<{ success: boolean; diff?: string; originalContent?: string; error?: string }>;
    log(folderPath: string, maxCount?: number): Promise<{ success: boolean; log?: any; error?: string }>;
    branches(folderPath: string): Promise<{ success: boolean; branches?: any; error?: string }>;
    checkout(folderPath: string, branchName: string): Promise<{ success: boolean; error?: string }>;
  };
  // Window controls
  window: {
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    isMaximized(): Promise<boolean>;
  };
  // Menu events
  menu: {
    onOpenFolder(callback: (folderPath: string) => void): () => void;
    onOpenFile(callback: (filePath: string) => void): () => void;
    onSave(callback: () => void): () => void;
    onSaveAll(callback: () => void): () => void;
    onNewFile(callback: () => void): () => void;
    onToggleSidebar(callback: () => void): () => void;
    onCommandPalette(callback: () => void): () => void;
    onFind(callback: () => void): () => void;
    onToggleTerminal(callback: () => void): () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
