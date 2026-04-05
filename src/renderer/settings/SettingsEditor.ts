// Settings editor UI inspired by VS Code's preferences editor
// src/vs/workbench/contrib/preferences/browser/settingsEditor2.ts

type SettingValue = string | number | boolean;

interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'select' | 'number' | 'text';
  default: SettingValue;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

const SETTING_GROUPS: { title: string; settings: SettingDefinition[] }[] = [
  {
    title: 'Editor',
    settings: [
      { key: 'editor.fontSize', label: 'Font Size', description: 'Controls the font size in pixels.', type: 'number', default: 14, min: 8, max: 32 },
      { key: 'editor.tabSize', label: 'Tab Size', description: 'The number of spaces a tab is equal to.', type: 'number', default: 2, min: 1, max: 16 },
      { key: 'editor.insertSpaces', label: 'Insert Spaces', description: 'Insert spaces when pressing Tab.', type: 'boolean', default: true },
      { key: 'editor.wordWrap', label: 'Word Wrap', description: 'Controls how lines should wrap.', type: 'select', default: 'off',
        options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }, { value: 'wordWrapColumn', label: 'Word Wrap Column' }] },
      { key: 'editor.minimap', label: 'Minimap', description: 'Controls whether the minimap is shown.', type: 'boolean', default: true },
      { key: 'editor.formatOnSave', label: 'Format On Save', description: 'Format a file on save.', type: 'boolean', default: false },
      { key: 'editor.formatOnPaste', label: 'Format On Paste', description: 'Format pasted content. Requires a formatter.', type: 'boolean', default: false },
      { key: 'editor.lineNumbers', label: 'Line Numbers', description: 'Controls the display of line numbers.', type: 'select', default: 'on',
        options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }, { value: 'relative', label: 'Relative' }] },
      { key: 'editor.bracketPairColorization', label: 'Bracket Pair Colorization', description: 'Enables bracket pair colorization.', type: 'boolean', default: true },
      { key: 'editor.smoothScrolling', label: 'Smooth Scrolling', description: 'Controls whether the editor will scroll with animation.', type: 'boolean', default: true },
      { key: 'editor.cursorBlinking', label: 'Cursor Blinking', description: 'Control the cursor animation style.', type: 'select', default: 'phase',
        options: [{ value: 'blink', label: 'Blink' }, { value: 'smooth', label: 'Smooth' }, { value: 'phase', label: 'Phase' }, { value: 'expand', label: 'Expand' }, { value: 'solid', label: 'Solid' }] },
    ],
  },
  {
    title: 'Workbench',
    settings: [
      { key: 'workbench.colorTheme', label: 'Color Theme', description: 'Specifies the color theme used in the workbench.', type: 'select', default: 'litecode-dark',
        options: [{ value: 'litecode-dark', label: 'LiteCode Dark' }] },
      { key: 'workbench.statusBarVisible', label: 'Status Bar', description: 'Controls the visibility of the status bar.', type: 'boolean', default: true },
      { key: 'workbench.activityBarVisible', label: 'Activity Bar', description: 'Controls the visibility of the activity bar.', type: 'boolean', default: true },
      { key: 'workbench.editorTabsVisible', label: 'Editor Tabs', description: 'Controls whether opened editors should show as tabs.', type: 'boolean', default: true },
    ],
  },
  {
    title: 'Terminal',
    settings: [
      { key: 'terminal.fontSize', label: 'Font Size', description: 'Controls the font size in pixels of the terminal.', type: 'number', default: 13, min: 8, max: 32 },
      { key: 'terminal.cursorStyle', label: 'Cursor Style', description: 'Controls the style of terminal cursor.', type: 'select', default: 'block',
        options: [{ value: 'block', label: 'Block' }, { value: 'underline', label: 'Underline' }, { value: 'bar', label: 'Bar' }] },
      { key: 'terminal.cursorBlink', label: 'Cursor Blink', description: 'Controls whether the terminal cursor blinks.', type: 'boolean', default: true },
    ],
  },
  {
    title: 'Files',
    settings: [
      { key: 'files.trimTrailingWhitespace', label: 'Trim Trailing Whitespace', description: 'When enabled, will trim trailing whitespace when saving a file.', type: 'boolean', default: true },
      { key: 'files.insertFinalNewline', label: 'Insert Final Newline', description: 'When enabled, inserts a newline at the end of a file.', type: 'boolean', default: true },
      { key: 'files.encoding', label: 'Encoding', description: 'The default character set encoding used for reading and writing files.', type: 'select', default: 'utf8',
        options: [{ value: 'utf8', label: 'UTF-8' }, { value: 'utf16le', label: 'UTF-16 LE' }, { value: 'utf16be', label: 'UTF-16 BE' }] },
    ],
  },
];

type TabName = 'User' | 'Workspace';

export class SettingsEditor {
  private element: HTMLElement;
  private settings: Record<string, SettingValue> = {};
  private settingsPath = '';
  private searchQuery = '';
  private activeTab: TabName = 'User';
  private onSettingsChange?: (settings: Record<string, SettingValue>) => void;

  constructor(container: HTMLElement, onSettingsChange?: (settings: Record<string, SettingValue>) => void) {
    this.element = document.createElement('div');
    this.element.className = 'settings-editor';
    container.appendChild(this.element);
    this.onSettingsChange = onSettingsChange;
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const result = await window.electronAPI.settings.read();
      if (result.success) {
        this.settings = this.flattenSettings(result.settings as Record<string, unknown>);
        this.settingsPath = result.path ?? '';
      }
    } catch { /* electronAPI not available */ }
    this.render();
  }

  private flattenSettings(obj: Record<string, unknown>, prefix = ''): Record<string, SettingValue> {
    const result: Record<string, SettingValue> = {};
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, this.flattenSettings(val as Record<string, unknown>, fullKey));
      } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        result[fullKey] = val;
      }
    }
    return result;
  }

  private render(): void {
    this.element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';

    const title = document.createElement('div');
    title.className = 'settings-title';
    title.textContent = 'Settings';

    const searchInput = document.createElement('input');
    searchInput.className = 'settings-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search settings';
    searchInput.value = this.searchQuery;
    searchInput.id = 'settings-search-input';
    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.renderBody();
    });

    const openJsonBtn = document.createElement('button');
    openJsonBtn.className = 'settings-open-json-btn';
    openJsonBtn.textContent = '{ } Open settings.json';
    openJsonBtn.addEventListener('click', async () => {
      const pathResult = await window.electronAPI.settings.getPath();
      if (pathResult.success) {
        // Tell Workbench to open the file
        const event = new CustomEvent('open-settings-json', { detail: pathResult.path });
        document.dispatchEvent(event);
      }
    });

    header.appendChild(title);
    header.appendChild(searchInput);
    header.appendChild(openJsonBtn);

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'settings-tabs';

    for (const tab of ['User', 'Workspace'] as TabName[]) {
      const tabBtn = document.createElement('button');
      tabBtn.className = `settings-tab${this.activeTab === tab ? ' active' : ''}`;
      tabBtn.textContent = tab;
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab;
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tabBtn.classList.add('active');
      });
      tabs.appendChild(tabBtn);
    }

    this.element.appendChild(header);
    this.element.appendChild(tabs);

    // Body (scrollable)
    const body = document.createElement('div');
    body.className = 'settings-body';
    body.id = 'settings-body';
    this.element.appendChild(body);
    this.renderBody();
  }

  private renderBody(): void {
    const body = document.getElementById('settings-body');
    if (!body) return;
    body.innerHTML = '';

    const query = this.searchQuery.toLowerCase();

    for (const group of SETTING_GROUPS) {
      const filteredSettings = group.settings.filter(s =>
        !query ||
        s.key.toLowerCase().includes(query) ||
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );

      if (filteredSettings.length === 0) continue;

      const groupEl = document.createElement('div');
      groupEl.className = 'settings-group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'settings-group-title';
      groupTitle.textContent = group.title;
      groupEl.appendChild(groupTitle);

      for (const setting of filteredSettings) {
        groupEl.appendChild(this.renderSetting(setting));
      }

      body.appendChild(groupEl);
    }

    if (body.children.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 32px; text-align: center; color: var(--color-fg-muted); font-size: 13px;';
      empty.textContent = `No settings found for "${this.searchQuery}"`;
      body.appendChild(empty);
    }
  }

  private renderSetting(def: SettingDefinition): HTMLElement {
    const item = document.createElement('div');
    item.className = 'settings-item';

    const info = document.createElement('div');
    info.className = 'settings-item-info';

    const keyEl = document.createElement('div');
    keyEl.className = 'settings-item-key';
    keyEl.textContent = def.key;

    const desc = document.createElement('div');
    desc.className = 'settings-item-description';
    desc.textContent = def.description;

    info.appendChild(keyEl);
    info.appendChild(desc);

    const control = document.createElement('div');
    control.className = 'settings-item-control';

    const currentValue = this.settings[def.key] ?? def.default;

    switch (def.type) {
      case 'boolean': {
        const toggle = this.createToggle(currentValue as boolean, (val) => this.setSetting(def.key, val));
        control.appendChild(toggle);
        break;
      }
      case 'select': {
        const select = document.createElement('select');
        select.className = 'settings-select';
        for (const opt of def.options ?? []) {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (String(currentValue) === opt.value) option.selected = true;
          select.appendChild(option);
        }
        select.addEventListener('change', () => this.setSetting(def.key, select.value));
        control.appendChild(select);
        break;
      }
      case 'number': {
        const input = document.createElement('input');
        input.className = 'settings-input';
        input.type = 'number';
        input.value = String(currentValue);
        input.style.width = '80px';
        if (def.min !== undefined) input.min = String(def.min);
        if (def.max !== undefined) input.max = String(def.max);
        input.addEventListener('change', () => this.setSetting(def.key, Number(input.value)));
        control.appendChild(input);
        break;
      }
      case 'text': {
        const input = document.createElement('input');
        input.className = 'settings-input';
        input.type = 'text';
        input.value = String(currentValue);
        input.addEventListener('change', () => this.setSetting(def.key, input.value));
        control.appendChild(input);
        break;
      }
    }

    item.appendChild(info);
    item.appendChild(control);
    return item;
  }

  private createToggle(checked: boolean, onChange: (val: boolean) => void): HTMLElement {
    const label = document.createElement('label');
    label.className = 'settings-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const slider = document.createElement('div');
    slider.className = 'settings-toggle-slider';
    label.appendChild(input);
    label.appendChild(slider);
    return label;
  }

  private async setSetting(key: string, value: SettingValue): Promise<void> {
    this.settings[key] = value;

    // Convert flat settings to nested
    const nested = this.unflattenSettings(this.settings);

    try {
      await window.electronAPI.settings.write(nested as Record<string, unknown>);
    } catch { /* not in electron */ }

    this.onSettingsChange?.(this.settings);
  }

  private unflattenSettings(flat: Record<string, SettingValue>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(flat)) {
      const parts = key.split('.');
      let current: Record<string, unknown> = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = val;
    }
    return result;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
