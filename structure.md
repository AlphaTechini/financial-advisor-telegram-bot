# Project Structure

```text
financial-advisor-telegram-bot/
├── .agents/
├── prompts/
├── src/
│   └── advisor/
├── Dockerfile
├── package.json
└── README.md
```

- The Telegram state machine and account binding are in [src/telegram-bot.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/telegram-bot.ts).
- The MCP transport boundary is in [src/mcp-client.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/mcp-client.ts).
- The Cloud Run health listener is in [src/health-server.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/health-server.ts).
- Financial data parsing is in [src/financial-data.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/financial-data.ts).
- Provider selection and fallback are in [src/advisor/providers.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/advisor/providers.ts).
- Advisor instructions are in [prompts/financial-advisor.md](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/prompts/financial-advisor.md).
- Project decisions are recorded in [.agents/GUIDE.md](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/.agents/GUIDE.md).

The prompt system can be found in [prompts/README.md](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/prompts/README.md).

The container packaging can be found in [Dockerfile](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/Dockerfile).
