import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class McpToolError extends Error {
  constructor(message: string, readonly payload?: unknown) {
    super(message);
    this.name = 'McpToolError';
  }
}

type ToolResult = {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
  structuredContent?: unknown;
};

function parseToolText(result: ToolResult): unknown {
  const text = result.content?.find((item) => item.type === 'text')?.text;
  if (!text) return result.structuredContent ?? {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function errorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    return String(payload.error);
  }
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    return String(payload.message);
  }
  return 'The banking service could not complete that request.';
}

export class McpClient {
  constructor(
    private readonly endpoint: string,
    private readonly timeoutMs: number,
    private readonly authToken?: string,
  ) {}

  async callTool(name: string, arguments_: Record<string, unknown>): Promise<unknown> {
    const client = new Client({ name: 'wema-financial-advisor', version: '0.1.0' });
    const headers = new Headers({ Accept: 'application/json, text/event-stream' });
    if (this.authToken) headers.set('Authorization', `Bearer ${this.authToken}`);

    const transport = new StreamableHTTPClientTransport(new URL(this.endpoint), {
      requestInit: { headers, signal: AbortSignal.timeout(this.timeoutMs) },
    });

    try {
      await client.connect(transport);
      const result = await client.callTool({ name, arguments: arguments_ }) as ToolResult;
      const payload = parseToolText(result);
      if (result.isError) throw new McpToolError(errorMessage(payload), payload);
      return payload;
    } catch (error) {
      if (error instanceof McpToolError) throw error;
      throw new McpToolError('The banking service is temporarily unavailable.', error);
    } finally {
      await client.close().catch(() => undefined);
    }
  }
}
