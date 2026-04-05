import * as fs from 'fs';
import * as path from 'path';
import { IpcMain, BrowserWindow, dialog } from 'electron';
import * as chokidar from 'chokidar';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  extension?: string;
}

let watcher: chokidar.FSWatcher | null = null;

function readDirRecursive(dirPath: string, depth = 0): FileEntry[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    // Sort: directories first, then files
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      return a.isDirectory() ? -1 : 1;
    });

    for (const entry of sorted) {
      // Skip hidden files and node_modules / .git at root level
      if (entry.name.startsWith('.') && depth === 0) continue;
      if ((entry.name === 'node_modules' || entry.name === '.git') && depth === 0) continue;

      const fullPath = path.join(dirPath, entry.name);
      const fileEntry: FileEntry = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        extension: entry.isFile() ? path.extname(entry.name).slice(1) : undefined,
      };

      result.push(fileEntry);
    }

    return result;
  } catch {
    return [];
  }
}

export function registerFileSystemHandlers(ipcMain: IpcMain): void {
  // Read directory (one level)
  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    try {
      return { success: true, entries: readDirRecursive(dirPath) };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Read file content
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Write file content
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Create new file
  ipcMain.handle('fs:createFile', async (_event, filePath: string) => {
    try {
      fs.writeFileSync(filePath, '', 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Create directory
  ipcMain.handle('fs:createDir', async (_event, dirPath: string) => {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Delete file or directory
  ipcMain.handle('fs:delete', async (_event, targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Rename file/dir
  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      fs.renameSync(oldPath, newPath);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Open folder dialog
  ipcMain.handle('fs:openFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No window found' };

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Open Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, folderPath: result.filePaths[0] };
  });

  // Watch folder for changes
  ipcMain.handle('fs:watchFolder', async (event, folderPath: string) => {
    // Stop previous watcher
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    watcher = chokidar.watch(folderPath, {
      ignored: /(node_modules|\.git|\.webpack|dist|out)/,
      persistent: true,
      ignoreInitial: true,
      depth: 10,
    });

    const send = (eventType: string, filePath: string) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('fs:watchEvent', { type: eventType, path: filePath });
      }
    };

    watcher.on('add', (p) => send('add', p));
    watcher.on('change', (p) => send('change', p));
    watcher.on('unlink', (p) => send('unlink', p));
    watcher.on('addDir', (p) => send('addDir', p));
    watcher.on('unlinkDir', (p) => send('unlinkDir', p));

    return { success: true };
  });

  // Stop watching
  ipcMain.handle('fs:stopWatch', async () => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    return { success: true };
  });

  // Get file stat
  ipcMain.handle('fs:stat', async (_event, filePath: string) => {
    try {
      const stat = fs.statSync(filePath);
      return {
        success: true,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}
