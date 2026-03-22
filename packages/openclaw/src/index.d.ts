/**
 * @silkweb/openclaw — TypeScript definitions
 */

export interface SilkWebOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface AgentConfig {
  name: string;
  id?: string;
  description?: string;
  version?: string;
  endpoint: string;
  tools?: ToolDefinition[];
}

export interface ToolDefinition {
  name?: string;
  id?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface RegisterOptions {
  pricing?: {
    model: 'free' | 'per_task' | 'per_minute' | 'subscription' | 'negotiable';
    currency?: string;
    amount?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface RegisterResult {
  silkId: string;
  agentId: string;
  apiKey: string;
  message: string;
}

export interface DiscoverQuery {
  capabilities?: string[];
  tags?: string[];
  minTrust?: number;
  maxPrice?: number;
  protocols?: string[];
  framework?: string;
  limit?: number;
  offset?: number;
}

export interface DiscoveredAgent {
  silkId: string;
  agentId: string;
  name: string;
  description: string;
  capabilities: Array<{
    id: string;
    name: string;
    description?: string;
    tags?: string[];
  }>;
  trustScore?: number;
  pricing?: Record<string, unknown>;
  endpoint: string;
  protocols: string[];
  metadata: Record<string, unknown>;
}

export interface DiscoverResult {
  agents: DiscoveredAgent[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskRequest {
  to: string;
  capability: string;
  input: Record<string, unknown>;
  maxCost?: number;
  timeout?: number;
  callbackUrl?: string;
}

export interface TaskCreatedResult {
  taskId: string;
  status: string;
  message: string;
}

export interface TaskStatus {
  taskId: string;
  status: string;
  progress: number;
  message?: string;
  output?: Record<string, unknown>;
  cost?: number;
  createdAt: string;
  completedAt?: string;
}

export interface Receipt {
  receiptId: string;
  taskId: string;
  hash: string;
  signatures: {
    executor: string;
    requester?: string;
  };
  cost?: number;
  verified: boolean;
  createdAt: string;
}

export declare class SilkWeb {
  constructor(options: SilkWebOptions);

  silkId: string | null;

  register(agent: AgentConfig, options?: RegisterOptions): Promise<RegisterResult>;
  discover(query?: DiscoverQuery): Promise<DiscoverResult>;
  requestTask(task: TaskRequest): Promise<TaskCreatedResult>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  getReceipt(taskId: string): Promise<Receipt>;
  getAgent(silkId: string): Promise<Record<string, unknown>>;
}
