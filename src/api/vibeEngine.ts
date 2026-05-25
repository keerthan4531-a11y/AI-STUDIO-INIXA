// ═══════════════════════════════════════════════════════════════
// INIXA VIBE CODE — AI Engine Integration
// Connects the Vibe Coding tool to INIXA's existing AI models
// Uses the best coding models as the AI brain
// ═══════════════════════════════════════════════════════════════

import { aiChat, type AIModel, AI_MODELS, getSelectedModel } from './aiEngine';
import { getToolsSystemPrompt } from './vibeTools';
import { VirtualFileSystem } from './vibeFileSystem';

// ─── Best Coding Models (prioritized for vibe coding) ───
export const VIBE_CODING_MODELS: AIModel[] = AI_MODELS.map(m => {
  if (m.id.toLowerCase().includes('deepseek')) {
    return { ...m, badge: 'RECOMMENDED', badgeColor: 'green' };
  }
  return m;
}).sort((a, b) => {
  const aDeep = a.id.toLowerCase().includes('deepseek');
  const bDeep = b.id.toLowerCase().includes('deepseek');
  if (aDeep && !bDeep) return -1;
  if (!aDeep && bDeep) return 1;
  return 0;
});


// ─── Context Compression (Layer 3) ───
function buildCompressedHistory(messages: VibeMessage[]): any[] {
  const result = [];
  
  const extractWrittenFiles = (text: string) => {
    const matches = text.matchAll(/filePath=["']([^"']+)["']/g);
    return [...matches].map(m => m[1]);
  };

  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.content && msg.content.length > 2000) {
      const filesWritten = extractWrittenFiles(msg.content);
      result.push({
        role: 'assistant',
        content: filesWritten.length > 0
          ? `[Wrote files: ${filesWritten.join(', ')}]` 
          : msg.content.slice(0, 300) + '...[truncated]'
      });
    } else if (msg.role === 'tool' && msg.toolResults) {
      const toolOutput = msg.toolResults
        .map(r => `[Tool: ${r.name}] ${r.success ? '✓' : '✗'}\n${r.output}`)
        .join('\n\n');
      result.push({ role: 'user', content: `Tool execution results:\n${toolOutput}` });
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      result.push({ role: msg.role, content: msg.content });
    }
  }
  
  // Keep the last 4 messages fully intact
  if (messages.length > 4) {
    const last4 = messages.slice(-4).map(m => {
      if (m.role === 'tool' && m.toolResults) {
        return { role: 'user', content: `Tool execution results:\n${m.toolResults.map(r => `[Tool: ${r.name}] ${r.success ? '✓' : '✗'}\n${r.output}`).join('\n\n')}` };
      }
      return { role: m.role, content: m.content };
    });
    return [...result.slice(0, -4), ...last4];
  }
  
  return result;
}

// ─── Vibe Coding System Prompt ───
  function getVibeSystemPrompt(vfs: VirtualFileSystem): string {
    const stats = vfs.getStats();
    const tree = vfs.getTreeString();
    const projectName = vfs.getProjectName();
    
    const projectContext = stats.files > 0
      ? `\n## Current Project: "${projectName}"\nFiles: ${stats.files} | Dirs: ${stats.dirs} | Size: ${(stats.totalSize / 1024).toFixed(1)}KB\nLanguages: ${Object.entries(stats.languages).map(([l, c]) => `${l}(${c})`).join(', ')}\n\nFile Tree:\n${tree || '(empty)'}\n`
      : `\n## Current Project: "${projectName}" (empty)\nNo files yet. Create files to get started.\n`;

    return `${getToolsSystemPrompt()}

${projectContext}

## Your Personality & Workflow
- You are Inixa Vibe Code — an elite AI coding assistant, operating like Cursor or Lovable.
- FIRST STEP (PLANNING): When a user asks you to create a NEW project, DO NOT write code immediately. FIRST, provide a brief Implementation Plan in normal text. Ask the user if they approve.
- ONLY start writing code using <vibe_artifact> AFTER the user explicitly approves.
- TARGETED FIXES: When fixing bugs, you MUST output the ENTIRE updated source code for the file using <vibe_action type="file" filePath="...">. DO NOT just write the error message, descriptions, or partial diffs inside the tag. The tag must contain the fully functioning rewritten code for that file!

## PROJECT CREATION GUIDELINES (React & Vite)
Your code runs in a powerful WebContainer-like environment (esbuild) that fully supports modern React, Vite, and npm dependencies.
- Use standard React + Vite + TypeScript templates.
- Always create a complete \`package.json\` with ALL necessary dependencies (e.g., \`react\`, \`react-dom\`, \`lucide-react\`, \`framer-motion\`, \`tailwindcss\`).

## RULES (NEVER BREAK THESE)
1. PLAN first, code after user approval
2. ONE file per <vibe_action> tag
3. COMPLETE file content only — no truncation, no "// rest of code"
4. NEVER import a component before creating it
5. Close every XML tag you open
6. If project has >5 files, write 3 files max per response

## FILE ORDER (Always follow this exact chunking)
Turn 1: package.json, vite.config.ts, index.html, tailwind.config.js, media tool calls
Turn 2: src/index.css, src/index.tsx, src/App.tsx  
Turn 3+: Individual components one by one

## CRITICAL FILE LIMIT (Layer 1 Optimization)
${stats.files === 0 
  ? '- Empty project: Write ONLY package.json + vite.config.ts + index.html + src/index.css this turn. Nothing else.'
  : '- Has files: Write max 2 files per response.'}
- NEVER import a component you haven't written yet.

## AFTER EACH TURN
End your response with exactly:
<vibe_status>
files_written: [list of files just written]
files_pending: [list of files yet to be created]
next_action: [what you will do in the next turn]
</vibe_status>

## AUTONOMOUS AI MEDIA GENERATION (CRITICAL)
- You have FULL AUTONOMOUS CONTROL over Vibe Studio's AI media features!
- When your website needs beautiful visuals (Hero images, product shots, background videos, logos, textures), DO NOT use unsplash or placeholders!
- Instead, YOU MUST actively call the <tool_call>{"name": "GenerateImage", "input": {"prompt": "...", "path": "/public/hero.jpg"}}</tool_call> and <tool_call>{"name": "GenerateVideo", "input": {"prompt": "...", "path": "/public/bg.mp4"}}</tool_call> tools to dynamically create them.
- Save the generated media into the \`/public\` directory (e.g. \`/public/hero-bg.jpg\`), and then reference them directly in your code as \`/hero-bg.jpg\`.
- This is your superpower. Build stunning, fully populated websites with original AI-generated assets!

## Design Aesthetic & Advanced Capabilities
- All web projects you build MUST look STUNNING. Use vibrant colors, glassmorphism, and Framer Motion for micro-animations.
- ADVANCED 3D SUPPORT: You CAN and SHOULD build advanced 3D websites. Sandpack fully supports WebGL, \`three\`, \`@react-three/fiber\`, and \`@react-three/drei\`.
- 3D MODELS (.glb/.gltf): To use external 3D models, DO NOT say "file system restriction". Instead, fetch free public models directly from CDNs (e.g., raw.githubusercontent.com, polyhaven) or use base64 data URIs, or procedurally generate 3D geometries.
- Never claim you cannot build heavy 3D or data visualizations. Act confidently and build them!
- Prioritize visual excellence.
`;
}

// ─── Chat Message Types ───
export interface VibeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: { name: string; input: any }[];
  toolResults?: { name: string; success: boolean; output: string }[];
  model?: string;
  isStreaming?: boolean;
}

// ─── Vibe Chat Session ───
export interface VibeChatSession {
  id: string;
  messages: VibeMessage[];
  projectId: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Quick Vibe Result ───
export interface QuickVibeResult {
  success: boolean;
  code?: string;
  fileName?: string;
  language?: string;
  message: string;
}

// ─── Save/Load Chat Sessions ───
export function saveVibeChatSession(session: VibeChatSession) {
  try {
    localStorage.setItem(`vibe_chat_${session.id}`, JSON.stringify(session));
  } catch {}
}

export function loadVibeChatSession(id: string): VibeChatSession | null {
  try {
    const data = localStorage.getItem(`vibe_chat_${id}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

// ─── Main Vibe AI Chat Function ───
export async function vibeChat(
  messages: VibeMessage[],
  vfs: VirtualFileSystem,
  selectedModel?: AIModel,
  onChunk?: (chunk: string, full: string) => void,
): Promise<string> {
  const model = selectedModel || getSelectedModel();

  // Build conversation for AI
  const systemPrompt = getVibeSystemPrompt(vfs);
  
  const aiMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...buildCompressedHistory(messages)
  ];

  let accumulated = '';
  try {
    const response = await aiChat(
      aiMessages, 
      onChunk ? (chunk: string) => {
        accumulated += chunk;
        onChunk(chunk, accumulated);
      } : undefined, 
      model
    );
    return accumulated || response;
  } catch (error: any) {
    console.error('[VibeEngine] AI chat error:', error);
    return `Error: ${error.message || 'Failed to get AI response'}`;
  }
}

// ─── Get selected vibe model ───
export function getVibeModel(): AIModel {
  const savedId = localStorage.getItem('vibe_coding_model');
  if (savedId) {
    const found = VIBE_CODING_MODELS.find(m => m.id === savedId);
    if (found) return found;
  }
  return VIBE_CODING_MODELS[0] || getSelectedModel();
}

export function setVibeModel(id: string) {
  localStorage.setItem('vibe_coding_model', id);
}

// ─── Quick Vibe — Fast Code Generation ───
export async function quickVibe(
  prompt: string,
  model?: AIModel,
  onChunk?: (chunk: string) => void
): Promise<QuickVibeResult> {
  const systemPrompt = `You are Quick Vibe - a high-speed AI code generator.
Your goal is to generate a SINGLE file that solves the user's request.
Always output the code inside a triple backtick code block with the language identifier.
Explain briefly (1 sentence) what you built.
If the user wants a UI, prefer a single-file HTML/CSS/JS solution (using Tailwind via CDN if needed).
Always provide a filename in your explanation.

Example response:
I've built a modern login page for you.
\`\`\`html
... code ...
\`\`\`
Filename: login.html
`;

  try {
    const response = await aiChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], onChunk ? (chunk: string) => onChunk(chunk) : undefined);

    // Extract code block
    const codeMatch = response.match(/```(\w+)?\n([\s\S]*?)```/);
    const language = codeMatch ? codeMatch[1] : 'text';
    const code = codeMatch ? codeMatch[2].trim() : response;

    // Extract filename
    const fileMatch = response.match(/Filename:\s*([^\n\s]+)/i) || response.match(/([^\n\s]+\.(html|tsx|ts|js|css|py|json))/i);
    let fileName = fileMatch ? fileMatch[1] : `vibe_${Date.now()}.${language === 'html' ? 'html' : 'txt'}`;
    
    // Clean filename
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '');

    return {
      success: true,
      code,
      fileName,
      language,
      message: 'Code generated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to generate code'
    };
  }
}
