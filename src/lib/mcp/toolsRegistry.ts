import * as cheerio from 'cheerio';
import vm from 'vm';
import { MCPToolDefinition } from './types';

export const MCP_TOOLS_REGISTRY: Record<string, MCPToolDefinition> = {
  // ── 1. Web Search Tool ──────────────────────────────────────────────
  web_search: {
    name: 'web_search',
    label: 'Live Web Search',
    description: 'Searches the live web for up-to-date real-time information, news, documentation, or facts.',
    category: 'search',
    icon: 'Globe',
    parameters: {
      query: {
        type: 'string',
        description: 'The search query string to look up.',
        required: true,
      },
      num_results: {
        type: 'number',
        description: 'Maximum number of search results to return (default: 5).',
        required: false,
        default: 5,
      },
    },
    execute: async (args: any) => {
      try {
        let query = typeof args === 'string' ? args : (args.query || args.search || args.q || '');
        if (!query && typeof args === 'object') {
          const firstVal = Object.values(args)[0];
          if (typeof firstVal === 'string') query = firstVal;
        }

        if (!query || typeof query !== 'string') {
          return { success: false, error: 'Query parameter is required' };
        }

        const num_results = args.num_results || 5;
        const encodedQuery = encodeURIComponent(query.trim());
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (!res.ok) {
          throw new Error(`Search provider returned HTTP ${res.status}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        const results: Array<{ title: string; url: string; snippet: string }> = [];

        $('.result').each((_, element) => {
          if (results.length >= (num_results || 5)) return;

          const titleElem = $(element).find('.result__title a');
          const snippetElem = $(element).find('.result__snippet');
          const title = titleElem.text().trim();
          let rawUrl = titleElem.attr('href') || '';

          // Unwrap DuckDuckGo redirect url
          if (rawUrl.includes('uddg=')) {
            const match = rawUrl.match(/uddg=([^&]+)/);
            if (match && match[1]) {
              rawUrl = decodeURIComponent(match[1]);
            }
          }

          const snippet = snippetElem.text().trim();

          if (title && rawUrl && snippet) {
            results.push({ title, url: rawUrl, snippet });
          }
        });

        return {
          success: true,
          data: {
            query,
            totalFound: results.length,
            results: results.slice(0, num_results || 5),
          },
        };
      } catch (err: any) {
        return { success: false, error: `Search failed: ${err.message || String(err)}` };
      }
    },
  },

  // ── 2. Fetch Web Page Tool ──────────────────────────────────────────
  fetch_web_page: {
    name: 'fetch_web_page',
    label: 'Web Page Reader',
    description: 'Fetches and extracts clean, readable text content from any public webpage or URL.',
    category: 'web',
    icon: 'FileText',
    parameters: {
      url: {
        type: 'string',
        description: 'The full URL of the webpage to fetch (must start with http:// or https://).',
        required: true,
      },
    },
    execute: async ({ url }) => {
      try {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
          return { success: false, error: 'A valid http/https URL is required' };
        }

        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch URL. HTTP status: ${res.status}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Remove junk elements
        $('script, style, noscript, nav, footer, header, svg, iframe, .ads, .cookie-banner').remove();

        const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Page';
        
        // Extract main text content
        let textContent = $('main, article, .content, #content, body')
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim();

        // Limit content to safe token length (max 4000 characters)
        if (textContent.length > 4000) {
          textContent = textContent.slice(0, 4000) + '... [Content truncated for brevity]';
        }

        return {
          success: true,
          data: {
            url,
            title,
            length: textContent.length,
            content: textContent,
          },
        };
      } catch (err: any) {
        return { success: false, error: `Failed to scrape page: ${err.message || String(err)}` };
      }
    },
  },

  // ── 3. Code Interpreter Sandbox ─────────────────────────────────────
  code_interpreter: {
    name: 'code_interpreter',
    label: 'Code Interpreter Sandbox',
    description: 'Safely executes JavaScript / mathematical calculations, algorithms, data formatting, and transformations.',
    category: 'code',
    icon: 'Terminal',
    parameters: {
      code: {
        type: 'string',
        description: 'The JavaScript code to execute. Can calculate math, format strings, transform JSON, or return output.',
        required: true,
      },
    },
    execute: async (args: any) => {
      try {
        let code = typeof args === 'string' ? args : (args.code || args.expression || args.script || args.js || '');
        if (!code && typeof args === 'object') {
          const firstVal = Object.values(args)[0];
          if (typeof firstVal === 'string') code = firstVal;
        }

        if (!code || typeof code !== 'string') {
          return { success: false, error: 'Code or expression parameter is required' };
        }

        // If code is an expression without return or console.log, wrap in return
        const trimmed = code.trim();
        let executableCode = trimmed;
        if (!trimmed.includes('return') && !trimmed.includes('console.log') && !trimmed.includes(';') && !trimmed.includes('\n')) {
          executableCode = `return (${trimmed});`;
        }

        // Sandbox setup
        const logs: string[] = [];
        const sandbox = {
          console: {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
            error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
            warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
          },
          Math,
          Date,
          JSON,
          Array,
          Object,
          String,
          Number,
          Boolean,
          RegExp,
        };

        const context = vm.createContext(sandbox);
        // Wrap executableCode in a function if it has a return statement
        const runString = executableCode.includes('return') ? `(() => { ${executableCode} })()` : executableCode;
        const script = new vm.Script(runString);

        // Run with strict 3-second timeout to prevent infinite loops
        const result = script.runInContext(context, { timeout: 3000 });

        return {
          success: true,
          data: {
            returnedValue: result !== undefined ? result : null,
            logs,
          },
        };
      } catch (err: any) {
        return { success: false, error: `Execution error: ${err.message || String(err)}` };
      }
    },
  },

  // ── 4. Data Visualizer Tool ─────────────────────────────────────────
  data_visualizer: {
    name: 'data_visualizer',
    label: 'Interactive Chart Generator',
    description: 'Generates structured JSON chart definitions (bar, line, pie, scatter) to render interactive graphics in chat.',
    category: 'data',
    icon: 'BarChart',
    parameters: {
      type: {
        type: 'string',
        description: 'The chart type: "bar", "line", "pie", or "scatter".',
        required: true,
      },
      title: {
        type: 'string',
        description: 'Descriptive title of the visualization.',
        required: true,
      },
      data: {
        type: 'array',
        description: 'Array of data objects to plot (e.g. [{ name: "2024", revenue: 50 }]).',
        required: true,
      },
      dataKeys: {
        type: 'array',
        description: 'Array of numeric key names in data to visualize.',
        required: true,
      },
      colors: {
        type: 'array',
        description: 'Hex color codes for the series (e.g. ["#3b82f6", "#10b981"]).',
        required: false,
      },
    },
    execute: async ({ type, title, data, dataKeys, colors }) => {
      try {
        if (!type || !title || !data || !dataKeys) {
          return { success: false, error: 'Missing required chart properties (type, title, data, dataKeys)' };
        }

        const chartConfig = {
          type,
          title,
          data: Array.isArray(data) ? data : [],
          dataKeys: Array.isArray(dataKeys) ? dataKeys : [],
          colors: Array.isArray(colors) && colors.length > 0 ? colors : ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        };

        return {
          success: true,
          data: {
            chartReady: true,
            chartConfig,
          },
        };
      } catch (err: any) {
        return { success: false, error: `Visualization failed: ${err.message || String(err)}` };
      }
    },
  },

  // ── 5. File & Artifact Generator ────────────────────────────────────
  file_generator: {
    name: 'file_generator',
    label: 'File Artifact Generator',
    description: 'Creates downloadable text, markdown, report, or JSON file artifacts for the user.',
    category: 'system',
    icon: 'Download',
    parameters: {
      filename: {
        type: 'string',
        description: 'The name of the file to generate with extension (e.g. "report.md", "data.json").',
        required: true,
      },
      content: {
        type: 'string',
        description: 'The complete text content of the file.',
        required: true,
      },
    },
    execute: async ({ filename, content }) => {
      try {
        if (!filename || !content) {
          return { success: false, error: 'filename and content are required' };
        }

        const artifactId = `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        return {
          success: true,
          data: {
            artifactId,
            filename,
            sizeBytes: Buffer.byteLength(content, 'utf-8'),
            content,
          },
        };
      } catch (err: any) {
        return { success: false, error: `File generation error: ${err.message || String(err)}` };
      }
    },
  },
};

/**
 * Formats the list of available tools into a JSON schema prompt for LLMs
 */
export function getToolsPromptDescription(enabledToolNames?: string[]): string {
  const tools = Object.values(MCP_TOOLS_REGISTRY).filter(t => 
    !enabledToolNames || enabledToolNames.includes(t.name)
  );

  return JSON.stringify(
    tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
    null,
    2
  );
}
