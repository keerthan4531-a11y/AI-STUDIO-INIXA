"use client";
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import { VirtualFileSystem } from '../../api/vibeFileSystem';

interface Props { 
  vfs: VirtualFileSystem; 
  onError?: (error: { message: string, source: 'build' | 'runtime' }) => void;
}

// ─── Global ESBuild Singleton ─────────────────────────────────────────────────
let esbuildInstance: any = null;
let esbuildInitPromise: Promise<any> | null = null;

async function getEsbuild() {
  if (esbuildInstance) return esbuildInstance;
  if (!esbuildInitPromise) {
    esbuildInitPromise = (async () => {
      // Bypass turbopack/webpack static analysis for remote URL completely
      const importFunc = new Function("url", "return import(url)");
      const mod = await importFunc('https://cdn.jsdelivr.net/npm/esbuild-wasm@0.21.5/esm/browser.js');
      
      try {
        await mod.initialize({
          wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.21.5/esbuild.wasm',
          worker: false, // Set to false to avoid COOP/COEP header requirements for SharedArrayBuffer
        });
      } catch (err: any) {
        // Ignore "already initialized" errors which can happen during HMR
        if (!err.message?.includes('initialize') && !err.message?.includes('already')) {
          throw err;
        }
      }
      
      esbuildInstance = mod;
      return mod;
    })();
  }
  return esbuildInitPromise;
}
getEsbuild().catch(console.warn);

// ─── Path Resolution ──────────────────────────────────────────────────────────
function resolvePath(importer: string, importee: string): string {
  const importerDir = importer.split('/').slice(0, -1);
  const parts = [...importerDir, ...importee.split('/')];
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === '..') resolved.pop();
    else if (p !== '.' && p !== '') resolved.push(p);
  }
  return resolved.join('/');
}

// ─── CSS → JS ─────────────────────────────────────────────────────────────────
function cssToJs(css: string): string {
  const safe = JSON.stringify(css);
  return `(function(){var s=document.createElement('style');s.textContent=${safe};document.head.appendChild(s);})();`;
}

// ─── Asset URL Replacement ───────────────────────────────────────────────────
function replaceAssetUrls(code: string, files: Record<string, string>): string {
  let result = code;
  const assetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'webm', 'wav', 'mp3'];
  
  for (const [filePath, content] of Object.entries(files)) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (assetExts.includes(ext)) {
      const escPath = filePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(["'])(?:\\.?\\/)?${escPath}(["'])`, 'g');
      result = result.replace(regex, `$1${content}$2`);
    }
  }
  return result;
}

// ─── HTML Shell ───────────────────────────────────────────────────────────────
function buildHtml(bundledJs: string, tailwindConfig: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script type="importmap">
  {
    "imports": {
      "react":            "https://esm.sh/react@18.3.1",
      "react-dom":        "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "react/jsx-runtime":"https://esm.sh/react@18.3.1/jsx-runtime",
      "lucide-react":     "https://esm.sh/lucide-react@0.400.0?bundle",
      "three":            "https://esm.sh/three@0.160.0",
      "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.15.12?external=react,react-dom,three",
      "@react-three/drei":  "https://esm.sh/@react-three/drei@9.96.1?external=react,react-dom,three,@react-three/fiber"
    }
  }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = ${tailwindConfig || '{ theme: { extend: {} } }'};
    if (tailwind.config.darkMode === undefined) tailwind.config.darkMode = 'class';
  </script>
  <style>
    *,::before,::after{box-sizing:border-box}
    html, body { margin: 0; min-height: 100vh; background: #0b0c14; }
    body{font-family:system-ui,-apple-system,sans-serif;color: white;}
    #root{min-height:100vh}
    ::-webkit-scrollbar { width: 0px; background: transparent; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom';
    window.React = React;
    window.ReactDOM = ReactDOM;
  </script>
  <script type="module">
    // Auto-sync background from app root
    const observer = new MutationObserver(() => {
      const root = document.getElementById('root');
      if (root?.firstElementChild) {
        const bg = getComputedStyle(root.firstElementChild).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          document.body.style.background = bg;
        }
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById('root'), { childList: true });

    function showError(msg) {
      window.parent.postMessage({ type: 'vibe_runtime_error', message: msg }, '*');
      const el = document.getElementById('__ve__');
      if (el) { el.textContent += '\\n' + msg; return; }
      const d = document.createElement('div');
      d.id = '__ve__';
      d.style = 'position:fixed;bottom:0;left:0;right:0;max-height:50vh;overflow:auto;background:#1a0000;color:#ff6b6b;font:11px/1.5 monospace;padding:12px;border-top:1px solid #ff000055;white-space:pre-wrap;z-index:9999';
      d.textContent = '\\u26a0 Runtime Error\\n' + msg;
      document.body.appendChild(d);
    }
    window.addEventListener('error', e => showError(e.error?.stack || e.message || String(e)));
    window.addEventListener('unhandledrejection', e => showError(String(e.reason?.stack || e.reason)));
${bundledJs}
  </script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function VibePreview({ vfs, onError }: Props) {
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const buildIdRef   = useRef(0);

  const [hasContent, setHasContent] = useState(false);
  const [status,     setStatus]     = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [key,        setKey]        = useState(0);

  const files = useMemo(() => {
    const result: Record<string, string> = {};
    for (const f of vfs.glob('**/*')) {
      const r = vfs.readFile(f);
      if (r.success) result[f.startsWith('/') ? f.slice(1) : f] = r.content;
    }
    return result;
  }, [vfs, vfs.getProject().updatedAt, key]);

  const buildAndRender = useCallback(async () => {
    if (Object.keys(files).length === 0) return;

    const buildId = ++buildIdRef.current;
    setStatus('loading');
    setErrorMsg(null);

    try {
      const esbuild = await getEsbuild();
      if (buildId !== buildIdRef.current) return;

      const vfsPlugin = {
        name: 'vfs',
        setup(build: any) {
          build.onResolve({ filter: /.*/ }, (args: any) => {
            const { path, importer } = args;

            if (path.startsWith('http://') || path.startsWith('https://')) {
              return { path, external: true };
            }

            // FIX: bare npm imports → handle via importmap or esm.sh
            if (!path.startsWith('.') && !path.startsWith('/')) {
              const isInternal = path.startsWith('src/') || files[path] !== undefined || files[path + '.tsx'] !== undefined;
              if (!isInternal) {
                // Packages in our importmap stay as bare names
                const isMapped = ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'].includes(path);
                if (isMapped) return { path, external: true };

                // All other libraries resolve to esm.sh CDN URLs
                // We force them to use the EXACT SAME React version to avoid useContext conflicts
                return { path: `https://esm.sh/${path}?bundle&deps=react@18.3.1,react-dom@18.3.1`, external: true };
              }
            }

            const resolved = path.startsWith('.')
              ? resolvePath(importer || 'src/index', path)
              : path.replace(/^\//, '');

            return { path: resolved, namespace: 'vfs' };
          });

          build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args: any) => {
            const p = args.path;
            const candidates = [
              p,
              `${p}.tsx`, `${p}.ts`, `${p}.jsx`, `${p}.js`,
              `${p}/index.tsx`, `${p}/index.ts`, `${p}/index.jsx`, `${p}/index.js`,
            ];

            let content: string | undefined;
            let matched = p;
            for (const c of candidates) {
              if (files[c] !== undefined) { content = files[c]; matched = c; break; }
            }
            if (content === undefined) return null;

            const ext = matched.split('.').pop()?.toLowerCase() ?? 'tsx';
            if (ext === 'css') return { contents: cssToJs(content), loader: 'js' };

            const assetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'webm', 'wav', 'mp3'];
            if (assetExts.includes(ext)) {
              return { contents: `export default ${JSON.stringify(content)};`, loader: 'js' };
            }

            const loaderMap: Record<string, string> = {
              tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js', json: 'json',
            };
            return { contents: content, loader: (loaderMap[ext] ?? 'tsx') as any };
          });
        },
      };

      const entry =
        ['src/main.tsx', 'src/index.tsx', 'src/main.ts', 'src/index.ts', 'src/App.tsx'].find(e => files[e])
        ?? Object.keys(files).find(f => /\.(tsx|jsx)$/.test(f));

      if (!entry) throw new Error('No entry point found (expected src/main.tsx or src/index.tsx)');

      const result = await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        plugins: [vfsPlugin],
        external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
        jsx: 'automatic',
        define: {
          'process.env.NODE_ENV': '"development"',
          'global': 'globalThis',
        },
        logLevel: 'silent',
      });

      if (buildId !== buildIdRef.current) return;

      // FIX: surface esbuild errors/warnings explicitly
      if (result.errors?.length) {
        const msg = result.errors.map((e: any) =>
          `${e.location?.file ?? ''}:${e.location?.line ?? ''} — ${e.text}`
        ).join('\n');
        throw new Error(msg);
      }

      const js   = result.outputFiles?.[0]?.text ?? '';
      
      // Extract Tailwind Config if it exists
      let twConfig = '';
      const twFile = files['tailwind.config.js'] || files['tailwind.config.mjs'];
      if (twFile) {
        const match = twFile.match(/(?:module\.exports|export\s+default)\s*=\s*(\{[\s\S]*\})/);
        if (match) twConfig = match[1];
      }

      const processedJs = replaceAssetUrls(js, files);
      const html = buildHtml(processedJs, twConfig);
      const processedHtml = replaceAssetUrls(html, files);

      if (iframeRef.current) {
        iframeRef.current.srcdoc = processedHtml;
        setHasContent(true);
      }
      setStatus('ready');

    } catch (err: any) {
      if (buildId !== buildIdRef.current) return;
      const msg = err.message ?? 'Unknown error';
      setErrorMsg(msg);
      setStatus('error');
      onError?.({ message: msg, source: 'build' });
    }
  }, [files]);

  useEffect(() => { buildAndRender(); }, [buildAndRender]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'vibe_runtime_error') {
        onError?.({ message: e.data.message, source: 'runtime' });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError]);

  // FIX: reset hasContent on manual retry so loading overlay shows fresh
  const handleRetry = useCallback(() => {
    setHasContent(false);
    setKey(k => k + 1);
  }, []);

  if (Object.keys(files).length === 0) {
    return (
      <div className="vibe-editor-empty flex flex-col items-center justify-center h-full gap-3">
        <Eye size={48} className="text-white/10" />
        <p className="text-white/40 text-sm">Build something to start the previewer</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0b0c14] relative rounded-xl overflow-hidden flex flex-col shadow-2xl">

      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-50">
        <button
          onClick={handleRetry}
          disabled={status === 'loading'}
          className="p-2 bg-black/60 hover:bg-black/80 disabled:opacity-40 text-white rounded-lg backdrop-blur-md transition-all flex items-center gap-2 text-[10px] font-bold border border-white/10 uppercase tracking-widest group"
        >
          <RefreshCw
            size={12}
            className={status === 'loading'
              ? 'animate-spin text-indigo-400'
              : 'group-hover:rotate-180 transition-transform duration-500'}
          />
          <span>{status === 'loading' ? 'Bundling...' : 'Restart'}</span>
        </button>
      </div>

      {/* First-load overlay */}
      {status === 'loading' && !hasContent && (
        <div className="absolute inset-0 z-40 bg-[#0b0c14] flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="flex gap-1.5">
            {['bg-indigo-500', 'bg-purple-500', 'bg-pink-500'].map((c, i) => (
              <div key={i} className={`w-2 h-2 ${c} rounded-full animate-bounce`}
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-white/30 font-mono text-[10px] uppercase tracking-widest">Bundling...</p>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && errorMsg && (
        <div className="absolute inset-0 z-50 bg-[#0b0c14]/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mb-5 border border-red-500/30">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-base mb-1">Bundle Failed</h3>
          <p className="text-white/40 text-xs mb-4 max-w-xs">Fix the error and the preview will auto-rebuild.</p>
          <div className="w-full max-h-48 overflow-auto bg-black/60 p-4 rounded-xl border border-white/5 text-left mb-5">
            <pre className="text-red-400 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{errorMsg}</pre>
          </div>
          <button
            onClick={handleRetry}
            className="px-5 py-2 bg-white text-black rounded-xl font-bold text-xs hover:scale-105 transition-all active:scale-95"
          >
            Retry Build
          </button>
        </div>
      )}

      {/* FIX: removed allow-same-origin — srcdoc + same-origin = parent DOM access risk */}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        className="flex-1 w-full h-full border-none"
        style={{ 
          opacity: status === 'loading' && !hasContent ? 0 : 1, 
          transition: 'opacity 0.3s ease',
          background: 'transparent'
        }}
        title="Vibe Preview"
      />
    </div>
  );
}

