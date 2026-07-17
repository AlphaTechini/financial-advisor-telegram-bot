import 'dotenv/config';

export type Config = {
  telegramBotToken: string;
  mcpEndpoint: string;
  mcpAuthToken?: string;
  mcpTimeoutMs: number;
  electronHubApiKey: string;
  electronHubBaseUrl: string;
  electronHubModel: string;
  geminiApiKey: string;
  geminiModel: string;
  advisorCurrency: string;
  statementLimit: number;
  sessionHistoryLimit: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

export function normalizeMcpEndpoint(rawUrl: string): string {
  const url = new URL(rawUrl);
  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = pathname.endsWith('/mcp') ? pathname : `${pathname}/mcp`;
  return url.toString();
}

function normalizeProviderBaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export function loadConfig(): Config {
  const mcpRawUrl = requiredEnv('MCP_SERVER_URL');

  return {
    telegramBotToken: requiredEnv('TELEGRAM_BOT_TOKEN'),
    mcpEndpoint: normalizeMcpEndpoint(mcpRawUrl),
    mcpAuthToken: process.env.MCP_AUTH_TOKEN?.trim() || undefined,
    mcpTimeoutMs: positiveInteger('MCP_TIMEOUT_MS', 15_000),
    electronHubApiKey: requiredEnv('ELECTRON_HUB_API_KEY'),
    electronHubBaseUrl: normalizeProviderBaseUrl(requiredEnv('ELECTRON_HUB_BASE_URL')),
    electronHubModel: requiredEnv('ELECTRON_HUB_MODEL'),
    geminiApiKey: requiredEnv('GEMINI_API_KEY'),
    geminiModel: requiredEnv('GEMINI_MODEL'),
    advisorCurrency: process.env.ADVISOR_CURRENCY?.trim() || 'NGN',
    statementLimit: positiveInteger('STATEMENT_LIMIT', 100),
    sessionHistoryLimit: positiveInteger('SESSION_HISTORY_LIMIT', 6),
  };
}
