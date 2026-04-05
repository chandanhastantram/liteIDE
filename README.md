# LiteIDE (LiteCode)

A lightweight, modern, and highly extensible code editor built with **Electron**, **TypeScript**, and **Monaco Editor**. LiteIDE is inspired by VS Code, offering a familiar, professional-grade development environment packed with next-generation AI integrations.

## ✨ Features

- **Monaco Editor Core**: Powered by the same editor engine as VS Code, delivering semantic token highlighting, breadcrumbs, multi-cursor support, minimap, and robust formatting.
- **Integrated Terminal**: Native shell access directly from the editor bottom panel (powered by `node-pty` and `xterm.js`).
- **Source Control (Git)**: Built-in Git panel to view staged/unstaged changes, write commit messages, and a dedicated differential viewer (`monaco.editor.createDiffEditor`).
- **AI-Powered Assistance**: Integrated chat sidebar and inline code editing (Groq / Ollama / OpenAI) to write, explain, and refactor code blazingly fast.
- **MCP Server Support**: Built-in Model Context Protocol server, enabling external AI agents (like Claude Desktop or Cursor) to securely interface with the editor workspace.
- **Extension Sandboxing**: A custom extension host allowing dynamic integration of tools like Prettier, ESLint, and custom themes using a subset of the VS Code extension API.
- **Multi-Root Workspaces**: Flexible file explorer supporting multiple independent folder roots.
- **Command Palette & Keybindings**: Fuzzy-searchable command palette (`Ctrl+Shift+P`), Quick Open (`Ctrl+P`), and a robust, customizable keybinding registry.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- **Windows Users**: Visual Studio Build Tools with the "Desktop development with C++" workload is required to compile the native `node-pty` terminal bindings.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/chandanhastantram/liteIDE.git
   cd liteIDE
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## 🛠️ Building for Production

To package the application for your current operating system, run:

```bash
npm run make
```

Packaged executables will be available in the `out/` directory.

## 🏗️ Architecture

LiteIDE follows a robust multi-process architecture:
- **Main Process**: Handles OS-level interactions, file system access, JSON-RPC MCP server, Git operations, and PTY terminal spawning.
- **Preload Bridge**: Exposes safe, strict, typed IPC methods (`window.electronAPI`) securely bridging Main and Renderer.
- **Renderer Process**: A responsive UI built primarily with Vanilla DOM and CSS Variables for maximum performance, managing the layout grid (Activity Bar, Sidebar, Editor Area, Panels).

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
