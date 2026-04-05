import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalInstance {
  id: number;
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLElement;
  name: string;
}

export class TerminalPanel {
  private element: HTMLElement;
  private tabBar!: HTMLElement;
  private content!: HTMLElement;

  private instances: TerminalInstance[] = [];
  private activeId: number | null = null;
  private nextId = 1;

  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'terminal-panel';
    container.appendChild(this.element);
    this.build();
  }

  private build(): void {
    // Tab bar
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'terminal-tab-bar';

    const newBtn = document.createElement('button');
    newBtn.className = 'terminal-new-btn';
    newBtn.title = 'New Terminal';
    newBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    newBtn.addEventListener('click', () => this.createTerminal());
    this.tabBar.appendChild(newBtn);

    // Content
    this.content = document.createElement('div');
    this.content.className = 'terminal-content';

    this.element.appendChild(this.tabBar);
    this.element.appendChild(this.content);

    // Create first terminal
    this.createTerminal();
  }

  createTerminal(): void {
    const id = this.nextId++;

    const termContainer = document.createElement('div');
    termContainer.style.cssText = 'height: 100%; display: none;';

    const terminal = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontFamily: '"JetBrains Mono", "Cascadia Code", Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    this.content.appendChild(termContainer);
    terminal.open(termContainer);

    // Welcome message (since no node-pty without build tools)
    terminal.writeln('\x1b[1;36m  ╔════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;36m  ║        LiteCode Terminal (v1.0.0)       ║\x1b[0m');
    terminal.writeln('\x1b[1;36m  ╚════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[33m  Note: Full terminal integration requires native build tools.\x1b[0m');
    terminal.writeln('\x1b[33m  To enable: npm install node-pty then rebuild.\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[90m  Tip: You can use Ctrl+` to toggle this panel.\x1b[0m');
    terminal.writeln('');

    // Interactive input simulation
    let inputBuffer = '';
    terminal.write('\x1b[32m$ \x1b[0m');

    terminal.onData((data) => {
      if (data === '\r') {
        terminal.writeln('');
        if (inputBuffer.trim()) {
          terminal.writeln(`\x1b[90mCommand: ${inputBuffer}\x1b[0m`);
          terminal.writeln('\x1b[31mTo run actual commands, node-pty must be installed.\x1b[0m');
        }
        inputBuffer = '';
        terminal.write('\x1b[32m$ \x1b[0m');
      } else if (data === '\x7f') {
        // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data.charCodeAt(0) >= 32) {
        inputBuffer += data;
        terminal.write(data);
      }
    });

    const instance: TerminalInstance = {
      id,
      terminal,
      fitAddon,
      container: termContainer,
      name: `Terminal ${id}`,
    };

    this.instances.push(instance);

    // Add tab button
    const tabBtn = document.createElement('button');
    tabBtn.className = 'terminal-tab';
    tabBtn.id = `terminal-tab-${id}`;
    tabBtn.textContent = `Terminal ${id}`;
    tabBtn.addEventListener('click', () => this.activateTerminal(id));

    // Insert before new button
    this.tabBar.insertBefore(tabBtn, this.tabBar.querySelector('.terminal-new-btn'));

    this.activateTerminal(id);
  }

  activateTerminal(id: number): void {
    // Hide all
    for (const inst of this.instances) {
      inst.container.style.display = 'none';
      document.getElementById(`terminal-tab-${inst.id}`)?.classList.remove('active');
    }

    // Show active
    const inst = this.instances.find(i => i.id === id);
    if (!inst) return;

    inst.container.style.display = 'block';
    document.getElementById(`terminal-tab-${id}`)?.classList.add('active');
    this.activeId = id;

    requestAnimationFrame(() => {
      inst.fitAddon.fit();
      inst.terminal.focus();
    });
  }

  fit(): void {
    const inst = this.instances.find(i => i.id === this.activeId);
    if (inst) {
      try { inst.fitAddon.fit(); } catch { /* ignore */ }
    }
  }

  focus(): void {
    const inst = this.instances.find(i => i.id === this.activeId);
    inst?.terminal.focus();
  }

  show(): void {
    this.element.style.display = 'flex';
    requestAnimationFrame(() => this.fit());
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  onResize(): void {
    this.fit();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    for (const inst of this.instances) {
      inst.terminal.dispose();
    }
  }
}
