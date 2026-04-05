import * as fs from 'fs';
import * as path from 'path';
import { IpcMain } from 'electron';

interface SearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  includePattern?: string;
  excludePattern?: string;
}

function matchesPattern(filename: string, pattern: string): boolean {
  if (!pattern) return true;
  const patterns = pattern.split(',').map(p => p.trim()).filter(Boolean);
  return patterns.some(p => {
    const regex = p
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    return new RegExp(`^${regex}$`).test(filename) || new RegExp(regex).test(filename);
  });
}

function searchInFile(
  filePath: string,
  options: SearchOptions,
  results: SearchResult[]
): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let searchRegex: RegExp;
    try {
      if (options.useRegex) {
        searchRegex = new RegExp(
          options.query,
          options.caseSensitive ? 'g' : 'gi'
        );
      } else {
        let pattern = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (options.wholeWord) pattern = `\\b${pattern}\\b`;
        searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
      }
    } catch {
      return; // Invalid regex
    }

    lines.forEach((line, idx) => {
      searchRegex.lastIndex = 0;
      let match;
      while ((match = searchRegex.exec(line)) !== null) {
        results.push({
          filePath,
          lineNumber: idx + 1,
          lineContent: line,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        });
        if (!searchRegex.global) break;
      }
    });
  } catch {
    // Skip unreadable files
  }
}

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.webpack', 'dist', 'out', '.next',
  '__pycache__', '.cache', 'build', 'coverage',
]);

function walkDir(
  dir: string,
  options: SearchOptions,
  results: SearchResult[],
  maxResults = 1000
): void {
  if (results.length >= maxResults) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= maxResults) break;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walkDir(fullPath, options, results, maxResults);
    } else if (entry.isFile()) {
      // Apply include/exclude patterns
      if (options.includePattern && !matchesPattern(entry.name, options.includePattern)) continue;
      if (options.excludePattern && matchesPattern(entry.name, options.excludePattern)) continue;

      // Skip binary-looking files
      const ext = path.extname(entry.name);
      const textExts = new Set([
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.json', '.jsonc', '.html', '.htm', '.css', '.scss', '.less',
        '.md', '.mdx', '.txt', '.log', '.yaml', '.yml', '.toml',
        '.xml', '.svg', '.py', '.rs', '.go', '.cpp', '.c', '.h',
        '.java', '.kt', '.swift', '.rb', '.php', '.sh', '.bash',
        '.ps1', '.bat', '.cmd', '.sql', '.r', '.lua', '.hs',
        '.ex', '.exs', '.elm', '.dart', '.cs', '.fs', '.vb',
        '.env', '.gitignore', '.gitattributes', '.editorconfig',
        '.eslintrc', '.prettierrc', '.babelrc', '', // no extension = likely text
      ]);
      if (!textExts.has(ext.toLowerCase())) continue;

      searchInFile(fullPath, options, results);
    }
  }
}

export function registerSearchHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('search:findInFiles', async (_event, folderPath: string, options: SearchOptions) => {
    try {
      const results: SearchResult[] = [];
      if (!options.query || options.query.length === 0) {
        return { success: true, results: [] };
      }
      walkDir(folderPath, options, results, 2000);
      return { success: true, results };
    } catch (err: unknown) {
      return { success: false, error: String(err), results: [] };
    }
  });

  ipcMain.handle('search:replaceInFiles', async (_event, replacements: Array<{ filePath: string; lineNumber: number; oldContent: string; newContent: string }>) => {
    try {
      const fileMap = new Map<string, string[]>();

      for (const rep of replacements) {
        if (!fileMap.has(rep.filePath)) {
          const content = fs.readFileSync(rep.filePath, 'utf-8');
          fileMap.set(rep.filePath, content.split('\n'));
        }
      }

      // Apply replacements (reversed order to preserve line numbers)
      const sortedReps = [...replacements].sort((a, b) => b.lineNumber - a.lineNumber);
      for (const rep of sortedReps) {
        const lines = fileMap.get(rep.filePath);
        if (lines && lines[rep.lineNumber - 1] !== undefined) {
          lines[rep.lineNumber - 1] = rep.newContent;
        }
      }

      for (const [filePath, lines] of fileMap.entries()) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}
