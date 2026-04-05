// VS Code-style Command Registry
// Inspired by: src/vs/platform/commands/common/commands.ts

interface Command {
  id: string;
  label: string;
  category?: string;
  keybinding?: string;
  description?: string;
  icon?: string;
  handler: () => void | Promise<void>;
}

export class CommandRegistry {
  private static commands: Map<string, Command> = new Map();

  static register(cmd: Command): void {
    this.commands.set(cmd.id, cmd);
  }

  static unregister(id: string): void {
    this.commands.delete(id);
  }

  static execute(id: string): void | Promise<void> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      console.warn(`Command not found: ${id}`);
      return;
    }
    return cmd.handler();
  }

  static getAll(): Command[] {
    return [...this.commands.values()];
  }

  static search(query: string): Command[] {
    if (!query) return this.getAll();
    const lower = query.toLowerCase();
    return this.getAll().filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.id.toLowerCase().includes(lower) ||
      (cmd.category && cmd.category.toLowerCase().includes(lower))
    );
  }
}

// Fuzzy score (inspired by VS Code's fuzzy matching)
export function fuzzyScore(str: string, query: string): number {
  if (!query) return 1;
  str = str.toLowerCase();
  query = query.toLowerCase();
  if (str.includes(query)) return 100 - (str.indexOf(query) * 0.1);

  let score = 0;
  let queryIdx = 0;
  for (let i = 0; i < str.length && queryIdx < query.length; i++) {
    if (str[i] === query[queryIdx]) {
      score += queryIdx === 0 ? 10 : 5;
      queryIdx++;
    }
  }
  return queryIdx === query.length ? score : 0;
}

// Highlight matched characters
export function highlightMatches(str: string, query: string): string {
  if (!query) return escapeHtml(str);
  const lower = str.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lower.includes(lowerQuery)) {
    const idx = lower.indexOf(lowerQuery);
    return (
      escapeHtml(str.slice(0, idx)) +
      `<mark>${escapeHtml(str.slice(idx, idx + query.length))}</mark>` +
      escapeHtml(str.slice(idx + query.length))
    );
  }

  let result = '';
  let qi = 0;
  for (let i = 0; i < str.length; i++) {
    if (qi < lowerQuery.length && lower[i] === lowerQuery[qi]) {
      result += `<mark>${escapeHtml(str[i])}</mark>`;
      qi++;
    } else {
      result += escapeHtml(str[i]);
    }
  }
  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
