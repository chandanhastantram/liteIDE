import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, WatchEvent, SearchOptions, SearchResult } from '../shared/types';

function makeListener(channel: string, callback: (...args: unknown[]) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler = (_event: any, ...args: unknown[]) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const electronAPI: ElectronAPI = {
  fs: {
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
    createDir: (dirPath) => ipcRenderer.invoke('fs:createDir', dirPath),
    delete: (targetPath) => ipcRenderer.invoke('fs:delete', targetPath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    openFolder: () => ipcRenderer.invoke('fs:openFolder'),
    watchFolder: (folderPath) => ipcRenderer.invoke('fs:watchFolder', folderPath),
    stopWatch: () => ipcRenderer.invoke('fs:stopWatch'),
    stat: (filePath) => ipcRenderer.invoke('fs:stat', filePath),
    onWatchEvent: (callback) => makeListener('fs:watchEvent', (ev) => callback(ev as WatchEvent)),
  },
  search: {
    findInFiles: (folderPath, options) => ipcRenderer.invoke('search:findInFiles', folderPath, options),
    replaceInFiles: (replacements) => ipcRenderer.invoke('search:replaceInFiles', replacements),
  },
  settings: {
    getDefaults: () => ipcRenderer.invoke('settings:getDefaults'),
    read: () => ipcRenderer.invoke('settings:read'),
    write: (settings) => ipcRenderer.invoke('settings:write', settings),
    getPath: () => ipcRenderer.invoke('settings:getPath'),
  },
  git: {
    init: (folderPath: string) => ipcRenderer.invoke('git:init', folderPath),
    status: (folderPath: string) => ipcRenderer.invoke('git:status', folderPath),
    stage: (folderPath: string, filePaths: string | string[]) => ipcRenderer.invoke('git:stage', folderPath, filePaths),
    unstage: (folderPath: string, filePaths: string | string[]) => ipcRenderer.invoke('git:unstage', folderPath, filePaths),
    commit: (folderPath: string, message: string) => ipcRenderer.invoke('git:commit', folderPath, message),
    diff: (folderPath: string, filePath: string) => ipcRenderer.invoke('git:diff', folderPath, filePath),
    log: (folderPath: string, maxCount?: number) => ipcRenderer.invoke('git:log', folderPath, maxCount),
    branches: (folderPath: string) => ipcRenderer.invoke('git:branches', folderPath),
    checkout: (folderPath: string, branchName: string) => ipcRenderer.invoke('git:checkout', folderPath, branchName),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  menu: {
    onOpenFolder: (cb) => makeListener('menu:openFolder', cb as (...args: unknown[]) => void),
    onOpenFile: (cb) => makeListener('menu:openFile', cb as (...args: unknown[]) => void),
    onSave: (cb) => makeListener('menu:save', cb as (...args: unknown[]) => void),
    onSaveAll: (cb) => makeListener('menu:saveAll', cb as (...args: unknown[]) => void),
    onNewFile: (cb) => makeListener('menu:newFile', cb as (...args: unknown[]) => void),
    onToggleSidebar: (cb) => makeListener('menu:toggleSidebar', cb as (...args: unknown[]) => void),
    onCommandPalette: (cb) => makeListener('menu:commandPalette', cb as (...args: unknown[]) => void),
    onFind: (cb) => makeListener('menu:find', cb as (...args: unknown[]) => void),
    onToggleTerminal: (cb) => makeListener('menu:toggleTerminal', cb as (...args: unknown[]) => void),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
