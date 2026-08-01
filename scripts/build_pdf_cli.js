const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generatePDFViaCLI() {
  console.log('[PDF CLI] Launching Headless Browser to render PDF...');
  
  const outputPath = path.join(__dirname, '..', 'public', 'INIXA_Prompt_Battle_CLI_Generated.pdf');
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>INIXA Prompt Battle Arena - College Symposium Official Rulebook</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    
    @page {
      size: letter;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
      }
    }
    
    body {
      font-family: 'Inter', system-ui, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    .badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      display: inline-block;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 900;
      color: #1e1b4b;
      margin: 10px 0 4px 0;
      letter-spacing: -0.5px;
    }
    
    .subtitle {
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e1b4b;
      border-left: 4px solid #6366f1;
      padding-left: 10px;
      margin-top: 28px;
      margin-bottom: 14px;
    }

    .sub-title {
      font-size: 14px;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }
    
    .card-title {
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
      margin-bottom: 4px;
    }
    
    .card-desc {
      font-size: 11.5px;
      color: #475569;
    }

    .constraint-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      color: #d97706;
      margin-top: 6px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      margin-bottom: 16px;
    }
    
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
      font-size: 12px;
    }
    
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    
    .step-box {
      background: #eef2ff;
      border-left: 4px solid #4f46e5;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 8px;
      font-size: 12px;
    }

    .code-block {
      background: #0f172a;
      color: #f1f5f9;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 10px 14px;
      border-radius: 8px;
      white-space: pre-wrap;
      margin: 8px 0;
    }

    .page-break {
      page-break-after: always;
    }

    .footer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
  </style>
</head>
<body>

  <div class="header">
    <span class="badge">Official CLI Generated Rulebook</span>
    <h1>INIXA PROMPT BATTLE ARENA</h1>
    <div class="subtitle">College Symposium Edition — Complete Game Specifications & Host Playbook</div>
  </div>

  <div class="section-title">1. Event Overview & Game Objectives</div>
  <p>The <strong>INIXA Prompt Engineering Battle</strong> is an inter-collegiate competition testing participants' mastery in prompt design, constraint adherence, algorithmic reasoning, and structured data extraction using Large Language Models (LLMs).</p>

  <div class="section-title">2. Competition Games Specs (All 6 Games)</div>
  
  <div class="grid">
    <div class="card">
      <div class="card-title">🧠 1. Unstructured Data to Typed JSON</div>
      <div class="card-desc">Extract support call transcript entities into valid JSON.</div>
      <div class="constraint-tag">Constraints: Strict JSON, No markdown \`\`\`json\`\`\` fences, No conversational intro.</div>
    </div>
    
    <div class="card">
      <div class="card-title">🧠 2. Zero-Hallucination Academic Extraction</div>
      <div class="card-desc">Format research paper stats into GitHub Markdown tables.</div>
      <div class="constraint-tag">Constraints: Zero hallucination, strictly &lt; 50 tokens.</div>
    </div>

    <div class="card">
      <div class="card-title">🧠 3. Constrained Roleplay & Reasoning</div>
      <div class="card-desc">Explain Quantum Entanglement to high schoolers.</div>
      <div class="constraint-tag">Constraints: ⚠️ Do NOT use the letter 'e' anywhere!</div>
    </div>

    <div class="card">
      <div class="card-title">💻 4. Algorithmic Optimization O(N^2) → O(N)</div>
      <div class="card-desc">Refactor slow duplicate detector to O(N) HashMap typescript code.</div>
      <div class="constraint-tag">Constraints: Strict O(N), include JSDoc comments.</div>
    </div>

    <div class="card">
      <div class="card-title">💻 5. Reverse Code Engineering</div>
      <div class="card-desc">Generate tail-recursive array flattener function from trace.</div>
      <div class="constraint-tag">Constraints: No Array.prototype.flat(), handle arbitrary depth.</div>
    </div>

    <div class="card">
      <div class="card-title">💻 6. Zod Schema Transpiler</div>
      <div class="card-desc">Transpile OpenAPI specs into production Zod schemas.</div>
      <div class="constraint-tag">Constraints: Export Zod schema + inferred TS type definitions.</div>
    </div>
  </div>

  <div class="page-break"></div>

  <div class="section-title">3. Prompt Engineering Master Cheatsheet</div>
  <table>
    <thead>
      <tr>
        <th>Technique</th>
        <th>Implementation Pattern</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Role Assignment</strong></td>
        <td><i>"You are a Lead Data Architect. Your task is to..."</i> — Sets domain expertise & tone.</td>
      </tr>
      <tr>
        <td><strong>Delimiters</strong></td>
        <td>Use triple quotes <code>"""</code> or XML tags <code>&lt;context&gt;...&lt;/context&gt;</code> to isolate input data.</td>
      </tr>
      <tr>
        <td><strong>Negative Guardrails</strong></td>
        <td>State <i>"DO NOT include intro text, DO NOT wrap in markdown fences"</i>.</td>
      </tr>
      <tr>
        <td><strong>Few-Shot Prompting</strong></td>
        <td>Provide 1 or 2 sample input-output pairs inside prompt for strict schema matching.</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. How to Play on INIXA Web App</div>
  <div class="step-box"><strong>Step 1: Select Game & Category:</strong> Choose between Text Research & Coding Battle tabs.</div>
  <div class="step-box"><strong>Step 2: Pick AI Model:</strong> Select GPT-5.6 (UPDF), DeepSeek V4 Pro, Qwen 3.7 Max, Perplexity Copilot, or GPT-5.4 Mini.</div>
  <div class="step-box"><strong>Step 3: Enforce Target Constraints:</strong> Review mandatory input context & negative constraints checklist.</div>
  <div class="step-box"><strong>Step 4: Execute Prompt:</strong> Construct prompt instructions & click "Execute Prompt". Watch live real-time token stream.</div>
  <div class="step-box"><strong>Step 5: Automated AI Judge:</strong> Click "AI Judge Score" to get an instant 0-100 score breakdown across Accuracy, Constraints, & Token Efficiency.</div>

  <div class="section-title">5. Official Judging & Scoring Rubric</div>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Weight</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Target Accuracy</strong></td>
        <td>40%</td>
        <td>Precision matching target JSON / code / table structure.</td>
      </tr>
      <tr>
        <td><strong>Constraint Adherence</strong></td>
        <td>30%</td>
        <td>100% compliance with negative constraints (e.g. no letter 'e', O(N)).</td>
      </tr>
      <tr>
        <td><strong>Token Efficiency</strong></td>
        <td>20%</td>
        <td>Concise prompt with zero conversational token waste.</td>
      </tr>
      <tr>
        <td><strong>Technique & Elegance</strong></td>
        <td>10%</td>
        <td>Use of delimiters, role assignment, and few-shot/CoT techniques.</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    INIXA AI Studio — Generated via CLI Puppeteer Headless PDF Compiler
  </div>

</body>
</html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (err) {
    console.warn('[PDF CLI] Launching installed chromium browser fallback...');
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || undefined,
      headless: true,
      args: ['--no-sandbox']
    });
  }

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
  });

  await browser.close();
  console.log(`[PDF CLI] SUCCESS! PDF generated at: ${outputPath}`);
}

generatePDFViaCLI().catch(err => {
  console.error('[PDF CLI Error]', err);
  process.exit(1);
});
