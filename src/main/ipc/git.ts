import { IpcMain, BrowserWindow } from 'electron';
import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

let git: SimpleGit;

export function registerGitHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('git:init', async (_event, folderPath: string) => {
    try {
      git = simpleGit(folderPath);
      await git.init();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:status', async (_event, folderPath: string) => {
    try {
      const g = simpleGit(folderPath);
      const isRepo = await g.checkIsRepo();
      if (!isRepo) {
         return { success: true, isRepo: false };
      }
      const status = await git.status();
      return { success: true, isRepo: true, status };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:stage', async (_event, folderPath: string, filePaths: string | string[]) => {
    try {
      const g = simpleGit(folderPath);
      await g.add(filePaths);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:unstage', async (_event, folderPath: string, filePaths: string | string[]) => {
    try {
      const g = simpleGit(folderPath);
      await g.reset(['--', ...(Array.isArray(filePaths) ? filePaths : [filePaths])]);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:commit', async (_event, folderPath: string, message: string) => {
    try {
      const g = simpleGit(folderPath);
      const res = await g.commit(message);
      return { success: true, result: res };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:diff', async (_event, folderPath: string, filePath: string) => {
    try {
      const g = simpleGit(folderPath);
      // Get the diff for the specific file
      const diff = await g.diff([filePath]);
      
      let originalContent = '';
      try {
        // Get the HEAD version of the file content
        originalContent = await g.show([`HEAD:${filePath}`]);
      } catch (e) {
        // File might be untracked/new
      }
      
      return { success: true, diff, originalContent };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:log', async (_event, folderPath: string, maxCount: number = 50) => {
    try {
      const g = simpleGit(folderPath);
      const log = await g.log({ maxCount });
      return { success: true, log };
    } catch (err: unknown) {
     return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:branches', async (_event, folderPath: string) => {
    try {
      const g = simpleGit(folderPath);
      const branches = await g.branch();
      return { success: true, branches };
    } catch (err: unknown) {
       return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('git:checkout', async (_event, folderPath: string, branchName: string) => {
    try {
      const g = simpleGit(folderPath);
      await g.checkout(branchName);
      return { success: true };
    } catch (err: unknown) {
       return { success: false, error: String(err) };
    }
  });
}
