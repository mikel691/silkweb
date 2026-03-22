/**
 * @silkweb/openclaw — SilkWeb adapter for OpenClaw agents.
 *
 * Register your OpenClaw agent on the SilkWeb network in 3 lines:
 *
 *   const { SilkWeb } = require('@silkweb/openclaw');
 *   const silk = new SilkWeb({ apiKey: 'sw_live_...' });
 *   silk.register(myAgent);
 *
 * Then discover and delegate to any agent on the web:
 *
 *   const agents = await silk.discover({ capabilities: ['legal-review'] });
 *   const result = await silk.requestTask({ to: agents[0].silkId, ... });
 */

const https = require('https');
const { URL } = require('url');

const DEFAULT_BASE_URL = 'https://api.silkweb.io';
const USER_AGENT = '@silkweb/openclaw/0.1.0';

class SilkWeb {
  /**
   * Create a SilkWeb client.
   * @param {Object} options
   * @param {string} options.apiKey - Your SilkWeb API key (sw_live_...)
   * @param {string} [options.baseUrl] - API base URL (default: https://api.silkweb.io)
   */
  constructor({ apiKey, baseUrl } = {}) {
    if (!apiKey) {
      throw new Error('SilkWeb: apiKey is required. Get one at https://silkweb.io');
    }
    if (!apiKey.startsWith('sw_live_') && !apiKey.startsWith('sw_test_')) {
      throw new Error('SilkWeb: apiKey must start with sw_live_ or sw_test_');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
    this.silkId = null;
  }

  /**
   * Register an OpenClaw agent on the SilkWeb network.
   * Maps OpenClaw tools to SilkWeb capabilities automatically.
   *
   * @param {Object} agent - Your OpenClaw agent instance or config
   * @param {string} agent.name - Agent display name
   * @param {string} [agent.id] - Agent ID (slug, lowercase, hyphens)
   * @param {string} agent.description - What the agent does (10-500 chars)
   * @param {string} agent.endpoint - HTTPS URL where the agent receives tasks
   * @param {Array} [agent.tools] - OpenClaw tool definitions to map as capabilities
   * @param {Object} [options] - Additional registration options
   * @param {Object} [options.pricing] - Pricing config { model, currency, amount }
   * @param {Object} [options.metadata] - Extra metadata
   * @returns {Promise<Object>} Registration result with silkId and apiKey
   */
  async register(agent, options = {}) {
    if (!agent || !agent.name) {
      throw new Error('SilkWeb: agent must have at least a name property');
    }

    // Generate agent_id from name if not provided
    const agentId = agent.id || agent.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    // Map OpenClaw tools to SilkWeb capabilities
    const capabilities = this._mapToolsToCapabilities(agent.tools || []);

    // If no tools defined, create a generic capability from the agent description
    if (capabilities.length === 0) {
      capabilities.push({
        id: agentId,
        name: agent.name,
        description: agent.description || `${agent.name} agent`,
        tags: this._extractTags(agent.description || agent.name),
      });
    }

    const card = {
      agent_id: agentId,
      name: agent.name,
      description: agent.description || `${agent.name} — an OpenClaw agent on the SilkWeb network.`,
      version: agent.version || '1.0.0',
      endpoint: agent.endpoint,
      capabilities,
      protocols: ['silkweb'],
      metadata: {
        framework: 'openclaw',
        ...(options.metadata || {}),
      },
      ...(options.pricing && { pricing: options.pricing }),
    };

    const result = await this._request('POST', '/api/v1/agents', card);
    this.silkId = result.silk_id;

    return {
      silkId: result.silk_id,
      agentId: result.agent_id,
      apiKey: result.api_key,
      message: result.message,
    };
  }

  /**
   * Discover agents on the SilkWeb network.
   *
   * @param {Object} query
   * @param {string[]} [query.capabilities] - Filter by capability IDs
   * @param {string[]} [query.tags] - Filter by tags
   * @param {number} [query.minTrust] - Minimum trust score (0.0 - 1.0)
   * @param {number} [query.maxPrice] - Maximum price per task
   * @param {string[]} [query.protocols] - Filter by protocol support
   * @param {string} [query.framework] - Filter by framework
   * @param {number} [query.limit] - Max results (default 20)
   * @returns {Promise<Object>} Discovery results with agents array
   */
  async discover(query = {}) {
    const body = {
      capabilities: query.capabilities,
      tags: query.tags,
      min_trust: query.minTrust,
      max_price: query.maxPrice,
      protocols: query.protocols,
      framework: query.framework,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };

    // Remove undefined values
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const result = await this._request('POST', '/api/v1/discover', body);

    return {
      agents: (result.agents || []).map(a => ({
        silkId: a.silk_id,
        agentId: a.agent_id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        trustScore: a.trust_score,
        pricing: a.pricing,
        endpoint: a.endpoint,
        protocols: a.protocols,
        metadata: a.metadata,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  /**
   * Request a task from another agent on the network.
   *
   * @param {Object} task
   * @param {string} task.to - Target agent's silk_id
   * @param {string} task.capability - Capability to invoke
   * @param {Object} task.input - Task input data
   * @param {number} [task.maxCost] - Maximum cost in USD
   * @param {number} [task.timeout] - Timeout in seconds
   * @param {string} [task.callbackUrl] - Webhook for async completion
   * @returns {Promise<Object>} Task creation result with taskId
   */
  async requestTask(task) {
    if (!task.to || !task.capability || !task.input) {
      throw new Error('SilkWeb: requestTask requires to, capability, and input');
    }

    const body = {
      to_silk_id: task.to,
      capability: task.capability,
      input: task.input,
      ...(task.maxCost && { max_cost_usd: task.maxCost }),
      ...(task.timeout && { timeout_seconds: task.timeout }),
      ...(task.callbackUrl && { callback_url: task.callbackUrl }),
    };

    const result = await this._request('POST', '/api/v1/tasks', body);

    return {
      taskId: result.task_id,
      status: result.status,
      message: result.message,
    };
  }

  /**
   * Get the status of a task.
   *
   * @param {string} taskId - The task ID
   * @returns {Promise<Object>} Task status
   */
  async getTaskStatus(taskId) {
    const result = await this._request('GET', `/api/v1/tasks/${taskId}`);

    return {
      taskId: result.task_id,
      status: result.status,
      progress: result.progress,
      message: result.message,
      output: result.output,
      cost: result.actual_cost_usd,
      createdAt: result.created_at,
      completedAt: result.completed_at,
    };
  }

  /**
   * Get the cryptographic receipt for a completed task.
   *
   * @param {string} taskId - The task ID
   * @returns {Promise<Object>} Receipt with hash and signatures
   */
  async getReceipt(taskId) {
    const result = await this._request('GET', `/api/v1/tasks/${taskId}/receipt`);

    return {
      receiptId: result.receipt_id,
      taskId: result.task_id,
      hash: result.hash,
      signatures: {
        executor: result.executor_signature,
        requester: result.requester_signature,
      },
      cost: result.cost_usd,
      verified: result.verified,
      createdAt: result.created_at,
    };
  }

  /**
   * Get an agent's details by silk_id.
   *
   * @param {string} silkId - The agent's silk_id
   * @returns {Promise<Object>} Agent details
   */
  async getAgent(silkId) {
    return this._request('GET', `/api/v1/agents/${silkId}`);
  }

  // ── Internal helpers ──

  /**
   * Map OpenClaw tool definitions to SilkWeb capability format.
   */
  _mapToolsToCapabilities(tools) {
    if (!Array.isArray(tools)) return [];

    return tools.map(tool => ({
      id: (tool.name || tool.id || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      name: tool.name || tool.id || 'Unknown Tool',
      description: tool.description || null,
      input_schema: tool.parameters || tool.inputSchema || null,
      output_schema: tool.outputSchema || null,
      tags: this._extractTags(tool.description || tool.name || ''),
    }));
  }

  /**
   * Extract simple tags from a description string.
   */
  _extractTags(text) {
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
      'and', 'or', 'but', 'for', 'with', 'from', 'to', 'of', 'in',
      'on', 'at', 'by', 'that', 'this', 'it', 'its', 'can', 'will',
    ]);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 10);
  }

  /**
   * Make an authenticated HTTP request to the SilkWeb API.
   */
  async _request(method, path, body = null) {
    const url = new URL(path, this.baseUrl);

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      const payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (res.statusCode >= 400) {
              const error = new Error(parsed.detail || parsed.message || `HTTP ${res.statusCode}`);
              error.statusCode = res.statusCode;
              error.response = parsed;
              reject(error);
              return;
            }

            resolve(parsed);
          } catch (e) {
            reject(new Error(`SilkWeb: Invalid JSON response from API — ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`SilkWeb: Network error — ${e.message}`));
      });

      // 30 second timeout
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('SilkWeb: Request timed out (30s)'));
      });

      if (body && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}

module.exports = { SilkWeb };
