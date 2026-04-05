import * as fs from 'fs';
import * as path from 'path';
import { IpcMain, app } from 'electron';
import * as os from 'os';

const DEFAULT_SETTINGS = {
  editor: {
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    minimap: true,
    formatOnSave: false,
    formatOnPaste: true,
    autoSave: 'off',
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    bracketPairColorization: true,
    smoothScrolling: true,
    cursorBlinking: 'phase',
  },
  workbench: {
    colorTheme: 'litecode-dark',
    iconTheme: 'default',
    sidebarLocation: 'left',
    statusBarVisible: true,
    activityBarVisible: true,
    editorTabsVisible: true,
  },
  terminal: {
    shell: os.platform() === 'win32' ? 'powershell.exe' : 'bash',
    fontSize: 14,
    cursorStyle: 'block',
    cursorBlink: true,
  },
  files: {
    autoSave: 'off',
    autoSaveDelay: 1000,
    trimTrailingWhitespace: true,
    insertFinalNewline: true,
    encoding: 'utf8',
  },
  search: {
    exclude: ['node_modules', '.git', 'dist', 'out'],
    useIgnoreFiles: true,
    followSymlinks: false,
  },
};

function getSettingsPath(): string {
  const configDir = path.join(app.getPath('userData'), 'User');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'settings.json');
}

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('settings:getDefaults', async () => {
    return { success: true, settings: DEFAULT_SETTINGS };
  });

  ipcMain.handle('settings:read', async () => {
    try {
      const settingsPath = getSettingsPath();
      if (!fs.existsSync(settingsPath)) {
        // Write defaults if not exists
        fs.writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
        return { success: true, settings: DEFAULT_SETTINGS, path: settingsPath };
      }
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const userSettings = JSON.parse(raw);
      // Deep merge with defaults
      const merged = deepMerge(DEFAULT_SETTINGS, userSettings);
      return { success: true, settings: merged, path: settingsPath };
    } catch (err: unknown) {
      return { success: false, error: String(err), settings: DEFAULT_SETTINGS };
    }
  });

  ipcMain.handle('settings:write', async (_event, settings: Record<string, unknown>) => {
    try {
      const settingsPath = getSettingsPath();
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      return { success: true, path: settingsPath };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('settings:getPath', async () => {
    return { success: true, path: getSettingsPath() };
  });
}

function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) &&
        typeof defaults[key] === 'object' && defaults[key] !== null) {
      result[key] = deepMerge(
        defaults[key] as Record<string, unknown>,
        val as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}
