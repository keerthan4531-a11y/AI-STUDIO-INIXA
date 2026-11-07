import { MCP_TOOLS_REGISTRY, getToolsPromptDescription } from './toolsRegistry';
import { AgentStep, AgentArtifact, AgentExecutionState } from './types';

export interface RunAgentOptions {
  prompt: string;
  model?: string;
  enabledTools?: string[];
  chatHistory?: Array<{ role: string; content: string }>;
  onEvent?: (event: { type: string; payload: any }) => void;
  baseUrl?: string;
}

const AGENT_SYSTEM_PROMPT = `You are INIXA AUTONOMOUS AGENT, a state-of-the-art AI agent operating via the Model Context Protocol (MCP).
You are not a simple chatbot; you are an autonomous problem solver capable of reasoning, planning, gathering live data, running code, and executing tasks end-to-end.

You have access to the following MCP Tools:
{{TOOLS_DESCRIPTION}}

RESPONSE PROTOCOL:
For every step, analyze the task and decide if you need external information, calculation, scraping, or file generation.
You MUST ALWAYS respond with a SINGLE valid JSON object wrapped in \`\`\`json ... \`\`\` code block, matching one of these two schemas:

Case 1: When you need to take an action / use a tool:
\`\`\`json
{
  "thought": "Clear explanation of what you are thinking and why you need this tool.",
  "action": "tool_name",
  "action_input": {
    "param1": "value1"
  }
}
\`\`\`

Case 2: When you have all required information and are ready to deliver the complete, final solution:
\`\`\`json
{
  "thought": "Summary of how all steps were accomplished.",
  "final_answer": "Comprehensive, beautifully formatted markdown response. Use bolding, tables, code blocks, bullet points, and source citations."
}
\`\`\`

RULES:
1. Never pretend to know live current events or recent facts without using \`web_search\`.
2. If the user asks for calculations, data analysis, or complex math, use \`code_interpreter\` for 100% precision.
3. If the user asks to analyze a specific URL or article, use \`fetch_web_page\`.
4. If the user asks for charts, use \`data_visualizer\`.
5. If the user asks for a report, code file, or document, you can use \`file_generator\`.
6. Always answer in the language the user speaks (e.g. Tamil, English, Tanglish).
7. Provide rich, insightful, deep answers, not short summaries.`;

export async function executeAgentLoop(options: RunAgentOptions): Promise<AgentExecutionState> {
  const {
    prompt,
    model = 'gpt-5-6',
    enabledTools = Object.keys(MCP_TOOLS_REGISTRY),
    chatHistory = [],
    onEvent,
    baseUrl = 'http://localhost:3000',
  } = options;

  const startTime = Date.now();
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const steps: AgentStep[] = [];
  const artifacts: AgentArtifact[] = [];

  const emit = (type: string, payload: any) => {
    if (onEvent) {
      onEvent({ type, payload });
    }
  };

  emit('agent_start', { taskId, model, prompt });

  const toolsPrompt = getToolsPromptDescription(enabledTools);
  const systemMessage = AGENT_SYSTEM_PROMPT.replace('{{TOOLS_DESCRIPTION}}', toolsPrompt);

  const conversation: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemMessage },
    ...chatHistory.slice(-4), // keep recent context
    { 
      role: 'user', 
      content: `${prompt}\n\n[INIXA AGENT MODE ACTIVATED]\nAvailable MCP Tools: [${enabledTools.join(', ')}]\nThink step-by-step and respond using the JSON action protocol.` 
    },
  ];

  let iterations = 0;
  const maxIterations = 5;
  let finalAnswer = '';

  while (iterations < maxIterations) {
    iterations++;
    const stepId = `step-${iterations}-${Date.now()}`;
    const stepStartTime = Date.now();

    emit('agent_status', { message: `Step ${iterations}: Thinking and planning...` });

    // 1. Call LLM Completions
    let llmResponseText = '';
    try {
      const apiUrl = `${baseUrl}/api/chat/completions`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: conversation,
          stream: false,
          temperature: 0.2, // Low temperature for deterministic tool calling
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM call failed (HTTP ${res.status}): ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      llmResponseText = data.reply || data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      const errorStep: AgentStep = {
        id: stepId,
        type: 'error',
        title: 'Model Connection Error',
        content: err.message || String(err),
        status: 'failed',
        timestamp: Date.now(),
        durationMs: Date.now() - stepStartTime,
      };
      steps.push(errorStep);
      emit('step_error', errorStep);
      finalAnswer = `⚠️ Agent execution encountered an error: ${err.message}`;
      break;
    }

    if (!llmResponseText.trim()) {
      finalAnswer = 'Agent received an empty response from model.';
      break;
    }

    // 2. Parse JSON action from response
    let actionPayload: any = null;
    const jsonMatch = llmResponseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidateJson = jsonMatch ? jsonMatch[1].trim() : llmResponseText.trim();

    try {
      actionPayload = JSON.parse(candidateJson);
    } catch {
      // If LLM returned raw text directly without JSON block, treat as final answer
      finalAnswer = llmResponseText.trim();
      const answerStep: AgentStep = {
        id: stepId,
        type: 'answer',
        title: 'Direct Response',
        content: finalAnswer,
        status: 'completed',
        timestamp: Date.now(),
        durationMs: Date.now() - stepStartTime,
      };
      steps.push(answerStep);
      emit('step_completed', answerStep);
      break;
    }

    // 3. Handle Thought
    if (actionPayload.thought) {
      const thoughtStep: AgentStep = {
        id: `${stepId}-thought`,
        type: 'thought',
        title: 'Agent Reasoning',
        content: actionPayload.thought,
        status: 'completed',
        timestamp: Date.now(),
        durationMs: Date.now() - stepStartTime,
      };
      steps.push(thoughtStep);
      emit('agent_thought', thoughtStep);
    }

    // 4. Case A: Final Answer reached
    if (actionPayload.final_answer || actionPayload.action === 'final_answer') {
      finalAnswer = actionPayload.final_answer || (typeof actionPayload.action_input === 'string' ? actionPayload.action_input : JSON.stringify(actionPayload.action_input || ''));
      const answerStep: AgentStep = {
        id: `${stepId}-answer`,
        type: 'answer',
        title: 'Solution Completed',
        content: finalAnswer,
        status: 'completed',
        timestamp: Date.now(),
        durationMs: Date.now() - stepStartTime,
      };
      steps.push(answerStep);
      emit('step_completed', answerStep);
      break;
    }

    // 5. Case B: Tool Call requested
    if (actionPayload.action) {
      const toolName = actionPayload.action;
      const toolArgs = actionPayload.action_input || {};
      const toolDef = MCP_TOOLS_REGISTRY[toolName];

      const callStep: AgentStep = {
        id: `${stepId}-tool`,
        type: 'tool_call',
        title: toolDef ? `Executing ${toolDef.label}` : `Executing ${toolName}`,
        toolName,
        toolArgs,
        status: 'running',
        timestamp: Date.now(),
      };
      steps.push(callStep);
      emit('tool_call_start', callStep);

      let toolResult: any;
      if (!toolDef) {
        toolResult = { success: false, error: `Tool "${toolName}" is not registered in MCP registry.` };
      } else {
        try {
          toolResult = await toolDef.execute(toolArgs);
        } catch (e: any) {
          toolResult = { success: false, error: e.message || String(e) };
        }
      }

      callStep.status = toolResult.success ? 'completed' : 'failed';
      callStep.toolResult = toolResult;
      callStep.durationMs = Date.now() - callStep.timestamp;
      emit('tool_call_result', callStep);

      // Check if tool produced an artifact (e.g. file, chart)
      if (toolName === 'file_generator' && toolResult.success && toolResult.data) {
        artifacts.push({
          id: toolResult.data.artifactId,
          title: toolResult.data.filename,
          type: 'file',
          content: toolResult.data.content,
          meta: { size: toolResult.data.sizeBytes },
        });
        emit('artifact_created', artifacts[artifacts.length - 1]);
      } else if (toolName === 'data_visualizer' && toolResult.success && toolResult.data?.chartConfig) {
        artifacts.push({
          id: `chart-${Date.now()}`,
          title: toolResult.data.chartConfig.title,
          type: 'chart',
          content: JSON.stringify(toolResult.data.chartConfig),
          meta: toolResult.data.chartConfig,
        });
        emit('artifact_created', artifacts[artifacts.length - 1]);
      }

      // Add observation back to conversation loop
      conversation.push({
        role: 'assistant',
        content: JSON.stringify({
          thought: actionPayload.thought,
          action: toolName,
          action_input: toolArgs,
        }),
      });

      conversation.push({
        role: 'user',
        content: `[TOOL OBSERVATION: ${toolName}]\n${JSON.stringify(toolResult, null, 2)}\n\nNow continue to the next step or output the final_answer JSON.`,
      });

      continue;
    }

    // Default break if format was ambiguous
    finalAnswer = llmResponseText;
    break;
  }

  const executionState: AgentExecutionState = {
    taskId,
    status: finalAnswer ? 'completed' : 'failed',
    steps,
    artifacts,
    finalAnswer: finalAnswer || 'Task completed without text output.',
    durationMs: Date.now() - startTime,
  };

  emit('agent_done', executionState);
  return executionState;
}
