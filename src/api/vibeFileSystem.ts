// ═══════════════════════════════════════════════════════════════
  // INIXA VIBE CODE — Virtual File System
  // Full-featured in-browser file system
  // Inspired by Claude Code's FileReadTool, FileWriteTool, FileEditTool
  // Enhanced with 50+ operations for massive project creation
  // ═══════════════════════════════════════════════════════════════

  export interface VFSNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    content?: string;
    language?: string;
    children?: VFSNode[];
    createdAt: number;
    updatedAt: number;
    size: number;
    executable?: boolean;
    hidden?: boolean;
  }

  export interface VFSProject {
    id: string;
    name: string;
    description?: string;
    root: VFSNode;
    createdAt: number;
    updatedAt: number;
    activeFile?: string;
    openFiles: string[];
  }

  // Project Templates for AI
  export const PROJECT_TEMPLATES: Record<string, { name: string; desc: string; files: Record<string, string> }> = {
    'react-vite': {
      name: 'React + Vite',
      desc: 'Modern React app with Vite bundler',
      files: {
        'package.json': `{
  "name": "vite-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }
}`,
        'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`,
        'src/index.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
        'src/App.tsx': `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="app">
      <h1>Vite + React</h1>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
    </div>
  )
}`,
        'src/index.css': `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; }
.app { padding: 2rem; text-align: center; }
button { padding: 0.5rem 1rem; background: #646cff; color: white; border: none; border-radius: 4px; cursor: pointer; }
button:hover { background: #747bff; }`,
        'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
        'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}`,
      }
    },
    'nextjs': {
      name: 'Next.js App',
      desc: 'Full-stack Next.js application',
      files: {
        'package.json': `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
        'app/page.tsx': `export default function Home() {
  return (
    <main>
      <h1>Welcome to Next.js</h1>
    </main>
  )
}`,
        'app/layout.tsx': `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}`,
      }
    },
    'express-api': {
      name: 'Express API',
      desc: 'REST API with Express',
      files: {
        'package.json': `{
  "name": "express-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}`,
        'server.js': `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
      }
    },
  };

// ─── Language Detection ───
const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.kt': 'kotlin', '.swift': 'swift', '.c': 'c',
  '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp',
  '.php': 'php', '.html': 'html', '.htm': 'html', '.css': 'css',
  '.scss': 'scss', '.less': 'less', '.json': 'json', '.xml': 'xml',
  '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown', '.mdx': 'mdx',
  '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.ps1': 'powershell', '.bat': 'batch', '.cmd': 'batch',
  '.dockerfile': 'dockerfile', '.toml': 'toml', '.ini': 'ini',
  '.env': 'plaintext', '.gitignore': 'plaintext', '.txt': 'plaintext',
  '.svg': 'xml', '.vue': 'vue', '.svelte': 'svelte',
  '.dart': 'dart', '.lua': 'lua', '.r': 'r', '.m': 'matlab',
  '.zig': 'zig', '.nim': 'nim', '.ex': 'elixir', '.exs': 'elixir',
  '.erl': 'erlang', '.hs': 'haskell', '.ml': 'ocaml',
  '.prisma': 'prisma', '.graphql': 'graphql', '.gql': 'graphql',
  '.proto': 'protobuf', '.tf': 'hcl',
};

export function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return 'dockerfile';
  if (lower === 'makefile') return 'makefile';
  if (lower === '.gitignore' || lower === '.dockerignore') return 'plaintext';
  const ext = '.' + lower.split('.').pop();
  return EXTENSION_MAP[ext] || 'plaintext';
}

// ─── Path Utilities ───
export function normalizePath(p: string): string {
  if (!p) return '/';
  return '/' + p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/');
}

export function dirname(p: string): string {
  const normalized = normalizePath(p);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return normalized.substring(0, lastSlash);
}

export function basename(p: string): string {
  const normalized = normalizePath(p);
  return normalized.split('/').pop() || '';
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.join('/'));
}

// ─── Virtual File System Class ───
export class VirtualFileSystem {
  private project: VFSProject;
  private listeners: Set<() => void> = new Set();
  private fileHistory: Map<string, string[]> = new Map();

  constructor(project?: VFSProject) {
    this.project = project || this.createEmptyProject('untitled');
  }

  // Event system
  onChange(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify() { this.listeners.forEach(fn => fn()); this.persist(); }

  // Persistence
  private persist() {
    try {
      localStorage.setItem(`vibe_project_${this.project.id}`, JSON.stringify(this.project));
      const ids = JSON.parse(localStorage.getItem('vibe_project_ids') || '[]');
      if (!ids.includes(this.project.id)) {
        ids.unshift(this.project.id);
        localStorage.setItem('vibe_project_ids', JSON.stringify(ids));
      }
    } catch {}
  }

  static loadProject(id: string): VFSProject | null {
    try {
      const data = localStorage.getItem(`vibe_project_${id}`);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (!parsed || !parsed.root) return null;
      return parsed;
    } catch { return null; }
  }

  static listProjects(): { id: string; name: string; updatedAt: number }[] {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('vibe_project_ids') || '[]');
      return ids.map(id => {
        const data = localStorage.getItem(`vibe_project_${id}`);
        if (!data) return null;
        const p = JSON.parse(data);
        return { id: p.id, name: p.name, updatedAt: p.updatedAt };
      }).filter(Boolean) as any;
    } catch { return []; }
  }

  static deleteProject(id: string) {
    localStorage.removeItem(`vibe_project_${id}`);
    const ids = JSON.parse(localStorage.getItem('vibe_project_ids') || '[]');
    localStorage.setItem('vibe_project_ids', JSON.stringify(ids.filter((i: string) => i !== id)));
  }

  createEmptyProject(name: string): VFSProject {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name,
      root: {
        name: name, path: '/', type: 'directory', children: [],
        createdAt: Date.now(), updatedAt: Date.now(), size: 0,
      },
      createdAt: Date.now(), updatedAt: Date.now(),
      openFiles: [], activeFile: undefined,
    };
  }

  loadFromProject(project: VFSProject) {
    this.project = project;
    this.notify();
  }

  newProject(name: string) {
    this.project = this.createEmptyProject(name);
    this.notify();
  }

  getProject(): VFSProject { return this.project; }
  getProjectId(): string { return this.project.id; }
  getProjectName(): string { return this.project.name; }

  // ─── File Tree Navigation ───
  private findNode(path: string, createDirs = false): VFSNode | null {
    const normalized = normalizePath(path);
    if (normalized === '/') return this.project.root;

    const parts = normalized.split('/').filter(Boolean);
    let current = this.project.root;

    for (let i = 0; i < parts.length; i++) {
      if (!current.children) current.children = [];
      const child = current.children.find(c => c.name === parts[i]);
      if (!child) {
        if (createDirs) {
          const dirPath = '/' + parts.slice(0, i + 1).join('/');
          const newDir: VFSNode = {
            name: parts[i], path: dirPath, type: 'directory', children: [],
            createdAt: Date.now(), updatedAt: Date.now(), size: 0,
          };
          current.children.push(newDir);
          current.children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          current = newDir;
        } else {
          return null;
        }
      } else {
        current = child;
      }
    }
    return current;
  }

  // ─── TOOL: FileRead ───
  readFile(path: string): { success: boolean; content: string; language: string } {
    const node = this.findNode(path);
    if (!node) return { success: false, content: `Error: File not found: ${path}`, language: 'plaintext' };
    if (node.type === 'directory') return { success: false, content: `Error: ${path} is a directory`, language: 'plaintext' };
    return { success: true, content: node.content || '', language: node.language || detectLanguage(node.name) };
  }

  // ─── TOOL: FileWrite ───
  writeFile(path: string, content: string): { success: boolean; message: string } {
    const normalized = normalizePath(path);
    const name = basename(normalized);
    const dir = dirname(normalized);

    // Create parent dirs if needed
    const parentNode = this.findNode(dir, true);
    if (!parentNode) return { success: false, message: `Error: Cannot create directory: ${dir}` };
    if (parentNode.type !== 'directory') return { success: false, message: `Error: ${dir} is not a directory` };

    if (!parentNode.children) parentNode.children = [];
    const existing = parentNode.children.find(c => c.name === name);

    if (existing) {
      // Save history
      if (existing.content !== undefined && existing.content !== content) {
        const history = this.fileHistory.get(normalized) || [];
        history.push(existing.content);
        if (history.length > 5) history.shift();
        this.fileHistory.set(normalized, history);
      }

      existing.content = content;
      existing.updatedAt = Date.now();
      existing.size = new Blob([content]).size;
      existing.language = detectLanguage(name);
    } else {
      parentNode.children.push({
        name, path: normalized, type: 'file', content,
        language: detectLanguage(name),
        createdAt: Date.now(), updatedAt: Date.now(),
        size: new Blob([content]).size,
      });
      parentNode.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    this.project.updatedAt = Date.now();
    this.notify();
    return { success: true, message: `Successfully wrote ${content.length} chars to ${normalized}` };
  }

  // ─── TOOL: FileEdit ───
  editFile(path: string, oldText: string, newText: string): { success: boolean; message: string } {
    const node = this.findNode(path);
    if (!node) return { success: false, message: `Error: File not found: ${path}` };
    if (node.type === 'directory') return { success: false, message: `Error: ${path} is a directory` };

    const content = node.content || '';
    if (!content.includes(oldText)) {
      return { success: false, message: `Error: Could not find the specified text to replace in ${path}` };
    }

    node.content = content.replace(oldText, newText);
    node.updatedAt = Date.now();
    node.size = new Blob([node.content]).size;
    this.project.updatedAt = Date.now();
    this.notify();
    return { success: true, message: `Successfully edited ${path}` };
  }

  // ─── TOOL: DeleteFile ───
  deleteFile(path: string): { success: boolean; message: string } {
    const normalized = normalizePath(path);
    const name = basename(normalized);
    const dir = dirname(normalized);
    const parentNode = this.findNode(dir);
    if (!parentNode || !parentNode.children) return { success: false, message: `Error: File not found: ${path}` };

    const idx = parentNode.children.findIndex(c => c.name === name);
    if (idx === -1) return { success: false, message: `Error: File not found: ${path}` };

    parentNode.children.splice(idx, 1);
    this.project.openFiles = this.project.openFiles.filter(f => f !== normalized);
    if (this.project.activeFile === normalized) this.project.activeFile = this.project.openFiles[0];
    this.project.updatedAt = Date.now();
    this.notify();
    return { success: true, message: `Deleted ${normalized}` };
  }

  // ─── TOOL: Mkdir ───
  mkdir(path: string): { success: boolean; message: string } {
    const node = this.findNode(path, true);
    if (!node) return { success: false, message: `Error: Cannot create directory: ${path}` };
    this.notify();
    return { success: true, message: `Created directory: ${normalizePath(path)}` };
  }

  // ─── TOOL: Copy File/Directory ───
  copy(source: string, dest: string): { success: boolean; message: string } {
    const srcNode = this.findNode(source);
    if (!srcNode) return { success: false, message: `Error: Source not found: ${source}` };
    
    const destNormalized = normalizePath(dest);
    const destName = basename(destNormalized);
    const destDir = dirname(destNormalized);
    const parentNode = this.findNode(destDir, true);
    
    if (!parentNode) return { success: false, message: `Error: Cannot create destination: ${dest}` };
    if (!parentNode.children) parentNode.children = [];
    
    // Deep copy
    const copyNode = (node: VFSNode, newPath: string): VFSNode => ({
      ...node,
      path: newPath,
      name: basename(newPath),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: node.children?.map((child, i) => 
        copyNode(child, `${newPath}/${child.name}`)
      )
    });
    
    const newNode = copyNode(srcNode, destNormalized);
    parentNode.children.push(newNode);
    this.project.updatedAt = Date.now();
    this.notify();
    return { success: true, message: `Copied ${source} → ${dest}` };
  }

  // ─── TOOL: Move/Rename ───
  move(source: string, dest: string): { success: boolean; message: string } {
    const srcNode = this.findNode(source);
    if (!srcNode) return { success: false, message: `Error: Source not found: ${source}` };
    
    const destNormalized = normalizePath(dest);
    const destDir = dirname(destNormalized);
    const parentNode = this.findNode(destDir);
    
    if (!parentNode) return { success: false, message: `Error: Destination directory not found: ${destDir}` };
    
    // Remove from source
    const sourceDir = dirname(source);
    const sourceParent = this.findNode(sourceDir);
    if (sourceParent?.children) {
      const idx = sourceParent.children.findIndex(c => c.path === source);
      if (idx !== -1) sourceParent.children.splice(idx, 1);
    }
    
    // Add to destination
    if (!parentNode.children) parentNode.children = [];
    srcNode.path = destNormalized;
    srcNode.name = basename(destNormalized);
    srcNode.updatedAt = Date.now();
    parentNode.children.push(srcNode);
    
    this.project.updatedAt = Date.now();
    this.notify();
    return { success: true, message: `Moved ${source} → ${dest}` };
  }

  // ─── TOOL: File Info ───
  getFileInfo(path: string): { success: boolean; info?: { size: number; created: number; modified: number; type: string } } {
    const node = this.findNode(path);
    if (!node) return { success: false };
    return {
      success: true,
      info: {
        size: node.size,
        created: node.createdAt,
        modified: node.updatedAt,
        type: node.type,
      }
    };
  }

  // ─── TOOL: File Exists Check ───
  exists(path: string): boolean {
    return this.findNode(path) !== null;
  }

  // ─── TOOL: Read Directory with Details ───
  listDirDetailed(path: string = '/'): { success: boolean; items?: { name: string; type: string; size: number; modified: number }[] } {
    const node = this.findNode(path);
    if (!node || node.type !== 'directory') return { success: false };
    const items = (node.children || []).map(c => ({
      name: c.name,
      type: c.type,
      size: c.size,
      modified: c.updatedAt,
    }));
    return { success: true, items };
  }

  // ─── TOOL: Glob / ListDir ───
  listDir(path: string = '/'): VFSNode[] {
    const node = this.findNode(path);
    if (!node || node.type !== 'directory') return [];
    return node.children || [];
  }

  // ─── TOOL: Glob pattern matching ───
  glob(pattern: string): string[] {
    const results: string[] = [];
    const regex = new RegExp('^' + pattern.replace(/\*\*/g, '___GLOBSTAR___').replace(/\*/g, '[^/]*').replace(/___GLOBSTAR___/g, '.*').replace(/\?/g, '.') + '$');

    const walk = (node: VFSNode) => {
      if (node.type === 'file' && regex.test(node.path)) {
        results.push(node.path);
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(this.project.root);
    return results;
  }

  // ─── TOOL: Grep ───
  grep(query: string, path: string = '/'): { file: string; line: number; content: string }[] {
    const results: { file: string; line: number; content: string }[] = [];
    const walk = (node: VFSNode) => {
      if (node.type === 'file' && node.content) {
        const lines = node.content.split('\n');
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            results.push({ file: node.path, line: i + 1, content: line.trim() });
          }
        });
      }
      if (node.children) node.children.forEach(walk);
    };
    const startNode = this.findNode(path);
    if (startNode) walk(startNode);
    return results;
  }

  // ─── File Tree (flat) ───
  getAllFiles(): VFSNode[] {
    const files: VFSNode[] = [];
    const walk = (node: VFSNode) => {
      if (node.type === 'file') files.push(node);
      if (node.children) node.children.forEach(walk);
    };
    walk(this.project.root);
    return files;
  }

  getTree(): VFSNode { return this.project.root; }

  // ─── Open/Active file management ───
  openFile(path: string) {
    const normalized = normalizePath(path);
    if (!this.project.openFiles.includes(normalized)) {
      this.project.openFiles.push(normalized);
    }
    this.project.activeFile = normalized;
    this.notify();
  }

  closeFile(path: string) {
    const normalized = normalizePath(path);
    this.project.openFiles = this.project.openFiles.filter(f => f !== normalized);
    if (this.project.activeFile === normalized) {
      this.project.activeFile = this.project.openFiles[0];
    }
    this.notify();
  }

  setActiveFile(path: string) {
    this.project.activeFile = normalizePath(path);
    this.notify();
  }

  getActiveFile(): string | undefined { return this.project.activeFile; }
  getOpenFiles(): string[] { return this.project.openFiles; }

  // ─── File History ───
  getPreviousVersion(path: string): string | null {
    const normalized = normalizePath(path);
    const history = this.fileHistory.get(normalized) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  // ─── Project Stats ───
  getStats(): { files: number; dirs: number; totalSize: number; languages: Record<string, number> } {
    let files = 0, dirs = 0, totalSize = 0;
    const languages: Record<string, number> = {};
    const walk = (node: VFSNode) => {
      if (node.type === 'file') {
        files++;
        totalSize += node.size;
        const lang = node.language || 'plaintext';
        languages[lang] = (languages[lang] || 0) + 1;
      } else {
        dirs++;
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(this.project.root);
    return { files, dirs, totalSize, languages };
  }

  // ─── Export entire project as JSON ───
  exportProject(): string {
    return JSON.stringify(this.project, null, 2);
  }

  // ─── Generate file tree string (like `tree` command) ───
  getTreeString(path: string = '/', prefix: string = ''): string {
    const node = this.findNode(path);
    if (!node) return '';
    let result = '';
    const children = node.children || [];
    children.forEach((child, i) => {
      const isLast = i === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      result += prefix + connector + child.name + (child.type === 'directory' ? '/' : '') + '\n';
      if (child.type === 'directory') {
        result += this.getTreeString(child.path, prefix + childPrefix);
      }
    });
    return result;
  }
}
