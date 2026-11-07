export interface MCPToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

export interface MCPToolDefinition {
  name: string;
  label: string;
  description: string;
  category: 'search' | 'code' | 'web' | 'data' | 'system';
  icon: string;
  parameters: Record<string, MCPToolParameter>;
  execute: (args: Record<string, any>) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;
}

export interface AgentStep {
  id: string;
  type: 'thought' | 'tool_call' | 'tool_result' | 'answer' | 'error';
  title: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  content?: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: number;
  durationMs?: number;
}

export interface AgentArtifact {
  id: string;
  title: string;
  type: 'file' | 'code' | 'chart' | 'data';
  content: string;
  meta?: Record<string, any>;
}

export interface AgentExecutionState {
  taskId: string;
  status: 'idle' | 'thinking' | 'calling_tool' | 'completed' | 'failed';
  steps: AgentStep[];
  artifacts: AgentArtifact[];
  finalAnswer: string;
  totalTokens?: number;
  durationMs: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
}
