import { AdvisorService } from './advisor/service.js';
import { ElectronHubProvider, FallbackAdvisorProvider, GeminiProvider } from './advisor/providers.js';
import { loadConfig } from './config.js';
import { McpClient } from './mcp-client.js';
import { SessionStore } from './session-store.js';
import { createTelegramBot } from './telegram-bot.js';
import { startHealthServer } from './health-server.js';

const config = loadConfig();
const healthServer = await startHealthServer();
const mcp = new McpClient(config.mcpEndpoint, config.mcpTimeoutMs, config.mcpAuthToken);
const advisor = new AdvisorService(new FallbackAdvisorProvider(
  new ElectronHubProvider(
    config.electronHubApiKey,
    config.electronHubBaseUrl,
    config.electronHubModel,
  ),
  new GeminiProvider(config.geminiApiKey, config.geminiModel),
));
const bot = createTelegramBot({
  config,
  mcp,
  sessions: new SessionStore(),
  advisor,
});

console.info(`Starting financial advisor bot with MCP endpoint ${config.mcpEndpoint}`);
console.info('Health server listening on 0.0.0.0:8080');

const shutdown = (): void => {
  bot.stop();
  healthServer.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await bot.start({
  onStart: (botInfo) => console.info(`Telegram bot started as @${botInfo.username}`),
});
