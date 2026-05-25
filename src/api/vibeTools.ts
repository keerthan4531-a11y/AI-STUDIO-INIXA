// ═══════════════════════════════════════════════════════════════
  // INIXA VIBE CODE — Tool System
  // Full agentic tool chain inspired by Claude Code's tool architecture
  // Enhanced with 20+ tools for massive project creation
  // ═══════════════════════════════════════════════════════════════

  import { VirtualFileSystem, normalizePath, basename, PROJECT_TEMPLATES } from './vibeFileSystem';
  import { aiGenerateImageWithProgress } from './aiEngine';
  import { generateVideo } from './veoApi';

// ─── Tool Definition Types ───
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  output: string;
  filesChanged?: string[];
  filesCreated?: string[];
  filesDeleted?: string[];
}

// ─── All Tool Definitions (sent to AI for function calling) ───
  export const VIBE_TOOLS: ToolDefinition[] = [
    {
      name: 'FileRead',
      description: 'Read the contents of a file at the given path. Use this to understand existing code.',
      parameters: {
        path: { type: 'string', description: 'Absolute file path to read', required: true },
      },
    },
    {
      name: 'FileWrite',
      description: 'Create a new file or overwrite an existing file with the given content.',
      parameters: {
        path: { type: 'string', description: 'Absolute file path to write', required: true },
        content: { type: 'string', description: 'Full file content to write', required: true },
      },
    },
    {
      name: 'FileEdit',
      description: 'Edit an existing file by replacing specific text. Use for targeted modifications.',
      parameters: {
        path: { type: 'string', description: 'Absolute file path to edit', required: true },
        old_text: { type: 'string', description: 'Exact text to find and replace', required: true },
        new_text: { type: 'string', description: 'New text to replace with', required: true },
      },
    },
    {
      name: 'DeleteFile',
      description: 'Delete a file or empty directory.',
      parameters: {
        path: { type: 'string', description: 'Absolute file path to delete', required: true },
      },
    },
    {
      name: 'MkDir',
      description: 'Create a new directory (and parent directories if needed).',
      parameters: {
        path: { type: 'string', description: 'Absolute directory path to create', required: true },
      },
    },
    {
      name: 'ListDir',
      description: 'List all files and directories in a given path.',
      parameters: {
        path: { type: 'string', description: 'Directory path to list (default: /)', required: false },
      },
    },
    {
      name: 'Glob',
      description: 'Find files matching a glob pattern (e.g. **/*.ts, src/**/*.css)',
      parameters: {
        pattern: { type: 'string', description: 'Glob pattern to match files', required: true },
      },
    },
    {
      name: 'Grep',
      description: 'Search for text content across all files in the project.',
      parameters: {
        query: { type: 'string', description: 'Text to search for', required: true },
        path: { type: 'string', description: 'Starting directory path (default: /)', required: false },
      },
    },
    {
      name: 'Bash',
      description: 'Simulate running a bash/terminal command. Supports: ls, cat, echo, mkdir, touch, rm, cp, mv, find, grep, wc, head, tail, pwd, tree, npm init, git init, npm install.',
      parameters: {
        command: { type: 'string', description: 'The bash command to execute', required: true },
      },
    },
    {
      name: 'TreeView',
      description: 'Show the full project file tree structure.',
      parameters: {
        path: { type: 'string', description: 'Root path for tree view (default: /)', required: false },
      },
    },
    {
      name: 'ProjectInfo',
      description: 'Get project statistics: file count, directory count, languages used, total size.',
      parameters: {},
    },
    {
      name: 'WebFetch',
      description: 'Fetch content from a URL. Use this to read documentation, APIs, or external data.',
      parameters: {
        url: { type: 'string', description: 'URL to fetch content from', required: true },
      },
    },
    {
      name: 'TodoWrite',
      description: 'Write a task or todo to a project-level TODO.md file.',
      parameters: {
        task: { type: 'string', description: 'Task description to add', required: true },
        priority: { type: 'string', description: 'Priority: high, medium, low', required: false },
      },
    },
    // NEW TOOLS (from Claude Code)
    {
      name: 'FileCopy',
      description: 'Copy a file or directory to a new location.',
      parameters: {
        source: { type: 'string', description: 'Source file path', required: true },
        destination: { type: 'string', description: 'Destination file path', required: true },
      },
    },
    {
      name: 'FileMove',
      description: 'Move or rename a file or directory.',
      parameters: {
        source: { type: 'string', description: 'Source file path', required: true },
        destination: { type: 'string', description: 'Destination file path', required: true },
      },
    },
    {
      name: 'FileExists',
      description: 'Check if a file or directory exists.',
      parameters: {
        path: { type: 'string', description: 'File path to check', required: true },
      },
    },
    {
      name: 'FileInfo',
      description: 'Get detailed information about a file (size, created, modified, type).',
      parameters: {
        path: { type: 'string', description: 'File path to get info', required: true },
      },
    },
    {
      name: 'TemplateCreate',
      description: 'Create a new project from a template (react-vite, nextjs, express-api).',
      parameters: {
        template: { type: 'string', description: 'Template name: react-vite, nextjs, or express-api', required: true },
      },
    },
    {
      name: 'WebSearch',
      description: 'Search the web for information, documentation, or answers.',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
      },
    },
    {
      name: 'MultiFileWrite',
      description: 'Write multiple files at once for creating entire project structures.',
      parameters: {
        files: { type: 'string', description: 'JSON array of {path, content} objects', required: true },
      },
    },
    {
      name: 'GenerateImage',
      description: 'Generate an AI image from a text prompt and save it to a path in the project (e.g., /assets/logo.png). Use this when the website needs custom graphics, icons, backgrounds, or mock images.',
      parameters: {
        prompt: { type: 'string', description: 'Detailed prompt describing the image to generate', required: true },
        path: { type: 'string', description: 'File path to save the generated image (e.g. /assets/hero.png)', required: true },
        model: { type: 'string', description: 'Optional image model to use: flux (default), flux-realism, flux-anime, flux-3d, any-dark, turbo-v', required: false },
      },
    },
    {
      name: 'GenerateVideo',
      description: 'Generate a short AI video from a text prompt and save it to a path in the project (e.g., /assets/intro.mp4). Use this when the website needs background videos, video ads, or intro clips.',
      parameters: {
        prompt: { type: 'string', description: 'Detailed prompt describing the video scene to generate', required: true },
        path: { type: 'string', description: 'File path to save the video (e.g. /assets/intro.mp4)', required: true },
        aspectRatio: { type: 'string', description: 'Optional aspect ratio: VIDEO_ASPECT_RATIO_PORTRAIT, VIDEO_ASPECT_RATIO_LANDSCAPE (default), VIDEO_ASPECT_RATIO_SQUARE', required: false },
      },
    },
  ];

// ─── Bash Command Simulator ───
function simulateBash(command: string, vfs: VirtualFileSystem): string {
  const cmd = command.trim();
  const parts = cmd.split(/\s+/);
  const binary = parts[0];

  try {
    switch (binary) {
      case 'ls': {
        const path = parts[1] || '/';
        const items = vfs.listDir(path);
        if (items.length === 0) return `(empty directory)`;
        return items.map(i => `${i.type === 'directory' ? '📁' : '📄'} ${i.name}${i.type === 'directory' ? '/' : ''}`).join('\n');
      }
      case 'cat': {
        if (!parts[1]) return 'Usage: cat <file>';
        const { success, content } = vfs.readFile(parts[1]);
        return success ? content : content;
      }
      case 'echo': {
        const rest = parts.slice(1).join(' ');
        // Handle echo "content" > file
        const redirectMatch = rest.match(/^(.+?)\s*>\s*(.+)$/);
        if (redirectMatch) {
          const content = redirectMatch[1].replace(/^["']|["']$/g, '');
          const file = redirectMatch[2].trim();
          const { message } = vfs.writeFile(file, content);
          return message;
        }
        // Handle echo "content" >> file (append)
        const appendMatch = rest.match(/^(.+?)\s*>>\s*(.+)$/);
        if (appendMatch) {
          const content = appendMatch[1].replace(/^["']|["']$/g, '');
          const file = appendMatch[2].trim();
          const existing = vfs.readFile(file);
          const newContent = existing.success ? existing.content + '\n' + content : content;
          const { message } = vfs.writeFile(file, newContent);
          return message;
        }
        return rest.replace(/^["']|["']$/g, '');
      }
      case 'mkdir': {
        const flag = parts[1] === '-p' ? 2 : 1;
        const path = parts[flag];
        if (!path) return 'Usage: mkdir [-p] <directory>';
        const { message } = vfs.mkdir(path);
        return message;
      }
      case 'touch': {
        if (!parts[1]) return 'Usage: touch <file>';
        const existing = vfs.readFile(parts[1]);
        if (!existing.success) vfs.writeFile(parts[1], '');
        return `touched ${parts[1]}`;
      }
      case 'rm': {
        const flag = parts[1] === '-rf' || parts[1] === '-r' ? 2 : 1;
        const path = parts[flag];
        if (!path) return 'Usage: rm [-rf] <file>';
        const { message } = vfs.deleteFile(path);
        return message;
      }
      case 'cp': {
        if (parts.length < 3) return 'Usage: cp <source> <dest>';
        const { success, content } = vfs.readFile(parts[1]);
        if (!success) return `cp: ${parts[1]}: No such file`;
        const { message } = vfs.writeFile(parts[2], content);
        return `Copied ${parts[1]} → ${parts[2]}`;
      }
      case 'mv': {
        if (parts.length < 3) return 'Usage: mv <source> <dest>';
        const { success, content } = vfs.readFile(parts[1]);
        if (!success) return `mv: ${parts[1]}: No such file`;
        vfs.writeFile(parts[2], content);
        vfs.deleteFile(parts[1]);
        return `Moved ${parts[1]} → ${parts[2]}`;
      }
      case 'find': {
        const pattern = parts.find(p => p.includes('*')) || '**/*';
        const results = vfs.glob(pattern);
        return results.length > 0 ? results.join('\n') : '(no matches)';
      }
      case 'grep': {
        if (parts.length < 2) return 'Usage: grep <pattern> [path]';
        const query = parts[1];
        const path = parts[2] || '/';
        const results = vfs.grep(query, path);
        return results.length > 0
          ? results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n')
          : '(no matches)';
      }
      case 'wc': {
        if (!parts[1]) return 'Usage: wc <file>';
        const { success, content } = vfs.readFile(parts[1]);
        if (!success) return `wc: ${parts[1]}: No such file`;
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(Boolean).length;
        const chars = content.length;
        return `  ${lines}  ${words}  ${chars} ${parts[1]}`;
      }
      case 'head': {
        if (!parts[parts.length - 1]) return 'Usage: head [-n N] <file>';
        const n = parts.includes('-n') ? parseInt(parts[parts.indexOf('-n') + 1]) : 10;
        const file = parts[parts.length - 1];
        const { success, content } = vfs.readFile(file);
        if (!success) return `head: ${file}: No such file`;
        return content.split('\n').slice(0, n).join('\n');
      }
      case 'tail': {
        if (!parts[parts.length - 1]) return 'Usage: tail [-n N] <file>';
        const n = parts.includes('-n') ? parseInt(parts[parts.indexOf('-n') + 1]) : 10;
        const file = parts[parts.length - 1];
        const { success, content } = vfs.readFile(file);
        if (!success) return `tail: ${file}: No such file`;
        const lines = content.split('\n');
        return lines.slice(-n).join('\n');
      }
      case 'pwd':
        return '/';
      case 'tree': {
        const path = parts[1] || '/';
        const tree = vfs.getTreeString(path);
        return tree || '(empty)';
      }
      case 'npm': {
        if (parts[1] === 'init' || (parts[1] === 'init' && parts[2] === '-y')) {
          const pkg = {
            name: vfs.getProjectName(),
            version: '1.0.0',
            description: '',
            main: 'index.js',
            scripts: { test: 'echo "Error: no test specified" && exit 1', dev: 'vite', build: 'vite build' },
            keywords: [],
            author: '',
            license: 'MIT',
          };
          vfs.writeFile('/package.json', JSON.stringify(pkg, null, 2));
          return 'Wrote to /package.json';
        }
        if (parts[1] === 'install') {
          return `Simulating npm install for: ${parts.slice(2).join(', ') || 'all dependencies'}\nAdded 142 packages, and audited 143 packages in 3s\n\nfound 0 vulnerabilities`;
        }
        return `npm: simulated — ${cmd}`;
      }
      case 'git': {
        if (parts[1] === 'init') {
          vfs.mkdir('/.git');
          return 'Initialized empty Git repository';
        }
        return `git: simulated — ${cmd}`;
      }
      case 'clear':
        return '__CLEAR__';
      default:
        return `$ ${cmd}\n(Command simulated in virtual environment)`;
    }
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

// ─── Tool Executor ───
export async function executeTool(call: ToolCall, vfs: VirtualFileSystem): Promise<ToolResult> {
  const base = { toolCallId: call.id, toolName: call.name };

  try {
    switch (call.name) {
      case 'FileRead': {
        const { success, content, language } = vfs.readFile(call.input.path);
        return { ...base, success, output: success ? `File: ${call.input.path} (${language})\n\n${content}` : content };
      }
      case 'FileWrite': {
        const { success, message } = vfs.writeFile(call.input.path, call.input.content);
        return {
          ...base, success, output: message,
          filesCreated: success ? [normalizePath(call.input.path)] : undefined,
        };
      }
      case 'FileEdit': {
        const { success, message } = vfs.editFile(call.input.path, call.input.old_text, call.input.new_text);
        return {
          ...base, success, output: message,
          filesChanged: success ? [normalizePath(call.input.path)] : undefined,
        };
      }
      case 'DeleteFile': {
        const { success, message } = vfs.deleteFile(call.input.path);
        return {
          ...base, success, output: message,
          filesDeleted: success ? [normalizePath(call.input.path)] : undefined,
        };
      }
      case 'MkDir': {
        const { success, message } = vfs.mkdir(call.input.path);
        return { ...base, success, output: message };
      }
      case 'ListDir': {
        const items = vfs.listDir(call.input.path || '/');
        const output = items.map(i => `${i.type === 'directory' ? '📁' : '📄'} ${i.name}${i.type === 'directory' ? '/' : ''} (${i.type === 'file' ? `${i.size}B` : `${(i.children?.length || 0)} items`})`).join('\n');
        return { ...base, success: true, output: output || '(empty directory)' };
      }
      case 'Glob': {
        const results = vfs.glob(call.input.pattern);
        return { ...base, success: true, output: results.length > 0 ? results.join('\n') : '(no matches)' };
      }
      case 'Grep': {
        const results = vfs.grep(call.input.query, call.input.path || '/');
        const output = results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n');
        return { ...base, success: true, output: output || '(no matches)' };
      }
      case 'Bash': {
        const output = simulateBash(call.input.command, vfs);
        return { ...base, success: true, output };
      }
      case 'TreeView': {
        const tree = vfs.getTreeString(call.input.path || '/');
        return { ...base, success: true, output: `${vfs.getProjectName()}/\n${tree}` || '(empty project)' };
      }
      case 'ProjectInfo': {
        const stats = vfs.getStats();
        const output = [
          `📦 Project: ${vfs.getProjectName()}`,
          `📄 Files: ${stats.files}`,
          `📁 Directories: ${stats.dirs}`,
          `💾 Total Size: ${(stats.totalSize / 1024).toFixed(1)} KB`,
          `🔤 Languages: ${Object.entries(stats.languages).map(([l, c]) => `${l}(${c})`).join(', ') || 'none'}`,
        ].join('\n');
        return { ...base, success: true, output };
      }
      case 'WebFetch': {
        // Simulated web fetch - in a real app this would call a proxy
        const url = call.input.url;
        return { ...base, success: true, output: `[WebFetch] Content from ${url}:\n(Simulated documentation/content for the requested URL. In a live environment, this would return real markdown content.)` };
      }
      case 'TodoWrite': {
        const { task, priority = 'medium' } = call.input;
        const todoPath = '/TODO.md';
        const existing = vfs.readFile(todoPath);
        const date = new Date().toLocaleDateString();
        const line = `- [ ] [${priority.toUpperCase()}] ${task} (${date})`;
        const newContent = existing.success ? existing.content + '\n' + line : `# Project TODOs\n\n${line}`;
        vfs.writeFile(todoPath, newContent);
        return { ...base, success: true, output: `Added task to TODO.md: ${task}`, filesChanged: [todoPath] };
      }
      case 'FileCopy': {
        const { source, destination } = call.input;
        const result = vfs.copy(source, destination);
        return { ...base, success: result.success, output: result.message };
      }
      case 'FileMove': {
        const { source, destination } = call.input;
        const result = vfs.move(source, destination);
        return { ...base, success: result.success, output: result.message };
      }
      case 'FileExists': {
        const { path } = call.input;
        const exists = vfs.exists(path);
        return { ...base, success: true, output: exists ? `File exists: ${path}` : `File does not exist: ${path}` };
      }
      case 'FileInfo': {
        const { path } = call.input;
        const info = vfs.getFileInfo(path);
        if (!info.success || !info.info) return { ...base, success: false, output: `File not found: ${path}` };
        return {
          ...base,
          success: true,
          output: `File: ${path}\nType: ${info.info.type}\nSize: ${(info.info.size / 1024).toFixed(2)} KB\nCreated: ${new Date(info.info.created).toLocaleString()}\nModified: ${new Date(info.info.modified).toLocaleString()}`
        };
      }
      case 'TemplateCreate': {
        const { template } = call.input;
        const tmpl = PROJECT_TEMPLATES[template];
        if (!tmpl) {
          return { ...base, success: false, output: `Template not found: ${template}. Available: ${Object.keys(PROJECT_TEMPLATES).join(', ')}` };
        }
        const filesCreated: string[] = [];
        for (const [path, content] of Object.entries(tmpl.files)) {
          vfs.writeFile('/' + path, content);
          filesCreated.push('/' + path);
        }
        return {
          ...base,
          success: true,
          output: `Created ${template} project with ${Object.keys(tmpl.files).length} files\nTemplate: ${tmpl.name} - ${tmpl.desc}`,
          filesCreated
        };
      }
      case 'WebSearch': {
        const { query } = call.input;
        return {
          ...base,
          success: true,
          output: `[Web Search: "${query}"]\n\nSearch functionality requires API integration. For now, use WebFetch for documentation.`
        };
      }
      case 'MultiFileWrite': {
        const { files } = call.input;
        let parsed;
        try {
          parsed = typeof files === 'string' ? JSON.parse(files) : files;
        } catch {
          return { ...base, success: false, output: 'Invalid JSON format for files array' };
        }
        if (!Array.isArray(parsed)) {
          return { ...base, success: false, output: 'files parameter must be an array' };
        }
        const filesCreated: string[] = [];
        for (const f of parsed) {
          if (f.path && f.content) {
            vfs.writeFile(f.path, f.content);
            filesCreated.push(f.path);
          }
        }
        return {
          ...base,
          success: true,
          output: `Created ${filesCreated.length} files successfully`,
          filesCreated
        };
      }
      case 'GenerateImage': {
        const { prompt, path, model = 'flux' } = call.input;
        if (!prompt || !path) {
          return { ...base, success: false, output: 'Missing prompt or path' };
        }
        try {
          const dataUrl = await aiGenerateImageWithProgress(prompt, undefined, { model });
          vfs.writeFile(path, dataUrl);
          return {
            ...base,
            success: true,
            output: `IMAGE_READY\nSaved to ${path}\nIn your code use: <img src="${path}" /> or as CSS background-image`,
            filesCreated: [normalizePath(path)],
          };
        } catch (e: any) {
          return { ...base, success: false, output: `Image generation failed: ${e.message}` };
        }
      }
      case 'GenerateVideo': {
        const { prompt, path, aspectRatio = 'VIDEO_ASPECT_RATIO_LANDSCAPE' } = call.input;
        if (!prompt || !path) {
          return { ...base, success: false, output: 'Missing prompt or path' };
        }
        try {
          const result = await generateVideo(
            prompt,
            aspectRatio as any,
            1,
            () => {},
            () => {}
          );
          vfs.writeFile(path, result.url);
          return {
            ...base,
            success: true,
            output: `VIDEO_READY_URL: ${result.url}\nSaved reference to ${path}\n\nIMPORTANT: In your code, use this URL directly:\n<video src="${result.url}" autoplay loop muted playsinline />`,
            filesCreated: [normalizePath(path)],
          };
        } catch (e: any) {
          return { ...base, success: false, output: `Video generation failed: ${e.message}` };
        }
      }
      default:
        return { ...base, success: false, output: `Unknown tool: ${call.name}` };
    }
  } catch (e: any) {
    return { ...base, success: false, output: `Tool error: ${e.message}` };
  }
}


// ─── Parse AI response for tool calls ───
// The AI will output tool calls in a special format:
// <tool_call>{"name": "FileWrite", "input": {"path": "/src/app.ts", "content": "..."}}</tool_call>
export function parseToolCalls(text: string): { cleanText: string; toolCalls: ToolCall[] } {
  const toolCalls: ToolCall[] = [];
  let cleanText = text;

  // Parse <vibe_action> blocks (Lovable/Claude artifact style)
  const actionRegex = /<vibe_action\s+type=["']([^"']+)["'](?:\s+filePath=["']([^"']+)["'])?\s*>([\s\S]*?)<\/vibe_action>/g;
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    const type = match[1];
    const path = match[2];
    let content = match[3];
    
    // Remove leading/trailing newlines safely without breaking indentation
    content = content.replace(/^\s*[\r\n]/, '').replace(/[\r\n]\s*$/, '');
    
    if (type === 'file' && path) {
      toolCalls.push({
        id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: 'FileWrite',
        input: { path, content }
      });
    } else if (type === 'shell') {
      toolCalls.push({
        id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: 'Bash',
        input: { command: content.trim() }
      });
    }
    cleanText = cleanText.replace(match[0], '');
  }

  // Remove <vibe_artifact> tags from cleanText to keep UI clean
  cleanText = cleanText.replace(/<vibe_artifact[^>]*>/g, '').replace(/<\/vibe_artifact>/g, '');

  // Parse <tool_call>...</tool_call> blocks
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  while ((match = toolCallRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      toolCalls.push({
        id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: parsed.name,
        input: parsed.input || {},
      });
    } catch (e) {}
    cleanText = cleanText.replace(match[0], '');
  }

  // Also parse ```json blocks
  const jsonBlockRegex = /```json\s*\n?\s*\{[\s\S]*?"name"\s*:\s*"(FileWrite|FileRead|FileEdit|Bash|DeleteFile|MkDir|ListDir|Glob|Grep|TreeView|ProjectInfo)"[\s\S]*?\}\s*\n?\s*```/g;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const jsonStr = match[0].replace(/```json\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && !toolCalls.find(tc => tc.name === parsed.name && JSON.stringify(tc.input) === JSON.stringify(parsed.input))) {
        toolCalls.push({
          id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: parsed.name,
          input: parsed.input || {},
        });
      }
    } catch {}
    cleanText = cleanText.replace(match[0], '');
  }

  return { cleanText: cleanText.trim(), toolCalls };
}

// ─── Real-Time Streaming Artifact Parser ───
export function parseStreamingArtifacts(streamingText: string, vfs: VirtualFileSystem, executedIds: Set<string>): { changedFiles: string[] } {
  const changedFiles: string[] = [];
  
  // Find all <vibe_action type="file" filePath="..."> blocks (complete or incomplete)
  // Accommodate single/double quotes and optional spaces
  const actionStartRegex = /<vibe_action\s+type=["']file["']\s+filePath=["']([^"']+)["']\s*>/g;
  let match;
  
  while ((match = actionStartRegex.exec(streamingText)) !== null) {
    const path = match[1];
    const startIndex = match.index + match[0].length;
    
    // Find where the action ends, or use the end of the streaming string
    const endMatch = streamingText.indexOf('</vibe_action>', startIndex);
    const endIndex = endMatch !== -1 ? endMatch : streamingText.length;
    
    let content = streamingText.substring(startIndex, endIndex);
    
    // Remove leading/trailing newlines safely
    content = content.replace(/^\s*[\r\n]/, '');
    
    // Create a unique ID for this write state to prevent duplicate disk writes if content hasn't changed
    const hash = `${path}_${content.length}`;
    if (!executedIds.has(hash)) {
      vfs.writeFile(path, content);
      executedIds.add(hash);
      changedFiles.push(path);
    }
  }
  
  // Also handle shell commands for real-time dir creation
  const shellStartRegex = /<vibe_action\s+type=["']shell["']\s*>([\s\S]*?)(?:<\/vibe_action>|$)/g;
  let shellMatch;
  while ((shellMatch = shellStartRegex.exec(streamingText)) !== null) {
    const content = shellMatch[1].trim();
    if (content && shellMatch[0].endsWith('</vibe_action>')) {
      const hash = `shell_${content}`;
      if (!executedIds.has(hash)) {
        simulateBash(content, vfs);
        executedIds.add(hash);
      }
    }
  }

  return { changedFiles };
}

// ─── Generate tools prompt for AI system message ───
export function getToolsSystemPrompt(): string {
  const toolDescriptions = VIBE_TOOLS.filter(t => !['FileWrite', 'Bash', 'MultiFileWrite'].includes(t.name)).map(t => {
    const params = Object.entries(t.parameters)
      .map(([k, v]) => `  - ${k} (${v.type}${v.required ? ', required' : ''}): ${v.description}`)
      .join('\n');
    return `### ${t.name}\n${t.description}\nParameters:\n${params || '  (none)'}`;
  }).join('\n\n');

  return `You are INIXA Vibe Code, an elite autonomous AI software engineer. You have full control over a virtual file system to build complete, multi-file projects from scratch.

## Project Creation & Modification (XML Artifacts)

When writing files or executing shell commands, you MUST use XML tags. This is your primary way of building projects. Do NOT output raw markdown code blocks for files.

<vibe_artifact id="project-setup" title="Initial Setup">
  <vibe_action type="shell">
    mkdir -p /src/components
  </vibe_action>
  
  <vibe_action type="file" filePath="/src/index.tsx">
import React from 'react';
// Complete, production-ready code goes here...
export const App = () => <div>Hello</div>;
  </vibe_action>
</vibe_artifact>

### CRITICAL XML RULES:
1. ALWAYS use <vibe_action type="file" filePath="..."> to create or overwrite a file.
2. ALWAYS provide COMPLETE, PRODUCTION-READY code inside the tag. NEVER use placeholders, "TODO", or "Rest of the code".
3. For multi-file projects, create EVERY necessary file (package.json, styles, components, utilities) within the same <vibe_artifact>.
4. Use <vibe_action type="shell"> for commands like 'mkdir', 'npm install', or 'touch'.
5. DO NOT use JSON escaping or markdown blocks inside <vibe_action>. Write raw, clean code.

## Advanced Tools (JSON Format)

If you need to read files, search, or get project info, use the JSON tool call format:
<tool_call>{"name": "FileRead", "input": {"path": "/src/main.ts"}}</tool_call>

Available Advanced Tools:
${toolDescriptions}

Always think step-by-step and briefly explain your plan before executing actions.`;
}
